# ShadiPlan (mobile)

Expo React Native app for wedding planning.

## Local Android build setup (Play Store AAB)

Builds are produced locally with Gradle (not EAS Build).

1. Install [Android Studio](https://developer.android.com/studio) and the Android SDK.
2. Create `android/local.properties` (gitignored) with your machine SDK path:
   ```
   sdk.dir=/Users/YOU/Library/Android/sdk
   ```
3. Set release signing env vars (see `.env.release.example`), **or** create gitignored `android/keystore.properties` pointing at your upload keystore:
   ```
   KEYSTORE_PATH=/absolute/path/to/shadiplan-upload.keystore
   KEYSTORE_PASSWORD=...
   KEY_ALIAS=shadiplan
   KEY_PASSWORD=...
   ```
4. Confirm API levels in `android/gradle.properties`:
   `android.compileSdkVersion=36` and `android.targetSdkVersion=36`.
5. Bump Play `versionCode` before each upload:
   ```bash
   npm run bump-version
   ```
   Edit `versionName` manually in `android/app/build.gradle` / `app.json` when you want a user-facing version change.
6. Build the App Bundle:
   ```bash
   cd android && ./gradlew clean && ./gradlew bundleRelease
   ```
7. Upload:
   `android/app/build/outputs/bundle/release/app-release.aab`
8. Optional verify signature:
   ```bash
   jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
   ```

**Never commit** keystores (`*.jks`, `*.keystore`), `android/keystore.properties`, `android/local.properties`, or real `.env.release` values.
