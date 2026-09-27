package app.synthai.hover;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import java.util.Locale;

/** Speech output only; exposes no device reads or hand authority to web content. */
final class HoverVoice {
    private final Handler main = new Handler(Looper.getMainLooper());
    private TextToSpeech engine;
    private boolean ready;
    private boolean closed;
    private String pending;

    HoverVoice(Context context) {
        engine = new TextToSpeech(context.getApplicationContext(), status -> {
            if (closed) return;
            ready = status == TextToSpeech.SUCCESS;
            if (ready && engine != null) {
                engine.setLanguage(Locale.getDefault());
                if (pending != null) { String text = pending; pending = null; say(text); }
            }
        });
    }

    @JavascriptInterface public void speak(String text) {
        if (text == null) return;
        String bounded = text.substring(0, Math.min(text.length(), TextToSpeech.getMaxSpeechInputLength()));
        main.post(() -> { if (closed) return; if (ready) say(bounded); else pending = bounded; });
    }

    private void say(String text) {
        if (engine != null) engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "synthia-talk");
    }

    @JavascriptInterface public void stop() {
        main.post(() -> { pending = null; if (engine != null) engine.stop(); });
    }

    void close() {
        closed = true;
        pending = null;
        if (engine != null) { engine.stop(); engine.shutdown(); engine = null; }
    }
}
