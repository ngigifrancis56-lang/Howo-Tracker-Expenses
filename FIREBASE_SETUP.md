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

## 6. Free master-PIN deletion safeguard

The app includes an optional company master PIN for the delete buttons. It stores a salted PBKDF2-SHA256 hash in the existing shared company data document, not the plain PIN. A correct PIN is required in the app before deleting a vehicle, driver, trip, expense, or driver adjustment. The app also records a recent deletion history with the signed-in account and timestamp.

**Security limitation:** this is an app-level safeguard only. The existing Firestore rules still allow authenticated users to write the shared company data document. A knowledgeable user with direct database or browser developer-tools access could bypass or alter this check. The PIN is useful for preventing accidental or casual deletion, but it is not tamper-proof security. True server-enforced deletion authorisation requires a trusted backend, which is not included because Cloud Functions would require a paid Firebase plan.

No Firebase billing upgrade or Firestore rules change is needed for this free version. Keep the existing production Firestore rules unchanged. After the app update is published and refreshed on each device, set the company PIN once in Settings. The PIN hash and deletion history sync with the shared company record. Keep the PIN private and continue taking regular JSON backups.
