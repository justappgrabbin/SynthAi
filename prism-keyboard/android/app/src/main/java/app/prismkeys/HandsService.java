package app.prismkeys;
import android.view.accessibility.AccessibilityEvent;
public class HandsService extends SynthiaAccessibilityService {
 static HandsService active;
 protected void onServiceConnected(){super.onServiceConnected();active=this;}
 public void onDestroy(){active=null;super.onDestroy();}
 static boolean action(int id){return active!=null&&active.performGlobalAction(id);}
}
