package app.prismkeys;
import android.app.*;
import android.content.*;
import android.os.*;
/** Keeps foreground work visible. Android still controls service lifetime. */
public class PrismServerService extends Service {
 public void onCreate(){super.onCreate();NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);nm.createNotificationChannel(new NotificationChannel("prism_worker","Prism background work",NotificationManager.IMPORTANCE_LOW));PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);Notification notice=new Notification.Builder(this,"prism_worker").setContentTitle("Prism local server").setContentText("Context, inbox and MCP tools are running on this device").setSmallIcon(android.R.drawable.ic_menu_edit).setContentIntent(open).build();startForeground(7,notice);PrismRuntime.ensure(this);PrismRuntime.startHover(this);}
 public int onStartCommand(Intent intent,int flags,int id){return START_NOT_STICKY;}
 public IBinder onBind(Intent intent){return null;}
 public void onTimeout(int startId,int type){stopSelf();}
}
