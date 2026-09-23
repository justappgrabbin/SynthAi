package org.synthai.computer;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
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
                    apps.put(app);
                }
            }

            // Some vendor builds expose fewer entries through LauncherApps until
            // the app has been selected as HOME. Fall back to ordinary launcher
            // intent discovery without inventing any packages.
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
    public void latestObservation(PluginCall call) {
        String json = getContext()
            .getSharedPreferences(WorldObservationService.PREFS, Context.MODE_PRIVATE)
            .getString(WorldObservationService.KEY_LATEST, null);

        JSObject result = new JSObject();
        result.put("available", json != null);
        result.put("observationJson", json);
        result.put("enabled", isObservationEnabled());
        call.resolve(result);
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
