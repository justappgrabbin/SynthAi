package app.synthai.computer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/assets/index.html";
    private static final String TAG = "SynthAIComputer";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private boolean pageReady;
    private boolean backendAttached;
    private int attachAttempts;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        startService(new Intent(this, ComputerBackendService.class));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(18, 9, 31));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " SynthAIComputer/0.4.0");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.i(TAG, "JS " + message.messageLevel() + " " + message.message());
                return true;
            }
        });
        webView.setWebViewClient(new AssetClient());
        webView.loadUrl(START_URL);
    }

    private void attachLocalBackendWhenReady() {
        if (!pageReady || backendAttached || webView == null) return;

        if (ComputerBackendService.isReady()) {
            String base = JSONObject.quote(LinuxContainer.BASE_URL);
            String secret = JSONObject.quote(ComputerBackendService.sessionSecret(this));
            String js =
                    "(async()=>{try{" +
                    "const c=globalThis.SynthAIComputer;" +
                    "if(!c||typeof c.connectLocalBackend!=='function') throw new Error('browser Computer bridge unavailable');" +
                    "const e=await c.connectLocalBackend({baseUrl:" + base + ",token:" + secret + ",timeoutMs:3000});" +
                    "return JSON.stringify({ok:true,environment:e.health.environment,version:e.health.version});" +
                    "}catch(e){return JSON.stringify({ok:false,error:String(e&&e.message||e)});}})()";

            webView.evaluateJavascript(js, value -> {
                Log.i(TAG, "LOCAL_BACKEND_JS_RESULT=" + value);
                webView.evaluateJavascript(
                        "Boolean(globalThis.SynthAIComputer && globalThis.SynthAIComputer.snapshot && globalThis.SynthAIComputer.snapshot().localBackend && globalThis.SynthAIComputer.snapshot().localBackend.status === 'VERIFIED')",
                        verified -> {
                            Log.i(TAG, "LOCAL_BACKEND_BROWSER_READY=" + verified);
                            backendAttached = "true".equals(verified);
                        }
                );
            });
            return;
        }

        attachAttempts += 1;
        if (attachAttempts < 360) {
            handler.postDelayed(this::attachLocalBackendWhenReady, 500);
        } else {
            Log.e(TAG, "LOCAL_BACKEND_ATTACH_TIMEOUT failure=" + ComputerBackendService.failure());
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private final class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!APP_HOST.equals(uri.getHost())) return super.shouldInterceptRequest(view, request);

            String rawPath = uri.getPath();
            String path = rawPath == null ? "" : rawPath;
            if (path.startsWith("/assets/")) path = path.substring("/assets/".length());
            else if (path.startsWith("/")) path = path.substring(1);
            if (path.isEmpty()) path = "index.html";

            if (path.contains("..")) {
                return errorResponse(403, "Forbidden", "Path traversal refused");
            }

            try {
                InputStream input = getAssets().open(path);
                return new WebResourceResponse(mime(path), "UTF-8", input);
            } catch (IOException error) {
                Log.e(TAG, "ASSET_MISSING " + path, error);
                return errorResponse(404, "Not Found", "Missing app asset: " + path);
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (APP_HOST.equals(uri.getHost())) return false;
            String scheme = uri.getScheme();
            if ("http".equals(scheme) || "https".equals(scheme)) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Throwable error) {
                    Log.w(TAG, "external navigation failed: " + error.getMessage());
                }
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            pageReady = true;
            attachAttempts = 0;
            Log.i(TAG, "PAGE_FINISHED " + url);
            view.postDelayed(() -> view.evaluateJavascript(
                    "Boolean(globalThis.SynthAIComputer && globalThis.SynthAIComputer.snapshot && globalThis.SynthAIComputer.snapshot().environment === 'browser')",
                    value -> Log.i(TAG, "RUNTIME_READY=" + value)
            ), 1500);
            attachLocalBackendWhenReady();
        }
    }

    private static WebResourceResponse errorResponse(int code, String reason, String message) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-store");
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                code,
                reason,
                headers,
                new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8))
        );
    }

    private static String mime(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
        return "application/octet-stream";
    }
}
