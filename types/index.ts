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
  'rental',
  'coaching',
  'school',
  'hospital',
  'clinic',
  'turf',
  'salon',
  'shop',
  'hotel',
  'pharmacy',
  'service',
  'other',
] as const;

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceInPaise: 0,
    features: ['Basic listing'],
  },
  basic: {
    name: 'Basic',
    price: 299,
    priceInPaise: 29900,
    features: ['Full profile', 'Photos', 'WhatsApp button', 'AI search'],
  },
  pro: {
    name: 'Pro',
    price: 499,
    priceInPaise: 49900,
    features: ['Everything in Basic', 'Verified badge', 'Priority ranking', 'Analytics dashboard'],
  },
};

export type City = typeof CITIES[number];
export type Category = typeof CATEGORIES[number];
export type PlanType = 'free' | 'basic' | 'pro';

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
  plan: PlanType;
  plan_expires_at?: string;
  is_verified: boolean;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
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
  amount: number;
  plan: PlanType;
  status: 'created' | 'paid' | 'failed';
  created_at: string;
}
