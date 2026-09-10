import { z } from 'zod';
import { FuelType, SearchSort, Transmission, VehicleCategory } from '../enums';
import { isoDatetime, paginationQuery } from './common';

export const searchVehiclesQuery = paginationQuery.extend({
  location: z.string().trim().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0).max(200).default(40),
  pickupAt: isoDatetime,
  returnAt: isoDatetime,
  returnLocation: z.string().trim().optional(),
  minPriceCents: z.coerce.number().int().nonnegative().optional(),
  maxPriceCents: z.coerce.number().int().nonnegative().optional(),
  category: z.nativeEnum(VehicleCategory).optional(),
  make: z.string().optional(),
  transmission: z.nativeEnum(Transmission).optional(),
  seats: z.coerce.number().int().min(2).optional(),
  fuel: z.nativeEnum(FuelType).optional(),
  instantBook: z.coerce.boolean().optional(),
  delivery: z.coerce.boolean().optional(),
  selfDrive: z.coerce.boolean().optional(),
  chauffeur: z.coerce.boolean().optional(),
  fourWheelDrive: z.coerce.boolean().optional(),
  ac: z.coerce.boolean().optional(),
  features: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  sort: z.nativeEnum(SearchSort).default(SearchSort.RECOMMENDED),
  facets: z.coerce.boolean().default(false),
});
export type SearchVehiclesQuery = z.infer<typeof searchVehiclesQuery>;
