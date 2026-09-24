package app.synthai.computer;

import android.content.Context;
import android.system.Os;
import android.util.Log;

import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

final class RootfsInstaller {
    private static final String TAG = "SynthAIComputer";
    // Android's asset packager expands .gz assets and removes the suffix.
    private static final String ROOTFS_ASSET = "linux-rootfs.bundle";
    private static final String VERSION_ASSET = "linux-rootfs.version";

    static final class Result {
        final File rootfs;
        final File data;
        final String version;

        Result(File rootfs, File data, String version) {
            this.rootfs = rootfs;
            this.data = data;
            this.version = version;
        }
    }

    private static final class PendingHardLink {
        final File destination;
        final String target;

        PendingHardLink(File destination, String target) {
            this.destination = destination;
            this.target = target;
        }
    }

    private RootfsInstaller() {}

    static synchronized Result installIfNeeded(Context context) throws Exception {
        File linuxBase = new File(context.getFilesDir(), "synthai-linux");
        File rootfs = new File(linuxBase, "rootfs");
        File marker = new File(linuxBase, "rootfs.version");
        File data = new File(context.getFilesDir(), "synthai-data");
        if (!linuxBase.exists() && !linuxBase.mkdirs()) {
            throw new IOException("cannot create Linux base directory");
        }
        if (!data.exists() && !data.mkdirs()) {
            throw new IOException("cannot create persistent Computer data directory");
        }

        String wanted = readAssetText(context, VERSION_ASSET).trim();
        String installed = marker.isFile() ? readFileText(marker).trim() : "";

        if (wanted.equals(installed)
                && new File(rootfs, "bin/sh").isFile()
                && new File(rootfs, "usr/local/bin/node").isFile()
                && new File(rootfs, "opt/synthai/computer/backend/local-server.mjs").isFile()) {
            Log.i(TAG, "ROOTFS_READY version=" + wanted + " source=existing");
            return new Result(rootfs, data, wanted);
        }

        File staging = new File(linuxBase, "rootfs.staging-" + System.currentTimeMillis());
        deleteRecursively(staging);
        if (!staging.mkdirs()) throw new IOException("cannot create rootfs staging directory");

        Log.i(TAG, "ROOTFS_INSTALL_START version=" + wanted);
        extract(context, staging);

        require(new File(staging, "bin/sh"), "guest shell");
        require(new File(staging, "usr/local/bin/node"), "guest Node runtime");
        require(new File(staging, "opt/synthai/computer/backend/local-server.mjs"), "local Computer backend");

        File old = new File(linuxBase, "rootfs.old");
        deleteRecursively(old);
        if (rootfs.exists() && !rootfs.renameTo(old)) {
            deleteRecursively(staging);
            throw new IOException("cannot rotate previous rootfs");
        }
        if (!staging.renameTo(rootfs)) {
            if (old.exists()) old.renameTo(rootfs);
            throw new IOException("cannot activate new rootfs");
        }
        deleteRecursively(old);
        writeFileText(marker, wanted + "\n");

        Log.i(TAG, "ROOTFS_READY version=" + wanted + " source=installed");
        return new Result(rootfs, data, wanted);
    }

    private static void extract(Context context, File root) throws Exception {
        List<PendingHardLink> hardLinks = new ArrayList<>();
        String rootPath = root.getCanonicalPath() + File.separator;

        try (InputStream raw = context.getAssets().open(ROOTFS_ASSET);
             BufferedInputStream buffered = new BufferedInputStream(raw, 128 * 1024);
             GzipCompressorInputStream gzip = new GzipCompressorInputStream(buffered);
             TarArchiveInputStream tar = new TarArchiveInputStream(gzip)) {

            TarArchiveEntry entry;
            byte[] buffer = new byte[128 * 1024];

            while ((entry = tar.getNextTarEntry()) != null) {
                String name = cleanEntryName(entry.getName());
                if (name.isEmpty()) continue;

                File destination = checked(root, rootPath, name);
                File parent = destination.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    throw new IOException("cannot create parent for " + name);
                }

                if (entry.isDirectory()) {
                    if (!destination.exists() && !destination.mkdirs()) {
                        throw new IOException("cannot create directory " + name);
                    }
                    chmod(destination, entry.getMode());
                    continue;
                }

                if (entry.isSymbolicLink()) {
                    if (destination.exists()) deleteRecursively(destination);
                    Os.symlink(entry.getLinkName(), destination.getAbsolutePath());
                    continue;
                }

                if (entry.isLink()) {
                    hardLinks.add(new PendingHardLink(destination, cleanEntryName(entry.getLinkName())));
                    continue;
                }

                if (!entry.isFile()) {
                    Log.w(TAG, "ROOTFS_SKIP_SPECIAL " + name);
                    continue;
                }

                try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(destination), 128 * 1024)) {
                    int read;
                    while ((read = tar.read(buffer)) != -1) out.write(buffer, 0, read);
                }
                chmod(destination, entry.getMode());
            }
        }

        for (PendingHardLink link : hardLinks) {
            File target = checked(root, rootPath, link.target);
            if (!target.exists()) throw new IOException("hardlink target missing: " + link.target);
            File parent = link.destination.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            if (link.destination.exists()) deleteRecursively(link.destination);
            Os.link(target.getAbsolutePath(), link.destination.getAbsolutePath());
        }
    }

    private static File checked(File root, String rootPath, String name) throws Exception {
        File out = new File(root, name);
        String canonical = out.getCanonicalPath();
        if (!canonical.startsWith(rootPath)) {
            throw new IOException("rootfs path traversal refused: " + name);
        }
        return out;
    }

    private static String cleanEntryName(String name) {
        String value = name == null ? "" : name.replace('\\', '/');
        while (value.startsWith("./")) value = value.substring(2);
        while (value.startsWith("/")) value = value.substring(1);
        if (value.contains("../") || value.equals("..")) return "";
        return value;
    }

    private static void chmod(File file, int mode) {
        try {
            Os.chmod(file.getAbsolutePath(), mode & 0777);
        } catch (Throwable error) {
            Log.w(TAG, "chmod failed for " + file + ": " + error.getMessage());
        }
    }

    private static void require(File file, String label) throws IOException {
        if (!file.isFile()) throw new IOException("rootfs missing " + label + ": " + file);
    }

    private static String readAssetText(Context context, String name) throws IOException {
        try (InputStream in = context.getAssets().open(name)) {
            return readAll(in);
        }
    }

    private static String readFileText(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            return readAll(in);
        }
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
        return out.toString(StandardCharsets.UTF_8.name());
    }

    private static void writeFileText(File file, String value) throws IOException {
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(value.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory() && !java.nio.file.Files.isSymbolicLink(file.toPath())) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        if (!file.delete() && file.exists()) {
            Log.w(TAG, "could not delete " + file);
        }
    }
}
