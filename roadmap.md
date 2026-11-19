# Roadmap

## Digital prescriptions
- [x] Secure draft/items/history storage and admin-controlled prescriber credentials
- [x] OPD prescription editor, authorization, cancellation/reissue and history
- [x] Clinic-branded A4 preview, printing and browser Save as PDF
- [x] 73 rule tests; Dr Ahmed fictional draft save/reload, cancellation/reissue, desktop/mobile preview and draft-print restriction checks
- [ ] Authorized print end-to-end: waiting for administrator-confirmed clinician qualification and professional registration; do not invent credentials

## Phase 3 — OPD (done)
## Phase 4 — Laboratory (done)

## Phase 5 — Integration, reports, billing, security, go-live prep
- [x] A. Integration: duplicate lab-order guard (same test still open on the visit), row lock against concurrent orders
- [x] B. Admin management dashboard (live database counts)
- [x] B. Reports (7) with date filters, CSV export, print/PDF, pagination, no names in aggregates
- [x] C. Optional billing (off until admin enables): charges, invoices, items, payments, receipts, adjustments, outstanding, daily report
- [x] D. Security: revoke anonymous function access, attribute staff/permission changes in audit, server input validation, password reset, idle sign-out, audit page filters
- [x] E/G. Backup & recovery + deployment/rollback/admin setup guide (document only what is verified)
- [x] F. QA: full journey + role tests in database, browser walkthrough, mobile layout, printing
- [x] Final implementation report
- [ ] Not verified: backup restore in a separate environment, real concurrent-order test, billing browser flow with billing switched on, email reset delivery to a real inbox

## Staff registration & approval (done)
- [ ] Needs a real inbox: register → confirm email → admin approves → log in

## Pre-deployment requirements (done)
- [x] 1. Lab test definitions: units/ranges/method/analyzer/critical limits, age/sex/pregnancy ranges, approval workflow, B/F + BF locked until confirmed
- [x] 2. Price list: per-charge approval, effective/expiry dates, price history, price-list confirmation gate before billing can run
- [x] 3. Backup/restore record, synthetic-data cleanup tool (admin-approved), 10-gate deployment readiness checklist
- [x] Tests + typecheck + final report

## Remixed copy (this project)
- [x] Database structure files restored into the copy (0000-0018 + migration journal)
- [x] Migration record-keeping repaired: it arrived empty, so every new database change replayed 0000 and failed with "type app_role already exists"
- [x] Reference lists restored: 10 clinic services, 56 laboratory tests (54 active; B/F and BF locked until the lab confirms them)
- [x] Sign-in page renders with the clinic logo; correct backend for this copy; no console errors; build OK; 73 tests pass
- [x] Staff registration verified end-to-end (backend accepts, confirmation email required, then admin approval); throwaway test account removed
- [x] Clinic confirmed this copy is intended for live operation; no fictional accounts or patient records were added for setup
- [ ] Previous account identified as qa.admin@example.test; waiting for the user to choose a real live-admin email or explicitly approve temporary test-admin recreation (passwords cannot be copied between backends)
- [ ] Waiting on the clinic: create the first administrator account (you choose the password) - only works while no administrator exists
- [ ] After an administrator exists: recreate the three office accounts, enter the diagnosis list, and approve prices if billing is wanted
- [ ] Not applicable here: diagnosis catalogue and prices are entered by the administrator in their own screens; prescription_settings is not read by the app

## Later / needs the clinic
- Perform a real backup restore and fill in the record in docs/GO_LIVE.md
- Clinic to enter validated units/reference intervals; confirm meaning of B/F and BF
- Clinic to approve prices + payment workflow before billing is switched on
- Remove test accounts and fictional records before real use
