# FleetLedger Android APK

This Android wrapper opens the live FleetLedger app at:

https://ngigifrancis56-lang.github.io/Howo-Tracker-Expenses/

It does not create a second database. Sign in with the existing Firebase account to access the same cloud-synced fleet records. The first sign-in on Android may be required because Android keeps its own app sign-in session.

## Build the APK

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **Build FleetLedger Android APK**.
4. Select **Run workflow**, then **Run workflow** again.
5. Wait for the run to finish successfully.
6. Open the completed run and download the **FleetLedger-Android-APK** artifact.
7. Extract the ZIP file. The APK inside is `app-debug.apk`.
8. Transfer the APK to your Android phone, open it, and allow installation from that source if Android asks.

This workflow creates a debug APK for personal installation and testing. It is not a Play Store release build.
