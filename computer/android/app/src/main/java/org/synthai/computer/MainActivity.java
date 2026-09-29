package org.synthai.computer;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class MainActivity extends Activity {
    static { System.loadLibrary("computer-node"); System.loadLibrary("node"); }
    private static final String ORIGIN = "http://127.0.0.1:8765";
    private static boolean nodeStarted = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private TextView status;
    private WebView browser;
    private ValueCallback<Uri[]> fileSelection;
    public native int startNode(String[] args);

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(0, bars.top, 0, bars.bottom);
            }
            return insets;
        });
        status = new TextView(this);
        status.setText("Starting Synthia's local computer…");
        status.setTextSize(18);
        status.setPadding(24, 40, 24, 24);
        root.addView(status);
        setContentView(root);
        synchronized (MainActivity.class) {
            if (!nodeStarted) {
                nodeStarted = true;
                new Thread(this::startComputer, "synthia-computer-runtime").start();
            }
        }
        waitForComputer(0);
    }

    private void startComputer() {
        try {
            int version = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            File runtime = new File(getFilesDir(), "runtime-" + version);
            File entry = new File(runtime, "mobile-entry.mjs");
            if (!entry.isFile()) extractRuntime(runtime);
            File data = new File(getFilesDir(), "computer-data");
            if (!data.exists() && !data.mkdirs()) throw new IllegalStateException("Cannot create computer data directory");
            int exit = startNode(new String[]{"node", entry.getAbsolutePath(), data.getAbsolutePath()});
            handler.post(() -> status.setText("Computer service exited: " + exit));
        } catch (Exception error) {
            handler.post(() -> status.setText("Computer startup failed: " + error));
        }
    }

    private void extractRuntime(File destination) throws Exception {
        if (!destination.exists() && !destination.mkdirs()) throw new IllegalStateException("Cannot create runtime directory");
        String base = destination.getCanonicalPath() + File.separator;
        try (InputStream source = getAssets().open("computer-assets.zip"); ZipInputStream zip = new ZipInputStream(source)) {
            ZipEntry item;
            while ((item = zip.getNextEntry()) != null) {
                File target = new File(destination, item.getName());
                if (!target.getCanonicalPath().startsWith(base)) throw new IllegalStateException("Invalid packaged path");
                if (item.isDirectory()) { if (!target.isDirectory() && !target.mkdirs()) throw new IllegalStateException("Cannot create runtime folder"); }
                else {
                    File parent = target.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) throw new IllegalStateException("Cannot create runtime folder");
                    try (FileOutputStream output = new FileOutputStream(target)) {
                        byte[] buffer = new byte[16384]; int n;
                        while ((n = zip.read(buffer)) != -1) output.write(buffer, 0, n);
                    }
                }
                zip.closeEntry();
            }
        }
    }

    private void waitForComputer(int attempt) {
        if (isFinishing() || browser != null) return;
        new Thread(() -> {
            boolean ready = false;
            try {
                HttpURLConnection check = (HttpURLConnection) new URL(ORIGIN + "/api/status").openConnection();
                check.setConnectTimeout(700);
                check.setReadTimeout(700);
                ready = check.getResponseCode() == 200;
                check.disconnect();
            } catch (Exception ignored) { }
            final boolean available = ready;
            handler.post(() -> {
                if (available) openDesktop();
                else if (attempt < 60) handler.postDelayed(() -> waitForComputer(attempt + 1), 500);
                else status.setText("The local computer did not start. Restart Synthia to retry.");
            });
        }, "computer-health-check").start();
    }

    private void openDesktop() {
        if (browser != null) return;
        root.removeView(status);
        browser = new WebView(this);
        browser.getSettings().setJavaScriptEnabled(true);
        browser.getSettings().setDomStorageEnabled(true);
        browser.getSettings().setAllowFileAccess(false);
        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !("http".equals(uri.getScheme()) && "127.0.0.1".equals(uri.getHost()) && uri.getPort() == 8765);
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileSelection != null) fileSelection.onReceiveValue(null);
                fileSelection = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*");
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(picker, 81);
                return true;
            }
        });
        root.addView(browser, new FrameLayout.LayoutParams(-1, -1));
        browser.loadUrl(ORIGIN + "/");
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != 81 || fileSelection == null) return;
        Uri[] selected = null;
        if (result == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                selected = new Uri[data.getClipData().getItemCount()];
                for (int i = 0; i < selected.length; i++) selected[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) selected = new Uri[]{data.getData()};
        }
        fileSelection.onReceiveValue(selected);
        fileSelection = null;
    }

    @Override public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }
}
