package org.synthai.computer;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int REQUEST_TERMUX_RUN = 7001;
    private static final int REQUEST_MIRROR_IMAGE = 7002;
    private static final int REQUEST_SYNTHIA_PACKAGE = 7003;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private NativeSeedClient client;
    private EventJournal journal;
    private PhoneWorldView world;
    private SharedPreferences prefs;
    private List<PhoneWorldView.AppPlace> appPlaces = new ArrayList<>();
    private File mirrorFile;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        client = new NativeSeedClient("http://127.0.0.1:17757");
        journal = new EventJournal(this);
        prefs = getSharedPreferences("synthai-native", MODE_PRIVATE);
        world = new PhoneWorldView(this);
        world.setListener(this::enterApp);
        world.setMirrorListener(this::pickMirrorImage);
        world.setPackageListener(this::pickSynthiaPackage);
        mirrorFile = new File(getFilesDir(), "synthia-mirror-face.jpg");
        loadMirrorFace();
        setContentView(world);
        refreshApps();
        wakeRuntimeAndFlush(0);
    }

    @Override
    protected void onResume() {
        super.onResume();
        long last = prefs.getLong("backgroundAt", 0L);
        long elapsed = last > 0 ? Math.max(0, System.currentTimeMillis() - last) : 0;
        prefs.edit().remove("backgroundAt").apply();
        refreshApps();
        wakeRuntimeAndFlush(elapsed);
    }

    @Override
    protected void onPause() {
        super.onPause();
        prefs.edit().putLong("backgroundAt", System.currentTimeMillis()).apply();
    }

    private void refreshApps() {
        PackageManager pm = getPackageManager();
        Intent query = new Intent(Intent.ACTION_MAIN, null);
        query.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> resolved = pm.queryIntentActivities(query, PackageManager.MATCH_ALL);
        List<PhoneWorldView.AppPlace> next = new ArrayList<>();
        JSONArray appsJson = new JSONArray();

        for (ResolveInfo info : resolved) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            if (getPackageName().equals(pkg)) continue;
            String label = String.valueOf(info.loadLabel(pm));
            next.add(new PhoneWorldView.AppPlace(pkg, label, info.loadIcon(pm)));
            JSONObject row = new JSONObject();
            try {
                row.put("packageName", pkg);
                row.put("label", label);
                row.put("category", "android-application");
                row.put("launchable", true);
                appsJson.put(row);
            } catch (Exception ignored) {}
        }
        next.sort(Comparator.comparing(a -> a.label.toLowerCase()));
        appPlaces = next;
        world.setApps(next);

        JSONObject sync = new JSONObject();
        try { sync.put("applications", appsJson); } catch (Exception ignored) {}
        io.execute(() -> client.post("/phone/sync", sync));
    }

    private void enterApp(PhoneWorldView.AppPlace app) {
        JSONObject event = new JSONObject();
        try {
            event.put("id", "android-launch-" + System.currentTimeMillis());
            event.put("type", "app.launch");
            event.put("packageName", app.packageName);
            event.put("residentId", "synthia");
            event.put("at", System.currentTimeMillis());
        } catch (Exception ignored) {}
        journal.append(event);
        flushJournal();

        Intent launch = getPackageManager().getLaunchIntentForPackage(app.packageName);
        if (launch != null) {
            world.setStatus("SYNTHIA ENTERING " + app.label.toUpperCase());
            startActivity(launch);
        }
    }

    private void pickSynthiaPackage() {
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("*/*");
        pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip", "application/octet-stream"});
        startActivityForResult(pick, REQUEST_SYNTHIA_PACKAGE);
    }

    private void acceptSynthiaPackage(Uri uri) {
        world.setStatus("INSTALLING SYNTHIA 5.7");
        io.execute(() -> {
            try {
                NativeSeedClient.Result health = client.health();
                if (!health.ok) {
                    TermuxBridge.startNativeSeed(this);
                    for (int i = 0; i < 7 && !health.ok; i++) {
                        try { Thread.sleep(700L * (i + 1)); } catch (InterruptedException ignored) {}
                        health = client.health();
                    }
                }
                if (!health.ok) throw new IllegalStateException("Native Seed is not available");

                long length = -1L;
                try (android.content.res.AssetFileDescriptor afd = getContentResolver().openAssetFileDescriptor(uri, "r")) {
                    if (afd != null) length = afd.getLength();
                } catch (Exception ignored) {}

                NativeSeedClient.Result result;
                try (InputStream in = getContentResolver().openInputStream(uri)) {
                    if (in == null) throw new IllegalStateException("Could not open Synthia 5.7 package");
                    String mime = getContentResolver().getType(uri);
                    result = client.upload(
                        "/packages/synthia57/install",
                        in,
                        length,
                        mime == null ? "application/zip" : mime,
                        "android-document-picker"
                    );
                }
                if (!result.ok) throw new IllegalStateException("Synthia package install failed: " + result.body);

                main.post(() -> {
                    world.setResidentName("SYNTHIA");
                    world.setStatus("MESH ACTIVE · SYNTHIA 5.7 MOUNTED");
                    loadMirrorFace();
                });
            } catch (Exception error) {
                main.post(() -> world.setStatus("SYNTHIA 5.7 INSTALL ERROR"));
            }
        });
    }

    private void pickMirrorImage() {
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("image/*");
        startActivityForResult(pick, REQUEST_MIRROR_IMAGE);
    }

    private void loadMirrorFace() {
        try {
            if (mirrorFile != null && mirrorFile.exists()) {
                Bitmap bitmap = BitmapFactory.decodeFile(mirrorFile.getAbsolutePath());
                if (bitmap != null) world.setMirrorFace(bitmap);
            }
        } catch (Exception ignored) {}
    }

    private void acceptMirrorImage(Uri uri) {
        io.execute(() -> {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                if (in == null) return;
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) >= 0) {
                    bytes.write(buffer, 0, read);
                    if (bytes.size() > 8 * 1024 * 1024) throw new IllegalStateException("Mirror image exceeds 8 MB");
                }
                byte[] original = bytes.toByteArray();
                Bitmap decoded = BitmapFactory.decodeByteArray(original, 0, original.length);
                if (decoded == null) throw new IllegalStateException("Could not decode mirror image");

                ByteArrayOutputStream jpeg = new ByteArrayOutputStream();
                decoded.compress(Bitmap.CompressFormat.JPEG, 90, jpeg);
                byte[] normalized = jpeg.toByteArray();
                try (FileOutputStream out = new FileOutputStream(mirrorFile)) {
                    out.write(normalized);
                }

                String dataUrl = "data:image/jpeg;base64," + Base64.encodeToString(normalized, Base64.NO_WRAP);
                JSONObject payload = new JSONObject();
                payload.put("dataUrl", dataUrl);
                payload.put("label", "user-face");
                payload.put("source", "android-photo-picker");
                NativeSeedClient.Result result = client.post("/synthia/mirror-image", payload);

                Bitmap display = BitmapFactory.decodeByteArray(normalized, 0, normalized.length);
                main.post(() -> {
                    world.setMirrorFace(display);
                    world.setStatus(result.ok ? "SYNTHIA 5.7 · MIRROR SOURCE READY" : "MIRROR SAVED · RUNTIME WILL SYNC ON WAKE");
                });
            } catch (Exception error) {
                main.post(() -> world.setStatus("MIRROR IMAGE ERROR"));
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_MIRROR_IMAGE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri uri = data.getData();
            try {
                getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}
            acceptMirrorImage(uri);
        }
        if (requestCode == REQUEST_SYNTHIA_PACKAGE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri uri = data.getData();
            try {
                getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}
            acceptSynthiaPackage(uri);
        }
    }

    private void wakeRuntimeAndFlush(long elapsedMs) {
        if (TermuxBridge.isInstalled(this) &&
            android.os.Build.VERSION.SDK_INT >= 23 &&
            checkSelfPermission(TermuxBridge.RUN_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            world.setStatus("GRANT TERMUX RUN PERMISSION");
            requestPermissions(new String[]{TermuxBridge.RUN_PERMISSION}, REQUEST_TERMUX_RUN);
            return;
        }
        world.setStatus("MESH WAKING");
        io.execute(() -> {
            NativeSeedClient.Result health = client.health();
            if (!health.ok) {
                TermuxBridge.startNativeSeed(this);
                for (int i = 0; i < 5 && !health.ok; i++) {
                    try { Thread.sleep(700L * (i + 1)); } catch (InterruptedException ignored) {}
                    health = client.health();
                }
            }
            boolean ready = health.ok;
            boolean synthiaReady = ready && hasMountedSynthia(health);
            if (ready) {
                JSONObject wake = new JSONObject();
                try { wake.put("elapsedMs", elapsedMs); } catch (Exception ignored) {}
                client.post("/wake", wake);
                flushJournalNow();
            }
            boolean finalReady = ready;
            boolean finalSynthiaReady = synthiaReady;
            main.post(() -> {
                world.setResidentName(finalSynthiaReady ? "SYNTHIA" : "YOU");
                world.setStatus(finalReady
                    ? (finalSynthiaReady ? "MESH ACTIVE · SYNTHIA HOME" : "MESH ACTIVE · RESIDENT PACKAGE NOT MOUNTED")
                    : "MESH DORMANT · EVENTS HELD");
            });
        });
    }

    private boolean hasMountedSynthia(NativeSeedClient.Result health) {
        try {
            JSONObject root = new JSONObject(health.body == null ? "{}" : health.body);
            JSONObject mounts = root.optJSONObject("optionalMounts");
            if (mounts == null || !mounts.has("synthia57")) return false;
            Object value = mounts.opt("synthia57");
            if (value instanceof JSONObject) {
                JSONObject object = (JSONObject)value;
                if (object.has("mounted")) return object.optBoolean("mounted", false);
                return !object.has("error");
            }
            return value != null && value != JSONObject.NULL;
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_TERMUX_RUN) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                wakeRuntimeAndFlush(0);
            } else {
                world.setStatus("MESH HELD · TERMUX PERMISSION NEEDED");
            }
        }
    }

    private void flushJournal() {
        io.execute(this::flushJournalNow);
    }

    private void flushJournalNow() {
        EventJournal.Batch batch = journal.beginBatch();
        if (batch.empty()) return;
        JSONObject payload = new JSONObject();
        try { payload.put("events", batch.events); } catch (Exception ignored) {}
        NativeSeedClient.Result result = client.post("/phone/native-events", payload);
        if (result.ok) journal.commit(batch);
        else journal.rollback(batch);
    }
}
