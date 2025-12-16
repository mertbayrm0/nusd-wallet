---
description: NUSD Crypto Sistemi - Kritik Bileşenler ve Kurallar
---

# 🔒 NUSD CRYPTO SİSTEMİ - KRİTİK DÖKÜMAN

Bu döküman crypto sisteminin bozulmaması için dikkat edilmesi gereken noktaları içerir.
**HER GÜNCELLEME ÖNCESİ BU DÖKÜMANI OKUYUN!**

---

## ⚠️ KRİTİK EDGE FUNCTIONS

Aşağıdaki Edge Functions değiştirildiğinde **MUTLAKA yeniden deploy** edilmelidir:

```bash
# Deploy komutu
supabase functions deploy <function-name> --no-verify-jwt
```

### 1. `internal-transfer` (Platform İçi Transfer)
- **Dosya:** `supabase/functions/internal-transfer/index.ts`
- **Görevi:** NUSD-XXXXX kodları arasında anında transfer
- **KRİTİK:** Transaction INSERT yapar - `transactions` tablosu yapısı değişirse bozulur!
- **Bağımlılıklar:**
  - `profiles.balance` sütunu
  - `profiles.nusd_code` sütunu
  - `transactions` tablosu (user_id, type, amount, status, network, description)

### 2. `withdraw-request` (Crypto Çekim)
- **Dosya:** `supabase/functions/withdraw-request/index.ts`
- **Görevi:** Çekim talebi oluşturur, bakiye düşer, PENDING transaction yaratır
- **KRİTİK:** Bakiye güncellemesi + Transaction INSERT atomik olmalı
- **Bağımlılıklar:**
  - `profiles.balance` sütunu
  - `transactions` tablosu

### 3. `cancel-withdrawal` (Çekim İptali)
- **Dosya:** `supabase/functions/cancel-withdrawal/index.ts`
- **Görevi:** PENDING çekim talebini iptal eder, bakiye geri yüklenir
- **KRİTİK:** Sadece kendi PENDING işlemini iptal edebilmeli

### 4. `deposit-request` (Crypto Yatırım)
- **Dosya:** `supabase/functions/deposit-request/index.ts`
- **Görevi:** Yatırım bildirimi alır, PENDING transaction yaratır
- **KRİTİK:** Bakiye güncellemesi YAPMAZ - admin onayı ile güncellenir

### 5. `p2p-action` (P2P İşlemleri)
- **Dosya:** `supabase/functions/p2p-action/index.ts`
- **Görevi:** P2P order oluşturma, eşleştirme, onaylama
- **KRİTİK:** Seller balance check var - negatif bakiye önlemek için

---

## 📊 KRİTİK TABLOLAR

### `transactions`
```sql
-- Gerekli sütunlar (SİLMEYİN!)
id         UUID PRIMARY KEY
user_id    UUID REFERENCES profiles(id)
type       TEXT  -- DEPOSIT, WITHDRAW, TRANSFER
amount     NUMERIC
status     TEXT  -- PENDING, COMPLETED, CANCELLED
network    TEXT
description TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
```

### `profiles`
```sql
-- Gerekli sütunlar (SİLMEYİN!)
id           UUID PRIMARY KEY
email        TEXT
balance      NUMERIC DEFAULT 0
nusd_code    TEXT  -- NUSD-XXXXXX (auto-generated from email)
account_type TEXT  -- personal, business
```

### `departments`
```sql
-- Gerekli sütunlar
id        UUID PRIMARY KEY
name      TEXT
owner_id  UUID REFERENCES profiles(id)  -- İşletme sahibi
```

---

## 🚨 DEĞİŞİKLİK KURALLARI

### ❌ YAPMAYIN:
1. `transactions` tablosundaki sütunları silmeyin/yeniden adlandırmayın
2. `profiles.balance` sütununu silmeyin
3. `profiles.nusd_code` sütununu silmeyin
4. Edge Functions deploy etmeyi unutmayın
5. RLS politikalarını kaldırmayın

### ✅ YAPIN:
1. Her Edge Function değişikliğinden sonra deploy edin
2. Yeni sütun eklerken nullable yapın veya DEFAULT verin
3. Transaction INSERT'lerde tüm required alanları doldurun
4. Balance güncellemelerini atomik yapın
5. Hata durumunda rollback yapın

---

## 🧪 TEST KONTROL LİSTESİ

Değişiklik yaptıktan sonra şunları test edin:

// turbo-all
1. **Internal Transfer Test:**
   ```bash
   # Uygulamada NUSD-XXXXX adresine transfer yapın
   # History'de görünmeli
   ```

2. **Crypto Withdraw Test:**
   ```bash
   # Uygulamada Crypto Withdraw yapın
   # Balance düşmeli, History'de PENDING görünmeli
   ```

3. **Transaction History Test:**
   ```sql
   SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
   -- Boş olmamalı!
   ```

4. **Edge Function Logs:**
   ```
   Supabase Dashboard → Edge Functions → Logs
   -- Hata olmamalı
   ```

---

## 🔄 RECOVERY (BOZULDUYSA)

### Transaction'lar görünmüyorsa:
1. Edge Functions'ları yeniden deploy edin
2. `transactions` tablo yapısını kontrol edin
3. RLS politikalarını kontrol edin

### Bakiye yanlışsa:
```sql
-- Kullanıcı bakiyesini düzelt
UPDATE profiles SET balance = <doğru_miktar> WHERE email = '<email>';
```

### NUSD kodu çalışmıyorsa:
```sql
-- NUSD kodunu güncelle
UPDATE profiles SET nusd_code = 'NUSD-XXXXXX' WHERE email = '<email>';
```

---

## 📁 İLGİLİ DOSYALAR

- `src/screens/CryptoWithdraw.tsx` - Çekim UI
- `src/screens/CryptoDeposit.tsx` - Yatırım UI
- `src/screens/History.tsx` - İşlem geçmişi
- `src/screens/AdminDepartmentDetail.tsx` - Departman detayları
- `src/services/api.ts` - API çağrıları
