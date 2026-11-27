# Roadmap

## Privacy-conscious prescription analytics
- [x] Track successful draft saves, rejected validation attempts and successful authorization in the existing editor
- [x] Register three closed event schemas without identifiers, medical text, error messages or signature assets
- [x] Verify handler behavior and privacy with seven action tests and validate all three catalog entries
- [ ] Confirm event delivery during actual clinic usage; signed-in browser verification unavailable because the requesting user has no matching clinic account

## Prescription save button
- [x] Enable Save prescription for draft saving independently of authorization credentials
- [x] Keep authorization separate; verified Nuriya's Save button is enabled and six prescription tests pass (no clinical records added)
- [ ] Final authorization for Nuriya waits for her real qualification and professional registration

## Paper prescription and second OPD clinician
- [ ] Match the supplied paper prescription layout without changing clinic contact details or inventing prices
- [ ] Create permanent additional clinician account for nuriyaaman44@gmail.com through admin staff creation
- [ ] Provide a separate clinician OPD workspace with shared patient records
- [ ] Store and select the second clinician's own signature, preserving the existing signatures
- [ ] Verify workspace, signatures, print layout and tests
- [ ] Confirm the new clinician's real name, qualification and registration before authorized prescribing

## Official document signatures
- [ ] Store the supplied OPD and laboratory signature images privately and register them as controlled clinic assets
- [ ] Show the OPD signature only on authorized prescriptions; show the laboratory signature only on final verified reports
- [ ] Add administrator-only replacement with mandatory reasons and audit history
- [ ] Verify A4 printing, reprints, permissions and existing rule tests

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
- [x] Recreated qa.admin@example.test as the temporary first administrator; approved admin role and fresh sign-in to /dashboard verified; first-admin/staff setup errors fixed and registration trigger restored
- [ ] Replace the temporary test administrator with a real clinic administrator before live use; the test address cannot receive password resets
- [ ] After an administrator exists: recreate the three office accounts, enter the diagnosis list, and approve prices if billing is wanted
- [ ] Not applicable here: diagnosis catalogue and prices are entered by the administrator in their own screens; prescription_settings is not read by the app

## Later / needs the clinic
- Perform a real backup restore and fill in the record in docs/GO_LIVE.md
- Clinic to enter validated units/reference intervals; confirm meaning of B/F and BF
- Clinic to approve prices + payment workflow before billing is switched on
- Remove test accounts and fictional records before real use
