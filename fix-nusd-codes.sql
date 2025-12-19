-- NUSD Kod Düzeltme - Frontend JavaScript Algoritması ile Senkronize
-- Frontend: ((acc << 5) - acc) + char.charCodeAt(0), sonra base36

-- 1. JavaScript hash algoritmasını PostgreSQL'de simüle et
CREATE OR REPLACE FUNCTION generate_nusd_code_js(email TEXT) 
RETURNS TEXT AS $$
DECLARE
    hash BIGINT := 0;
    i INT;
    char_code INT;
    base36_chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    num BIGINT;
BEGIN
    IF email IS NULL OR email = '' THEN
        RETURN 'NUSD-XXXX';
    END IF;
    
    -- JavaScript hash: ((acc << 5) - acc) + charCode
    -- Bu: acc * 31 + charCode ile eşdeğer
    FOR i IN 1..LENGTH(email) LOOP
        char_code := ASCII(SUBSTRING(email FROM i FOR 1));
        hash := (hash * 31) + char_code;
        -- JavaScript 32-bit integer simülasyonu
        hash := hash % 2147483647;
    END LOOP;
    
    -- ABS
    hash := ABS(hash);
    num := hash;
    
    -- Base36 dönüşümü
    WHILE num > 0 LOOP
        result := SUBSTRING(base36_chars FROM (num % 36)::INT + 1 FOR 1) || result;
        num := num / 36;
    END LOOP;
    
    IF result = '' THEN
        result := '0';
    END IF;
    
    -- İlk 6 karakteri al
    RETURN 'NUSD-' || UPPER(SUBSTRING(result FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- 2. Tüm kullanıcıları güncelle
UPDATE profiles SET nusd_code = generate_nusd_code_js(email);

-- 3. Kontrol et
SELECT email, nusd_code, generate_nusd_code_js(email) as expected FROM profiles ORDER BY email;

-- 4. Trigger'ı güncelle
CREATE OR REPLACE FUNCTION set_nusd_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nusd_code IS NULL AND NEW.email IS NOT NULL THEN
        NEW.nusd_code := generate_nusd_code_js(NEW.email);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_nusd_code ON profiles;
CREATE TRIGGER trigger_set_nusd_code
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_nusd_code();
