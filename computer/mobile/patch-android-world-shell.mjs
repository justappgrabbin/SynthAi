import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const androidRoot = new URL('../../android/', import.meta.url);
const packageDir = new URL('./app/src/main/java/org/synthai/computer/', androidRoot);
const manifestUrl = new URL('./app/src/main/AndroidManifest.xml', androidRoot);

await mkdir(packageDir, { recursive: true });
await cp(new URL('./native/MainActivity.java', import.meta.url), new URL('./MainActivity.java', packageDir));
await cp(new URL('./native/WorldShellPlugin.java', import.meta.url), new URL('./WorldShellPlugin.java', packageDir));

let manifest = await readFile(manifestUrl, 'utf8');
if (!manifest.includes('android.intent.category.HOME')) {
  const homeFilter = `
            <!-- SynthAI IndiVerse HOME surface. Android still owns the OS;
                 this activity can be selected as the user's HOME launcher. -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>`;
  const activityClose = manifest.indexOf('</activity>');
  if (activityClose < 0) throw new Error('Could not locate MainActivity closing tag in AndroidManifest.xml');
  manifest = manifest.slice(0, activityClose) + homeFilter + '\n        ' + manifest.slice(activityClose);
  await writeFile(manifestUrl, manifest, 'utf8');
}

console.log('SynthAI world-shell native bridge + HOME intent installed');
