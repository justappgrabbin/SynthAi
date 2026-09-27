package app.synthai.hover;

import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Floating Synthia planet + expandable panel. Ported from Synthia 5.8 android-host
 * (com.synthia.sovereign.OverlayService) with:
 *  - runtime URL 127.0.0.1:4183 (hover face port),
 *  - no dark background: transparent panel + transparent WebView, and a light-theme CSS
 *    override injected at page load (5.8's own ui/ files are not edited).
 */
public final class OverlayService extends Service {
    private static volatile OverlayService instance;
    private static final String RUNTIME_URL = HoverPorts.RUNTIME_URL;

    /**
     * Injected into Synthia 5.8's front screen. Hides the dimming/blurring .veil and swaps
     * the ~95% opaque dark .workspace gradient for a light translucent glass.
     */
    static final String LIGHT_CSS =
            "html,body{background:transparent!important}"
            + ".veil{display:none!important;background:transparent!important;"
            + "backdrop-filter:none!important;-webkit-backdrop-filter:none!important}"
            + ".workspace{background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(236,226,255,.26))!important;"
            + "backdrop-filter:blur(10px) saturate(1.1);-webkit-backdrop-filter:blur(10px) saturate(1.1);"
            + "box-shadow:0 12px 40px rgba(60,20,120,.18)!important;"
            // 5.8's text is light-on-dark; a soft shadow keeps it legible on the light glass.
            + "text-shadow:0 1px 2px rgba(20,6,40,.6)}";

    static final String INJECT_JS =
            "(function(){try{var id='synthai-hover-light';var s=document.getElementById(id);"
            + "if(!s){s=document.createElement('style');s.id=id;"
            + "(document.head||document.documentElement).appendChild(s);}"
            + "s.textContent=" + jsString(LIGHT_CSS) + ";return 'ok';}catch(e){return 'err:'+e;}})()";

    private WindowManager windowManager;
    private ImageButton bubble;
    private LinearLayout panel;
    private WindowManager.LayoutParams bubbleParams;
    private WindowManager.LayoutParams panelParams;
    private WebView panelWebView;
    private HoverVoice voice;

    public static void hideForAction(long millis) {
        OverlayService current = instance;
        if (current == null) return;
        current.hideTemporarily(millis);
    }

    static void setIdentityEditing(boolean editing) {
        OverlayService current = instance;
        if (current == null || current.bubble == null) return;
        current.bubble.setVisibility(editing ? View.GONE : View.VISIBLE);
        if (editing && current.panel != null) current.panel.setVisibility(View.GONE);
        if (!editing && current.panelWebView != null) {
            current.panelWebView.evaluateJavascript("window.dispatchEvent(new Event('focus'))", null);
        }
    }

    static boolean isRunning() {
        return instance != null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        if (!Settings.canDrawOverlays(this)) {
            Log.w(HoverPorts.TAG, "HOVER_OVERLAY_DENIED");
            stopSelf();
            return;
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createBubble();
        createPanel();
        Log.i(HoverPorts.TAG, "HOVER_PLANET_VISIBLE=true");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    private void createBubble() {
        bubble = new ImageButton(this);
        bubble.setImageResource(app.synthai.computer.R.drawable.synthia_planet);
        bubble.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        bubble.setBackgroundColor(0x00000000);
        bubble.setPadding(dp(4), dp(4), dp(4), dp(4));
        bubble.setContentDescription("Open Synthia");

        bubbleParams = new WindowManager.LayoutParams(
                dp(72), dp(72),
                overlayType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = getResources().getDisplayMetrics().widthPixels - dp(88);
        bubbleParams.y = Math.round(getResources().getDisplayMetrics().heightPixels * 0.28f);

        final float[] touch = new float[4];
        bubble.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    touch[0] = event.getRawX();
                    touch[1] = event.getRawY();
                    touch[2] = bubbleParams.x;
                    touch[3] = bubbleParams.y;
                    return true;
                case MotionEvent.ACTION_MOVE:
                    bubbleParams.x = Math.round(touch[2] + event.getRawX() - touch[0]);
                    bubbleParams.y = Math.round(touch[3] + event.getRawY() - touch[1]);
                    windowManager.updateViewLayout(bubble, bubbleParams);
                    return true;
                case MotionEvent.ACTION_UP:
                    float dx = Math.abs(event.getRawX() - touch[0]);
                    float dy = Math.abs(event.getRawY() - touch[1]);
                    if (dx < dp(8) && dy < dp(8)) togglePanel();
                    return true;
                default:
                    return false;
            }
        });

        windowManager.addView(bubble, bubbleParams);
    }

    private void createPanel() {
        panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        // No dark backdrop: 5.8 shipped 0xEE090613 here.
        panel.setBackgroundColor(Color.TRANSPARENT);
        panel.setVisibility(View.GONE);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setPadding(dp(10), dp(4), dp(6), dp(4));
        bar.setBackgroundColor(0x40FFFFFF);

        TextView title = new TextView(this);
        title.setText("Synthia");
        title.setTextColor(0xFF3A1D66);
        title.setTextSize(16);
        bar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button identity = new Button(this);
        identity.setText("Birth details");
        identity.setAllCaps(false);
        identity.setOnClickListener(v -> {
            panel.setVisibility(View.GONE);
            Intent edit = new Intent(this, IdentityActivity.class);
            edit.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(edit);
        });
        bar.addView(identity, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, dp(44)));

        Button close = new Button(this);
        close.setText("×");
        close.setAllCaps(false);
        close.setOnClickListener(v -> panel.setVisibility(View.GONE));
        bar.addView(close, new LinearLayout.LayoutParams(dp(52), dp(44)));

        panel.addView(bar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        panelWebView = new WebView(this);
        voice = new HoverVoice(this);
        panelWebView.addJavascriptInterface(voice, "SynthiaVoice");
        panelWebView.setBackgroundColor(Color.TRANSPARENT);
        WebSettings settings = panelWebView.getSettings();
        panelWebView.setFocusableInTouchMode(true);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        panelWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                injectLightTheme(view);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                injectLightTheme(view);
            }
        });
        panelWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Microphone permission is granted only if the user granted Android RECORD_AUDIO.
                if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                        == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    request.deny();
                }
            }
        });
        panelWebView.loadUrl(RUNTIME_URL);
        panel.addView(panelWebView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        panelParams = new WindowManager.LayoutParams(
                Math.min(dp(430), getResources().getDisplayMetrics().widthPixels - dp(24)),
                Math.min(dp(760), getResources().getDisplayMetrics().heightPixels - dp(96)),
                overlayType(),
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
        panelParams.gravity = Gravity.CENTER;
        panelParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        windowManager.addView(panel, panelParams);
    }

    private static void injectLightTheme(WebView view) {
        if (view == null) return;
        view.evaluateJavascript(INJECT_JS, null);
    }

    private void togglePanel() {
        if (panel == null) return;
        if (panel.getVisibility() == View.VISIBLE) {
            panel.setVisibility(View.GONE);
        } else {
            panel.setVisibility(View.VISIBLE);
            if (panelWebView != null) panelWebView.requestFocus();
        }
    }

    private void hideTemporarily(long millis) {
        if (bubble == null || panel == null) return;
        bubble.post(() -> {
            if (bubble == null || panel == null) return;
            boolean bubbleWasVisible = bubble.getVisibility() == View.VISIBLE;
            boolean panelWasVisible = panel.getVisibility() == View.VISIBLE;
            bubble.setVisibility(View.INVISIBLE);
            panel.setVisibility(View.INVISIBLE);
            bubble.postDelayed(() -> {
                if (bubble == null || panel == null) return;
                if (bubbleWasVisible) bubble.setVisibility(View.VISIBLE);
                if (panelWasVisible) panel.setVisibility(View.VISIBLE);
            }, Math.max(250, millis));
        });
    }

    private int overlayType() {
        return Build.VERSION.SDK_INT >= 26
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static String jsString(String value) {
        StringBuilder out = new StringBuilder("'");
        for (char c : value.toCharArray()) {
            if (c == '\\' || c == '\'') out.append('\\');
            out.append(c);
        }
        return out.append('\'').toString();
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (voice != null) voice.close();
        try {
            if (bubble != null) windowManager.removeView(bubble);
        } catch (Exception ignored) {}
        try {
            if (panel != null) windowManager.removeView(panel);
        } catch (Exception ignored) {}
        if (panelWebView != null) {
            panelWebView.destroy();
            panelWebView = null;
        }
        bubble = null;
        panel = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
