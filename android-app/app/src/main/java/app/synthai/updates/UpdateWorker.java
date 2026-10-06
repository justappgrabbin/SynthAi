package app.synthai.updates;

import android.content.Context;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

public final class UpdateWorker extends Worker {
    private static final String CHANNEL = "https://api.github.com/repos/justappgrabbin/SynthAi/releases/tags/computer-updates";
    public UpdateWorker(Context context, WorkerParameters params) { super(context, params); }
    @Override public Result doWork() {
        synchronized (UpdateWorker.class) { return perform(); }
    }
    private Result perform() {
        Context context = getApplicationContext();
        File staged = new File(context.getFilesDir(), "updates/download.apk");
        try {
            HttpURLConnection request = connect(CHANNEL);
            if (request.getResponseCode() == 404) { request.disconnect(); return Result.success(); }
            JSONObject release;
            try (InputStream in = request.getInputStream()) { release = new JSONObject(new String(read(in, 2097152), java.nio.charset.StandardCharsets.UTF_8)); }
            finally { request.disconnect(); }
            String expected = context.getPackageName().equals("app.synthai.hover") ? "app-hover-debug.apk" : "app-venom-debug.apk";
            JSONArray assets = release.getJSONArray("assets");
            String url = null; JSONObject selected = null;
            for (int i=0; i<assets.length(); i++) {
                JSONObject asset = assets.getJSONObject(i);
                if (expected.equals(asset.getString("name"))) { url = asset.getString("browser_download_url"); selected = asset; break; }
            }
            if (url == null) return Result.success();
            if (!url.startsWith("https://github.com/justappgrabbin/SynthAi/releases/download/")) throw new SecurityException("Untrusted update source");
            String seen = context.getSharedPreferences("updates",Context.MODE_PRIVATE).getString("checked-url", "");
            // Assets on this channel are replaced in place; release ID alone is insufficient.
            String revision = selected.getLong("id") + ":" + selected.getString("updated_at") + ":" + selected.getLong("size");
            if (revision.equals(seen)) return Result.success();
            if (!staged.getParentFile().isDirectory() && !staged.getParentFile().mkdirs()) throw new IOException("Cannot stage update");
            HttpURLConnection download = connect(url);
            try (InputStream in = download.getInputStream(); OutputStream out = new FileOutputStream(staged)) {
                byte[] bytes = new byte[65536]; long size = 0; int count;
                while ((count=in.read(bytes))!=-1) { size+=count; if (size>536870912) throw new IOException("Update exceeds 512 MB"); out.write(bytes,0,count); }
            } finally { download.disconnect(); }
            try {
                AutoUpdates.verify(context, staged);
                if (!staged.renameTo(AutoUpdates.pending(context))) throw new IOException("Cannot stage verified update");
            } catch (SecurityException rejected) {
                android.util.Log.i("ComputerUpdates", rejected.getMessage());
                staged.delete();
            }
            context.getSharedPreferences("updates",Context.MODE_PRIVATE).edit().putString("checked-url",revision).apply();
            return Result.success();
        } catch (Exception error) {
            staged.delete();
            android.util.Log.w("ComputerUpdates", "Update check: " + error.getMessage());
            return Result.retry();
        }
    }
    private static HttpURLConnection connect(String address) throws IOException {
        HttpURLConnection request = (HttpURLConnection)new URL(address).openConnection();
        request.setConnectTimeout(15000); request.setReadTimeout(30000);
        request.setRequestProperty("User-Agent","SynthAI-Computer-Updater");
        return request;
    }
    private static byte[] read(InputStream in, int limit) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] bytes=new byte[8192]; int count;
        while ((count=in.read(bytes))!=-1) { if (out.size()+count>limit) throw new IOException("Release response too large"); out.write(bytes,0,count); }
        return out.toByteArray();
    }
}
