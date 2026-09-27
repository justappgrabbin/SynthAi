package app.synthai.hover;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

/**
 * Foreground host for the hover face: keeps the loopback hand bridge (8797) and the
 * embedded Linux runtime (Synthia 5.8 on 4183) alive while the planet floats.
 * Ported from Synthia 5.8 android-host (com.synthia.sovereign.BridgeForegroundService).
 */
public final class BridgeForegroundService extends Service {
    private static final String CHANNEL_ID = "synthia_hands";
    private LocalBridgeServer server;
    private HoverRuntime runtime;
    private Thread runtimeWorker;
    private Notification notification;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
                this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        notification = builder
                .setContentTitle("Synthia is ready")
                .setContentText("Local runtime " + HoverPorts.RUNTIME_URL + " and hand bridge " + HoverPorts.BRIDGE_URL)
                .setSmallIcon(app.synthai.computer.R.drawable.synthia_planet)
                .setContentIntent(pending)
                .setOngoing(true)
                .build();

        startForeground(58, notification);
        server = new LocalBridgeServer(getApplicationContext(), HoverPorts.BRIDGE_PORT);
        server.start();
        Log.i(HoverPorts.TAG, "HOVER_BRIDGE_STARTED port=" + HoverPorts.BRIDGE_PORT);
        startRuntime();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Every startForegroundService() must be answered with startForeground().
        if (notification != null) startForeground(58, notification);
        if (server != null) server.start();
        startRuntime();
        return START_STICKY;
    }

    private synchronized void startRuntime() {
        if (runtimeWorker != null && runtimeWorker.isAlive()) return;
        if (runtime != null && runtime.isVerified()) return;
        runtimeWorker = new Thread(() -> {
            try {
                HoverRuntime next = new HoverRuntime(this);
                runtime = next;
                next.startAndVerify();
            } catch (UnsupportedOperationException unsupported) {
                HoverRuntime.markFailure(unsupported.getMessage());
                Log.w(HoverPorts.TAG, "HOVER_RUNTIME_UNSUPPORTED_ABI " + unsupported.getMessage());
            } catch (Throwable error) {
                HoverRuntime.markFailure(String.valueOf(error.getMessage()));
                Log.e(HoverPorts.TAG, "HOVER_RUNTIME_FAILED " + error.getMessage(), error);
            }
        }, "Synthia-Hover-Runtime");
        runtimeWorker.setDaemon(true);
        runtimeWorker.start();
    }

    @Override
    public void onDestroy() {
        if (server != null) server.stop();
        server = null;
        if (runtime != null) runtime.stop();
        runtime = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Synthia", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Keeps Synthia's local, device-only runtime and hand bridge available.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }
}
