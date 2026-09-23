package org.synthai.computer;

import android.app.Notification;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class WorldNotificationListener extends NotificationListenerService {
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
        Notification notification = sbn.getNotification();
        CharSequence title = notification.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = notification.extras.getCharSequence(Notification.EXTRA_TEXT);

        JSONObject envelope = new JSONObject();
        JSONObject data = new JSONObject();
        try {
            data.put("id", sbn.getKey());
            data.put("packageName", sbn.getPackageName());
            data.put("title", title == null ? "" : title.toString());
            data.put("text", text == null ? "" : text.toString());
            data.put("at", sbn.getPostTime());
            envelope.put("id", "notification-" + sbn.getKey());
            envelope.put("type", "notification");
            envelope.put("residentId", "synthia");
            envelope.put("notification", data);
        } catch (Exception ignored) {}

        EventJournal journal = new EventJournal(this);
        if (!journal.append(envelope)) {
            getSharedPreferences("synthai-native", MODE_PRIVATE)
                .edit()
                .putString("notificationError", journal.lastError())
                .putLong("notificationErrorAt", System.currentTimeMillis())
                .apply();
        }
        io.execute(() -> {
            NativeSeedClient client = new NativeSeedClient("http://127.0.0.1:17757");
            if (!client.health().ok) TermuxBridge.startNativeSeed(this);
        });
    }

    @Override
    public void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }
}
