-- Customer saved items: one row per saved business or property
CREATE TABLE IF NOT EXISTS public.saved_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id)  ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id)  ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT saved_items_one_type CHECK (
    (business_id IS NOT NULL)::int + (property_id IS NOT NULL)::int = 1
  )
);

-- One save per user per business
CREATE UNIQUE INDEX IF NOT EXISTS saved_items_user_business
  ON public.saved_items(user_id, business_id) WHERE business_id IS NOT NULL;

-- One save per user per property
CREATE UNIQUE INDEX IF NOT EXISTS saved_items_user_property
  ON public.saved_items(user_id, property_id) WHERE property_id IS NOT NULL;

-- Fast fetch of all saves for a user
CREATE INDEX IF NOT EXISTS saved_items_user_id_idx
  ON public.saved_items(user_id);

-- RLS: each user sees and manages only their own rows
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_items: select own"
  ON public.saved_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_items: insert own"
  ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_items: delete own"
  ON public.saved_items FOR DELETE USING (auth.uid() = user_id);
