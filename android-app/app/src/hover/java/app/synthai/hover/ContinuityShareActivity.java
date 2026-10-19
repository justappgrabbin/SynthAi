package app.synthai.hover;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.json.JSONObject;

/**
 * User-initiated Android Shares and text-selection actions become reviewable
 * SYNTHAI CONTINUITY entries. No keyboard interception or background capture.
 */
public final class ContinuityShareActivity extends Activity {
    private String pending;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Intent intent=getIntent();
        CharSequence incoming = null;
        if(Intent.ACTION_PROCESS_TEXT.equals(intent.getAction())) {
            incoming=intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
        } else if(Intent.ACTION_SEND.equals(intent.getAction())) {
            incoming=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        }
        pending=incoming==null?"":incoming.toString().trim();
        if(pending.isEmpty()) { Toast.makeText(this,"No shared text was provided.",Toast.LENGTH_LONG).show();finish();return; }
        if(pending.length()>15000)pending=pending.substring(0,15000);

        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF171428);
        int padding=(int)(18*getResources().getDisplayMetrics().density);
        root.setPadding(padding,padding,padding,padding);

        TextView title=new TextView(this);
        title.setText("Send to SYNTHAI CONTINUITY");
        title.setTextColor(Color.WHITE);title.setTextSize(22);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        TextView explanation=new TextView(this);
        explanation.setText("Only the text you selected or shared will be saved. This does not read your other conversations automatically.");
        explanation.setTextColor(0xFFCEC5E5);explanation.setTextSize(14);
        explanation.setPadding(0,14,0,18);
        root.addView(explanation,new LinearLayout.LayoutParams(-1,-2));

        TextView excerpt=new TextView(this);
        excerpt.setText(pending.length()>650?pending.substring(0,650)+"…":pending);
        excerpt.setTextColor(0xFFEDE8FC);excerpt.setTextSize(14);
        excerpt.setPadding(12,12,12,12);
        excerpt.setBackgroundColor(0xFF302A49);
        root.addView(excerpt,new LinearLayout.LayoutParams(-1,0,1f));

        Button save=new Button(this);
        save.setText("Save selected text");
        save.setAllCaps(false);
        root.addView(save,new LinearLayout.LayoutParams(-1,-2));
        Button cancel=new Button(this);
        cancel.setText("Cancel — do not save");
        cancel.setAllCaps(false);
        root.addView(cancel,new LinearLayout.LayoutParams(-1,-2));
        cancel.setOnClickListener(v->finish());
        save.setOnClickListener(v->{
            save.setEnabled(false);
            save.setText("Saving to Continuity…");
            new Thread(()->{
                String outcome=null;
                try {
                    final String key=readAccessKey();
                    final String sharedText=pending;
                    JSONObject event=new JSONObject();
                    event.put("type","conversation");
                    event.put("actor","android-share");
                    event.put("content",sharedText);
                    event.put("ref","phone-explicit-share:"+getIntent().getAction());
                    HttpURLConnection conn=(HttpURLConnection)new URL(HoverPorts.RUNTIME_URL+"/api/companion/events").openConnection();
                    try {
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type","application/json; charset=utf-8");
                        conn.setRequestProperty("x-synthia-access-key",key);
                        conn.setConnectTimeout(2500);
                        conn.setReadTimeout(8000);
                        conn.setDoOutput(true);
                        conn.getOutputStream().write(event.toString().getBytes(StandardCharsets.UTF_8));
                        int code=conn.getResponseCode();
                        if(code!=201)throw new IllegalStateException("Local continuity service returned HTTP "+code);
                        outcome=null;
                    } finally { conn.disconnect(); }
                } catch(Exception e) { outcome=e.getMessage(); }
                final String result=outcome;
                runOnUiThread(()->{
                    if(result==null) {
                        Toast.makeText(this,"Saved to SYNTHAI CONTINUITY.",Toast.LENGTH_LONG).show();
                        finish();
                    } else {
                        Toast.makeText(this,"Not saved: "+result,Toast.LENGTH_LONG).show();
                        save.setText("Retry save");save.setEnabled(true);
                    }
                });
            },"Prism-Continuity-Share").start();
        });
        setContentView(root);
    }

    private String readAccessKey() throws Exception {
        File path=new File(getFilesDir(),"synthia58-data/synthia58/gpt-companion/access-key");
        if(!path.isFile())throw new IllegalStateException("Open SYNTHAI CONTINUITY once to initialize its private key");
        String token=new String(Files.readAllBytes(path.toPath()),StandardCharsets.UTF_8).trim();
        if(!token.matches("[a-f0-9]{64}"))throw new IllegalStateException("Invalid companion access key");
        return token;
    }
}