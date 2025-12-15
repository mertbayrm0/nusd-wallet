# Production Checklist - NUSD Wallet (Supabase Edition)

## 1. Environment & Configuration
- [ ] **Supabase URL & Key:** Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in Vercel/Production environment variables.
- [ ] **Service Role Key:** Ensure Edge Functions secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are set via `npx supabase secrets set`.
- [ ] **Authentication:** Confirm Email/Password provider is enabled in Supabase Auth settings.
- [ ] **Redirect URLs:** Add your production domain (e.g., `https://nusd-wallet.vercel.app/**`) to Supabase Auth -> URL Configuration.

## 2. Database & Storage
- [ ] **Migrations:** Run all SQL scripts in order if setting up a fresh DB:
    1.  `supabase-step1-departments.sql`
    2.  `supabase-step2-payment-panels.sql`
    3.  `supabase-step3-transactions-check.sql`
    4.  `supabase-step4-vault-linking.sql`
    5.  `supabase-step5-fix-permissions.sql`
    6.  `supabase-step6-correction.sql`
    7.  `supabase-step7-comprehensive-fix.sql`
    8.  `supabase-atomic-transfer.sql` (if not already applied)
- [ ] **RLS Policies:** Verify RLS is enabled on all tables (`transactions`, `profiles`, `vaults`, `departments`, `payment_panels`).
- [ ] **Realtime:** Enable Realtime for `transactions` if immediate UI updates are required (optional).

## 3. Edge Functions
- [ ] **Deploy:** Ensure all functions are deployed to the correct project:
    - `create-department`
    - `create-payment-panel`
    - `create-transaction-from-panel`
    - `manage-vault`
- [ ] **Secrets:** Verify secrets are present (`npx supabase secrets list`).

## 4. Frontend & CDN
- [ ] **Build:** `npm run build` must pass without errors.
- [ ] **Routing:** Ensure generic SPA fallback (index.html for 404s) is configured on the host (Vercel does this automatically).
- [ ] **CORS:** Check `create-department` and others have strictly configured CORS if strictly needed (currently `*` for ease of public portal access).

## 5. Domain & SSL
- [ ] **SSL:** Automatic on Vercel.
- [ ] **Custom Domain:** Map your domain via A/CNAME records if applicable.

## 6. Post-Launch Verification
- [ ] **Admin Login:** Log in as admin and verify dashboard access.
- [ ] **Create Department:** Create a test department (Color, Name).
- [ ] **Assign Vault:** Assign a vault to that department via "Vaults" tab.
- [ ] **Create Panel:** Create a payment panel.
- [ ] **Public Portal:** Visit `/pay/:slug` and verify the Deposit address matches the assigned Primary Vault.
