package app.synthai.updates;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import androidx.work.*;
import java.io.File;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

/** Check/download automatically; Android owns the final installation consent. */
public final class AutoUpdates {
    private AutoUpdates() {}
    public static void start(Activity activity) {
        Context context = activity.getApplicationContext();
        activity.getPreferences(Context.MODE_PRIVATE).edit().remove("offered-update").apply();
        Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager work = WorkManager.getInstance(context);
        work.enqueueUniquePeriodicWork("computer-updates", ExistingPeriodicWorkPolicy.KEEP,
            new PeriodicWorkRequest.Builder(UpdateWorker.class, 24, TimeUnit.HOURS).setConstraints(constraints).build());
        work.enqueueUniqueWork("computer-update-check", ExistingWorkPolicy.KEEP,
            new OneTimeWorkRequest.Builder(UpdateWorker.class).setConstraints(constraints).build());
        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override public void run() {
                if (activity.isFinishing() || activity.isDestroyed()) return;
                offer(activity);
                handler.postDelayed(this, 10000);
            }
        }, 3000);
    }
    static File pending(Context context) { return new File(context.getFilesDir(), "updates/pending.apk"); }
    static PackageInfo verify(Context context, File file) throws Exception {
        PackageManager pm = context.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo installed = pm.getPackageInfo(context.getPackageName(), flags);
        PackageInfo candidate = pm.getPackageArchiveInfo(file.getAbsolutePath(), flags);
        if (candidate == null || !context.getPackageName().equals(candidate.packageName)) throw new SecurityException("Update package does not match this computer");
        long next = Build.VERSION.SDK_INT >= 28 ? candidate.getLongVersionCode() : candidate.versionCode;
        long current = Build.VERSION.SDK_INT >= 28 ? installed.getLongVersionCode() : installed.versionCode;
        if (next <= current) throw new SecurityException("Update is not newer");
        Signature[] oldKeys = signatures(installed), newKeys = signatures(candidate);
        if (oldKeys == null || newKeys == null || oldKeys.length == 0 || oldKeys.length != newKeys.length) throw new SecurityException("Missing update signing identity");
        String[] a = Arrays.stream(oldKeys).map(Signature::toCharsString).sorted().toArray(String[]::new);
        String[] b = Arrays.stream(newKeys).map(Signature::toCharsString).sorted().toArray(String[]::new);
        if (!UpdatePolicy.accepts(installed.packageName, current, candidate.packageName, next, a, b)) throw new SecurityException("Update signing identity changed");
        return candidate;
    }
    private static Signature[] signatures(PackageInfo info) {
        return Build.VERSION.SDK_INT >= 28 ? (info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners()) : info.signatures;
    }
    private static void offer(Activity activity) {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        File file = pending(activity);
        if (!file.isFile()) return;
        try {
            PackageInfo next = verify(activity, file);
            android.content.SharedPreferences preferences = activity.getPreferences(Context.MODE_PRIVATE);
            if (preferences.getBoolean("install-requested", false) && activity.getPackageManager().canRequestPackageInstalls()) {
                preferences.edit().remove("install-requested").apply(); install(activity); return;
            }
            if (System.currentTimeMillis() < preferences.getLong("defer-update-until", 0)) return;
            String version = Long.toString(Build.VERSION.SDK_INT >= 28 ? next.getLongVersionCode() : next.versionCode);
            if (version.equals(preferences.getString("offered-update", ""))) return;
            preferences.edit().putString("offered-update", version).apply();
            new AlertDialog.Builder(activity).setTitle("Computer update ready")
                .setMessage("Install " + next.versionName + "? Your saved world and identity stay on this phone.")
                .setPositiveButton("Install", (dialog, which) -> install(activity))
                .setNegativeButton("Later", (dialog, which) -> activity.getPreferences(Context.MODE_PRIVATE).edit().remove("offered-update").putLong("defer-update-until", System.currentTimeMillis()+86400000L).apply()).show();
        } catch (Exception error) { file.delete(); }
    }
    private static void install(Activity activity) {
        try {
            verify(activity, pending(activity));
            if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                activity.getPreferences(Context.MODE_PRIVATE).edit().putBoolean("install-requested", true).apply();
                activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName())));
                return;
            }
            Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".updates", pending(activity));
            activity.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        } catch (Exception error) { android.widget.Toast.makeText(activity, "Update could not install: " + error.getMessage(), android.widget.Toast.LENGTH_LONG).show(); }
    }
}
