package app.synthai.hover;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Exposes the host Android runtime to Synthia without embedding or mutating another Android OS.
 *
 * Synthia can inspect launchable apps, open them, hand an app/search to Google Play when present,
 * and fall back to the provider's web surface when a native AI app is unavailable on the device.
 */
public final class AndroidRuntimeBridge {
    public static final String PLAY_STORE_PACKAGE = "com.android.vending";
    public static final String CHATGPT_PACKAGE = "com.openai.chatgpt";
    public static final String CLAUDE_PACKAGE = "com.anthropic.claude";
    public static final String MANUS_PACKAGE = "tech.butterfly.app";

    private static final String CHATGPT_WEB = "https://chatgpt.com/";
    private static final String CLAUDE_WEB = "https://claude.ai/";
    private static final String MANUS_WEB = "https://manus.im/";

    private final Context context;
    private final PackageManager packages;

    public AndroidRuntimeBridge(Context context) {
        this.context = context.getApplicationContext();
        this.packages = this.context.getPackageManager();
    }

    public JSONObject status() throws Exception {
        JSONArray abis = new JSONArray();
        for (String abi : Build.SUPPORTED_ABIS) abis.put(abi);

        JSONObject ai = new JSONObject()
                .put("chatgpt", providerStatus(CHATGPT_PACKAGE, CHATGPT_WEB))
                .put("claude", providerStatus(CLAUDE_PACKAGE, CLAUDE_WEB))
                .put("manus", providerStatus(MANUS_PACKAGE, MANUS_WEB));

        return new JSONObject()
                .put("ok", true)
                .put("hostRuntime", "android")
                .put("sdkInt", Build.VERSION.SDK_INT)
                .put("androidRelease", Build.VERSION.RELEASE)
                .put("manufacturer", Build.MANUFACTURER)
                .put("brand", Build.BRAND)
                .put("model", Build.MODEL)
                .put("supportedAbis", abis)
                .put("playStorePackage", PLAY_STORE_PACKAGE)
                .put("playStoreAvailable", isPackageInstalled(context, PLAY_STORE_PACKAGE))
                .put("browserAvailable", canOpen(Uri.parse("https://example.com/")))
                .put("ai", ai);
    }

    public JSONObject apps() throws Exception {
        Intent launcher = new Intent(Intent.ACTION_MAIN);
        launcher.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> resolved = packages.queryIntentActivities(launcher, 0);
        List<AppRecord> records = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (ResolveInfo info : resolved) {
            if (info.activityInfo == null || info.activityInfo.packageName == null) continue;
            String packageName = info.activityInfo.packageName;
            if (!seen.add(packageName)) continue;

            CharSequence rawLabel = info.loadLabel(packages);
            String label = rawLabel == null ? packageName : rawLabel.toString();
            ApplicationInfo appInfo = info.activityInfo.applicationInfo;
            boolean system = appInfo != null && (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            records.add(new AppRecord(label, packageName, info.activityInfo.name, system));
        }

        records.sort(Comparator.comparing(a -> a.label.toLowerCase(Locale.ROOT)));

        JSONArray apps = new JSONArray();
        for (AppRecord record : records) {
            apps.put(new JSONObject()
                    .put("label", record.label)
                    .put("packageName", record.packageName)
                    .put("activityName", record.activityName)
                    .put("system", record.system));
        }

        return new JSONObject()
                .put("ok", true)
                .put("count", apps.length())
                .put("apps", apps);
    }

    public JSONObject openApp(String packageName) throws Exception {
        String clean = packageName == null ? "" : packageName.trim();
        if (clean.isEmpty()) {
            return new JSONObject().put("ok", false).put("accepted", false)
                    .put("error", "packageName is required");
        }

        Intent launch = packages.getLaunchIntentForPackage(clean);
        if (launch == null) {
            return new JSONObject().put("ok", false).put("accepted", false)
                    .put("packageName", clean).put("error", "No launchable app found");
        }

        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(launch);
        return new JSONObject().put("ok", true).put("accepted", true)
                .put("action", "open-app").put("packageName", clean);
    }

    public JSONObject openStore(String packageName, String query) throws Exception {
        String cleanPackage = packageName == null ? "" : packageName.trim();
        String cleanQuery = query == null ? "" : query.trim();

        Uri nativeUri;
        Uri webUri;
        if (!cleanPackage.isEmpty()) {
            nativeUri = Uri.parse("market://details?id=" + Uri.encode(cleanPackage));
            webUri = Uri.parse("https://play.google.com/store/apps/details?id=" + Uri.encode(cleanPackage));
        } else if (!cleanQuery.isEmpty()) {
            String encoded = URLEncoder.encode(cleanQuery, StandardCharsets.UTF_8.name());
            nativeUri = Uri.parse("market://search?q=" + encoded + "&c=apps");
            webUri = Uri.parse("https://play.google.com/store/search?q=" + encoded + "&c=apps");
        } else {
            nativeUri = Uri.parse("market://apps");
            webUri = Uri.parse("https://play.google.com/store/apps");
        }

        boolean hasPlay = isPackageInstalled(context, PLAY_STORE_PACKAGE);
        if (hasPlay) {
            Intent play = new Intent(Intent.ACTION_VIEW, nativeUri)
                    .setPackage(PLAY_STORE_PACKAGE)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                context.startActivity(play);
                return new JSONObject().put("ok", true).put("accepted", true)
                        .put("action", "open-store").put("mode", "google-play")
                        .put("packageName", cleanPackage).put("query", cleanQuery);
            } catch (Exception ignored) {
                // Fall through to the browser surface below.
            }
        }

        Intent browser = new Intent(Intent.ACTION_VIEW, webUri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (browser.resolveActivity(packages) == null) {
            return new JSONObject().put("ok", false).put("accepted", false)
                    .put("action", "open-store").put("mode", "unavailable")
                    .put("error", "No Google Play app or browser can handle the request");
        }
        context.startActivity(browser);
        return new JSONObject().put("ok", true).put("accepted", true)
                .put("action", "open-store").put("mode", "web")
                .put("packageName", cleanPackage).put("query", cleanQuery);
    }

    public JSONObject openAi(String provider) throws Exception {
        String key = provider == null ? "" : provider.trim().toLowerCase(Locale.ROOT);
        String packageName;
        String webUrl;
        String canonical;

        switch (key) {
            case "chatgpt":
            case "gpt":
            case "openai":
                canonical = "chatgpt";
                packageName = CHATGPT_PACKAGE;
                webUrl = CHATGPT_WEB;
                break;
            case "claude":
            case "anthropic":
                canonical = "claude";
                packageName = CLAUDE_PACKAGE;
                webUrl = CLAUDE_WEB;
                break;
            case "manus":
                canonical = "manus";
                packageName = MANUS_PACKAGE;
                webUrl = MANUS_WEB;
                break;
            default:
                return new JSONObject().put("ok", false).put("accepted", false)
                        .put("error", "provider must be chatgpt, claude, or manus");
        }

        if (isPackageInstalled(context, packageName)) {
            JSONObject opened = openApp(packageName);
            if (opened.optBoolean("accepted", false)) {
                opened.put("provider", canonical).put("mode", "native-app").put("webFallback", webUrl);
                return opened;
            }
        }

        Uri uri = Uri.parse(webUrl);
        Intent web = new Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (web.resolveActivity(packages) == null) {
            return new JSONObject().put("ok", false).put("accepted", false)
                    .put("provider", canonical).put("mode", "unavailable")
                    .put("error", "Native app is unavailable and no browser can open the web fallback");
        }
        context.startActivity(web);
        return new JSONObject().put("ok", true).put("accepted", true)
                .put("action", "open-ai").put("provider", canonical)
                .put("packageName", packageName).put("mode", "web")
                .put("url", webUrl);
    }

    private JSONObject providerStatus(String packageName, String webUrl) throws Exception {
        return new JSONObject()
                .put("packageName", packageName)
                .put("installed", isPackageInstalled(context, packageName))
                .put("webFallback", webUrl);
    }

    private boolean canOpen(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        return intent.resolveActivity(packages) != null;
    }

    public static boolean isPackageInstalled(Context context, String packageName) {
        try {
            context.getPackageManager().getApplicationInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException missing) {
            return false;
        }
    }

    private static final class AppRecord {
        final String label;
        final String packageName;
        final String activityName;
        final boolean system;

        AppRecord(String label, String packageName, String activityName, boolean system) {
            this.label = label;
            this.packageName = packageName;
            this.activityName = activityName;
            this.system = system;
        }
    }
}
