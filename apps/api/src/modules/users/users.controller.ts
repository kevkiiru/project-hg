import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ZodBody, CurrentUser } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { UsersService } from './users.service';

const profileSchema = z.object({
  legalFirstName: z.string().trim().min(1).max(100).optional(),
  legalLastName: z.string().trim().min(1).max(100).optional(),
  dob: z.string().datetime({ offset: true }).optional(),
  nationality: z.string().trim().length(2).optional(),
  countryOfResidence: z.string().trim().length(2).optional(),
  photoObjectKey: z.string().optional(),
});

const userSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  avatarObjectKey: z.string().optional(),
});

const consentSchema = z.object({
  purpose: z.string().min(3).max(80),
  granted: z.boolean(),
  version: z.string().default('v1'),
});

const addressSchema = z.object({
  label: z.string().optional(),
  county: z.string().optional(),
  city: z.string().optional(),
  neighbourhood: z.string().optional(),
  street: z.string().optional(),
  landmark: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

@Controller('api/v1/account')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.getAccount(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @ZodBody(userSchema) body: any) {
    return this.users.updateUser(user.id, body);
  }

  @Patch('customer-profile')
  updateProfile(@CurrentUser() user: AuthUser, @ZodBody(profileSchema) body: any) {
    return this.users.updateCustomerProfile(user.id, body);
  }

  @Post('consent')
  consent(@CurrentUser() user: AuthUser, @ZodBody(consentSchema) body: any, @Req() req: any) {
    return this.users.recordConsent(user.id, body.purpose, body.granted, body.version, req.ip);
  }

  @Post('address')
  addAddress(@CurrentUser() user: AuthUser, @ZodBody(addressSchema) body: any) {
    return this.users.addAddress(user.id, body);
  }

  @Post('delete-request')
  deleteRequest(
    @CurrentUser() user: AuthUser,
    @ZodBody(z.object({ reason: z.string().min(5).max(500) })) body: any,
  ) {
    return this.users.requestDeletion(user.id, body.reason);
  }
}
