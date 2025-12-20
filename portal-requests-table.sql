-- Portal Talep Sistemi Tablosu

CREATE TABLE IF NOT EXISTS portal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

-- RLS Politikaları
ALTER TABLE portal_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated kullanıcılar okuyabilir
CREATE POLICY "portal_requests_select" ON portal_requests FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated kullanıcılar ekleyebilir
CREATE POLICY "portal_requests_insert" ON portal_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Sadece adminler güncelleyebilir (approve/reject)
CREATE POLICY "portal_requests_update" ON portal_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
