package app.prismkeys;
import android.content.*;
import android.security.keystore.*;
import android.util.Base64;
import android.webkit.WebView;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.io.*;
import java.security.KeyStore;
import org.json.JSONObject;

/** Owns the server independently of the WebView and protects provider credentials with Android Keystore. */
public final class PrismRuntime {
 public static final int PORT=8770;public static final String URL="http://127.0.0.1:"+PORT+"/";
 private static HoverRuntime hover;private static LocalBridgeServer handBridge;private static boolean startingHover;private static PrismServer server;private static Vault vault;private static String failure="";
 public static synchronized PrismServer ensure(Context context){if(server!=null)return server;try{Context app=context.getApplicationContext();vault=new Vault(app);server=new PrismServer(new File(app.getFilesDir(),"prism-runtime"),vault,name->app.getAssets().open(name),PORT);}catch(Exception e){failure=e.getMessage();}return server;}
 public static File override(Context context,String name){return new File(context.getFilesDir(),"prism-runtime/overrides/"+name);}
 public static void connect(WebView web){PrismServer s=ensure(web.getContext());if(s==null){web.evaluateJavascript("toast("+JSONObject.quote("Device server failed to start: "+failure)+")",null);return;}web.evaluateJavascript("window.prismEmbedded=true;enableEmbeddedRuntimeUI();workerToken="+JSONObject.quote(s.token)+";sessionStorage.setItem('prismToken',workerToken);byId('workerToken').value=workerToken;refreshWorker();",null);}
 public static synchronized void startHover(Context context){if(startingHover||(hover!=null&&hover.isVerified()))return;startingHover=true;Context app=context.getApplicationContext();new Thread(()->{try{ensure(app);if(handBridge==null){handBridge=new LocalBridgeServer(app,HoverPorts.BRIDGE_PORT);handBridge.start();}hover=new HoverRuntime(app);hover.startAndVerify();}catch(Exception e){HoverRuntime.markFailure(e.getMessage());}finally{startingHover=false;}},"Prism-Synthia-Linux").start();}
 public static String deviceToken(){return server==null?"":server.token;}
 public static String hoverState(){return HoverRuntime.isReady()?"ready":HoverRuntime.failure()!=null?"failed: "+HoverRuntime.failure():startingHover?"starting":"not started";}
 public static String get(String key,String fallback){return vault==null?fallback:vault.get(key,fallback);}
 public static void set(String key,String value)throws Exception{if(vault==null)throw new Exception("Server not initialized");vault.set(key,value);}
 public static void restoreUI(Context context){for(String name:new String[]{"index.html","companion.js","keyboard-ui.js"}){File f=override(context,name);if(f.exists())f.delete();}}
 public static final class Vault implements PrismServer.Config {
  private final SharedPreferences prefs;private final SecretKey key;
  Vault(Context c)throws Exception{prefs=c.getSharedPreferences("prism_server_secrets",Context.MODE_PRIVATE);KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);String alias="PrismServerConfig";if(!store.containsAlias(alias)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}key=(SecretKey)store.getKey(alias,null);}
  public String embeddedCommand(String command,boolean python)throws Exception{if(hover==null)throw new Exception("Embedded Synthia Linux is starting");return hover.execute(command,python);}
  public synchronized String get(String name,String fallback){String saved=prefs.getString(name,null);if(saved==null){if(name.equals("synthiaMode"))return "hover";if(name.equals("synthiaUrl"))return HoverPorts.RUNTIME_URL;if(name.equals("synthiaToken"))return deviceToken();if(name.equals("hoverState"))return hoverState();return fallback;}try{String[] pieces=saved.split(":",2);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Base64.decode(pieces[0],Base64.NO_WRAP)));return new String(cipher.doFinal(Base64.decode(pieces[1],Base64.NO_WRAP)),"UTF-8");}catch(Exception e){return fallback;}}
  synchronized void set(String name,String value)throws Exception{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key);String saved=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes("UTF-8")),Base64.NO_WRAP);if(!prefs.edit().putString(name,saved).commit())throw new IOException("Could not save server setting");}
 }
}
