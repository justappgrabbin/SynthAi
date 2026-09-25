package org.synthai.computer;

import android.content.Context;
import android.content.res.AssetManager;
import android.os.Build;
import android.system.Os;
import android.util.Log;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * APK-local Linux residence.
 *
 * The APK carries an ARM64 Alpine rootfs and PRoot binary under assets/runtime.
 * On first use the assets are verified/copied into app-private storage, then the
 * native seed starts inside PRoot. No Termux installation is required.
 */
public final class LinuxResidenceManager {
    private static final String TAG = "SynthAILinuxResidence";
    private static final String ROOTFS_ASSET = "runtime/rootfs-arm64.tar.gz";
    private static final String PROOT_PACKAGE_ASSET = "runtime/proot-android-aarch64.tar.gz";
    private static final String MANIFEST_ASSET = "runtime/residence-manifest.properties";
    private static final String INSTALL_VERSION = "2026-09-25-resident-v1";
    private static final int COPY_BUFFER = 128 * 1024;

    public interface Listener {
        void onStatus(String status);
        void onReady();
        void onError(Throwable error);
    }

    private final Context context;
    private final AssetManager assets;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final File residenceDir;
    private final File rootfsDir;
    private final File prootPackageDir;
    private final File prootBin;
    private final File prootTmpDir;
    private final File marker;
    private volatile Process nativeSeedProcess;
    private volatile boolean starting;

    public LinuxResidenceManager(Context context) {
        this.context = context.getApplicationContext();
        this.assets = this.context.getAssets();
        this.residenceDir = new File(this.context.getFilesDir(), "linux-residence");
        this.rootfsDir = new File(residenceDir, "rootfs");
        this.prootPackageDir = new File(residenceDir, "proot-android");
        this.prootBin = new File(prootPackageDir, "root/bin/proot");
        this.prootTmpDir = new File(prootPackageDir, "tmp");
        this.marker = new File(residenceDir, ".installed-version");
    }

    public File getRootfsDir() { return rootfsDir; }
    public File getResidenceDir() { return residenceDir; }

    public synchronized boolean isRunning() {
        if (nativeSeedProcess == null) return false;
        try { nativeSeedProcess.exitValue(); return false; }
        catch (IllegalThreadStateException running) { return true; }
    }

    public void ensureStarted(Listener listener) {
        synchronized (this) {
            if (isRunning()) {
                listener.onReady();
                return;
            }
            if (starting) {
                listener.onStatus("LINUX RESIDENCE STARTING");
                return;
            }
            starting = true;
        }
        executor.execute(() -> {
            try {
                listener.onStatus("VERIFYING LINUX RESIDENCE");
                ensureInstalled(listener);
                listener.onStatus("STARTING LOCAL LINUX");
                startNativeSeed();
                listener.onReady();
            } catch (Throwable error) {
                Log.e(TAG, "Residence startup failed", error);
                listener.onError(error);
            } finally {
                synchronized (LinuxResidenceManager.this) { starting = false; }
            }
        });
    }

    private void ensureInstalled(Listener listener) throws Exception {
        if (!supportsArm64()) throw new IllegalStateException("This residence build currently requires arm64-v8a");
        if (!residenceDir.exists() && !residenceDir.mkdirs()) throw new IllegalStateException("Could not create residence directory");

        String expectedVersion = INSTALL_VERSION + "\n" + readResidenceManifest();
        if (marker.exists() && rootfsLooksReady() && prootBin.exists()) {
            String existing = new String(readAll(new FileInputStream(marker)), StandardCharsets.UTF_8);
            if (existing.equals(expectedVersion)) {
                Os.chmod(prootBin.getAbsolutePath(), 0700);
                prootTmpDir.mkdirs();
                return;
            }
        }

        listener.onStatus("INSTALLING APK-LOCAL LINUX");
        stop();
        deleteRecursively(rootfsDir);
        if (!rootfsDir.mkdirs()) throw new IllegalStateException("Could not create rootfs directory");

        deleteRecursively(prootPackageDir);
        if (!prootPackageDir.mkdirs()) throw new IllegalStateException("Could not create PRoot package directory");
        extractTarGzipAsset(PROOT_PACKAGE_ASSET, prootPackageDir);
        if (!prootBin.exists()) throw new IllegalStateException("Bundled Android PRoot package is missing root/bin/proot");
        Os.chmod(prootBin.getAbsolutePath(), 0700);
        prootTmpDir.mkdirs();

        try (InputStream raw = new BufferedInputStream(assets.open(ROOTFS_ASSET), COPY_BUFFER);
             GzipCompressorInputStream gzip = new GzipCompressorInputStream(raw);
             TarArchiveInputStream tar = new TarArchiveInputStream(gzip)) {
            TarArchiveEntry entry;
            byte[] buffer = new byte[COPY_BUFFER];
            while ((entry = tar.getNextTarEntry()) != null) {
                String name = sanitizePath(entry.getName());
                if (name == null || name.isEmpty()) continue;
                File out = new File(rootfsDir, name);
                assertInsideRootfs(out);

                if (entry.isDirectory()) {
                    if (!out.exists() && !out.mkdirs()) throw new IllegalStateException("Could not create " + name);
                    chmodQuiet(out, entry.getMode());
                    continue;
                }

                File parent = out.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("Could not create parent for " + name);

                if (entry.isSymbolicLink()) {
                    if (out.exists()) out.delete();
                    Os.symlink(entry.getLinkName(), out.getAbsolutePath());
                    continue;
                }
                if (entry.isLink()) {
                    String linkName = sanitizePath(entry.getLinkName());
                    if (linkName == null) throw new IllegalStateException("Unsafe hard link " + entry.getLinkName());
                    File target = new File(rootfsDir, linkName);
                    assertInsideRootfs(target);
                    if (out.exists()) out.delete();
                    try { Os.link(target.getAbsolutePath(), out.getAbsolutePath()); }
                    catch (Throwable ignored) {
                        try (InputStream in = new FileInputStream(target); OutputStream copy = new BufferedOutputStream(new FileOutputStream(out), COPY_BUFFER)) {
                            int read;
                            while ((read = in.read(buffer)) >= 0) if (read > 0) copy.write(buffer, 0, read);
                        }
                    }
                    chmodQuiet(out, entry.getMode());
                    continue;
                }
                if (!entry.isFile()) continue;

                try (OutputStream output = new BufferedOutputStream(new FileOutputStream(out), COPY_BUFFER)) {
                    int read;
                    while ((read = tar.read(buffer)) >= 0) if (read > 0) output.write(buffer, 0, read);
                }
                chmodQuiet(out, entry.getMode());
            }
        }

        if (!rootfsLooksReady()) throw new IllegalStateException("Bundled rootfs did not contain Node/native seed");
        writeAll(marker, expectedVersion.getBytes(StandardCharsets.UTF_8));
    }

    private synchronized void startNativeSeed() throws Exception {
        if (isRunning()) return;
        File node = new File(rootfsDir, "usr/bin/node");
        File seed = new File(rootfsDir, "opt/synthai/computer/native/native-seed-server.mjs");
        if (!node.exists() || !seed.exists()) throw new IllegalStateException("Linux residence is missing Node or native seed");

        File logDir = new File(residenceDir, "logs");
        logDir.mkdirs();
        File log = new File(logDir, "native-seed.log");

        List<String> command = new ArrayList<>();
        command.add(prootBin.getAbsolutePath());
        command.add("-0");
        command.add("-r"); command.add(rootfsDir.getAbsolutePath());
        command.add("-w"); command.add("/opt/synthai");
        command.add("-b"); command.add("/dev");
        command.add("-b"); command.add("/proc");
        command.add("-b"); command.add("/sys");
        command.add("-b"); command.add(context.getFilesDir().getAbsolutePath() + ":/mnt/synthai-host");
        command.add("--link2symlink");
        command.add("-p");
        command.add("-L");
        command.add("-b"); command.add("/system");
        command.add("/usr/bin/env");
        command.add("HOME=/root");
        command.add("PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin");
        command.add("SYNTHAI_NATIVE_HOST=127.0.0.1");
        command.add("SYNTHAI_NATIVE_PORT=17757");
        command.add("SYNTHAI_IDLE_EXIT_MS=0");
        command.add("SYNTHAI_NATIVE_STATE=/mnt/synthai-host/linux-residence/native-seed-state.json");
        command.add("SYNTHAI_RESIDENT_IMAGE_ROOT=/mnt/synthai-host/linux-residence/resident-images");
        command.add("SYNTHIA58_DATA_DIR=/mnt/synthai-host/linux-residence/prime-state");
        command.add("SYNTHIA_ANDROID_HAND=1");
        command.add("SYNTHIA_ANDROID_HAND_URL=http://127.0.0.1:18758");
        command.add("SYNTHIA_ANDROID_HAND_TOKEN=" + SynthiaSecurity.handToken(context));
        command.add("/usr/bin/node");
        command.add("/opt/synthai/computer/native/native-seed-server.mjs");

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(residenceDir);
        builder.environment().put("PROOT_TMP_DIR", prootTmpDir.getAbsolutePath());
        builder.environment().put("TERMSH_UID", String.valueOf(android.os.Process.myUid()));
        builder.environment().remove("TMPDIR");
        builder.environment().remove("LD_LIBRARY_PATH");
        builder.redirectErrorStream(true);
        builder.redirectOutput(ProcessBuilder.Redirect.appendTo(log));
        nativeSeedProcess = builder.start();
        Log.i(TAG, "Native seed started in APK-local Linux residence pid=" + pidOf(nativeSeedProcess));
    }

    public synchronized void stop() {
        Process process = nativeSeedProcess;
        nativeSeedProcess = null;
        if (process != null) {
            try { process.destroy(); } catch (Throwable ignored) {}
        }
    }

    public void shutdown() {
        stop();
        executor.shutdownNow();
    }

    private void extractTarGzipAsset(String asset, File destination) throws Exception {
        try (InputStream raw = new BufferedInputStream(assets.open(asset), COPY_BUFFER);
             GzipCompressorInputStream gzip = new GzipCompressorInputStream(raw);
             TarArchiveInputStream tar = new TarArchiveInputStream(gzip)) {
            TarArchiveEntry entry;
            byte[] buffer = new byte[COPY_BUFFER];
            String destinationRoot = destination.getCanonicalPath() + File.separator;
            while ((entry = tar.getNextTarEntry()) != null) {
                String name = sanitizePath(entry.getName());
                if (name == null || name.isEmpty()) continue;
                File out = new File(destination, name);
                String candidate = out.getCanonicalPath();
                if (!candidate.equals(destination.getCanonicalPath()) && !candidate.startsWith(destinationRoot)) {
                    throw new SecurityException("Tar path escapes destination: " + candidate);
                }
                if (entry.isDirectory()) {
                    if (!out.exists() && !out.mkdirs()) throw new IllegalStateException("Could not create " + name);
                    chmodQuiet(out, entry.getMode());
                    continue;
                }
                File parent = out.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("Could not create parent for " + name);
                if (entry.isSymbolicLink()) {
                    if (out.exists()) out.delete();
                    Os.symlink(entry.getLinkName(), out.getAbsolutePath());
                    continue;
                }
                if (!entry.isFile()) continue;
                try (OutputStream output = new BufferedOutputStream(new FileOutputStream(out), COPY_BUFFER)) {
                    int read;
                    while ((read = tar.read(buffer)) >= 0) if (read > 0) output.write(buffer, 0, read);
                }
                chmodQuiet(out, entry.getMode());
            }
        }
    }

    private boolean rootfsLooksReady() {
        return new File(rootfsDir, "bin/sh").exists()
            && new File(rootfsDir, "usr/bin/node").exists()
            && new File(rootfsDir, "usr/bin/python3").exists()
            && new File(rootfsDir, "opt/synthai/computer/native/native-seed-server.mjs").exists();
    }

    private boolean supportsArm64() {
        for (String abi : Build.SUPPORTED_ABIS) if ("arm64-v8a".equals(abi)) return true;
        return false;
    }

    private String readResidenceManifest() throws Exception {
        try (InputStream in = assets.open(MANIFEST_ASSET)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        }
    }

    private void copyAsset(String asset, File target) throws Exception {
        File parent = target.getParentFile();
        if (parent != null) parent.mkdirs();
        try (InputStream in = new BufferedInputStream(assets.open(asset), COPY_BUFFER);
             OutputStream out = new BufferedOutputStream(new FileOutputStream(target), COPY_BUFFER)) {
            byte[] buffer = new byte[COPY_BUFFER];
            int read;
            while ((read = in.read(buffer)) >= 0) if (read > 0) out.write(buffer, 0, read);
        }
    }

    private String sanitizePath(String value) {
        if (value == null) return null;
        String normalized = value.replace('\\', '/');
        while (normalized.startsWith("./")) normalized = normalized.substring(2);
        while (normalized.startsWith("/")) normalized = normalized.substring(1);
        if (normalized.equals("..") || normalized.startsWith("../") || normalized.contains("/../")) return null;
        return normalized;
    }

    private void assertInsideRootfs(File file) throws Exception {
        String root = rootfsDir.getCanonicalPath() + File.separator;
        String candidate = file.getCanonicalPath();
        if (!candidate.equals(rootfsDir.getCanonicalPath()) && !candidate.startsWith(root)) {
            throw new SecurityException("Tar path escapes rootfs: " + candidate);
        }
    }

    private void chmodQuiet(File file, int mode) {
        try { Os.chmod(file.getAbsolutePath(), mode & 0777); }
        catch (Throwable ignored) {}
    }

    private static byte[] readAll(InputStream in) throws Exception {
        try (InputStream source = in; java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = source.read(buffer)) >= 0) if (read > 0) out.write(buffer, 0, read);
            return out.toByteArray();
        }
    }

    private static void writeAll(File file, byte[] data) throws Exception {
        File parent = file.getParentFile();
        if (parent != null) parent.mkdirs();
        try (OutputStream out = new FileOutputStream(file)) { out.write(data); }
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        if (!file.delete()) Log.w(TAG, "Could not delete " + file);
    }

    private static long pidOf(Process process) {
        try { return process.pid(); } catch (Throwable ignored) { return -1; }
    }
}
