package app.synthai.hover;

import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Android-native daily inventory sweep. This is NOT a simulated Linux daemon.
 * JobScheduler runs independently of the guest and may defer work under Doze.
 * Only the launchable applications Android lets this APK enumerate are included.
 */
public final class DeviceInventorySweep {
    private static final String PREF = "continuity-phone-sweep-v1";
    private static final String SNAPSHOT = "current";
    private static final String REPORT = "report";
    private static final int JOB_ID = 58018;
    private static final long DAY_MS = 24L * 60L * 60L * 1000L;

    private DeviceInventorySweep() {}

    public static void schedule(Context context) {
        try {
            JobScheduler jobs = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (jobs == null) throw new IllegalStateException("Android JobScheduler unavailable");
            JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(context, DailySweepJobService.class))
                    .setPersisted(true)
                    .setPeriodic(DAY_MS)
                    .build();
            int result = jobs.schedule(info);
            Log.i(HoverPorts.TAG, "CONTINUITY_SWEEP_JOB_SCHEDULED status=" + result);
        } catch (Exception error) {
            Log.w(HoverPorts.TAG, "Unable to schedule inventory sweep: " + error.getMessage());
        }
    }

    private static JSONObject item(PackageManager manager, ResolveInfo resolve) throws Exception {
        if (resolve.activityInfo == null || resolve.activityInfo.packageName == null) return null;
        String id = resolve.activityInfo.packageName;
        JSONObject out = new JSONObject().put("packageName", id)
                .put("label", String.valueOf(resolve.loadLabel(manager)));
        try {
            PackageInfo info = manager.getPackageInfo(id, 0);
            long code = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            out.put("versionCode", code);
            out.put("versionName", info.versionName == null ? "" : info.versionName);
            out.put("lastUpdateTime", info.lastUpdateTime);
        } catch (PackageManager.NameNotFoundException missing) {
            out.put("versionCode", JSONObject.NULL);
            out.put("versionName", "");
            out.put("lastUpdateTime", 0);
        }
        return out;
    }

    public static synchronized JSONObject scan(Context context) throws Exception {
        SharedPreferences preferences = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        String previousData = preferences.getString(SNAPSHOT, "");
        JSONObject previous = previousData == null || previousData.isEmpty() ? new JSONObject() : new JSONObject(previousData);
        PackageManager manager = context.getPackageManager();
        Intent query = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> found = manager.queryIntentActivities(query, PackageManager.MATCH_ALL);
        Map<String, JSONObject> inventory = new HashMap<>();
        for (ResolveInfo resolve : found) {
            JSONObject entry = item(manager, resolve);
            if (entry != null) inventory.put(entry.optString("packageName"), entry);
        }
        List<String> sorted = new ArrayList<>(inventory.keySet());
        sorted.sort(Comparator.naturalOrder());
        JSONObject current = new JSONObject();
        JSONArray added = new JSONArray(), removed = new JSONArray(), updated = new JSONArray();
        boolean baseline = previous.length() == 0;
        for (String pkg : sorted) {
            JSONObject now = inventory.get(pkg);
            current.put(pkg, now);
            if (baseline) continue;
            JSONObject before = previous.optJSONObject(pkg);
            if (before == null) {
                added.put(now);
            } else if (now.optLong("versionCode", -1) != before.optLong("versionCode", -1)
                    || now.optLong("lastUpdateTime", -1) != before.optLong("lastUpdateTime", -1)) {
                updated.put(new JSONObject().put("packageName", pkg)
                        .put("label", now.optString("label"))
                        .put("fromVersion", before.optString("versionName"))
                        .put("toVersion", now.optString("versionName"))
                        .put("fromCode", before.optLong("versionCode", -1))
                        .put("toCode", now.optLong("versionCode", -1))
                        .put("lastUpdateTime", now.optLong("lastUpdateTime")));
            }
        }
        if (!baseline) {
            List<String> missing = new ArrayList<>();
            java.util.Iterator<String> keys = previous.keys();
            while (keys.hasNext()) {
                String pkg = keys.next();
                if (!inventory.containsKey(pkg)) missing.add(pkg);
            }
            missing.sort(Comparator.naturalOrder());
            for (String pkg : missing) removed.put(previous.getJSONObject(pkg));
        }
        JSONObject report = new JSONObject()
                .put("ok", true)
                .put("schema", "synthai-android-inventory/v1")
                .put("checkedAt", System.currentTimeMillis())
                .put("count", sorted.size())
                .put("baseline", baseline)
                .put("added", added)
                .put("updated", updated)
                .put("removed", removed)
                .put("scope", "launchable applications visible to this APK under Android package-visibility rules")
                .put("schedule", "Android periodic JobScheduler, approximately once daily; system may defer under Doze");
        if (!preferences.edit().putString(SNAPSHOT, current.toString()).putString(REPORT, report.toString()).commit()) {
            throw new IllegalStateException("Failed to persist Android inventory");
        }
        return report;
    }

    public static JSONObject report(Context context) throws Exception {
        String value = context.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(REPORT, "");
        if (value == null || value.isEmpty()) return new JSONObject().put("ok", true)
                .put("checkedAt", JSONObject.NULL).put("count", JSONObject.NULL)
                .put("scope", "launchable applications visible to this APK")
                .put("note", "First phone inventory has not completed yet");
        return new JSONObject(value);
    }
}