import {
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const pk = () => uuid('id').primaryKey().defaultRandom();
export const fk = (name = 'id') => uuid(name);
export const now = (name: string) => timestamp(name, { withTimezone: true });

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const cents = (name: string) => integer(name);
export const jsonbDefault = (name: string, value: unknown = '{}') =>
  jsonb(name).notNull().default(value as any);
export const boolDefault = (name: string, value: boolean) =>
  boolean(name).notNull().default(value);
export const textDefault = (name: string, value: string) =>
  text(name).notNull().default(value);
export const intDefault = (name: string, value: number) =>
  integer(name).notNull().default(value);

export const uq = uniqueIndex;
