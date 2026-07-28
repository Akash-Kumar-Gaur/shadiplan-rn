#!/usr/bin/env node
/**
 * Increments Android versionCode by 1 in android/app/build.gradle
 * and keeps app.json android.versionCode in sync when present.
 *
 * versionName is NOT auto-bumped — edit it manually in:
 *   - android/app/build.gradle  (versionName "x.y.z")
 *   - app.json / package.json   (version)
 * before uploading a user-facing release.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const gradlePath = path.join(root, "android", "app", "build.gradle");

if (!fs.existsSync(gradlePath)) {
  console.error(
    "Missing android/app/build.gradle. Run `npx expo prebuild -p android` first.",
  );
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, "utf8");
const match = content.match(/versionCode\s+(\d+)/);
if (!match) {
  console.error("Could not find versionCode in android/app/build.gradle");
  process.exit(1);
}

const currentVersionCode = parseInt(match[1], 10);
const newVersionCode = currentVersionCode + 1;
content = content.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
fs.writeFileSync(gradlePath, content);

console.log(`Bumped versionCode: ${currentVersionCode} → ${newVersionCode}`);

const appJsonPath = path.join(root, "app.json");
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    if (appJson.expo?.android) {
      appJson.expo.android.versionCode = newVersionCode;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
      console.log(`Synced app.json expo.android.versionCode → ${newVersionCode}`);
    }
  } catch (err) {
    console.warn("Could not sync app.json versionCode:", err.message);
  }
}

console.log(
  "Note: versionName was left unchanged — bump it manually in build.gradle / app.json when shipping a user-facing release.",
);
