FLEETLEDGER - CAR PROFIT TRACKER (Firebase-ready PWA)

FILES
- index.html: app
- manifest.webmanifest: install metadata
- sw.js: service worker
- icon-192.png and icon-512.png: app icons
- FIREBASE_SETUP.md: Firebase setup and security rules

QUICK START
1. Publish the contents of this folder to the ROOT of a GitHub repository.
2. Enable GitHub Pages (Settings > Pages > Deploy from a branch > main > /(root)).
3. Open the published HTTPS URL in Safari on iPhone.
4. Tap Share > Add to Home Screen.

LOCAL MODE
Before Firebase is connected, records are stored in this browser's local storage. Export JSON backups regularly.

FIREBASE
Follow FIREBASE_SETUP.md. The app uses Firebase Authentication (email/password) and Cloud Firestore. It expects a signed-in user and stores the full app data document at users/{uid}/appData/fleetledger.
