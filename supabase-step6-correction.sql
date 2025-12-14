-- =============================================
-- STEP 6 (FIXED): ADD COLOR ONLY
-- =============================================

-- HATA DÜZELTME: "commission_mode column does not exist" hatası aldığınız için
-- bu komut sadece 'color' kolonunu ekler. Diğer kolonlarla oynamaz.

ALTER TABLE departments ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';

-- Eğer commission kolonları Varsa bile artık kullanılmayacak.
-- Yoksa zaten sorun yok.
