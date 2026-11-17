package org.independentcomputer.local;
import android.app.*;import android.content.*;import android.content.pm.ServiceInfo;import android.os.*;import java.io.*;import java.nio.charset.StandardCharsets;import org.json.*;

public final class LocalComputerService extends Service {
 public static final String URL="http://127.0.0.1:8765/";public static volatile boolean ready=false;public static volatile String failure=null;
 private AssetHttpServer server;
 public void onCreate(){super.onCreate();ready=false;failure=null;
  NotificationManager notifications=getSystemService(NotificationManager.class);notifications.createNotificationChannel(new NotificationChannel("computer","Local computer",NotificationManager.IMPORTANCE_LOW));
  PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification note=new Notification.Builder(this,"computer").setSmallIcon(getApplicationInfo().icon).setContentTitle("Independent Computer is running").setContentText("Local model and source on this device. Tap to open.").setContentIntent(open).setOngoing(true).build();
  if(Build.VERSION.SDK_INT>=34)startForeground(1,note,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);else startForeground(1,note);
  try{
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=getAssets().open("asset-index.json")){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)bytes.write(buffer,0,n);}
   final JSONObject index=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
   server=new AssetHttpServer(8765,new AssetHttpServer.Source(){public InputStream open(String path)throws IOException{return getAssets().open("www/"+path);}public long size(String path)throws IOException{try{if(!index.has(path))throw new IOException("Missing asset");return index.getJSONObject(path).getLong("bytes");}catch(JSONException e){throw new IOException(e);}}});
   server.start();ready=true;
  }catch(Exception error){failure=error.getMessage();stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
 }
 public int onStartCommand(Intent intent,int flags,int startId){return START_NOT_STICKY;}
 public IBinder onBind(Intent intent){return null;}
 public void onDestroy(){ready=false;if(server!=null)server.close();super.onDestroy();}
}
