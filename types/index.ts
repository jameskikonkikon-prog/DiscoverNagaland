export const CITIES = [
  'Kohima',
  'Dimapur',
  'Mokokchung',
  'Wokha',
  'Tuensang',
  'Mon',
  'Phek',
  'Zunheboto',
] as const;

export const CATEGORIES = [
  'restaurant',
  'cafe',
  'pg',
  'hostel',
  'rental_house',
  'gym',
  'turf',
  'study_space',
  'salon',
  'hotel',
  'coaching',
  'homestay',
  'vehicle_rental',
  'couple_spot',
  'school',
  'hospital',
  'clinic',
  'shop',
  'pharmacy',
  'service',
  'rental',
  'other',
] as const;

/** @deprecated No longer used by the UI. Kept only to avoid breaking existing API routes until they are updated. */
export const FOUNDING_MEMBER_LIMIT = 100;

// ── Plan definitions — single source of truth ────────────────────────────────
// All plan names, prices, photo limits, and feature lists live here.
// Every part of the app that references plans pulls from this config.

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceInPaise: 0,
    maxPhotos: 5,
    features: [
      'Listed on Yana',
      'WhatsApp & Call buttons',
      '5 photos',
      'Opening hours',
    ],
  },
  pro: {
    name: 'Pro',
    price: 499,
    priceInPaise: 49900,
    maxPhotos: Infinity,
    features: [
      'Everything in Free',
      'Yana Verified badge',
      'Featured on homepage',
      'Priority in search rankings',
    ],
  },
};

export type PlanType = 'free' | 'pro';

/**
 * Maps legacy DB plan values to current plan keys.
 * Use this wherever the DB plan value is read, until the migration has run.
 *
 * Migration rules:
 *   old 'plus'  → new 'pro'   (keeps all Pro entitlements)
 *   old 'basic' → new 'free'
 *   old 'pro'   → new 'free'  (old Pro plan no longer exists)
 */
export function normalizePlan(plan: string | null | undefined): PlanType {
  if (plan === 'plus') return 'pro';
  if (plan === 'pro') return 'free';   // legacy — old Pro maps to Free after migration
  if (plan === 'basic') return 'free';
  if (plan === 'free' || plan === 'pro') return plan as PlanType;
  return 'free';
}

export type City = typeof CITIES[number];
export type Category = typeof CATEGORIES[number];

export interface Business {
  id: string;
  name: string;
  slug: string;
  category: Category;
  city: City;
  address: string;
  landmark?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  description?: string;
  opening_hours?: string;
  photos?: string[];
  videos?: string[];
  plan: string;
  plan_expires_at?: string;
  trial_ends_at?: string;
  is_verified: boolean;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, unknown>;
  tags?: string;
  amenities?: string;
  menu_url?: string;
  price_min?: number;
  price_max?: number;
  price_range?: string;
  gender?: string;
  vacancy?: boolean;
  wifi?: boolean;
  ac?: boolean;
  meals?: boolean;
  room_type?: string;
  cuisine?: string;
  vibe_tags?: string;
}

export interface BusinessAnalytics {
  id: string;
  business_id: string;
  date: string;
  profile_views: number;
  search_appearances: number;
  whatsapp_clicks: number;
  call_clicks: number;
  maps_clicks: number;
}

export interface Payment {
  id: string;
  business_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  amount: number;
  plan: string;
  status: 'created' | 'paid' | 'failed';
  created_at: string;
}
