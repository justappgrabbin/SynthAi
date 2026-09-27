package app.synthai.hover;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Activity-backed editor gives birth entry a normal Android window and keyboard. */
public final class IdentityActivity extends Activity {
    private WebView editor;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        editor = new WebView(this);
        editor.getSettings().setJavaScriptEnabled(true);
        editor.getSettings().setDomStorageEnabled(true);
        editor.getSettings().setAllowFileAccess(false);
        editor.getSettings().setAllowContentAccess(false);
        editor.setFocusableInTouchMode(true);
        editor.setWebViewClient(new WebViewClient());
        setContentView(editor);
        editor.loadUrl(HoverPorts.RUNTIME_URL + "/?setup=1");
    }

    @Override protected void onResume() {
        super.onResume();
        OverlayService.setIdentityEditing(true);
    }

    @Override protected void onPause() {
        OverlayService.setIdentityEditing(false);
        super.onPause();
    }

    @Override protected void onDestroy() {
        if (editor != null) editor.destroy();
        super.onDestroy();
    }
}
