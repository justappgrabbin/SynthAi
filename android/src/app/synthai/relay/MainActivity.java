package app.synthai.relay;

import android.app.Activity;
import android.app.Dialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

public class MainActivity extends Activity {
  private WebView main;
  private String pendingExport;
  private final class WorkerSecrets {
    private SecretKey key() throws Exception {
      KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
      if (!store.containsAlias("relay-worker-token")) {
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder("relay-worker-token", KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        generator.generateKey();
      }
      return (SecretKey)store.getKey("relay-worker-token", null);
    }
    @JavascriptInterface public synchronized boolean saveWorkerToken(String token) {
      try {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        String encrypted = Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
        return getSharedPreferences("relay-secrets", MODE_PRIVATE).edit().putString("token", encrypted).putString("iv", iv).commit();
      } catch(Exception error) { return false; }
    }
    @JavascriptInterface public synchronized String getWorkerToken() {
      try {
        android.content.SharedPreferences preferences = getSharedPreferences("relay-secrets", MODE_PRIVATE);
        String token = preferences.getString("token", ""), iv = preferences.getString("iv", "");
        if(token.isEmpty()) return "";
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(token, Base64.NO_WRAP)), StandardCharsets.UTF_8);
      } catch(Exception error) { return ""; }
    }
  }
  private final class ExportBridge {
    @JavascriptInterface public void save(String name, String content) {
      runOnUiThread(() -> {
        if (pendingExport != null) { Toast.makeText(MainActivity.this, "Finish the current export first", Toast.LENGTH_SHORT).show(); return; }
        pendingExport = content;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(name.endsWith(".html") ? "text/html" : "application/json");
        intent.putExtra(Intent.EXTRA_TITLE, name.replaceAll("[^a-zA-Z0-9._-]", "_"));
        startActivityForResult(intent, 10);
      });
    }
  }
  private WebView createView() {
    WebView view = new WebView(this);
    view.getSettings().setJavaScriptEnabled(true);
    view.getSettings().setDomStorageEnabled(true);
    view.getSettings().setSupportMultipleWindows(true);
    view.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
    view.getSettings().setAllowFileAccess(false);
    view.getSettings().setAllowContentAccess(false);
    view.addJavascriptInterface(new ExportBridge(), "RelayAndroid");
    view.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!"relay.local".equals(uri.getHost())) return null;
        String path = uri.getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        if (path.contains("..")) return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", null, new ByteArrayInputStream(new byte[0]));
        String type = path.endsWith(".mjs") || path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".html") ? "text/html" : "application/octet-stream";
        try { return new WebResourceResponse(type, "UTF-8", getAssets().open("www" + path)); }
        catch(IOException e) { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0])); }
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        Uri uri = r.getUrl();
        if ("relay.local".equals(uri.getHost()) || "blob".equals(uri.getScheme()) || "about".equals(uri.getScheme())) return false;
        if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) startActivity(new Intent(Intent.ACTION_VIEW, uri));
        return true;
      }
    });
    view.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onCreateWindow(WebView v, boolean dialog, boolean gesture, Message result) {
        WebView child = createView();
        Dialog window = new Dialog(MainActivity.this, android.R.style.Theme_Material_NoActionBar);
        window.setContentView(child); window.show();
        window.getWindow().setLayout(-1, -1);
        window.setOnDismissListener(d -> { child.removeJavascriptInterface("RelayAndroid"); child.destroy(); });
        child.setWebChromeClient(new WebChromeClient() { @Override public void onCloseWindow(WebView w) { window.dismiss(); } });
        ((WebView.WebViewTransport) result.obj).setWebView(child); result.sendToTarget(); return true;
      }
    });
    return view;
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    main = createView();
    // Only the trusted workspace receives credentials. Generated app windows do not.
    main.addJavascriptInterface(new WorkerSecrets(), "RelaySecrets");
    main.setOnApplyWindowInsetsListener((view, insets) -> {
      view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
      return insets;
    });
    setContentView(main);
    main.loadUrl("https://relay.local/");
  }
  @Override public void onBackPressed() { if(main.canGoBack()) main.goBack(); else super.onBackPressed(); }
  @Override protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    String content = pendingExport; pendingExport = null;
    if(request != 10 || result != RESULT_OK || data == null || content == null) return;
    try(OutputStream out = getContentResolver().openOutputStream(data.getData())) { out.write(content.getBytes(StandardCharsets.UTF_8)); Toast.makeText(this,"Export saved",Toast.LENGTH_SHORT).show(); }
    catch(IOException e) { Toast.makeText(this,"Export failed: " + e.getMessage(),Toast.LENGTH_LONG).show(); }
  }
}
