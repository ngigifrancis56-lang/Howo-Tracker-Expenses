# Firebase setup (one-time)

This app is already wired to Firebase Web SDK 10.12.2. You must create and configure your own Firebase project; this ZIP does not contain your private project configuration.

## 1. Create project and web app
1. Open https://console.firebase.google.com/ and create a project.
2. In Project settings > General > Your apps, add a Web app.
3. Copy the web configuration values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
4. In FleetLedger open **Firebase & Settings**, paste those values and choose **Connect / sign in**.

Firebase web API keys identify a project; they are not admin credentials. Never put service-account private keys in this app.

## 2. Enable email/password login
Firebase Console > Build > Authentication > Get started > Sign-in method > Email/Password > Enable > Save.

The app will ask for an email and password. It tries to sign in first; if the account does not exist, it offers to create it using the supplied credentials. For first setup, use a strong password and remember it.

## 3. Create Firestore
Firebase Console > Build > Firestore Database > Create database. Choose a region close to your users, then create it.

## 4. Firestore security rules
In Firestore > Rules, publish:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This lets each signed-in user access only their own data path. Do not use open rules such as `allow read, write: if true`.

## 5. Test cloud sync
1. Connect from the app using your Firebase web config.
2. Create a test vehicle, driver and trip.
3. Sign in on another device/browser using the same account.
4. If cloud data is found, choose the cloud records when prompted.

## Data model and calculation
- Each trip stores its own individually entered driver-pay amount; no fixed driver rate is assumed.
- Driver balance = trip pay earned - advances - deductions - salary settlements.
- Business net profit = trip income - fuel/other trip costs - recorded business expenses - driver pay earned.
- An advance is a cash payment against earned driver pay; it is not counted a second time in business expenses. A deduction reduces the driver's balance. Record actual business costs separately under Expenses if they should reduce business profit.

## Important current limitations
- This is a functional starter PWA, not a native signed iOS IPA.
- The current sync is a single user-owned Firestore document and synchronizes on save / sign-in, not multi-user live collaboration or conflict merging. Avoid editing the same account concurrently on multiple devices until a stronger sync strategy is implemented.
- Local data is not automatically merged into cloud data. Make a JSON backup before connecting and choose carefully when prompted.
- Keep Firebase Authentication and Firestore rules enabled. Do not share your login password.

## 6. Enable pictures in Fleet Live Chat

The live chat picture feature stores image files in Firebase Storage and their download references in the `fleetChat` Firestore collection.

1. In Firebase Console, open **Build → Storage** and create/enable the project's Storage bucket if it is not already set up.
2. Open **Storage → Rules**, replace the rules with the contents of this repository's `storage.rules` file, then click **Publish**.
3. Open **Firestore Database → Rules**, and replace the rules with the contents of this repository's `firestore.rules` file, then click **Publish**. These rules preserve per-user fleet records and allow signed-in users to read the shared chat while only allowing each sender to edit or delete their own messages.
4. Reload Apex Logistic Group and open **Live Chat**. Choose **Attach picture**, select an image, then press **Send**. Images are limited to 5 MB each.

**Billing note:** Firebase Storage availability and required billing depend on the project's bucket and Firebase plan. Check the Storage page in Firebase Console before enabling it; do not upgrade a billing plan without reviewing the costs. The app's text chat continues to work independently if Storage is not enabled.
