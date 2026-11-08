# Firebase setup and shared company sync

Apex Logistic Group uses the existing Firebase project `how-expense-tracker`. Keep using the same project and web-app configuration already saved in each browser. Do not create a new Firebase project for this update.

## 1. Publish the updated Firestore rules (required)

The application code is deployed through GitHub Pages, but GitHub Pages does **not** publish Firebase security rules automatically.

1. Open [Firebase Console](https://console.firebase.google.com/project/how-expense-tracker/firestore).
2. Select **Firestore Database → Rules**.
3. Open the repository file [firestore.rules](./firestore.rules).
4. Replace the rules in the Firebase editor with the complete contents of that file.
5. Click **Publish** and wait for Firebase to confirm publication.

The updated rules let signed-in Apex Logistic Group accounts read and write the shared company dataset at `companies/apex-logistic-group/appData/fleetledger`. They retain the old per-user path so legacy records can be migrated. Chat rules remain included.

**Access note:** the app currently treats every authenticated account as a company user, consistent with the requested all-admin setup. Anyone who can create/sign into an account can therefore access the shared fleet records. Do not distribute account creation access beyond trusted staff. These are authenticated rules, not public unauthenticated access.

## 2. What changed in cloud synchronisation

- All signed-in accounts use one shared company database.
- Live Firestore updates are listened for while the app is open.
- Writes use Firestore transactions and merge records by ID instead of blindly replacing the complete dataset.
- Edited records receive update timestamps; deletions are tracked so stale devices do not normally restore removed records.
- Each account's old `users/{uid}/appData/fleetledger` document is retained and merged into the shared dataset the first time that account signs in after the update.
- The old per-user documents are deliberately not deleted.

Each existing user should sign in once after the new app is live and after the updated Firestore rules are published. This allows that user's legacy cloud records to be merged into the shared company database. Use the same Firebase project and existing login credentials.

## 3. Protect and recover existing data

Before the first post-update login on each device, do not clear browser data, uninstall the PWA, or use the app's Clear Data button. If a device still displays records that are missing elsewhere, open **Settings → Backup & restore → Download JSON backup** on that device and keep the file safe. Do not restore a backup over the shared database until its contents have been checked.

The new merge can preserve records still present in a device's local storage or legacy per-user Firestore document. It cannot recreate records that have already been erased from every device and every cloud copy; Firebase backups or exports may be needed for those.

## 4. Firebase authentication

Keep Email/Password enabled in **Authentication → Sign-in method**. Keep the existing authorised domain `ngigifrancis56-lang.github.io`. Do not change the Firebase project, API key, app ID, or authentication provider as part of this sync repair.

## 5. Live Chat image uploads

The chat image feature uses Firebase Storage. If images are already working, leave Storage configuration unchanged. If not, open **Storage → Rules**, publish the rules from this repository's `storage.rules` file, and check the project's Storage billing requirements before enabling a paid bucket.

## Important

- Do not publish permissive rules such as `allow read, write: if true`.
- Do not delete the old per-user Firestore documents until all users have signed in and their records have been verified in the shared dataset.
- The app's daily reminder is browser-based; it may require the app/browser to be open and notification permission to be granted.

## 6. Secure master-PIN deletion (staged rollout)

The master-PIN feature uses server-side Firebase Functions. The PIN is never stored in browser storage; the server stores a salted scrypt hash. A correct PIN produces a short-lived, one-use authorisation token. The server checks every proposed removal of a vehicle, driver, trip, expense, or driver adjustment and writes a deletion audit record with the signed-in account and timestamp.

**Billing requirement:** deploying Firebase Cloud Functions requires the Firebase project to use the Blaze (pay-as-you-go) plan. Review Firebase pricing and set a billing budget alert before upgrading. Do not enable billing if you are not comfortable with possible usage charges.

**Safe deployment order — do not skip or reorder:**

1. Keep the current production app and current Firestore rules unchanged while preparing this release. Keep the JSON backups from all devices.
2. Check out the `secure-master-pin-deletion` branch and install the Functions dependencies:
   ```sh
   npm --prefix functions install
   ```
3. After reviewing the Firebase billing plan, deploy only the Functions to the existing project:
   ```sh
   firebase deploy --only functions --project how-expense-tracker
   ```
   Do not use `firebase deploy --only firestore` at this stage.
4. Merge the reviewed code into `main` so GitHub Pages publishes the updated app. Refresh the app on every device and confirm that each device shows cloud sync active.
5. Only after the new app is live and all devices have refreshed, publish the updated `firestore.rules` from this branch in Firebase Console → Firestore Database → Rules. These rules allow clients to read the shared company data but deny direct client writes; writes are performed by the callable Functions.
6. Sign in, open Settings → Admin, set the company master PIN once, and test with a disposable test record. Verify that cancel/wrong PIN leaves it untouched and that a correct PIN creates a deletion-history entry. Do not use a real financial record for the first test.

**Important:** publishing the restrictive Firestore rules before the Functions are deployed and the updated app is running will interrupt cloud writes for the existing app. Never clear local storage or restore a backup over the live database as part of this rollout.
