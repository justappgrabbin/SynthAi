package org.synthai.computer;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.LauncherActivityInfo;
import android.content.pm.LauncherApps;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Process;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

@CapacitorPlugin(name = "WorldShell")
public class WorldShellPlugin extends Plugin {

    @PluginMethod
    public void listApps(PluginCall call) {
        JSArray apps = new JSArray();
        try {
            LauncherApps launcherApps =
                (LauncherApps) getContext().getSystemService(Context.LAUNCHER_APPS_SERVICE);

            if (launcherApps != null) {
                List<LauncherActivityInfo> activities =
                    launcherApps.getActivityList(null, Process.myUserHandle());

                for (LauncherActivityInfo info : activities) {
                    JSObject app = new JSObject();
                    app.put("packageName", info.getApplicationInfo().packageName);
                    app.put("activity", info.getComponentName().getClassName());
                    app.put("label", String.valueOf(info.getLabel()));
                    app.put("category", categoryName(info.getApplicationInfo().category));
                    apps.put(app);
                }
            }

            if (apps.length() == 0) {
                PackageManager pm = getContext().getPackageManager();
                Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
                launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> resolved =
                    pm.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL);

                for (ResolveInfo info : resolved) {
                    JSObject app = new JSObject();
                    app.put("packageName", info.activityInfo.packageName);
                    app.put("activity", info.activityInfo.name);
                    app.put("label", String.valueOf(info.loadLabel(pm)));
                    app.put("category", categoryName(info.activityInfo.applicationInfo.category));
                    apps.put(app);
                }
            }

            JSObject result = new JSObject();
            result.put("apps", apps);
            result.put("source", "android-launcher");
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to enumerate launchable Android applications", error);
        }
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

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        String activity = call.getString("activity");

        if (packageName == null || packageName.isBlank()) {
            call.reject("packageName is required");
            return;
        }

        try {
            Intent intent;
            if (activity != null && !activity.isBlank()) {
                intent = new Intent(Intent.ACTION_MAIN);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);
                intent.setComponent(new ComponentName(packageName, activity));
            } else {
                intent = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            }

            if (intent == null) {
                call.reject("No launchable activity for " + packageName);
                return;
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("launched", true);
            result.put("packageName", packageName);
            result.put("activity", activity);
            result.put("source", "android-launcher");
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to launch " + packageName, error);
        }
    }

    private boolean isObservationEnabled() {
        String enabled = Settings.Secure.getString(
            getContext().getContentResolver(),
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        if (enabled == null || enabled.isBlank()) return false;

        String target = new ComponentName(getContext(), WorldObservationService.class).flattenToString();
        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabled);
        while (splitter.hasNext()) {
            if (target.equalsIgnoreCase(splitter.next())) return true;
        }
        return false;
    }

    @PluginMethod
    public void accessibilityStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isObservationEnabled());
        appendObservationError(result);
        call.resolve(result);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to open Android accessibility settings", error);
        }
    }

    @PluginMethod
    public void observations(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(
                WorldObservationService.PREFS,
                Context.MODE_PRIVATE
            );
            String json = prefs.getString(WorldObservationService.KEY_QUEUE, "[]");
            JSONArray queue = new JSONArray(json);

            JSObject result = new JSObject();
            result.put("observationQueueJson", queue.toString());
            result.put("count", queue.length());
            result.put("enabled", isObservationEnabled());
            appendObservationError(result);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to read Android observation queue", error);
        }
    }

    @PluginMethod
    public void ackObservations(PluginCall call) {
        Long through = call.getLong("throughObservedAt");
        if (through == null) {
            call.reject("throughObservedAt is required");
            return;
        }

        try {
            SharedPreferences prefs = getContext().getSharedPreferences(
                WorldObservationService.PREFS,
                Context.MODE_PRIVATE
            );
            JSONArray queue = new JSONArray(
                prefs.getString(WorldObservationService.KEY_QUEUE, "[]")
            );
            JSONArray keep = new JSONArray();

            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.optJSONObject(i);
                if (item == null) continue;
                if (item.optLong("observedAt", Long.MAX_VALUE) > through) {
                    keep.put(item);
                }
            }

            prefs.edit()
                .putString(WorldObservationService.KEY_QUEUE, keep.toString())
                .apply();

            JSObject result = new JSObject();
            result.put("acknowledgedThrough", through);
            result.put("remaining", keep.length());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to acknowledge Android observations", error);
        }
    }

    private void appendObservationError(JSObject result) {
        SharedPreferences prefs = getContext().getSharedPreferences(
            WorldObservationService.PREFS,
            Context.MODE_PRIVATE
        );
        String error = prefs.getString(WorldObservationService.KEY_ERROR, null);
        long errorAt = prefs.getLong(WorldObservationService.KEY_ERROR_AT, 0L);
        result.put("error", error);
        result.put("errorAt", errorAt == 0L ? null : errorAt);
    }

    @PluginMethod
    public void homeStatus(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            ResolveInfo home = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);

            String selectedPackage =
                home != null && home.activityInfo != null ? home.activityInfo.packageName : null;

            JSObject result = new JSObject();
            result.put("packageName", getContext().getPackageName());
            result.put("selectedHomePackage", selectedPackage);
            result.put("isDefaultHome", getContext().getPackageName().equals(selectedPackage));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to resolve Android HOME status", error);
        }
    }
}
