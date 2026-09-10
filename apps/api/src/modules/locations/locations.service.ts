import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module';
import { locations } from '../../db/schema/hosts';

@Injectable()
export class LocationsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  suggested() {
    return this.db
      .select()
      .from(locations)
      .where(eq(locations.suggested, true))
      .orderBy(asc(locations.sortOrder));
  }

  all() {
    return this.db.select().from(locations).orderBy(asc(locations.sortOrder));
  }

  bySlug(slug: string) {
    return this.db.select().from(locations).where(eq(locations.slug, slug.toLowerCase())).limit(1);
  }
}
