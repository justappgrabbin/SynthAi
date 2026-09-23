package org.synthai.computer;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity implements PhoneWorldView.Listener {
    private static final int REQUEST_TERMUX_RUN = 7001;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private NativeSeedClient client;
    private EventJournal journal;
    private PhoneWorldView world;
    private SharedPreferences prefs;
    private List<PhoneWorldView.AppPlace> appPlaces = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        client = new NativeSeedClient("http://127.0.0.1:17757");
        journal = new EventJournal(this);
        prefs = getSharedPreferences("synthai-native", MODE_PRIVATE);
        world = new PhoneWorldView(this);
        world.setListener(this);
        world.setPerceptionEnabled(isObservationEnabled());
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
        world.setPerceptionEnabled(isObservationEnabled());
        String observationError = prefs.getString("observationError", null);
        if (observationError != null) {
            world.setStatus("PERCEPTION ERROR · " + observationError);
        }
        refreshApps();
        wakeRuntimeAndFlush(elapsed);
    }

    @Override
    protected void onPause() {
        super.onPause();
        prefs.edit().putLong("backgroundAt", System.currentTimeMillis()).apply();
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onEnter(PhoneWorldView.AppPlace app) {
        enterApp(app);
    }

    @Override
    public void onPerceptionRequested() {
        if (isObservationEnabled()) {
            world.setPerceptionEnabled(true);
            world.setStatus("PERCEPTION ACTIVE · APP EVENTS ENTER PHONE WORLD");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivity(intent);
        } catch (Exception error) {
            world.setStatus("PERCEPTION SETTINGS ERROR · " + error.getClass().getSimpleName());
        }
    }

    private boolean isObservationEnabled() {
        String enabled = Settings.Secure.getString(
            getContentResolver(),
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        if (enabled == null || enabled.isEmpty()) return false;

        String target = new ComponentName(this, WorldObservationService.class).flattenToString();
        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabled);
        while (splitter.hasNext()) {
            if (target.equalsIgnoreCase(splitter.next())) return true;
        }
        return false;
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
            String category = categoryName(info.activityInfo.applicationInfo.category);
            next.add(new PhoneWorldView.AppPlace(pkg, label, info.loadIcon(pm), category));

            JSONObject row = new JSONObject();
            try {
                row.put("packageName", pkg);
                row.put("label", label);
                row.put("activity", info.activityInfo.name);
                row.put("category", category);
                row.put("launchable", true);
                appsJson.put(row);
            } catch (Exception error) {
                world.setStatus("APP INVENTORY ERROR · " + error.getClass().getSimpleName());
            }
        }

        next.sort(Comparator.comparing(a -> a.label.toLowerCase()));
        appPlaces = next;
        world.setApps(next);

        JSONObject sync = new JSONObject();
        try {
            sync.put("applications", appsJson);
        } catch (Exception error) {
            world.setStatus("PHONE SYNC BUILD ERROR · " + error.getClass().getSimpleName());
            return;
        }

        io.execute(() -> {
            NativeSeedClient.Result result = client.post("/phone/sync", sync);
            if (result.ok) {
                applyPhoneSnapshot(result.body);
            } else {
                main.post(() -> world.setStatus("PHONE WORLD SYNC ERROR · HTTP " + result.code));
            }
        });
    }

    private String categoryName(int category) {
        switch (category) {
            case ApplicationInfo.CATEGORY_GAME: return "game";
            case ApplicationInfo.CATEGORY_AUDIO: return "audio";
            case ApplicationInfo.CATEGORY_VIDEO: return "video";
            case ApplicationInfo.CATEGORY_IMAGE: return "image";
            case ApplicationInfo.CATEGORY_SOCIAL: return "social";
            case ApplicationInfo.CATEGORY_NEWS: return "news";
            case ApplicationInfo.CATEGORY_MAPS: return "maps";
            case ApplicationInfo.CATEGORY_PRODUCTIVITY: return "productivity";
            default: return "application";
        }
    }

    private void applyPhoneSnapshot(String body) {
        try {
            JSONObject snapshot = new JSONObject(body);
            JSONArray apps = snapshot.optJSONArray("apps");
            if (apps == null) return;

            List<String[]> updates = new ArrayList<>();
            for (int i = 0; i < apps.length(); i++) {
                JSONObject app = apps.optJSONObject(i);
                if (app == null) continue;
                updates.add(new String[]{
                    app.optString("packageName", ""),
                    app.optString("experienceId", "application-place")
                });
            }

            main.post(() -> {
                for (String[] update : updates) {
                    if (!update[0].isEmpty()) world.setExperience(update[0], update[1]);
                }
            });
        } catch (Exception error) {
            main.post(() -> world.setStatus("WORLD SNAPSHOT ERROR · " + error.getClass().getSimpleName()));
        }
    }

    private void enterApp(PhoneWorldView.AppPlace app) {
        JSONObject event = new JSONObject();
        try {
            event.put("id", "android-launch-" + System.currentTimeMillis());
            event.put("type", "app.launch");
            event.put("packageName", app.packageName);
            event.put("residentId", "synthia");
            event.put("at", System.currentTimeMillis());
            JSONObject context = new JSONObject();
            context.put("experienceId", app.experienceId);
            context.put("category", app.category);
            event.put("context", context);
        } catch (Exception error) {
            world.setStatus("APP EVENT ERROR · " + error.getClass().getSimpleName());
        }

        if (!journal.append(event)) {
            world.setStatus("EVENT JOURNAL ERROR · " + journal.lastError());
        }
        flushJournal();

        Intent launch = getPackageManager().getLaunchIntentForPackage(app.packageName);
        if (launch != null) {
            world.setStatus("SYNTHIA ENTERING " + app.label.toUpperCase());
            startActivity(launch);
        } else {
            world.setStatus("APP LAUNCH ERROR · NO ACTIVITY FOR " + app.label.toUpperCase());
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
                    try {
                        Thread.sleep(700L * (i + 1));
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    health = client.health();
                }
            }

            boolean ready = health.ok;
            if (ready) {
                JSONObject wake = new JSONObject();
                try {
                    wake.put("elapsedMs", elapsedMs);
                } catch (Exception ignored) {}
                NativeSeedClient.Result wakeResult = client.post("/wake", wake);
                if (!wakeResult.ok) {
                    main.post(() -> world.setStatus("WAKE ERROR · HTTP " + wakeResult.code));
                }
                flushJournalNow();
                updateResidentState();
            }

            if (!ready) {
                main.post(() -> {
                    world.setResidentActive(false);
                    world.setStatus("MESH DORMANT · EVENTS HELD");
                });
            }
        });
    }

    private void updateResidentState() {
        NativeSeedClient.Result snapshotResult = client.snapshot();
        if (!snapshotResult.ok) {
            main.post(() -> {
                world.setResidentActive(false);
                world.setStatus("MESH ACTIVE · RESIDENT STATUS UNAVAILABLE");
            });
            return;
        }

        try {
            JSONObject snapshot = new JSONObject(snapshotResult.body);
            Object synthia = snapshot.opt("synthia57");
            boolean mounted = synthia instanceof JSONObject;
            JSONObject residents = snapshot.optJSONObject("residents");
            JSONArray bound = residents == null ? null : residents.optJSONArray("boundResidents");
            if (!mounted && bound != null) {
                for (int i = 0; i < bound.length(); i++) {
                    if ("synthia".equals(bound.optString(i))) {
                        mounted = true;
                        break;
                    }
                }
            }

            boolean finalMounted = mounted;
            main.post(() -> {
                world.setResidentActive(finalMounted);
                world.setStatus(finalMounted
                    ? "MESH ACTIVE · SYNTHIA RESIDENT"
                    : "MESH ACTIVE · SYNTHIA PACKAGE UNMOUNTED");
            });
        } catch (Exception error) {
            main.post(() -> {
                world.setResidentActive(false);
                world.setStatus("RESIDENT SNAPSHOT ERROR · " + error.getClass().getSimpleName());
            });
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
        try {
            payload.put("events", batch.events);
        } catch (Exception error) {
            journal.rollback(batch);
            main.post(() -> world.setStatus("EVENT BATCH ERROR · " + error.getClass().getSimpleName()));
            return;
        }

        NativeSeedClient.Result result = client.post("/phone/native-events", payload);
        if (result.ok) {
            journal.commit(batch);
        } else {
            journal.rollback(batch);
            main.post(() -> world.setStatus("EVENT REPLAY HELD · HTTP " + result.code));
        }
    }
}
