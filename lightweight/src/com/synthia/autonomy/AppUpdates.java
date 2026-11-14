package com.synthia.autonomy;
import android.app.Activity;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.*;

/** Passive daily checks; downloading always requires a separate user action. */
public final class AppUpdates {
    private static final AtomicBoolean checking=new AtomicBoolean(false);
    private static SharedPreferences prefs(Context c){return c.getSharedPreferences("github-updates",0);}
    private static PackageInfo info(Context c)throws Exception{return c.getPackageManager().getPackageInfo(c.getPackageName(),PackageManager.GET_SIGNATURES);}
    private static String signer(Context c)throws Exception {
        android.content.pm.Signature[] signatures=info(c).signatures;
        if(signatures==null||signatures.length!=1)throw new IOException("Cannot verify this installation's signing identity");
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(signatures[0].toByteArray());StringBuilder out=new StringBuilder();
        for(byte b:hash)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();
    }
    public static String status(Context c) {
        try {
            SharedPreferences p=prefs(c);PackageInfo installed=info(c);
            JSONObject value=new JSONObject().put("currentVersion",installed.versionName).put("currentCode",installed.versionCode)
                .put("autoCheck",p.getBoolean("auto",true)).put("checking",checking.get()).put("lastChecked",p.getLong("checked",0))
                .put("message",p.getString("message","Check GitHub for newer Lite versions."));
            String saved=p.getString("offer","");
            if(!saved.isEmpty()) {
                JSONObject offer=new JSONObject(saved);
                if(offer.getInt("versionCode")>installed.versionCode&&offer.getString("certificateSha256").equals(signer(c)))value.put("update",offer);
                else {p.edit().remove("offer").putString("message","You're up to date. Check GitHub for newer releases.").apply();value.put("message","You're up to date. Check GitHub for newer releases.");}
            }
            return value.toString();
        }catch(Exception e){return "{\"message\":\"Update information unavailable\"}";}
    }
    public static void auto(Context c,boolean enabled){prefs(c).edit().putBoolean("auto",enabled).apply();if(enabled)maybe(c);}
    public static void maybe(Context c){SharedPreferences p=prefs(c);if(p.getBoolean("auto",true)&&System.currentTimeMillis()-p.getLong("attempted",0)>24L*60*60*1000)check(c);}
    public static void check(Context context) {
        final Context c=context.getApplicationContext();
        if(!checking.compareAndSet(false,true))return;
        prefs(c).edit().putLong("attempted",System.currentTimeMillis()).putString("message","Checking GitHub…").apply();
        new Thread(()->{
            try {
                int installed=info(c).versionCode;String certificate=signer(c);JSONObject best=null;
                // Other SynthAi applications share this repo; select only signed Lite descriptors.
                JSONArray releases=new JSONArray(read("https://api.github.com/repos/"+UpdatePolicy.REPO+"/releases?per_page=100",2*1024*1024));
                int manifests=0;
                for(int i=0;i<releases.length()&&manifests<10;i++) {
                    JSONObject release=releases.getJSONObject(i);String url=UpdatePolicy.metadataUrl(release);if(url==null)continue;
                    manifests++;
                    JSONObject manifest=new JSONObject(read(url,32768));
                    try {JSONObject offer=UpdatePolicy.validate(release,manifest,installed,certificate);if(best==null||offer.getInt("versionCode")>best.getInt("versionCode"))best=offer;}
                    catch(IllegalArgumentException incompatible){/* Never offer another app, key, or downgrade. */}
                }
                prefs(c).edit().putString("offer",best==null?"":best.toString()).putLong("checked",System.currentTimeMillis())
                    .putString("message",best==null?"You're up to date. No newer compatible Lite release on GitHub.":"Update available: "+best.getString("versionName")+". You choose when to download.").apply();
            } catch(Exception e) {
                prefs(c).edit().putString("message","Couldn't check GitHub. Your app still works; try again when online.").apply();
            } finally {checking.set(false);}
        },"github-update-check").start();
    }
    public static void open(final Activity activity) {
        try {
            JSONObject current=new JSONObject(status(activity));JSONObject update=current.optJSONObject("update");
            if(update==null)return;
            final Uri uri=Uri.parse(update.getString("url"));
            if(!"https".equals(uri.getScheme())||!"github.com".equals(uri.getHost())||!uri.getPath().startsWith("/"+UpdatePolicy.REPO+"/releases/download/"))return;
            activity.runOnUiThread(()->{try{activity.startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){prefs(activity).edit().putString("message","No browser available to download the update.").apply();}});
        }catch(Exception ignored){}
    }
    private static String read(String initial,int max) throws Exception {
        URL url=new URL(initial);
        for(int redirects=0;redirects<=5;redirects++) {
            if(!"https".equals(url.getProtocol()))throw new IOException("HTTPS required");
            HttpURLConnection con=(HttpURLConnection)url.openConnection();
            con.setInstanceFollowRedirects(false);con.setConnectTimeout(15000);con.setReadTimeout(20000);
            con.setRequestProperty("User-Agent","Synthia-Adaptive-Lite-Updater");con.setRequestProperty("Accept","application/vnd.github+json");
            try {
                int code=con.getResponseCode();
                if(code>=300&&code<400){String next=con.getHeaderField("Location");if(next==null)throw new IOException("Missing redirect");url=new URL(url,next);continue;}
                if(code!=200)throw new IOException("GitHub HTTP "+code);
                try(InputStream in=con.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                    byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>max)throw new IOException("Response too large");out.write(buffer,0,n);}
                    return new String(out.toByteArray(),java.nio.charset.StandardCharsets.UTF_8);
                }
            }finally{con.disconnect();}
        }
        throw new IOException("Too many redirects");
    }
}
