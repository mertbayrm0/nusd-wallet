-- NUSD Kod Düzeltme Script v2
-- Frontend ile aynı algoritma kullanılıyor

-- 1. Function'ı frontend algoritmasına göre güncelle (JS hash fonksiyonu simülasyonu)
CREATE OR REPLACE FUNCTION generate_nusd_code_js(email TEXT) 
RETURNS TEXT AS $$
DECLARE
    hash BIGINT := 0;
    i INT;
    char_code INT;
BEGIN
    IF email IS NULL THEN
        RETURN 'NUSD-XXXX';
    END IF;
    
    -- JavaScript'teki ((acc << 5) - acc) + char.charCodeAt(0) simülasyonu
    FOR i IN 1..LENGTH(email) LOOP
        char_code := ASCII(SUBSTRING(email FROM i FOR 1));
        hash := ((hash * 32) - hash) + char_code;
        -- Taşmayı önle
        hash := hash % 2147483647;
    END LOOP;
    
    -- ABS ve base36 dönüşümü
    hash := ABS(hash);
    
    -- Base36 encode (ilk 6 karakter)
    RETURN 'NUSD-' || UPPER(SUBSTRING(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            to_hex(hash::INT),
            'a', 'A'), 'b', 'B'), 'c', 'C'), 'd', 'D'), 'e', 'E'), 'f', 'F'),
            '0', 'G'), '1', 'H'), '2', 'I'), '3', 'J')
    FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- 2. Alternatif: MD5 tabanlı basit ve tutarlı kod üret
CREATE OR REPLACE FUNCTION generate_nusd_code(email TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF email IS NULL THEN
        RETURN 'NUSD-XXXX';
    END IF;
    -- MD5 hash'in ilk 6 karakteri (uppercase)
    RETURN 'NUSD-' || UPPER(SUBSTRING(MD5(email) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- 3. Tüm mevcut hesapları güncelle (NUSD-000000 olanları)
UPDATE profiles 
SET nusd_code = generate_nusd_code(email) 
WHERE nusd_code = 'NUSD-000000' OR nusd_code IS NULL;

-- 4. Trigger'ı güncelle (yeni kayıtlar için)
CREATE OR REPLACE FUNCTION set_nusd_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nusd_code IS NULL AND NEW.email IS NOT NULL THEN
        NEW.nusd_code := generate_nusd_code(NEW.email);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_nusd_code ON profiles;
CREATE TRIGGER trigger_set_nusd_code
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_nusd_code();

-- 5. Kontrol et
SELECT email, nusd_code FROM profiles ORDER BY email;
