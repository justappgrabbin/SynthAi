package app.synthai.hover;

/**
 * Loopback ports for the hover face. Deliberately different from Synthia 5.8's
 * defaults (4173 / 8787) so a Termux-hosted 5.8 or the Venom Computer app on the
 * same phone never collides with the embedded hover runtime.
 */
final class HoverPorts {
    static final String HOST = "127.0.0.1";
    static final int RUNTIME_PORT = 4183;
    static final int BRIDGE_PORT = 8797;
    static final String RUNTIME_URL = "http://" + HOST + ":" + RUNTIME_PORT;
    static final String BRIDGE_URL = "http://" + HOST + ":" + BRIDGE_PORT;
    static final String TAG = "SynthiaHover";

    private HoverPorts() {}
}
