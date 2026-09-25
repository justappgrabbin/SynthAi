package org.synthai.computer;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

public final class SynthiaVoiceBridge implements RecognitionListener, TextToSpeech.OnInitListener {
    private final Context context;
    private final WebView webView;
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady;

    public SynthiaVoiceBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
        main.post(() -> {
            if (SpeechRecognizer.isRecognitionAvailable(this.context)) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(this.context);
                recognizer.setRecognitionListener(this);
            }
            tts = new TextToSpeech(this.context, this);
        });
    }

    @JavascriptInterface
    public void listen() {
        main.post(() -> {
            if (recognizer == null) {
                emitError("Speech recognition is unavailable on this device");
                return;
            }
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            recognizer.startListening(intent);
        });
    }

    @JavascriptInterface
    public void speak(String text) {
        final String value = text == null ? "" : text.trim();
        if (value.isEmpty()) return;
        main.post(() -> {
            if (!ttsReady || tts == null) return;
            tts.stop();
            tts.speak(value, TextToSpeech.QUEUE_FLUSH, null, "synthia-" + System.currentTimeMillis());
        });
    }

    @JavascriptInterface
    public void stopSpeaking() {
        main.post(() -> { if (tts != null) tts.stop(); });
    }

    @JavascriptInterface
    public boolean isRecognitionAvailable() {
        return SpeechRecognizer.isRecognitionAvailable(context);
    }

    @Override
    public void onInit(int status) {
        ttsReady = status == TextToSpeech.SUCCESS;
        if (ttsReady) tts.setLanguage(Locale.getDefault());
    }

    @Override public void onReadyForSpeech(Bundle params) { emitState("listening"); }
    @Override public void onBeginningOfSpeech() { emitState("hearing"); }
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() { emitState("processing"); }

    @Override
    public void onError(int error) {
        emitError("Speech recognition error " + error);
    }

    @Override
    public void onResults(Bundle results) {
        ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        String text = matches == null || matches.isEmpty() ? "" : matches.get(0);
        emitTranscript(text);
    }

    @Override public void onPartialResults(Bundle partialResults) {}
    @Override public void onEvent(int eventType, Bundle params) {}

    private void emitTranscript(String text) {
        final String quoted = JSONObject.quote(text == null ? "" : text);
        main.post(() -> webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('synthia-voice-result',{detail:" + quoted + "}));", null
        ));
    }

    private void emitState(String state) {
        final String quoted = JSONObject.quote(state);
        main.post(() -> webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('synthia-voice-state',{detail:" + quoted + "}));", null
        ));
    }

    private void emitError(String error) {
        final String quoted = JSONObject.quote(error);
        main.post(() -> webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('synthia-voice-error',{detail:" + quoted + "}));", null
        ));
    }

    public void shutdown() {
        main.post(() -> {
            if (recognizer != null) {
                recognizer.cancel();
                recognizer.destroy();
                recognizer = null;
            }
            if (tts != null) {
                tts.stop();
                tts.shutdown();
                tts = null;
            }
            ttsReady = false;
        });
    }
}
