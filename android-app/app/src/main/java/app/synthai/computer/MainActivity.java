package app.synthai.computer;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/assets/index.html";

    private WebView webView;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(18, 9, 31));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " SynthAIComputer/0.3.0");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new AssetClient());
        webView.loadUrl(START_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
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
                return errorResponse(404, "Not Found", "Missing app asset: " + path);
            }
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
