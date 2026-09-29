package app.synthai.hover;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Gives the overlay WebView's photo input an Activity result without storage permission. */
public final class PhotoPickerActivity extends Activity {
    private static final int PICK_IMAGE = 704;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType(getIntent().getStringExtra("mime") == null ? "image/*" : getIntent().getStringExtra("mime"));
        try {
            startActivityForResult(Intent.createChooser(pick, "Choose a photo"), PICK_IMAGE);
        } catch (Exception unavailable) {
            OverlayService.completeFileChoice(null);
            finish();
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
        OverlayService.completeFileChoice(uri == null ? null : new Uri[]{uri});
        finish();
    }

    @Override protected void onDestroy() {
        if (isFinishing()) OverlayService.completeFileChoice(null);
        super.onDestroy();
    }
}
