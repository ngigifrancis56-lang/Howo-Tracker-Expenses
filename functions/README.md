# Secure master-PIN deletion backend

This directory contains callable Firebase Cloud Functions for Apex Logistic Group.

## Functions

- `setMasterPin`: one-time setup of a 6–12 digit company PIN. Only a salted scrypt hash is stored; the PIN itself is never written to Firestore.
- `authorizeDeletion`: checks the PIN on the server, applies per-account lockout after five incorrect attempts, and issues a short-lived one-use authorisation token.
- `syncCompanyData`: performs the shared-document merge on the server. If any existing vehicle, driver, trip, expense, or driver adjustment would be removed, it requires a valid authorisation token and writes a deletion audit entry.

## Important rollout constraints

**Do not deploy restrictive Firestore rules or switch the live app to this backend until the frontend migration is complete and tested.** The current production app writes the shared company document directly. Blocking those writes before all active app clients use these callables would interrupt cloud sync.

The final rollout must:
1. Deploy these Functions.
2. Update the app so initial migration and all sync writes use `syncCompanyData`, and deletion UI calls `authorizeDeletion` before changing local data.
3. Publish Firestore rules that allow authenticated reads of the shared app document but deny client writes to it; deny client reads/writes of the PIN, attempt, authorisation, and audit collections.
4. Test create/edit/sync/deletion from two test accounts and multiple devices before enabling the new rules for production.

Functions deployment requires the Firebase project to be on the Blaze (pay-as-you-go) plan. Charges depend on usage and other Firebase services. Do not upgrade billing without reviewing the pricing and setting a budget alert.

## Deploy (only after the frontend and rules are ready)

From this directory's parent project, initialise Firebase Functions for the existing project `how-expense-tracker`, install dependencies, and deploy only Functions. Do not run a Firestore data reset or delete existing documents.

The production app is not changed by the presence of these source files alone.
