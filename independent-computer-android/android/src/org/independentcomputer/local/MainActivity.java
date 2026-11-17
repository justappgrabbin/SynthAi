package org.independentcomputer.local;
import android.app.*;import android.content.*;import android.content.pm.PackageManager;import android.graphics.Color;import android.net.Uri;import android.os.*;import android.view.*;import android.webkit.*;import android.widget.*;

public final class MainActivity extends Activity {
 private final Handler handler=new Handler(Looper.getMainLooper());private boolean launched;private TextView status;
 public void onCreate(Bundle state){super.onCreate(state);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(36,64,36,36);root.setBackgroundColor(Color.rgb(16,20,25));
  TextView title=new TextView(this);title.setText("Independent Computer");title.setTextColor(Color.WHITE);title.setTextSize(26);root.addView(title);
  status=new TextView(this);status.setText("Starting your local computer…");status.setTextColor(Color.rgb(184,239,202));status.setPadding(0,24,0,24);root.addView(status);
  Button open=new Button(this);open.setText("Open computer");open.setOnClickListener(v->openComputer());root.addView(open);
  Button stop=new Button(this);stop.setText("Stop local computer");stop.setOnClickListener(v->{stopService(new Intent(this,LocalComputerService.class));status.setText("Computer stopped. Your browser-stored work is retained.");});root.addView(stop);
  TextView info=new TextView(this);info.setText("Qwen and the complete JavaScript computer are bundled in this app. No API key or server installation. Chrome supplies the on-device WebGPU renderer; no work is sent to an external model service.");info.setTextColor(Color.LTGRAY);info.setPadding(0,28,0,0);root.addView(info);setContentView(root);
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},1);
  startForegroundService(new Intent(this,LocalComputerService.class));waitForServer(0);
 }
 private void waitForServer(int attempt){if(isFinishing())return;if(LocalComputerService.ready){status.setText("Local computer ready. Your model runs on this device.");if(!launched){launched=true;openComputer();}return;}if(LocalComputerService.failure!=null){status.setText("Could not start: "+LocalComputerService.failure);return;}if(attempt>=100){status.setText("Still starting. Tap Open computer when ready.");return;}handler.postDelayed(()->waitForServer(attempt+1),100);}
 private void openComputer(){if(!LocalComputerService.ready){status.setText("Start the app again to restart its local computer.");return;}
  Intent browser=new Intent(Intent.ACTION_VIEW,Uri.parse(LocalComputerService.URL));Bundle extras=new Bundle();extras.putBinder("android.support.customtabs.extra.SESSION",null);browser.putExtras(extras);browser.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR",Color.rgb(16,20,25));browser.putExtra("android.support.customtabs.extra.ENABLE_URLBAR_HIDING",true);
  for(String name:new String[]{"com.android.chrome","com.chrome.beta"}){try{getPackageManager().getPackageInfo(name,0);browser.setPackage(name);startActivity(browser);return;}catch(PackageManager.NameNotFoundException|ActivityNotFoundException ignored){}}
  if(browser.resolveActivity(getPackageManager())!=null){browser.setPackage(null);startActivity(browser);return;}
  showWebView();
 }
 private void showWebView(){WebView view=new WebView(this);view.getSettings().setJavaScriptEnabled(true);view.getSettings().setDomStorageEnabled(true);view.getSettings().setAllowFileAccess(false);view.getSettings().setAllowContentAccess(false);view.setWebViewClient(new WebViewClient());view.setWebChromeClient(new WebChromeClient());setContentView(view);view.loadUrl(LocalComputerService.URL);Toast.makeText(this,"Chrome is recommended for local WebGPU inference. This WebView may support foundation tools only.",Toast.LENGTH_LONG).show();}
 public void onDestroy(){handler.removeCallbacksAndMessages(null);super.onDestroy();}
}
