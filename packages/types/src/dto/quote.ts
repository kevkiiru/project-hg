import { z } from 'zod';
import { PickupOption } from '../enums';
import { isoDatetime } from './common';

export const createQuote = z.object({
  vehicleId: z.string().uuid(),
  pickupAt: isoDatetime,
  returnAt: isoDatetime,
  timezone: z.string().default('Africa/Nairobi'),
  pickupOption: z.nativeEnum(PickupOption).default(PickupOption.AT_LOCATION),
  deliveryZoneId: z.string().uuid().optional(),
  extras: z
    .array(z.object({ code: z.string(), quantity: z.number().int().min(1).max(20) }))
    .default([]),
  promoCode: z.string().trim().max(40).optional(),
});
export type CreateQuote = z.infer<typeof createQuote>;

export const createBooking = z.object({
  quoteId: z.string().uuid(),
  mode: z.enum(['REQUEST', 'INSTANT']).optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});
export type CreateBooking = z.infer<typeof createBooking>;
