package com.irorender.app;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/**
 * Native bridge for IroRender:
 *  - httpRequest: bypasses WebView CORS limits (api.render.com doesn't allow CORS)
 *  - SharedPreferences-backed token store (used by the widget)
 *  - Clipboard / vibrate / toast / openUrl
 */
@CapacitorPlugin(name = "IroBridge")
public class IroBridgePlugin extends Plugin {

    public static final String PREFS  = "irorender";
    public static final String KEY_TOKEN = "token";
    public static final String KEY_LOGIN = "login";
    private static final String TAG = "IroBridge";

    @Override
    public void load() { /* nothing */ }

    // -----------------------------------------------------------
    // HTTP — escapes the WebView CORS jail.
    // -----------------------------------------------------------
    @PluginMethod
    public void httpRequest(PluginCall call) {
        final String urlStr = call.getString("url", "");
        final String method = call.getString("method", "GET");
        final String body   = call.getString("body", "");
        final JSObject headers = call.getObject("headers", new JSObject());
        final int timeoutSec = call.getInt("timeout", 60);

        if (urlStr == null || urlStr.isEmpty()) { call.reject("url required"); return; }

        new Thread(() -> {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(Math.max(timeoutSec * 1000, 20000));
                conn.setReadTimeout(Math.max(timeoutSec * 1000, 60000));
                conn.setInstanceFollowRedirects(true);

                conn.setRequestProperty("User-Agent", "IroRender/1.0 (Android)");
                conn.setRequestProperty("Accept", "application/json");
                conn.setRequestProperty("Accept-Encoding", "identity");

                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    String v = headers.getString(k);
                    if (v != null) conn.setRequestProperty(k, v);
                }

                String m = method.toUpperCase();
                if (body != null && !body.isEmpty()
                    && (m.equals("POST") || m.equals("PUT") || m.equals("PATCH") || m.equals("DELETE"))) {
                    conn.setDoOutput(true);
                    byte[] bts = body.getBytes(StandardCharsets.UTF_8);
                    conn.setRequestProperty("Content-Length", String.valueOf(bts.length));
                    conn.getOutputStream().write(bts);
                    conn.getOutputStream().flush();
                }

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();
                if (is == null) is = conn.getInputStream();

                StringBuilder resp = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    char[] buf = new char[8192]; int n; int total = 0; int max = 4 * 1024 * 1024;
                    while ((n = r.read(buf)) != -1 && total < max) { resp.append(buf, 0, n); total += n; }
                }

                // Forward useful rate-limit headers
                JSObject respHeaders = new JSObject();
                respHeaders.put("ratelimit-limit",     conn.getHeaderField("ratelimit-limit"));
                respHeaders.put("ratelimit-remaining", conn.getHeaderField("ratelimit-remaining"));
                respHeaders.put("ratelimit-reset",     conn.getHeaderField("ratelimit-reset"));
                respHeaders.put("content-type",        conn.getHeaderField("content-type"));

                JSObject ret = new JSObject();
                ret.put("status", code);
                ret.put("body", resp.toString());
                ret.put("headers", respHeaders);
                resolveOnMain(call, ret);
            } catch (Exception e) {
                Log.w(TAG, "httpRequest failed: " + e.getMessage());
                JSObject ret = new JSObject();
                ret.put("status", 0);
                ret.put("body", "");
                ret.put("error", e.getMessage() != null ? e.getMessage() : "network error");
                resolveOnMain(call, ret);
            }
        }).start();
    }

    private void resolveOnMain(PluginCall call, JSObject ret) {
        new Handler(Looper.getMainLooper()).post(() -> call.resolve(ret));
    }

    // -----------------------------------------------------------
    // Token storage (used by widget)
    // -----------------------------------------------------------
    @PluginMethod
    public void saveToken(PluginCall call) {
        String token = call.getString("token", "");
        String login = call.getString("login", "");
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_TOKEN, token).putString(KEY_LOGIN, login).apply();
        JSObject r = new JSObject(); r.put("value", true); call.resolve(r);
    }

    @PluginMethod
    public void clearToken(PluginCall call) {
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        JSObject r = new JSObject(); r.put("value", true); call.resolve(r);
    }

    // -----------------------------------------------------------
    // UI niceties
    // -----------------------------------------------------------
    @PluginMethod
    public void vibrate(PluginCall call) {
        int ms = call.getInt("ms", 30);
        try {
            Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else { v.vibrate(ms); }
            }
            JSObject r = new JSObject(); r.put("value", true); call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void toast(PluginCall call) {
        final String msg = call.getString("message", "");
        try {
            new Handler(Looper.getMainLooper()).post(
                () -> Toast.makeText(getContext(), msg, Toast.LENGTH_SHORT).show());
            JSObject r = new JSObject(); r.put("value", true); call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void copy(PluginCall call) {
        String text = call.getString("text", "");
        try {
            new Handler(Looper.getMainLooper()).post(() -> {
                ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("IroRender", text));
            });
            JSObject r = new JSObject(); r.put("value", true); call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            JSObject r = new JSObject(); r.put("value", true); call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
}
