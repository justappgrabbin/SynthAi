package app.synthai.hover;

import android.app.job.JobParameters;
import android.app.job.JobService;
import android.util.Log;

/** Android-owned scheduler; runs without needing the Alpine guest or Synthia UI open. */
public final class DailySweepJobService extends JobService {
    @Override public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            boolean retry = false;
            try {
                DeviceInventorySweep.scan(getApplicationContext());
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
    @Override public boolean onStopJob(JobParameters params) {
        return true;
    }
}