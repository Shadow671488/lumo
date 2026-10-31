const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const jdkDir = 'C:\\Users\\11\\.jdks\\jbr-21.0.11';
const adbPath = 'C:\\Users\\11\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

console.log('[1/4] Running mobile bundle build & sync...');
execSync('npm run build:mobile', { cwd: rootDir, stdio: 'inherit' });

console.log('[2/4] Building APK with Gradle and JDK 21...');
const env = {
  ...process.env,
  JAVA_HOME: jdkDir,
  PATH: `${path.join(jdkDir, 'bin')};${process.env.PATH}`
};

const gradlew = path.join(androidDir, 'gradlew.bat');
const gradleResult = spawnSync(gradlew, ['assembleDebug'], {
  cwd: androidDir,
  env,
  shell: true,
  stdio: 'inherit'
});

if (gradleResult.status !== 0) {
  console.error('Gradle build failed with status', gradleResult.status);
  process.exit(1);
}

const apkSrc = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDest = path.join(rootDir, 'Lumo-44.0.21-android.apk');
fs.copyFileSync(apkSrc, apkDest);
console.log('[3/4] Copied APK to', apkDest);

console.log('[4/4] Installing APK on device R8YY30W323N...');
execSync(`"${adbPath}" -s R8YY30W323N install -r "${apkDest}"`, { stdio: 'inherit' });

console.log('Successfully built and installed 44.0.21!');
