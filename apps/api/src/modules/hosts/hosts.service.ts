import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  BusinessMemberStatus,
  HostStatus,
  HostType,
  RoleName,
  ScopeType,
  VerificationStatus,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  businesses,
  businessMembers,
  hostProfiles,
} from '../../db/schema/hosts';
import { verificationDocuments } from '../../db/schema/identity';
import { roleAssignments, users } from '../../db/schema/identity';
import { conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { AuditService } from '../audit/audit.service';
import { encryptField } from '../../core/crypto';

@Injectable()
export class HostsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string) {
    const profile = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (!profile) return null;
    const business = (
      await this.db.select().from(businesses).where(eq(businesses.hostProfileId, profile.id)).limit(1)
    )[0];
    const members = business
      ? await this.db.select().from(businessMembers).where(eq(businessMembers.businessId, business.id))
      : [];
    const documents = await this.db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.ownerId, profile.id));
    const businessDocs = business
      ? await this.db
          .select()
          .from(verificationDocuments)
          .where(eq(verificationDocuments.ownerId, business.id))
      : [];
    return { profile, business, members, documents: [...documents, ...businessDocs] };
  }

  async requireHostProfile(userId: string) {
    const profile = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (!profile) throw forbidden('Complete host onboarding first.');
    return profile;
  }

  async ensureHostProfile(userId: string) {
    const existing = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)).limit(1)
    )[0];
    if (existing) return existing;
    const profile = (
      await this.db
        .insert(hostProfiles)
        .values({ userId, type: HostType.INDIVIDUAL, status: HostStatus.PENDING })
        .returning()
    )[0]!;
    await this.db.insert(roleAssignments).values({
      userId,
      role: RoleName.HOST,
      scopeType: ScopeType.GLOBAL,
    });
    return profile;
  }

  async onboard(
    userId: string,
    dto: {
      type: HostType;
      brandName?: string;
      bio?: string;
      business?: {
        name: string;
        registrationNumber?: string;
        kraPin?: string;
        phone?: string;
        email?: string;
        authorizedRepresentativeName?: string;
      };
    },
  ) {
    const profile = await this.ensureHostProfile(userId);
    if (profile.status === HostStatus.VERIFIED && dto.type !== profile.type) {
      throw conflict('HOST_VERIFIED', 'Verified hosts cannot change type; contact support.');
    }
    await this.db.transaction(async (tx) => {
      await tx
        .update(hostProfiles)
        .set({
          type: dto.type,
          brandName: dto.brandName ?? null,
          bio: dto.bio ?? null,
        })
        .where(eq(hostProfiles.id, profile.id));

      if (dto.type === HostType.BUSINESS && dto.business) {
        const existing = (
          await tx.select().from(businesses).where(eq(businesses.hostProfileId, profile.id)).limit(1)
        )[0];
        const values = {
          name: dto.business.name,
          registrationNumber: dto.business.registrationNumber ?? null,
          kraPinEnc: dto.business.kraPin ? encryptField(dto.business.kraPin) : null,
          phone: dto.business.phone ?? null,
          email: dto.business.email ?? null,
          authorizedRepresentativeName: dto.business.authorizedRepresentativeName ?? null,
          authorizedRepresentativeUserId: userId,
        };
        if (existing) await tx.update(businesses).set(values).where(eq(businesses.id, existing.id));
        else await tx.insert(businesses).values({ hostProfileId: profile.id, ...values });
      }
    });
    return this.getProfile(userId);
  }

  async addDocument(
    userId: string,
    dto: {
      owner: 'HOST' | 'BUSINESS';
      documentType: string;
      objectKey: string;
      fileName: string;
      contentType: string;
      issuedAt?: string;
      expiresAt?: string;
    },
  ) {
    const profile = await this.requireHostProfile(userId);
    let ownerId = profile.id;
    if (dto.owner === 'BUSINESS') {
      const business = (
        await this.db
          .select()
          .from(businesses)
          .where(eq(businesses.hostProfileId, profile.id))
          .limit(1)
      )[0];
      if (!business) throw unprocessable('NO_BUSINESS', 'Create a business profile first.');
      ownerId = business.id;
    }
    const row = (
      await this.db
        .insert(verificationDocuments)
        .values({
          ownerType: dto.owner,
          ownerId,
          documentType: dto.documentType,
          objectKey: dto.objectKey,
          fileName: dto.fileName,
          contentType: dto.contentType,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          status: 'PENDING',
        })
        .returning()
    )[0]!;
    return row;
  }

  async submit(userId: string) {
    const profile = await this.requireHostProfile(userId);
    if (profile.status === HostStatus.VERIFIED) return profile;
    const docs = await this.db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.ownerId, profile.id));
    if (docs.length === 0 && profile.type === HostType.INDIVIDUAL) {
      throw unprocessable('DOCUMENTS_REQUIRED', 'Upload your ID and supporting documents first.');
    }
    let businessId: string | null = null;
    if (profile.type === HostType.BUSINESS) {
      const business = (
        await this.db
          .select()
          .from(businesses)
          .where(eq(businesses.hostProfileId, profile.id))
          .limit(1)
      )[0];
      if (!business) throw unprocessable('NO_BUSINESS', 'Complete business details first.');
      businessId = business.id;
      const businessDocs = await this.db
        .select()
        .from(verificationDocuments)
        .where(eq(verificationDocuments.ownerId, business.id));
      if (businessDocs.length === 0) {
        throw unprocessable('BUSINESS_DOCUMENTS_REQUIRED', 'Upload business registration documents.');
      }
      await this.db
        .update(businesses)
        .set({ verificationStatus: VerificationStatus.PENDING, submittedAt: new Date() })
        .where(eq(businesses.id, business.id));
    }
    await this.db
      .update(hostProfiles)
      .set({ status: HostStatus.PENDING, submittedAt: new Date() })
      .where(eq(hostProfiles.id, profile.id));
    await this.audit.record({
      actorId: userId,
      action: 'HOST.SUBMIT_VERIFICATION',
      entityType: 'HOST_PROFILE',
      entityId: profile.id,
      newValue: { businessId },
    });
    return this.getProfile(userId);
  }

  async decide(
    adminId: string,
    hostProfileId: string,
    decision: 'VERIFIED' | 'REJECTED' | 'SUSPENDED',
    reason?: string,
  ) {
    const profile = (
      await this.db.select().from(hostProfiles).where(eq(hostProfiles.id, hostProfileId)).limit(1)
    )[0];
    if (!profile) throw notFound('Host');
    await this.db.transaction(async (tx) => {
      await tx
        .update(hostProfiles)
        .set({
          status: decision,
          decidedAt: new Date(),
          decidedById: adminId,
          decisionNote: reason ?? null,
          payoutReadyAt: decision === 'VERIFIED' ? profile.payoutReadyAt : null,
        })
        .where(eq(hostProfiles.id, hostProfileId));
      if (decision === 'VERIFIED') {
        await tx
          .update(verificationDocuments)
          .set({ status: 'VERIFIED', reviewerId: adminId, reviewedAt: new Date() })
          .where(eq(verificationDocuments.ownerId, hostProfileId));
        const business = await tx
          .update(businesses)
          .set({
            verificationStatus: VerificationStatus.VERIFIED,
            decidedAt: new Date(),
            decidedById: adminId,
            decisionNote: reason ?? null,
          })
          .where(eq(businesses.hostProfileId, hostProfileId))
          .returning({ id: businesses.id });
        if (business[0]) {
          await tx
            .update(verificationDocuments)
            .set({ status: 'VERIFIED', reviewerId: adminId, reviewedAt: new Date() })
            .where(eq(verificationDocuments.ownerId, business[0].id));
        }
      }
    });
    await this.audit.record({
      actorId: adminId,
      actorRole: 'VERIFICATION',
      action: `HOST.${decision}`,
      entityType: 'HOST_PROFILE',
      entityId: hostProfileId,
      newValue: { status: decision },
      reason,
    });
    return { id: hostProfileId, status: decision };
  }

  async addStaffMember(
    hostUserId: string,
    dto: { identifier: string; staffRole: string; permissions: string[] },
  ) {
    const profile = await this.requireHostProfile(hostUserId);
    const business = (
      await this.db
        .select()
        .from(businesses)
        .where(eq(businesses.hostProfileId, profile.id))
        .limit(1)
    )[0];
    if (!business) throw unprocessable('NO_BUSINESS', 'Staff require a registered business.');
    const email = dto.identifier.toLowerCase();
    const staff = (
      await this.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, email))
        .limit(1)
    )[0];
    if (!staff) throw notFound('No user with that email. Ask them to register first.');
    await this.db
      .insert(businessMembers)
      .values({
        businessId: business.id,
        userId: staff.id,
        staffRole: dto.staffRole,
        permissions: dto.permissions,
        status: BusinessMemberStatus.ACTIVE,
        invitedById: hostUserId,
      })
      .onConflictDoNothing();
    await this.db
      .insert(roleAssignments)
      .values({
        userId: staff.id,
        role: RoleName.HOST_STAFF,
        scopeType: ScopeType.BUSINESS,
        scopeId: business.id,
        grantedById: hostUserId,
      })
      .onConflictDoNothing();
    return { ok: true };
  }
}
