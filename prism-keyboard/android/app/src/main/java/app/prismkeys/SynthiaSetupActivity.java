package app.prismkeys;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
/** Presents the actual donor identity and execution surface, not a replacement configuration model. */
public class SynthiaSetupActivity extends Activity {
 public void onCreate(Bundle state){super.onCreate(state);PrismRuntime.ensure(this);PrismRuntime.startHover(this);WebView web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(HoverPorts.RUNTIME_URL+"/");}});setContentView(web);java.util.Map<String,String> headers=new java.util.HashMap<>();headers.put("Authorization","Bearer "+PrismRuntime.deviceToken());web.loadUrl(HoverPorts.RUNTIME_URL+"/",headers);}
}
