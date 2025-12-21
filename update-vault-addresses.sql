-- NUSD Wallet Vault Adresleri Güncelleme
-- Bu script mevcut vault adreslerini yeni güvenli adreslerle değiştirir

-- Önce mevcut vault'ları görelim
SELECT id, name, wallet_address, network FROM crypto_vaults;

-- Main Vault güncelle
UPDATE crypto_vaults 
SET wallet_address = 'TFebbVDHovpwqRhCzXZsN9VcKiPqQ5zCgg'
WHERE name ILIKE '%main%' OR id = (SELECT id FROM crypto_vaults ORDER BY created_at LIMIT 1);

-- Reserve Vault güncelle
UPDATE crypto_vaults 
SET wallet_address = 'TTdPusANCpsQ7m3zamqF542N2draowFwLB'
WHERE name ILIKE '%reserve%' OR id = (SELECT id FROM crypto_vaults ORDER BY created_at LIMIT 1 OFFSET 1);

-- Eğer 3. vault varsa veya eklemek isterseniz:
-- INSERT INTO crypto_vaults (name, wallet_address, network, is_active)
-- VALUES ('Backup Vault', 'TAeaxxAUqqpdKJmvg9JPHajTNQLRfwdJ3F', 'TRC20', true);

-- Güncellenmiş vault'ları göster
SELECT id, name, wallet_address, network, is_active FROM crypto_vaults;
