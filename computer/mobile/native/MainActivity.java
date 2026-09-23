package org.synthai.computer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WorldShellPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
