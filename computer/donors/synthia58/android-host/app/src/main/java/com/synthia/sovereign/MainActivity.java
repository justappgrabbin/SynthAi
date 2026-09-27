package com.synthia.sovereign;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String RUNTIME_URL = "http://127.0.0.1:4173";
    private TextView status;
    private WebView webView;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 102);
        }

        startBridge();

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(12);
        root.setPadding(pad, pad, pad, pad);

        status = new TextView(this);
        status.setTextSize(14);
        root.addView(status, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);

        Button accessibility = button("Enable hands");
        accessibility.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        controls.addView(accessibility, weight());

        Button overlay = button("Allow hover");
        overlay.setOnClickListener(v -> {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        });
        controls.addView(overlay, weight());

        Button battery = button("Battery");
        battery.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)));
        controls.addView(battery, weight());

        root.addView(controls, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout runtimeControls = new LinearLayout(this);
        runtimeControls.setOrientation(LinearLayout.HORIZONTAL);

        Button hover = button("Start hover");
        hover.setOnClickListener(v -> startHoverIfAllowed());
        runtimeControls.addView(hover, weight());

        Button reload = button("Reload Cynthia");
        reload.setOnClickListener(v -> webView.loadUrl(RUNTIME_URL));
        runtimeControls.addView(reload, weight());

        root.addView(runtimeControls, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        webView = new WebView(this);
        configureWebView(webView);
        webView.loadUrl(RUNTIME_URL);
        root.addView(webView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        setContentView(root);
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
        startBridge();
        startHoverIfAllowed();
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= 21
                        && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    request.deny();
                }
            }
        });
    }

    private void startBridge() {
        Intent bridge = new Intent(this, BridgeForegroundService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(bridge);
        else startService(bridge);
    }

    private void startHoverIfAllowed() {
        if (!Settings.canDrawOverlays(this)) return;
        Intent overlay = new Intent(this, OverlayService.class);
        startService(overlay);
    }

    private void updateStatus() {
        if (status == null) return;
        boolean hands = SynthiaAccessibilityService.getInstance() != null;
        boolean hover = Settings.canDrawOverlays(this);
        status.setText("Hands: " + (hands ? "enabled" : "needs Accessibility permission")
                + "  •  Hover: " + (hover ? "allowed" : "needs overlay permission")
                + "\nLinux runtime expected at " + RUNTIME_URL
                + "  •  Local hand bridge: http://127.0.0.1:8787");
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams weight() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
