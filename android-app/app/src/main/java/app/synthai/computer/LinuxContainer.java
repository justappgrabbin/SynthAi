package app.synthai.computer;

import android.content.Context;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

final class LinuxContainer {
    static final String BASE_URL = "http://127.0.0.1:17380";
    private static final String TAG = "SynthAIComputer";

    private final Context context;
    private final String sessionSecret;
    private final StringBuilder outputTail = new StringBuilder();
    private volatile Process process;
    private volatile boolean verified;

    LinuxContainer(Context context, String sessionSecret) {
        this.context = context.getApplicationContext();
        this.sessionSecret = sessionSecret;
    }

    boolean isVerified() {
        return verified && isAlive(process);
    }

    void startAndVerify() throws Exception {
        if (!supportsArm64()) {
            throw new UnsupportedOperationException(
                    "embedded Linux backend is ARM64; device ABIs=" + Arrays.toString(Build.SUPPORTED_ABIS));
        }

        RootfsInstaller.Result installed = RootfsInstaller.installIfNeeded(context);
        Exception firstFailure = null;

        try {
            launch(installed, false);
            verifyGuestBackend();
            verified = true;
            Log.i(TAG, "LOCAL_BACKEND_READY=true rootfs=" + installed.version + " noSeccomp=false");
            return;
        } catch (Exception error) {
            firstFailure = error;
            Log.w(TAG, "LOCAL_BACKEND_FIRST_BOOT_FAILED " + error.getMessage());
            stop();
        }

        outputTail.setLength(0);
        launch(installed, true);
        try {
            verifyGuestBackend();
            verified = true;
            Log.i(TAG, "LOCAL_BACKEND_READY=true rootfs=" + installed.version + " noSeccomp=true");
        } catch (Exception secondFailure) {
            stop();
            throw new IllegalStateException(
                    "Linux backend failed normal and no-seccomp boot. first="
                            + firstFailure.getMessage() + " second=" + secondFailure.getMessage()
                            + " tail=" + tail(), secondFailure);
        }
    }

    private void launch(RootfsInstaller.Result installed, boolean noSeccomp) throws Exception {
        File nativeDir = new File(context.getApplicationInfo().nativeLibraryDir);
        File proot = new File(nativeDir, "libproot.so");
        File loader = new File(nativeDir, "libproot-loader.so");
        File loader32 = new File(nativeDir, "libproot-loader32.so");

        requireExecutable(proot, "PRoot");
        requireExecutable(loader, "PRoot 64-bit loader");

        File tmp = new File(context.getFilesDir(), "proot-tmp");
        if (!tmp.exists()) tmp.mkdirs();

        List<String> command = new ArrayList<>();
        command.add(proot.getAbsolutePath());
        command.add("-0");
        command.add("--link2symlink");
        command.add("-r");
        command.add(installed.rootfs.getAbsolutePath());
        command.add("-b");
        command.add("/dev");
        command.add("-b");
        command.add("/proc");
        command.add("-b");
        command.add("/sys");
        command.add("-b");
        command.add(installed.data.getAbsolutePath() + ":/var/lib/synthai");
        command.add("-w");
        command.add("/opt/synthai");
        command.add("/usr/local/bin/node");
        command.add("/opt/synthai/computer/backend/local-server.mjs");

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.redirectErrorStream(true);
        Map<String, String> env = builder.environment();
        env.put("PROOT_TMP_DIR", tmp.getAbsolutePath());
        env.put("PROOT_LOADER", loader.getAbsolutePath());
        if (loader32.isFile()) env.put("PROOT_LOADER_32", loader32.getAbsolutePath());
        env.put("LD_LIBRARY_PATH", nativeDir.getAbsolutePath());
        env.put("HOME", "/root");
        env.put("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin");
        env.put("TMPDIR", "/tmp");
        env.put("SYNTHAI_LOCAL_HOST", "127.0.0.1");
        env.put("SYNTHAI_LOCAL_PORT", "17380");
        env.put("SYNTHAI_LOCAL_TOKEN", sessionSecret);
        env.put("SYNTHAI_STATE_DIR", "/var/lib/synthai");
        env.put("SYNTHAI_EVENT_LOG", "/var/lib/synthai/events.ndjson");
        if (noSeccomp) env.put("PROOT_NO_SECCOMP", "1");

        process = builder.start();
        Thread reader = new Thread(() -> drain(process), "SynthAI-Linux-output");
        reader.setDaemon(true);
        reader.start();
        Log.i(TAG, "LOCAL_BACKEND_PROCESS_STARTED pid=" + process);
    }

    private void verifyGuestBackend() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 120_000L;
        Exception last = null;

        while (SystemClock.elapsedRealtime() < deadline) {
            Process current = process;
            if (!isAlive(current)) {
                throw new IllegalStateException("PRoot guest exited before backend became ready: " + tail());
            }

            try {
                String health = http("GET", "/health", null);
                if (!health.contains("\"ok\":true") || !health.contains("\"environment\":\"linux-local\"")) {
                    throw new IllegalStateException("unexpected health response: " + health);
                }

                String snapshot = http(
                        "POST",
                        "/rpc",
                        "{\"method\":\"snapshot\",\"args\":[]}");
                if (!snapshot.contains("\"ok\":true") || !snapshot.contains("\"version\"")) {
                    throw new IllegalStateException("canonical Computer snapshot probe failed: " + snapshot);
                }

                String projectList = http(
                        "POST",
                        "/rpc",
                        "{\"method\":\"project.list\",\"args\":[]}");
                if (!projectList.contains("\"ok\":true")) {
                    throw new IllegalStateException("Computer project RPC probe failed: " + projectList);
                }
                return;
            } catch (Exception error) {
                last = error;
                SystemClock.sleep(500);
            }
        }

        throw new IllegalStateException(
                "local Computer backend did not become ready: "
                        + (last == null ? "unknown" : last.getMessage()) + " tail=" + tail());
    }

    private String http(String method, String path, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(BASE_URL + path).openConnection();
        connection.setConnectTimeout(1200);
        connection.setReadTimeout(2500);
        connection.setRequestMethod(method);
        connection.setRequestProperty("Authorization", "Bearer " + sessionSecret);
        connection.setRequestProperty("Accept", "application/json");

        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            try (OutputStream out = connection.getOutputStream()) {
                out.write(bytes);
            }
        }

        int code = connection.getResponseCode();
        java.io.InputStream stream = code >= 200 && code < 400
                ? connection.getInputStream()
                : connection.getErrorStream();
        StringBuilder response = new StringBuilder();
        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) response.append(line);
            }
        }
        connection.disconnect();
        if (code < 200 || code >= 300) throw new IllegalStateException("HTTP " + code + " " + response);
        return response.toString();
    }

    private void drain(Process source) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(source.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                appendTail(line);
                Log.i(TAG, "LINUX " + line);
            }
        } catch (Exception error) {
            Log.w(TAG, "Linux output reader ended: " + error.getMessage());
        }
    }

    private synchronized void appendTail(String line) {
        outputTail.append(line).append('\n');
        if (outputTail.length() > 12000) outputTail.delete(0, outputTail.length() - 12000);
    }

    private synchronized String tail() {
        return outputTail.toString();
    }

    void stop() {
        verified = false;
        Process current = process;
        process = null;
        if (current != null) {
            try { current.destroy(); } catch (Throwable ignored) {}
            SystemClock.sleep(150);
            if (isAlive(current)) {
                try { current.destroyForcibly(); } catch (Throwable ignored) {}
            }
        }
    }

    private static boolean supportsArm64() {
        for (String abi : Build.SUPPORTED_ABIS) if ("arm64-v8a".equals(abi)) return true;
        return false;
    }

    private static boolean isAlive(Process value) {
        if (value == null) return false;
        try {
            value.exitValue();
            return false;
        } catch (IllegalThreadStateException running) {
            return true;
        }
    }

    private static void requireExecutable(File file, String label) {
        if (!file.isFile()) throw new IllegalStateException(label + " missing: " + file);
    }
}
