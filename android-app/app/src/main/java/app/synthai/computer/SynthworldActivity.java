package app.synthai.computer;

import android.os.Bundle;
import android.widget.Toast;
import java.io.*;
import java.util.ArrayList;
import java.util.List;
import org.godotengine.godot.GodotActivity;

/** Native Godot scene, isolated from the Computer's backend process. */
public final class SynthworldActivity extends GodotActivity {
    private File pack;
    @Override public void onCreate(Bundle state) {
        try {
            File directory = new File(getFilesDir(), "synthworld-program");
            if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot create game directory");
            pack = new File(directory, "synthworld.pck");
            File temporary = new File(directory, "synthworld.pck.new");
            try (InputStream in = getAssets().open("synthworld/synthworld.pck"); OutputStream out = new FileOutputStream(temporary)) {
                byte[] bytes = new byte[16384]; int count;
                while ((count = in.read(bytes)) != -1) out.write(bytes, 0, count);
            }
            if (!temporary.renameTo(pack)) throw new IOException("Cannot install game pack");
        } catch (IOException error) {
            Toast.makeText(this, "Synthworld could not start: " + error.getMessage(), Toast.LENGTH_LONG).show();
            finish(); return;
        }
        super.onCreate(state);
    }
    @Override public List<String> getCommandLine() {
        List<String> args = new ArrayList<>(super.getCommandLine());
        args.add("--main-pack"); args.add(pack.getAbsolutePath());
        args.add("--rendering-method"); args.add("gl_compatibility");
        return args;
    }
}
