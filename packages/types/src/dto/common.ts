import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: { path: string; message: string }[];
  status: number;
}
export interface ApiEnvelope<T> { data: T }
export interface ApiErrorEnvelope { error: ApiError; correlationId?: string }

export const isoDatetime = z.string().datetime({ offset: true });
export const e164Phone = z
  .string()
  .regex(/^\+254[17]\d{8}$/, 'Enter a Kenyan phone number like +2547XXXXXXXX');
