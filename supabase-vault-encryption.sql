-- Vault Private Key Encryption
-- pgcrypto extension ile AES-256 şifreleme
-- Run in Supabase SQL Editor

-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add encrypted_private_key column
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;

-- 3. Create encryption functions
-- IMPORTANT: Replace 'YOUR_MASTER_KEY_HERE' with a secure key stored in environment

-- Encrypt function
CREATE OR REPLACE FUNCTION encrypt_private_key(p_private_key TEXT, p_master_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(p_private_key, p_master_key, 'cipher-algo=aes256'),
        'base64'
    );
END;
$$;

-- Decrypt function
CREATE OR REPLACE FUNCTION decrypt_private_key(p_encrypted TEXT, p_master_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(p_encrypted, 'base64'),
        p_master_key
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL; -- Decryption failed
END;
$$;

-- 4. Migrate existing plaintext keys (one-time operation)
-- WARNING: Run this manually after setting VAULT_MASTER_KEY
/*
UPDATE vaults 
SET encrypted_private_key = encrypt_private_key(private_key, 'YOUR_MASTER_KEY')
WHERE private_key IS NOT NULL AND encrypted_private_key IS NULL;

-- After verifying encryption works, clear plaintext:
UPDATE vaults SET private_key = NULL WHERE encrypted_private_key IS NOT NULL;
*/

-- 5. Grant execute to service_role only
REVOKE ALL ON FUNCTION decrypt_private_key FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrypt_private_key TO service_role;
