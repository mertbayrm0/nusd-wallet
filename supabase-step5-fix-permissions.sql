-- =============================================
-- STEP 5: FIX PERMISSIONS & COLUMNS
-- =============================================

-- Bu script, Vault atama işleminin başarısız olma ihtimaline karşı
-- yetkileri sıfırlar ve eksik kolonları tamamlar.

-- 1. EKSİK KOLON KONTROLÜ (Step 4 çalışmadıysa diye)
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 2. VAULT YETKİLERİNİ SIFIRLA
-- Mevcut policy'leri siliyoruz (Conflict olmasın diye)
DROP POLICY IF EXISTS "Admins can manage vaults" ON vaults;
DROP POLICY IF EXISTS "Authenticated users can view vaults" ON vaults;
DROP POLICY IF EXISTS "Service role manages vaults" ON vaults;

-- 3. ADMIN YETKİSİ (YENİDEN TANIMLAMA)
-- Adminlerin vault üzerinde SELECT, INSERT, UPDATE, DELETE yapabilmesi için:
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

-- 4. READ YETKİSİ (Authenticated Users)
-- Panelde ve listede görüntülemek için:
CREATE POLICY "Authenticated users can view vaults"
ON vaults FOR SELECT
TO authenticated
USING (true);
