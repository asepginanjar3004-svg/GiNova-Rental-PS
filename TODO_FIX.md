# GINOVA - Fix Plan & Implementation Tasks

## Task Overview
Fix synchronization issue (F&B orders not syncing) and action button issues (Bayar/Selesai & Bayar not working) in GiNova PlayStation Rental Management dashboard.

---

## Step 1: Database Schema Update ✅
- [x] Analyze existing `ginova_db.sql`
- [ ] Add `is_synced` column to `transaction_items` table
- [ ] Create updated SQL migration or ALTER statement

## Step 2: JavaScript Fixes - Sync Logic
- [x] Analyze `dashboard.js` sync functions
- [ ] Fix `syncPendingFnBOrders()` function  
- [ ] Fix "Sinkron Sekarang" button click handler
- [ ] Ensure alert hides on successful sync

## Step 3: JavaScript Fixes - Payment Buttons
- [x] Analyze `payment.js` and `dashboard.js` completePayment conflict
- [ ] Fix `completePayment()` function ownership
- [ ] Ensure buttons trigger payment modal correctly

## Step 4: Backend PHP Files
- [x] Analyze existing API files
- [ ] Create/Update `sync.php` for bulk F&B sync
- [ ] Create/Update `update_status.php` for payment processing

## Step 5: Code Examples (as requested by user)
- [ ] Provide database table structure with sync status
- [ ] Provide JavaScript AJAX/Fetch snippets
- [ ] Provide PHP backend files (sync.php, update_status.php)

## Step 6: PWA Considerations
- [ ] Ensure Service Worker handles offline scenarios
- [ ] Test sync when connection becomes available

---

## Implementation Notes

### Issues Identified:
1. **Sync Issue**: Missing `is_synced` column in `transaction_items` table
2. **Button Issue**: `completePayment()` defined in both dashboard.js and payment.js - potential conflict
3. **AJAX Error Handling**: Silent failures without user feedback

### Solution Approach:
1. Add `is_synced` column to track sync status
2. Centralize payment logic in one location
3. Add proper error feedback to user
4. Create dedicated sync endpoint

---

## Progress:
- ✅ Step 1: Database Schema - Created `ginova_db_fix.sql` with is_synced column
- ✅ Step 2: JavaScript Fix - Created `js/sync-fix.js` with proper sync logic
- ✅ Step 3: Payment PHP - Created `api/update_status.php` for payment processing
- ✅ Step 4: Sync PHP - Created `api/sync.php` for F&B synchronization
- ✅ Step 5: Examples - Created `EXAMPLES.md` with all code snippets

## Files Created:
1. `ginova_db_fix.sql` - Database schema with sync status columns
2. `api/sync.php` - Backend sync endpoint
3. `api/update_status.php` - Backend payment/status endpoint  
4. `js/sync-fix.js` - Frontend sync & payment fixes
5. `EXAMPLES.md` - Complete code examples

## How to Use:
1. Run SQL migration to add is_synced column
2. Upload PHP files to api/ folder
3. Include js/sync-fix.js in dashboard.html
4. Test "Sinkron Sekarang" button - alert should disappear
5. Test "Bayar" and "Selesai & Bayar" - should open payment modal

---
*Last Updated: 2025*
