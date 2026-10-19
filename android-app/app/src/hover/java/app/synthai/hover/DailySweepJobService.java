package app.synthai.hover;

import android.app.job.JobParameters;
import android.app.job.JobService;
import android.util.Log;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.File;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;

/** Android-owned scheduler; runs without needing the Alpine guest or Synthia UI open. */
public final class DailySweepJobService extends JobService {
    @Override public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            boolean retry = false;
            try {
                DeviceInventorySweep.scan(getApplicationContext());
                // Reuse the embedded MCP/Continuity worker only when its local
                // Linux host is actually running. Android still records the phone
                // inventory if the guest is asleep.
                runLocalReadOnlySweepIfAvailable();
                Log.i(HoverPorts.TAG, "CONTINUITY_DAILY_PHONE_SWEEP_COMPLETED");
            } catch (Exception error) {
                retry = true;
                Log.e(HoverPorts.TAG, "CONTINUITY_DAILY_PHONE_SWEEP_FAILED " + error.getMessage(), error);
            } finally {
                jobFinished(params, retry);
            }
        }, "Synthia-Phone-Daily-Sweep").start();
        return true;
    }
    private void runLocalReadOnlySweepIfAvailable() {
        HttpURLConnection connection=null;
        try {
            File keyFile=new File(getFilesDir(),"synthia58-data/synthia58/gpt-companion/access-key");
            if(!keyFile.isFile()) {
                Log.i(HoverPorts.TAG,"CONTINUITY_TASK_SWEEP_DEFERRED=no-local-key");
                return;
            }
            String key=new String(Files.readAllBytes(keyFile.toPath()),StandardCharsets.UTF_8).trim();
            if(!key.matches("[a-f0-9]{64}"))throw new IllegalStateException("Invalid local companion key");
            connection=(HttpURLConnection)new URL(HoverPorts.RUNTIME_URL+"/api/companion/tasks/sweep").openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type","application/json");
            connection.setRequestProperty("x-synthia-access-key",key);
            connection.setConnectTimeout(1400);
            connection.setReadTimeout(16000);
            connection.setDoOutput(true);
            connection.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));
            int status=connection.getResponseCode();
            Log.i(HoverPorts.TAG,status>=200&&status<300
                ? "CONTINUITY_READ_ONLY_TASK_SWEEP_SUCCESS"
                : "CONTINUITY_TASK_SWEEP_DEFERRED=HTTP_"+status);
        } catch(Exception error) {
            Log.i(HoverPorts.TAG,"CONTINUITY_TASK_SWEEP_DEFERRED="+error.getClass().getSimpleName());
        } finally {
            if(connection!=null)connection.disconnect();
        }
    }

    @Override public boolean onStopJob(JobParameters params) {
        return true;
    }
}