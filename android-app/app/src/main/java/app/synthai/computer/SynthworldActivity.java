package app.synthai.computer;

import android.util.Log;
import java.util.ArrayList;
import java.util.List;
import org.godotengine.godot.GodotActivity;

/** Native scene loaded directly through Godot's Android asset reader. */
public final class SynthworldActivity extends GodotActivity {
    @Override public List<String> getCommandLine() {
        List<String> args = new ArrayList<>(super.getCommandLine());
        args.add("--main-pack"); args.add("res://synthworld/synthworld.pck");
        args.add("--rendering-method"); args.add("gl_compatibility");
        args.add("--rendering-driver"); args.add("opengl3");
        args.add("--verbose");
        return args;
    }
    @Override public void onGodotMainLoopStarted() {
        Log.i("SynthworldNative", "SYNTHWORLD_ENGINE_STARTED=true");
    }
}
