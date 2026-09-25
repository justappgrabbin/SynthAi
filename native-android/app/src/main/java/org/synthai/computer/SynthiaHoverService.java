package org.synthai.computer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class SynthiaHoverService extends Service {
    private static final String CHANNEL = "synthia-prime-hover";
    private static final int NOTIFICATION_ID = 5801;
    private WindowManager windowManager;
    private View bubble;
    private FrameLayout panel;
    private WebView primeWebView;
    private SynthiaVoiceBridge voiceBridge;
    private boolean expanded;

    public static void start(Context context) {
        Intent intent = new Intent(context, SynthiaHoverService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(NOTIFICATION_ID, notification());
        if (Settings.canDrawOverlays(this)) showBubble();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (bubble == null && Settings.canDrawOverlays(this)) showBubble();
        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager.class).createNotificationChannel(
                new NotificationChannel(CHANNEL, "Synthia Prime hover", NotificationManager.IMPORTANCE_LOW)
            );
        }
    }

    private Notification notification() {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL)
            : new Notification.Builder(this);
        return builder
            .setContentTitle("Synthia Prime")
            .setContentText("Hover surface is resident")
            .setSmallIcon(android.R.drawable.presence_online)
            .setOngoing(true)
            .build();
    }

    private WindowManager.LayoutParams params(int width, int height, boolean focusable) {
        int type = Build.VERSION.SDK_INT >= 26
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        int flags = WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
        if (!focusable) flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
            width, height, type, flags, PixelFormat.TRANSLUCENT
        );
        p.gravity = Gravity.TOP | Gravity.END;
        p.x = 12;
        p.y = 220;
        return p;
    }

    private void showBubble() {
        if (bubble != null) return;
        windowManager = getSystemService(WindowManager.class);
        TextView view = new TextView(this);
        view.setText("S");
        view.setTextSize(20);
        view.setGravity(Gravity.CENTER);
        view.setBackgroundColor(0xCC17131F);
        view.setTextColor(0xFFFFFFFF);
        view.setOnClickListener(v -> togglePanel());
        windowManager.addView(view, params(dp(58), dp(58), false));
        bubble = view;
    }

    private void togglePanel() {
        if (expanded) collapse();
        else expand();
    }

    private void expand() {
        if (panel != null) return;
        FrameLayout shell = new FrameLayout(this);
        WebView web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.setWebViewClient(new WebViewClient());
        voiceBridge = new SynthiaVoiceBridge(this, web);
        web.addJavascriptInterface(voiceBridge, "SynthiaVoice");
        primeWebView = web;
        web.loadUrl("http://127.0.0.1:17759/");
        shell.addView(web, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        TextView close = new TextView(this);
        close.setText("×");
        close.setTextSize(24);
        close.setGravity(Gravity.CENTER);
        close.setBackgroundColor(0xAA000000);
        close.setTextColor(0xFFFFFFFF);
        close.setOnClickListener(v -> collapse());
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(dp(52), dp(52), Gravity.TOP | Gravity.END);
        shell.addView(close, closeParams);
        windowManager.addView(shell, params(dp(360), dp(520), true));
        panel = shell;
        expanded = true;
    }

    private void collapse() {
        if (panel != null && windowManager != null) {
            windowManager.removeView(panel);
            panel = null;
        }
        if (voiceBridge != null) {
            voiceBridge.shutdown();
            voiceBridge = null;
        }
        if (primeWebView != null) {
            primeWebView.removeJavascriptInterface("SynthiaVoice");
            primeWebView.destroy();
            primeWebView = null;
        }
        expanded = false;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onDestroy() {
        collapse();
        if (bubble != null && windowManager != null) windowManager.removeView(bubble);
        bubble = null;
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
