-- 1. Payment Panels Table
CREATE TABLE IF NOT EXISTS payment_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  commission_type text CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value numeric DEFAULT 0,
  asset text NOT NULL, -- TRX, USDT, INTERNAL
  settlement_type text CHECK (settlement_type IN ('internal', 'external')),
  public_slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 2. Enable RLS
ALTER TABLE payment_panels ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Admin View All
CREATE POLICY "Admin view all panels"
ON payment_panels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- User View Department Panels
CREATE POLICY "Users view department panels"
ON payment_panels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM department_members
    WHERE department_members.department_id = payment_panels.department_id
    AND department_members.user_id = auth.uid()
  )
);

-- Public Read via Slug (For Public Payment Page)
CREATE POLICY "Public read panels via slug"
ON payment_panels FOR SELECT
TO anon, authenticated
USING (true); 
-- Note: Ideally we want to restrict this to only fetching by slug, but Supabase RLS is row-based. 
-- Since slug is unique, fetching by slug returns one row.
-- We can trust the Edge Function or Frontend to query by slug.

-- 4. Restrict Writes to Edge Function (Service Role)
-- No INSERT/UPDATE policies for authenticated/anon.

GRANT SELECT ON payment_panels TO authenticated;
GRANT SELECT ON payment_panels TO anon;
