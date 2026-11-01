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

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '44.0.26';

const apkSrc = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDest = path.join(rootDir, `Lumo-${version}-android.apk`);
fs.copyFileSync(apkSrc, apkDest);
console.log('[3/4] Copied APK to', apkDest);

console.log('[4/4] Checking device connection & installing APK...');
try {
  const devicesOutput = execSync(`"${adbPath}" devices`, { encoding: 'utf8' });
  if (devicesOutput.includes('R8YY30W323N') || devicesOutput.match(/\n[^\s]+\s+device\b/)) {
    execSync(`"${adbPath}" install -r "${apkDest}"`, { stdio: 'inherit' });
    console.log(`Successfully built and installed ${version}!`);
  } else {
    console.log(`Device not currently connected via ADB. APK is ready at: ${apkDest}`);
  }
} catch (adbErr) {
  console.warn(`ADB install skipped: ${adbErr.message}. APK is ready at: ${apkDest}`);
}
