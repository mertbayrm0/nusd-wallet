-- =============================================
-- STEP 4: VAULT LINKING & PERMISSIONS
-- =============================================

-- 1. Add Department linking to Vaults
-- We add department_id to link a vault to a department.
-- We add is_primary to designate the main deposit address for that department.

ALTER TABLE vaults ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 2. Update RLS for Vaults
-- Ensure Admins can manage these new fields.
-- We might need new policies if the previous ones were too restrictive (only SELECT).

-- Drop existing admin policy if it exists to replace it with full access
DROP POLICY IF EXISTS "Admins can manage vaults" ON vaults;

CREATE POLICY "Admins can manage vaults"
ON vaults
FOR ALL
USING (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 3. Safety Check: Only one primary vault per department
-- Ideally handled by application logic, but we can add a unique partial index if supported.
-- For now, we rely on the application logic (setPrimaryVault) to toggle others to false.

-- 4. Expose Vaults to Public (for Deposit Page)
-- Users need to read the vault address if they have the UUID (or via department relation).
-- However, we must be careful. The edge function `create-transaction-from-panel` creates the tx.
-- The Frontend needs to DISPLAY the address.
-- So we allow SELECT on vaults if the user is authenticated (or maybe public if strictly needed for read-only).
-- Given the portal might be used by logged-in users, AUTHENTICATED SELECT is safe.

CREATE POLICY "Authenticated users can view vaults"
ON vaults FOR SELECT
TO authenticated
USING (true);
