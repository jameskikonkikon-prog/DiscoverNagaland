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

export const FOUNDING_MEMBER_LIMIT = 100;

export const PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    priceInPaise: 0,
    maxPhotos: 2,
    maxVideos: 0,
    features: [
      'Full listing with all details',
      '2 photos, no videos',
      'WhatsApp & Call buttons',
      'Normal search position',
    ],
  },
  pro: {
    name: 'Pro',
    price: 299,
    priceInPaise: 29900,
    maxPhotos: 10,
    maxVideos: 3,
    features: [
      'Everything in Basic',
      '10 photos, 3 videos',
      'AI-written description',
      'AI menu/price list reader',
      'View count & WhatsApp click analytics',
      'Listing health score',
      'Higher search ranking',
    ],
  },
  plus: {
    name: 'Plus',
    price: 499,
    priceInPaise: 49900,
    maxPhotos: Infinity,
    maxVideos: Infinity,
    features: [
      'Everything in Pro',
      'Unlimited photos & videos',
      'Verified Owner badge',
      'Always appears first in search',
      'Featured on homepage weekly',
      'Vacancy alerts to saved users',
      'Festival promotion banners',
      'QR code for your listing',
      'Monthly performance report',
    ],
  },
};

export type City = typeof CITIES[number];
export type Category = typeof CATEGORIES[number];
export type PlanType = 'basic' | 'pro' | 'plus';

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
  plan: PlanType;
  plan_expires_at?: string;
  trial_ends_at?: string;
  is_verified: boolean;
  is_active: boolean;
  is_founding_member?: boolean;
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
  plan: PlanType;
  status: 'created' | 'paid' | 'failed';
  created_at: string;
}
