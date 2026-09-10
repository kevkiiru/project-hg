import type { AnalyticsPort, GeoPort, GeoPlace, KycPort, KycResult, KycSubmission } from './ports';

// Nairobi landmark geometry for offline geocoding/distance.
const NAIROBI_PLACES: Record<string, GeoPlace> = {
  nairobi: { lat: -1.2864, lng: 36.8172, label: 'Nairobi' },
  cbd: { lat: -1.2833, lng: 36.8167, label: 'Nairobi CBD' },
  jkia: { lat: -1.3192, lng: 36.9278, label: 'JKIA' },
  'wilson airport': { lat: -1.3217, lng: 36.8143, label: 'Wilson Airport' },
  westlands: { lat: -1.2683, lng: 36.8110, label: 'Westlands' },
  kilimani: { lat: -1.2881, lng: 36.7830, label: 'Kilimani' },
  karen: { lat: -1.3330, lng: 36.7100, label: 'Karen' },
  lavington: { lat: -1.2894, lng: 36.7645, label: 'Lavington' },
};

export class MockGeoAdapter implements GeoPort {
  async geocode(query: string): Promise<GeoPlace | null> {
    const key = query.trim().toLowerCase();
    if (NAIROBI_PLACES[key]) return NAIROBI_PLACES[key]!;
    for (const k of Object.keys(NAIROBI_PLACES)) {
      if (key.includes(k)) return NAIROBI_PLACES[k]!;
    }
    return null;
  }
  distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
}

// Manual-only KYC: no government APIs are assumed (spec §13). Everything
// routes to a human reviewer; a provider can slot in behind this port.
export class ManualKycAdapter implements KycPort {
  async submit(_submission: KycSubmission): Promise<KycResult> {
    return { status: 'MANUAL_REVIEW', providerReference: 'manual-queue' };
  }
}

export class NoopAnalytics implements AnalyticsPort {
  async track() {}
}
