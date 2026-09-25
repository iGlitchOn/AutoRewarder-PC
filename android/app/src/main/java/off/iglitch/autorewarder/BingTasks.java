package off.iglitch.autorewarder;

import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Automates check-in / news inside a BingSapphire WebView on this phone. */
final class BingTasks {
    static final String UA =
            "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 "
                    + "BingSapphire/30.0.410309301";

    private static final String[] CHECKIN_URLS = {
            "https://www.bing.com/?form=APMCS1&setmkt=es-CO",
            "https://rewards.bing.com/dashboard?setmkt=es-CO",
            "https://rewards.bing.com/?form=ML2N2V&setmkt=es-CO",
            "https://rewards.bing.com/dashboard?setmkt=es-CO"
    };
    private static final String NEWS_URL =
            "https://www.bing.com/news?form=APMCS1&setmkt=es-CO&dcf=1";

    private static final String CHECKIN_JS =
            "(async function(){"
                    + "function clickCheck(){"
                    + " var nodes=document.querySelectorAll('button,a,[role=button],span,div,p');"
                    + " for(var i=0;i<nodes.length;i++){"
                    + "  var el=nodes[i];"
                    + "  var t=((el.innerText||el.getAttribute('aria-label')||'')+'').replace(/\\s+/g,' ').trim();"
                    + "  if(!t||t.length>90) continue;"
                    + "  if(/redeem|canjear|donate|donar/i.test(t)) continue;"
                    + "  if(/check[\\s-]?in|registrar(se)?|fichar|asistencia|claim|reclamar/i.test(t)){"
                    + "    (el.closest('button,a,[role=button]')||el).click(); return true;"
                    + "  }"
                    + " }"
                    + " return false;"
                    + "}"
                    + "var clicked=false; try{clicked=!!clickCheck();}catch(e){}"
                    + "var ids=[];"
                    + "try{"
                    + " const r=await fetch('https://rewards.bing.com/api/getuserinfo?type=1',{credentials:'include'});"
                    + " const data=await r.json();"
                    + " const dash=data.dashboard||{};"
                    + " const promos=[].concat(dash.promotionalItems||[],dash.morePromotions||[],dash.punchCards||[]);"
                    + " for(var i=0;i<promos.length;i++){"
                    + "  var p=promos[i]||{}; var parent=p.parentPromotion||p;"
                    + "  var title=((parent.name||'')+' '+(parent.title||'')+' '+(parent.description||'')).toLowerCase();"
                    + "  var ptype=(parent.promotionType||'').toLowerCase();"
                    + "  if(ptype==='checkin'||title.indexOf('check-in')>=0||title.indexOf('check in')>=0||title.indexOf('registro')>=0){"
                    + "   if(parent.complete) return JSON.stringify({ok:true,how:'already'});"
                    + "   if(parent.offerId) ids.push(parent.offerId);"
                    + "  }"
                    + " }"
                    + "}catch(e){}"
                    + "ids=ids.concat(['MobileApp_Checkin','App_Checkin','ENUS_checkin','ESCO_checkin','checkin']);"
                    + "for(var j=0;j<ids.length;j++){"
                    + " var id=ids[j]; if(!id) continue;"
                    + " try{"
                    + "  var st=await fetch('https://prod.rewardsplatform.microsoft.com/dapi/me/activities',{"
                    + "   method:'POST',credentials:'include',"
                    + "   headers:{'Content-Type':'application/json'},"
                    + "   body:JSON.stringify({id:crypto.randomUUID(),offerId:id,type:'urlreward',amount:1})"
                    + "  }).then(function(r){return r.status;}).catch(function(){return -1;});"
                    + "  if(st===200||st===204) return JSON.stringify({ok:true,how:'api '+id});"
                    + " }catch(e){}"
                    + "}"
                    + "return JSON.stringify({ok:clicked,how:clicked?'ui':'none'});"
                    + "})();";

    private static final String NEWS_HREFS_JS =
            "(function(){"
                    + "var sel=['a.title','a.card-title','.title-container a','a.card-link','.news-card a',"
                    + "'a[href*=\"msn.com/\"]','a[href*=\"microsoftnews\"]','[class*=\"news\"] a[href]'];"
                    + "var out=[], seen={};"
                    + "for(var s=0;s<sel.length;s++){"
                    + " var els=document.querySelectorAll(sel[s]);"
                    + " for(var i=0;i<els.length;i++){"
                    + "  var h=els[i].href||'';"
                    + "  if(!h||seen[h]) continue;"
                    + "  if(h.indexOf('bing.com/search')>=0) continue;"
                    + "  if(h.indexOf('login')>=0) continue;"
                    + "  if(h.indexOf('http')!==0) continue;"
                    + "  seen[h]=1; out.push(h);"
                    + "  if(out.length>=8) return JSON.stringify(out);"
                    + " }"
                    + "}"
                    + "return JSON.stringify(out);"
                    + "})();";

    private final MainActivity activity;
    private final WebView bing;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String kind = "";
    private int step = 0;
    private boolean waitingLogin = false;
    private final List<String> newsHrefs = new ArrayList<>();
    private int newsIndex = 0;
    private boolean running = false;

    BingTasks(MainActivity activity, WebView bing) {
        this.activity = activity;
        this.bing = bing;
        WebSettings s = bing.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setUserAgentString(UA);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(bing, true);
        bing.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                onLoaded(url);
            }
        });
    }

    void start(String kind) {
        if (running) return;
        this.kind = kind == null ? "checkin" : kind;
        this.step = 0;
        this.waitingLogin = false;
        this.newsHrefs.clear();
        this.newsIndex = 0;
        this.running = true;
        if ("news".equals(this.kind)) {
            activity.setBingStatus("Abriendo noticias Bing…");
            bing.loadUrl(NEWS_URL);
        } else {
            activity.setBingStatus("Abriendo Rewards para check-in…");
            bing.loadUrl(CHECKIN_URLS[0]);
        }
    }

    void cancel() {
        running = false;
        handler.removeCallbacksAndMessages(null);
    }

    boolean isRunning() {
        return running;
    }

    private boolean isLogin(String url) {
        String u = url == null ? "" : url.toLowerCase();
        return u.contains("login.live.com")
                || u.contains("login.microsoftonline.com")
                || u.contains("account.live.com")
                || u.contains("account.microsoft.com");
    }

    private void onLoaded(String url) {
        if (!running) return;
        if (isLogin(url)) {
            waitingLogin = true;
            activity.setBingStatus("Inicia sesión con la misma cuenta Microsoft. Solo una vez; luego sigue solo.");
            return;
        }
        if (waitingLogin) {
            waitingLogin = false;
            activity.setBingStatus("Sesión guardada. Continuando…");
        }
        if ("news".equals(kind)) {
            handleNews(url);
        } else {
            handleCheckin();
        }
    }

    private void handleCheckin() {
        handler.postDelayed(() -> bing.evaluateJavascript(CHECKIN_JS, value -> {
            if (!running) return;
            boolean ok = false;
            String how = "";
            try {
                String raw = decodeJs(value);
                JSONObject o = new JSONObject(raw);
                ok = o.optBoolean("ok", false);
                how = o.optString("how", "");
            } catch (Exception e) {
                if (value != null && value.contains("ok") && value.contains("true")) ok = true;
            }
            if (ok) {
                finish(true, "Check-in listo (" + how + ")");
                return;
            }
            step++;
            if (step < CHECKIN_URLS.length) {
                activity.setBingStatus("Check-in, intento " + (step + 1) + "…");
                bing.loadUrl(CHECKIN_URLS[step]);
            } else {
                finish(false, "No se pudo reclamar el check-in. ¿Misma cuenta Microsoft?");
            }
        }), 2500);
    }

    private void handleNews(String url) {
        if (newsHrefs.isEmpty() && url != null && url.contains("/news")) {
            handler.postDelayed(() -> bing.evaluateJavascript(NEWS_HREFS_JS, value -> {
                parseHrefs(value);
                openNextArticle();
            }), 2000);
            return;
        }
        if (newsIndex > 0 && newsIndex <= newsHrefs.size()) {
            handler.postDelayed(this::openNextArticle, 12000);
        }
    }

    private static String decodeJs(String value) throws Exception {
        if (value == null || value.equals("null")) return "{}";
        Object parsed = new org.json.JSONTokener(value).nextValue();
        return parsed == null ? "{}" : parsed.toString();
    }

    private void parseHrefs(String value) {
        newsHrefs.clear();
        if (value == null) return;
        try {
            String raw = decodeJs(value);
            org.json.JSONArray arr = new org.json.JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                newsHrefs.add(arr.getString(i));
            }
        } catch (Exception ignored) {}
    }

    private void openNextArticle() {
        if (!running) return;
        if (newsHrefs.isEmpty()) {
            finish(false, "No se encontraron noticias Bing para abrir");
            return;
        }
        if (newsIndex >= newsHrefs.size() || newsIndex >= 6) {
            finish(true, "Noticias: abiertas " + newsIndex + " artículos");
            return;
        }
        String href = newsHrefs.get(newsIndex);
        newsIndex++;
        activity.setBingStatus("Leyendo artículo " + newsIndex + "…");
        bing.loadUrl(href);
    }

    private void finish(boolean ok, String detail) {
        running = false;
        handler.removeCallbacksAndMessages(null);
        try { CookieManager.getInstance().flush(); } catch (Exception ignored) {}
        activity.onBingTaskDone(ok, detail);
    }
}
