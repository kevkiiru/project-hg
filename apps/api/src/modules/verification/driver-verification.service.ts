import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  KycIdType,
  VerificationStatus,
} from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import {
  customerProfiles,
  driverVerifications,
  verificationDocuments,
} from '../../db/schema/identity';
import { config } from '../../core/config/config';
import { decryptField, encryptField } from '../../core/crypto';
import { AppError, conflict, forbidden, notFound, unprocessable } from '../../core/http/errors';
import { AuditService } from '../audit/audit.service';

export interface DriverSubmission {
  legalFirstName: string;
  legalLastName: string;
  dob: string;
  nationality: string;
  idType: KycIdType;
  idNumber: string;
  licenceNumber: string;
  licenceCountry: string;
  licenceIssuedAt?: string;
  licenceExpiresAt: string;
  selfieObjectKey?: string;
  documentKeys?: { documentType: string; objectKey: string; fileName: string; contentType: string }[];
}

@Injectable()
export class DriverVerificationService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async getByUser(userId: string) {
    const profile = await this.requireProfile(userId);
    const verification = (
      await this.db
        .select()
        .from(driverVerifications)
        .where(eq(driverVerifications.customerProfileId, profile.id))
        .limit(1)
    )[0];
    const documents = await this.db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.ownerId, verification?.id ?? ''));
    return {
      verification: verification
        ? {
            ...verification,
            idNumber: undefined,
            licenceNumber: verification.licenceNumberEnc
              ? this.mask(decryptField(verification.licenceNumberEnc) ?? '')
              : null,
            idNumberEnc: undefined,
            licenceNumberEnc: undefined,
          }
        : null,
      documents: documents.map((d) => ({ ...d, objectKey: undefined })),
    };
  }

  private mask(value: string) {
    if (value.length <= 3) return '•'.repeat(value.length);
    return `${value.slice(0, 1)}${'•'.repeat(Math.max(0, value.length - 3))}${value.slice(-2)}`;
  }

  async requireProfile(userId: string) {
    const profile = (
      await this.db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
    )[0];
    if (!profile) throw notFound('Customer profile');
    return profile;
  }

  async submit(userId: string, dto: DriverSubmission) {
    const profile = await this.requireProfile(userId);
    const existing = (
      await this.db
        .select()
        .from(driverVerifications)
        .where(eq(driverVerifications.customerProfileId, profile.id))
        .limit(1)
    )[0];
    if (existing && (existing.status === 'VERIFIED' || existing.status === 'PENDING' || existing.status === 'MANUAL_REVIEW')) {
      throw conflict(
        'VERIFICATION_ALREADY_SUBMITTED',
        existing.status === 'VERIFIED'
          ? 'You are already verified.'
          : 'Your verification is already being reviewed.',
      );
    }

    const dob = new Date(dto.dob);
    const expiry = new Date(dto.licenceExpiresAt);
    const issued = dto.licenceIssuedAt ? new Date(dto.licenceIssuedAt) : null;
    const age = (Date.now() - dob.getTime()) / (365.25 * 86_400_000);
    if (age < config().MIN_DRIVER_AGE) {
      throw unprocessable('UNDER_MIN_AGE', `Drivers must be at least ${config().MIN_DRIVER_AGE} years old.`);
    }
    if (expiry <= new Date()) {
      throw unprocessable('LICENCE_EXPIRED', 'The driving licence provided has expired.');
    }

    const values = {
      status: VerificationStatus.PENDING,
      legalFirstName: dto.legalFirstName,
      legalLastName: dto.legalLastName,
      dob,
      nationality: dto.nationality,
      idType: dto.idType,
      idNumberEnc: encryptField(dto.idNumber),
      licenceNumberEnc: encryptField(dto.licenceNumber),
      licenceCountry: dto.licenceCountry,
      licenceIssuedAt: issued,
      licenceExpiresAt: expiry,
      effectiveExpiryAt: expiry,
      selfieObjectKey: dto.selfieObjectKey ?? null,
      submittedAt: new Date(),
      rejectionReasons: [] as string[],
    };

    let verificationId = existing?.id;
    if (existing) {
      await this.db.update(driverVerifications).set(values).where(eq(driverVerifications.id, existing.id));
    } else {
      verificationId = (
        await this.db
          .insert(driverVerifications)
          .values({ customerProfileId: profile.id, ...values })
          .returning({ id: driverVerifications.id })
      )[0]!.id;
    }
    await this.db
      .update(customerProfiles)
      .set({
        legalFirstName: dto.legalFirstName,
        legalLastName: dto.legalLastName,
        dob,
        nationality: dto.nationality,
        verificationStatus: VerificationStatus.PENDING,
      })
      .where(eq(customerProfiles.id, profile.id));

    if (dto.documentKeys?.length) {
      for (const doc of dto.documentKeys) {
        await this.db.insert(verificationDocuments).values({
          ownerType: 'DRIVER',
          ownerId: verificationId!,
          documentType: doc.documentType,
          objectKey: doc.objectKey,
          fileName: doc.fileName,
          contentType: doc.contentType,
          expiresAt: doc.documentType === 'DRIVING_LICENCE' ? expiry : null,
        });
      }
    }

    await this.audit.record({
      actorId: userId,
      action: 'DRIVER_VERIFICATION.SUBMIT',
      entityType: 'DRIVER_VERIFICATION',
      entityId: verificationId!,
    });
    return { id: verificationId, status: VerificationStatus.PENDING };
  }

  async decide(
    adminId: string,
    id: string,
    decision: Extract<VerificationStatus, 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW'>,
    reason?: string,
  ) {
    const verification = (
      await this.db.select().from(driverVerifications).where(eq(driverVerifications.id, id)).limit(1)
    )[0];
    if (!verification) throw notFound('Driver verification');
    await this.db.transaction(async (tx) => {
      await tx
        .update(driverVerifications)
        .set({
          status: decision,
          reviewerId: adminId,
          reviewedAt: new Date(),
          rejectionReasons: decision === 'REJECTED' && reason ? [reason] : [],
        })
        .where(eq(driverVerifications.id, id));
      await tx
        .update(customerProfiles)
        .set({
          verificationStatus: decision,
          verifiedAt: decision === 'VERIFIED' ? new Date() : null,
          verificationNote: reason ?? null,
        })
        .where(eq(customerProfiles.id, verification.customerProfileId));
    });
    await this.audit.record({
      actorId: adminId,
      actorRole: 'VERIFICATION',
      action: `DRIVER_VERIFICATION.${decision}`,
      entityType: 'DRIVER_VERIFICATION',
      entityId: id,
      newValue: { status: decision },
      reason,
    });
    return { id, status: decision };
  }

  /** Gate used by booking creation: driver must be verified & unexpired. */
  async assertCanDrive(userId: string): Promise<void> {
    const profile = await this.requireProfile(userId);
    const verification = (
      await this.db
        .select()
        .from(driverVerifications)
        .where(eq(driverVerifications.customerProfileId, profile.id))
        .limit(1)
    )[0];
    if (!verification) throw forbidden('Complete driver verification before booking.');
    if (verification.status === VerificationStatus.REJECTED)
      throw forbidden('Your driver verification was rejected. Contact support.');
    if (verification.status !== VerificationStatus.VERIFIED)
      throw new AppError(422, 'VERIFICATION_PENDING', 'Your driving details are still being verified.');
    if (verification.effectiveExpiryAt && verification.effectiveExpiryAt < new Date()) {
      await this.db
        .update(driverVerifications)
        .set({ status: VerificationStatus.EXPIRED })
        .where(eq(driverVerifications.id, verification.id));
      throw forbidden('Your driving licence on file has expired. Please renew your verification.');
    }
  }
}
