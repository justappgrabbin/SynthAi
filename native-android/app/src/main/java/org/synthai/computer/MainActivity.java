package org.synthai.computer;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
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
        world.setListener(this::enterApp);
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
            if (ready) {
                JSONObject wake = new JSONObject();
                try { wake.put("elapsedMs", elapsedMs); } catch (Exception ignored) {}
                client.post("/wake", wake);
                flushJournalNow();
            }
            boolean finalReady = ready;
            main.post(() -> world.setStatus(finalReady ? "MESH ACTIVE" : "MESH DORMANT · EVENTS HELD"));
        });
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
