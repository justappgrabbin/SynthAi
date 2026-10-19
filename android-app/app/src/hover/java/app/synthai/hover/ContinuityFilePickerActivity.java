package app.synthai.hover;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;
import android.webkit.WebChromeClient;

/** Document picker proxy for the floating Hover WebView; runs as an Activity
 * because Android does not deliver activity results directly to a Service. */
public final class ContinuityFilePickerActivity extends Activity {
    private static final int CHOOSE = 58019;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if(state!=null) {
            // Recovering an activity after process death cannot restore a
            // previous in-memory WebView callback; fail closed.
            OverlayService.onFilesPicked(null);
            finish();
            return;
        }
        try {
            Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(intent,CHOOSE);
        }catch(Exception error) {
            Toast.makeText(this,"No Android document picker: "+error.getMessage(),Toast.LENGTH_LONG).show();
            OverlayService.onFilesPicked(null);
            finish();
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        Uri[] chosen=null;
        if(requestCode==CHOOSE&&resultCode==RESULT_OK&&data!=null) {
            if(data.getClipData()!=null) {
                int size=Math.min(data.getClipData().getItemCount(),50);
                chosen=new Uri[size];
                for(int i=0;i<size;i++)chosen[i]=data.getClipData().getItemAt(i).getUri();
            } else if(data.getData()!=null) {
                chosen=new Uri[]{data.getData()};
            }
        }
        OverlayService.onFilesPicked(chosen);
        finish();
    }
    @Override public void onBackPressed() {
        OverlayService.onFilesPicked(null);
        super.onBackPressed();
    }
}