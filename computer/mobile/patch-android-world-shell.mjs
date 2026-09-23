import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const androidRoot = new URL('../../android/', import.meta.url);
const packageDir = new URL('./app/src/main/java/org/synthai/computer/', androidRoot);
const xmlDir = new URL('./app/src/main/res/xml/', androidRoot);
const manifestUrl = new URL('./app/src/main/AndroidManifest.xml', androidRoot);

await mkdir(packageDir, { recursive: true });
await mkdir(xmlDir, { recursive: true });
await cp(new URL('./native/MainActivity.java', import.meta.url), new URL('./MainActivity.java', packageDir));
await cp(new URL('./native/WorldShellPlugin.java', import.meta.url), new URL('./WorldShellPlugin.java', packageDir));
await cp(new URL('./native/WorldObservationService.java', import.meta.url), new URL('./WorldObservationService.java', packageDir));
await cp(new URL('./native/world_observation_service.xml', import.meta.url), new URL('./world_observation_service.xml', xmlDir));

let manifest = await readFile(manifestUrl, 'utf8');

if (!manifest.includes('android.intent.category.HOME')) {
  const homeFilter = `
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>`;
  const activityClose = manifest.indexOf('</activity>');
  if (activityClose < 0) throw new Error('Could not locate MainActivity closing tag in AndroidManifest.xml');
  manifest = manifest.slice(0, activityClose) + homeFilter + '\n        ' + manifest.slice(activityClose);
}

if (!manifest.includes('<queries>')) {
  const queries = `
    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
    </queries>`;
  const applicationOpen = manifest.indexOf('<application');
  if (applicationOpen < 0) throw new Error('Could not locate application tag in AndroidManifest.xml');
  manifest = manifest.slice(0, applicationOpen) + queries + '\n    ' + manifest.slice(applicationOpen);
}

if (!manifest.includes('WorldObservationService')) {
  const observationService = `
        <service
            android:name=".WorldObservationService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="false">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/world_observation_service" />
        </service>`;
  const applicationClose = manifest.indexOf('</application>');
  if (applicationClose < 0) throw new Error('Could not locate application closing tag in AndroidManifest.xml');
  manifest = manifest.slice(0, applicationClose) + observationService + '\n    ' + manifest.slice(applicationClose);
}

await writeFile(manifestUrl, manifest, 'utf8');
console.log('SynthAI Android HOME + Phone World semantic observation bridge installed');
