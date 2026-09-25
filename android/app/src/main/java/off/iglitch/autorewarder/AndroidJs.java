package off.iglitch.autorewarder;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class AndroidJs {
    private final MainActivity activity;
    private final WebView webView;
    private final SharedPreferences prefs;
    private final ExecutorService io = Executors.newCachedThreadPool();
    private volatile boolean discovering = false;

    public AndroidJs(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.prefs = activity.getSharedPreferences("autorewarder", Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public String deviceName() {
        String name = null;
        try {
            name = Settings.Global.getString(activity.getContentResolver(), Settings.Global.DEVICE_NAME);
        } catch (Exception ignored) {}
        if (name == null || name.trim().isEmpty()) {
            name = Build.MODEL;
        }
        return name;
    }

    @JavascriptInterface
    public String deviceModel() {
        return (Build.MANUFACTURER + " " + Build.MODEL).trim();
    }

    @JavascriptInterface
    public String androidId() {
        try {
            String id = Settings.Secure.getString(
                    activity.getContentResolver(), Settings.Secure.ANDROID_ID);
            return id == null ? "" : id;
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public int appVersionCode() {
        try {
            return activity.getPackageManager()
                    .getPackageInfo(activity.getPackageName(), 0).versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    @JavascriptInterface
    public String appVersionName() {
        try {
            return activity.getPackageManager()
                    .getPackageInfo(activity.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public String loadPairing() {
        String fromPrefs = prefs.getString("pair", "");
        if (fromPrefs != null && !fromPrefs.isEmpty()) return fromPrefs;
        String fromFile = readPairFile();
        if (fromFile != null && !fromFile.isEmpty()) {
            prefs.edit().putString("pair", fromFile).commit();
            return fromFile;
        }
        return "";
    }

    @JavascriptInterface
    public void savePairing(String json) {
        String raw = json == null ? "" : json;
        prefs.edit().putString("pair", raw).commit();
        writePairFile(raw);
    }

    @JavascriptInterface
    public void clearPairing() {
        prefs.edit().remove("pair").commit();
        File f = pairFile();
        if (f.exists()) {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
    }

    private File pairFile() {
        return new File(activity.getFilesDir(), "pair.json");
    }

    private String readPairFile() {
        File f = pairFile();
        if (!f.isFile()) return "";
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[(int) Math.min(f.length(), 32_000)];
            int n = in.read(buf);
            return n <= 0 ? "" : new String(buf, 0, n, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private void writePairFile(String raw) {
        try (FileOutputStream out = new FileOutputStream(pairFile())) {
            out.write(raw.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void downloadUpdate(String url) {
        if (url == null || url.isEmpty()) return;
        io.execute(() -> {
            File dir = new File(activity.getFilesDir(), "updates");
            if (!dir.exists() && !dir.mkdirs()) {
                activity.onUpdateFailed("No se pudo crear la carpeta de actualización.");
                return;
            }
            File apk = new File(dir, "AutoRewarder.apk");
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(120000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "AutoRewarder-Phone");
                int code = conn.getResponseCode();
                if (code >= 400) {
                    activity.onUpdateFailed("El PC no sirvió el APK (" + code + ").");
                    return;
                }
                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    out.getFD().sync();
                }
                activity.installApk(apk);
            } catch (Exception e) {
                String msg = e.getMessage() == null ? "error" : e.getMessage();
                activity.onUpdateFailed("Descarga falló: " + msg);
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    @JavascriptInterface
    public void discover() {
        if (discovering) return;
        discovering = true;
        io.execute(this::listenBeacon);
    }

    @JavascriptInterface
    public void scanLan() {
        io.execute(this::probeLan);
    }

    @JavascriptInterface
    public boolean hasBing() {
        return BingLauncher.isInstalled(activity);
    }

    @JavascriptInterface
    public boolean installBing() {
        return BingLauncher.install(activity);
    }

    @JavascriptInterface
    public boolean openBingApp(String kind) {
        return BingLauncher.open(activity, kind);
    }

    @JavascriptInterface
    public boolean openBing(String kind) {
        if (BingLauncher.isInstalled(activity) && BingLauncher.open(activity, kind)) {
            return true;
        }
        activity.startBingTask(kind);
        return true;
    }

    @JavascriptInterface
    public void runTask(String kind) {
        activity.startBingTask(kind);
    }

    @JavascriptInterface
    public void keepDiscovering() {
        if (discovering) return;
        discovering = true;
        io.execute(this::listenBeacon);
    }

    @JavascriptInterface
    public void scanQr() {
        activity.startQrScan();
    }

    @JavascriptInterface
    public String http(String method, String url, String body, String token) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(15000);
            conn.setInstanceFollowRedirects(true);
            conn.setRequestMethod(method == null ? "GET" : method.toUpperCase());
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", "AutoRewarder-Phone");
            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }
            if (body != null && !body.isEmpty() && !"GET".equalsIgnoreCase(method)) {
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setRequestProperty("Content-Length", String.valueOf(bytes.length));
                OutputStream os = conn.getOutputStream();
                os.write(bytes);
                os.close();
            }
            int code = conn.getResponseCode();
            InputStream in = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            if (in == null) in = conn.getInputStream();
            String text = readStream(in);
            if (text == null || text.isEmpty()) {
                return "{\"ok\":false,\"status\":" + code + ",\"error\":\"empty\"}";
            }
            return text;
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "error" : e.getMessage().replace("\"", "'");
            return "{\"ok\":false,\"error\":\"" + msg + "\"}";
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String readStream(InputStream in) {
        if (in == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    void sendUnlinkBestEffort() {
        String raw = loadPairing();
        if (raw == null || raw.isEmpty()) return;
        String token = jsonField(raw, "token");
        if (token.isEmpty()) return;
        String[] urls = new String[] { jsonField(raw, "lan"), jsonField(raw, "base") };
        for (String url : urls) {
            if (url == null || url.isEmpty()) continue;
            String base = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
            String resp = http("POST", base + "/phone/unlink", "{}", token);
            if (resp != null && resp.contains("\"ok\":true")) return;
        }
    }

    private static String jsonField(String json, String key) {
        if (json == null || key == null) return "";
        String needle = "\"" + key + "\"";
        int at = json.indexOf(needle);
        if (at < 0) return "";
        int colon = json.indexOf(':', at + needle.length());
        if (colon < 0) return "";
        int i = colon + 1;
        while (i < json.length() && Character.isWhitespace(json.charAt(i))) i++;
        if (i >= json.length() || json.charAt(i) != '"') return "";
        i++;
        StringBuilder sb = new StringBuilder();
        while (i < json.length()) {
            char c = json.charAt(i++);
            if (c == '\\' && i < json.length()) {
                sb.append(json.charAt(i++));
                continue;
            }
            if (c == '"') break;
            sb.append(c);
        }
        return sb.toString();
    }

    void shutdown() {
        discovering = false;
        io.shutdownNow();
    }

    private void listenBeacon() {
        WifiManager wifi = (WifiManager) activity.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        WifiManager.MulticastLock lock = null;
        if (wifi != null) {
            lock = wifi.createMulticastLock("autorewarder-beacon");
            lock.setReferenceCounted(true);
            try { lock.acquire(); } catch (Exception ignored) {}
        }
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket(38472);
            socket.setBroadcast(true);
            socket.setReuseAddress(true);
            socket.setSoTimeout(1500);
            byte[] buf = new byte[1024];
            while (discovering) {
                DatagramPacket packet = new DatagramPacket(buf, buf.length);
                try {
                    socket.receive(packet);
                } catch (Exception timeout) {
                    continue;
                }
                String msg = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8).trim();
                if (!msg.startsWith("AR1|") && !msg.startsWith("AR2|")) continue;
                final String raw = msg;
                activity.runOnUiThread(() -> webView.evaluateJavascript(
                        "window.onBeaconRaw && onBeaconRaw(" + json(raw) + ")",
                        null));
            }
        } catch (Exception ignored) {
        } finally {
            discovering = false;
            if (socket != null) socket.close();
            if (lock != null && lock.isHeld()) {
                try { lock.release(); } catch (Exception ignored) {}
            }
        }
    }

    private void probeLan() {
        Set<String> prefixes = new LinkedHashSet<>();
        try {
            Enumeration<NetworkInterface> nifs = NetworkInterface.getNetworkInterfaces();
            while (nifs.hasMoreElements()) {
                NetworkInterface nif = nifs.nextElement();
                try {
                    if (!nif.isUp() || nif.isLoopback()) continue;
                } catch (Exception ignored) {
                    continue;
                }
                for (InetAddress addr : Collections.list(nif.getInetAddresses())) {
                    if (!(addr instanceof Inet4Address) || addr.isLoopbackAddress()) continue;
                    String ip = addr.getHostAddress();
                    if (ip == null) continue;
                    if (ip.startsWith("192.168.") || ip.startsWith("10.") || isPrivate172(ip)) {
                        prefixes.add(ip.substring(0, ip.lastIndexOf('.') + 1));
                    }
                }
            }
        } catch (Exception ignored) {}
        if (prefixes.isEmpty()) {
            notifyLan("");
            return;
        }
        ExecutorService pool = Executors.newFixedThreadPool(32);
        AtomicBoolean found = new AtomicBoolean(false);
        for (String prefix : prefixes) {
            for (int i = 1; i <= 254; i++) {
                final String host = prefix + i;
                pool.execute(() -> {
                    if (found.get()) return;
                    if (!pingBridge(host)) return;
                    if (found.compareAndSet(false, true)) {
                        notifyLan("http://" + host + ":38471");
                    }
                });
            }
        }
        pool.shutdown();
        try {
            pool.awaitTermination(8, TimeUnit.SECONDS);
        } catch (Exception ignored) {}
        pool.shutdownNow();
        if (!found.get()) notifyLan("");
    }

    private static boolean isPrivate172(String ip) {
        if (!ip.startsWith("172.")) return false;
        try {
            int second = Integer.parseInt(ip.split("\\.")[1]);
            return second >= 16 && second <= 31;
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean pingBridge(String host) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL("http://" + host + ":38471/ping").openConnection();
            conn.setConnectTimeout(280);
            conn.setReadTimeout(280);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            if (code >= 400) return false;
            InputStream in = conn.getInputStream();
            String body = readStream(in);
            return body != null && body.contains("\"ok\"");
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void notifyLan(String url) {
        activity.runOnUiThread(() -> webView.evaluateJavascript(
                "window.onLanFound && onLanFound(" + json(url) + ")",
                null));
    }

    private static String json(String value) {
        if (value == null) return "\"\"";
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
