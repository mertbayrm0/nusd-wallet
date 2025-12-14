-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  commission_mode text CHECK (commission_mode IN ('percentage', 'fixed')),
  commission_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 2. Department Members Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Department Members
-- Admin can view all members
CREATE POLICY "Admin view all members"
ON department_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Users can view members of their own departments (optional, mostly for UI context)
CREATE POLICY "Users view own department members"
ON department_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- 5. RLS Policies for Departments
-- Admin can view all departments
CREATE POLICY "Admin view all departments"
ON departments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Users can view departments they belong to
CREATE POLICY "Users view assigned departments"
ON departments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM department_members
    WHERE department_members.department_id = departments.id
    AND department_members.user_id = auth.uid()
  )
);

-- 6. Restrict Writes (INSERT/UPDATE/DELETE) to Service Role Only (Edge Functions)
-- We do NOT create policies for INSERT/UPDATE for 'authenticated' role.
-- By default, if no policy exists for an operation, it is denied.
-- So Frontend cannot write directly.

-- Grant access to authenticated users to READ (based on policy)
GRANT SELECT ON departments TO authenticated;
GRANT SELECT ON department_members TO authenticated;
