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

## 7. Legacy Backend (CRITICAL)
- [ ] **No Server.js:** Confirm `server.js` is not present in the build or repository.
- [ ] **No Localhost Calls:** Frontend code (`src/`) must not contain `localhost:3000` or `localhost:3001` calls.
- [ ] **Dependencies:** Confirm `express`, `prisma`, `cors` are removed from `package.json`.

## 8. Financial Safety & Vaults
- [ ] **Active Vault:** Ensure EVERY Active Department has at least 1 Active/Primary TRX Vault.
- [ ] **Fail-Safe:** Verify that a Payment Panel transaction FAILS if no Primary Vault is assigned (do not accept money without destination).
- [ ] **Reserve Vaults:** Confirm manual Reserve Vaults are NOT flagged as `is_primary` to avoid accidental public deposits.

## 9. Commission Logic
- [ ] **Priority Check:** Verify Commission hierarchy:
    1.  Panel Commission (if > 0)
    2.  Department Default (if Panel is 0/null)
    3.  Final Fallback: 0%

## 10. Security & Edge Functions
- [ ] **Auth Check:** Try calling `create-department` or `manage-vault` as a non-admin user (should fail 403).
- [ ] **Service Role:** Confirm balance updates/sensitive writes happen ONLY in Edge Functions (Service Role), never RLS-bypass in client.
- [ ] **Public Abuse:**
    - [ ] Panels marked `is_active: false` should return 404 or "Maintenance" on `/pay/:slug`.
    - [ ] (Future) Implement rate-limiting for Public Portal if spam becomes an issue.

## 11. Observability
- [ ] **Audit Logs:** Confirm critical actions (Create Dept, Assign Vault, Withdraw Request) appear in `transaction_audit_logs`.
- [ ] **Edge Logs:** Check Supabase Dashboard -> Edge Functions -> Logs for any silent failures.

## 12. Transaction Integrity & Data Validity
- [ ] **Data Sanitization:** Edge Functions must verify `amount > 0` and valid `currency` enum before insert.
- [ ] **Deduping:** Ensure `tx_hash` is unique in the `transactions` table to prevent double-spending/double-crediting.
- [ ] **Validation:** Reject any transaction with missing metadata (e.g., `panel_id` or `network`).

## 13. Admin UX & Operational Safety
- [ ] **Confirm Modal:** "Approve" action MUST have a confirmation dialog to prevent accidental clicks.
- [ ] **Reject Reason:** "Reject" action should ideally log a reason in metadata or audit logs.
- [ ] **Idempotency:** Ensure a `completed` transaction cannot be Approved again (UI hidden or Backend check).

## 14. Emergency Kill Switch (Advanced)
- [ ] **Global Flag:** (Optional but recommended) A feature flag in the DB (e.g., `system_settings` table) to disable all Payment Panels instantly.
- [ ] **Edge Check:** `create-transaction-from-panel` should check this flag before processing.
