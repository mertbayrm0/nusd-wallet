-- İşletme Alt Hesapları - Veritabanı Değişiklikleri
-- Supabase SQL Editor'da çalıştırın

-- 1. profiles tablosuna yeni alanlar ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_business_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_role TEXT DEFAULT 'owner';

-- parent_business_id için index
CREATE INDEX IF NOT EXISTS idx_profiles_parent_business ON profiles(parent_business_id);

-- 2. business_invites tablosu oluştur
CREATE TABLE IF NOT EXISTS business_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, cancelled
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES profiles(id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_business_invites_business ON business_invites(business_id);
CREATE INDEX IF NOT EXISTS idx_business_invites_email ON business_invites(email);
CREATE INDEX IF NOT EXISTS idx_business_invites_code ON business_invites(invite_code);

-- 3. RLS Policies
ALTER TABLE business_invites ENABLE ROW LEVEL SECURITY;

-- İşletme sahibi tüm davetlerini görebilir
CREATE POLICY "Business owner can view invites" ON business_invites
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND account_type = 'business'
        )
    );

-- İşletme sahibi davet oluşturabilir
CREATE POLICY "Business owner can create invites" ON business_invites
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND account_type = 'business'
        )
    );

-- İşletme sahibi daveti iptal edebilir
CREATE POLICY "Business owner can cancel invites" ON business_invites
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND account_type = 'business'
        )
    );

-- Davet edilen kişi kendi davetini görebilir (email ile)
CREATE POLICY "Invited user can view own invite" ON business_invites
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- 4. Mevcut işletme hesaplarının rolünü 'owner' yap
UPDATE profiles SET business_role = 'owner' WHERE account_type = 'business' AND business_role IS NULL;

-- 5. Kontrol
SELECT 'business_invites tablosu oluşturuldu' as status;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('parent_business_id', 'business_role');
