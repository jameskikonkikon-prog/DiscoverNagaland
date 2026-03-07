-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE businesses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  landmark TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  description TEXT,
  opening_hours TEXT,
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'plus')),
  plan_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  grace_period_ends_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  owner_id UUID REFERENCES auth.users(id),
  custom_fields JSONB DEFAULT '{}',
  tags TEXT,
  amenities TEXT,
  menu_url TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  price_range TEXT,
  gender TEXT,
  vacancy BOOLEAN DEFAULT false,
  wifi BOOLEAN DEFAULT false,
  ac BOOLEAN DEFAULT false,
  meals BOOLEAN DEFAULT false,
  room_type TEXT,
  cuisine TEXT,
  vibe_tags TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search logs / cache table
CREATE TABLE search_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_hash TEXT UNIQUE NOT NULL,
  results JSONB NOT NULL,
  cached_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business analytics table
CREATE TABLE business_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  profile_views INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  call_clicks INTEGER DEFAULT 0,
  maps_clicks INTEGER DEFAULT 0,
  UNIQUE(business_id, date)
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_subscription_id TEXT,
  amount INTEGER NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read active businesses
CREATE POLICY "Public can view active businesses" ON businesses
  FOR SELECT USING (is_active = true);

-- Owners can update their own business
CREATE POLICY "Owners can update their business" ON businesses
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can insert their business
CREATE POLICY "Owners can insert business" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can view their analytics
CREATE POLICY "Owners can view their analytics" ON business_analytics
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Anyone can read reviews
CREATE POLICY "Public can view reviews" ON reviews
  FOR SELECT USING (true);

-- Anyone can insert reviews
CREATE POLICY "Anyone can write reviews" ON reviews
  FOR INSERT WITH CHECK (true);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access businesses" ON businesses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access analytics" ON business_analytics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access reviews" ON reviews
  FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket for business photos
INSERT INTO storage.buckets (id, name, public) VALUES ('business-photos', 'business-photos', true);

CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-photos');

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-photos' AND auth.role() = 'authenticated');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migration from old plan names (run once if upgrading existing database)
-- UPDATE businesses SET plan = 'basic' WHERE plan IN ('free', 'trial');
-- UPDATE businesses SET plan = 'pro' WHERE plan = 'basic' AND plan_expires_at IS NOT NULL;
-- UPDATE businesses SET plan = 'plus' WHERE plan = 'pro' AND plan_expires_at IS NOT NULL;
