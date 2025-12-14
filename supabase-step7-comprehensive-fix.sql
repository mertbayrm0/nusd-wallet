-- =============================================
-- STEP 7: COMPREHENSIVE FIX (COLOR & CLEANUP)
-- =============================================

-- Bu script, departman oluşturma hatasını kesin olarak çözmek için tasarlanmıştır.

-- 1. "color" kolonunu ekle (Eğer yoksa)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';

-- 2. Eski "commission_mode" ve "commission_value" kolonlarını TEMİZLE
-- Çünkü artık bu verileri departman tablosunda tutmuyoruz.
-- Eğer bu kolonlar varsa, "NOT NULL" hatası vermemeleri için siliyoruz veya nullable yapıyoruz.
-- En temiz yöntem: Bu kolonları düşürmek (sütun yok hatası alıyorsanız bu komutlar hata verebilir, o yüzden DO block içine alıyoruz veya basitçe ALTER yapıyoruz)

DO $$
BEGIN
    -- commission_mode varsa drop not null yap veya sil
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'commission_mode') THEN
        ALTER TABLE departments ALTER COLUMN commission_mode DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'commission_value') THEN
        ALTER TABLE departments ALTER COLUMN commission_value DROP NOT NULL;
        ALTER TABLE departments ALTER COLUMN commission_value SET DEFAULT 0;
    END IF;
END $$;

-- 3. RLS Kontrolü (Garanti)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert departments" ON departments;
CREATE POLICY "Admins can insert departments"
ON departments
FOR INSERT
TO authenticated
WITH CHECK (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
