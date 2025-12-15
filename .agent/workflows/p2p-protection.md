---
description: P2P System Protection - DO NOT MODIFY WITHOUT EXPLICIT USER REQUEST
---

# ⚠️ PROTECTED SYSTEM: P2P Trading

This system is **WORKING** and should **NOT** be modified unless the user explicitly requests changes to P2P functionality.

## Protected Files

The following files are part of the working P2P system:

### Edge Function
- `supabase/functions/p2p-action/index.ts` - Unified P2P endpoint (create, markPaid, confirm, reject)

### Frontend Components
- `src/screens/Dashboard.tsx` - P2P popup for seller confirmation (lines 210-250 approximately)
- `src/screens/Deposit.tsx` - Buyer deposit and "Ödedim" flow
- `src/screens/Withdraw.tsx` - Seller withdrawal and order creation

### API
- `src/services/api.ts` - `p2pAction()` method (at the end of file)

### Database
- `p2p_orders` table - Main P2P orders table

## P2P Flow (WORKING)

```
1. SELLER → Çekim ver → status: OPEN
2. BUYER → Yatırım ver → Eşleşme → status: MATCHED
3. BUYER → "İşlemi Onayla" → IBAN görür
4. BUYER → "Ödedim" → status: PAID
5. SELLER → Popup "Onaylıyorum" → status: COMPLETED + Bakiye transfer
```

## Rules for AI

1. **DO NOT** modify any P2P files unless user says:
   - "P2P sistemini değiştir"
   - "P2P'de şunu güncelle"
   - Or explicitly mentions P2P changes

2. **DO NOT** refactor P2P code as part of other changes

3. **DO NOT** move P2P functions or rename them

4. If unsure, **ASK** the user before touching P2P code

## Last Working State

- Date: 2025-12-16
- Status: FULLY WORKING
- Tested: Create, Match, MarkPaid, Confirm, Reject all work
- Balance transfer: Working correctly
