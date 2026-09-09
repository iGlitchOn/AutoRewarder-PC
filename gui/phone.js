/* AutoRewarder phone companion — LAN or remote HTTPS tunnel. */
function native() {
  try { return window.Android || null; } catch (e) { return null; }
}
const state = {
  base: "",
  lan: "",
  token: "",
  account: "",
  membership: "",
  phone: "",
  pendingJob: null,
  pendingPhoneUpdate: null,
  phoneUpdateCheckRunning: false,
  originalUpdateNotified: false,
  restored: false,
};

function log(msg) {
  const area = document.getElementById("log_area");
  if (!area) return;
  const line = document.createElement("div");
  line.textContent = msg;
  area.appendChild(line);
  area.scrollTop = area.scrollHeight;
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  const a = (parts[0] || "?").charAt(0);
  const b = parts.length > 1 ? parts[1].charAt(0) : (parts[0] || "").charAt(1) || "";
  return (a + b).toUpperCase();
}

function loadSaved() {
  const n = native();
  try {
    if (n && n.loadPairing) {
      const raw = n.loadPairing();
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  try {
    const raw = localStorage.getItem("ar_pair");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function savePair(data) {
  const raw = JSON.stringify(data);
  try { localStorage.setItem("ar_pair", raw); } catch (e) {}
  try {
    const n = native();
    if (n && n.savePairing) n.savePairing(raw);
  } catch (e) {}
}

function persist() {
  savePair({
    base: state.base,
    lan: state.lan,
    token: state.token,
    account: state.account,
    membership: state.membership,
    phone: state.phone,
    bingReady: !!state.bingReady,
  });
}

function clearPair() {
  try { localStorage.removeItem("ar_pair"); } catch (e) {}
  try {
    const n = native();
    if (n && n.clearPairing) n.clearPairing();
  } catch (e) {}
  state.token = "";
  state.base = "";
  state.lan = "";
}

function deviceName() {
  try { const n = native(); if (n && n.deviceName) return n.deviceName(); } catch (e) {}
  return "Phone";
}

function deviceModel() {
  try { const n = native(); if (n && n.deviceModel) return n.deviceModel(); } catch (e) {}
  return "";
}

function bases() {
  const out = [];
  const add = function (u) {
    if (!u) return;
    u = String(u).replace(/\/$/, "");
    if (out.indexOf(u) < 0) out.push(u);
  };
  add(state.lan);
  add(state.base);
  return out;
}

function httpRaw(method, url, body, token) {
  if (native() && native().http) {
    return native().http(method, url, body ? JSON.stringify(body) : "", token || "");
  }
  return null;
}

async function fetchRaw(method, url, body, token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(url, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return await res.text();
}

function isAuthError(e) {
  return String((e && e.message) || e) === "auth";
}

function androidId() {
  try {
    const n = native();
    if (n && n.androidId) return String(n.androidId() || "");
  } catch (e) {}
  return "";
}

function dropLink(reason) {
  clearPair();
  showPair();
  const status = document.getElementById("pair_status");
  if (status && reason) status.textContent = reason;
  try { if (native() && native().discover) native().discover(); } catch (e) {}
}

function forgetStaleOn(url) {
  const id = androidId();
  if (!id || !url || state.token) return;
  const base = String(url).replace(/\/$/, "");
  const body = { android_id: id, name: deviceName(), model: deviceModel() };
  try {
    let text = httpRaw("POST", base + "/phone/forget", body, "");
    if (text == null) fetchRaw("POST", base + "/phone/forget", body, "").catch(function () {});
  } catch (e) {}
}

async function request(method, path, body) {
  const urls = bases();
  if (!urls.length) throw new Error("not linked");
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i] + path;
      try {
        let text = httpRaw(method, url, body, state.token);
        if (text == null) text = await fetchRaw(method, url, body, state.token);
        const data = JSON.parse(text || "{}");
        if (data && data.error === "auth") throw new Error("auth");
        if (data && data.ok === false && data.error && data.status == null) {
          last = new Error(data.error);
          continue;
        }
        if (urls[i].indexOf("192.") >= 0 || urls[i].indexOf("10.") >= 0 || urls[i].indexOf("172.") >= 0) {
          state.lan = urls[i];
        } else {
          state.base = urls[i];
        }
        persist();
        return data;
      } catch (e) {
        last = e;
      }
    }
  }
  throw last || new Error("offline");
}

function showMain() {
  document.getElementById("pair_screen").hidden = true;
  document.getElementById("main_screen").hidden = false;
  document.getElementById("ms_name").textContent = state.account || "Microsoft account";
  document.getElementById("ms_avatar").textContent = initials(state.account || "MS");
  document.getElementById("ph_name").textContent = state.phone || deviceName();
  const ready = state.ready ? "Listo" : "Falta setup en el PC";
  const mem = state.membership || "Microsoft Rewards";
  document.getElementById("ms_meta").textContent = ready + " · " + mem + " · by Microsoft";
  document.getElementById("ph_meta").textContent = ready + " · " + mem + " · by phone";
  updateBingUi();
}

function showPair() {
  document.getElementById("pair_screen").hidden = false;
  document.getElementById("main_screen").hidden = true;
}

window.onBeaconRaw = function (msg) {
  const parts = String(msg || "").split("|");
  if (parts[0] === "AR1" && parts.length >= 4) {
    const ip = parts[1];
    const port = parts[2];
    const code = parts[3];
    const remote = parts.length >= 5 ? parts[4] : "";
    const url = remote && remote.indexOf("http") === 0 ? remote : ("http://" + ip + ":" + port);
    applyFound({ url: url, code: code, sig: "" });
    return;
  }
  if (parts[0] !== "AR2" || parts.length < 3) return;
  applyFound({
    url: parts[1],
    code: parts[2],
    sig: parts[3] || "",
  });
};

function applyFound(found, fromScan) {
  if (!found || !found.url || found.url.indexOf("http") !== 0) return;
  state.found = found;
  const codeEl = document.getElementById("pair_code");
  const status = document.getElementById("pair_status");
  if (found.code && found.code.length === 6 && codeEl) {
    codeEl.value = found.code;
  }
  if (state.token && found.url && found.code === "-") {
    if (found.url !== state.base) {
      state.base = found.url;
      persist();
      request("GET", "/me").then(function (me) {
        if (me && me.ok) log("PC actualizado.");
      }).catch(function () {});
    }
    return;
  }
  if (status && found.code && found.code !== "-") {
    status.textContent = "PC encontrado. Confirma el código y vincula.";
  } else if (status && found.url) {
    status.textContent = "PC encontrado. Escribe el código y pulsa Vincular.";
  }
  if (!state.token && found.url) forgetStaleOn(found.url);
}

function parsePairText(text) {
  text = String(text || "").trim();
  if (!text) return null;
  if (/^\d{6}$/.test(text)) {
    const codeEl = document.getElementById("pair_code");
    if (codeEl) codeEl.value = text;
    return { code: text };
  }
  if (text.indexOf("AR1|") === 0 || text.indexOf("AR2|") === 0) {
    window.onBeaconRaw(text);
    return state.found || { raw: text };
  }
  const urlMatch = text.match(/https?:\/\/[^\s|]+/i);
  const codeMatch = text.match(/\b(\d{6})\b/);
  if (codeMatch) {
    const codeEl = document.getElementById("pair_code");
    if (codeEl) codeEl.value = codeMatch[1];
  }
  if (urlMatch) {
    applyFound({
      url: urlMatch[0].replace(/\/$/, ""),
      code: codeMatch ? codeMatch[1] : "",
      sig: "",
    }, true);
    return state.found;
  }
  return null;
}

function normalizeBase(raw) {
  let v = String(raw || "").trim();
  if (!v) return "";
  if (v.indexOf("http") !== 0) v = "http://" + v;
  return v.replace(/\/$/, "");
}

function scanQr() {
  const status = document.getElementById("pair_status");
  if (status) status.textContent = "Abriendo la cámara…";
  if (native() && native().scanQr) {
    native().scanQr();
    return;
  }
  if (status) status.textContent = "La cámara solo está en la app Android.";
}

window.onQrScanFailed = function (msg) {
  const status = document.getElementById("pair_status");
  if (status) {
    status.textContent = msg || "Cámara cerrada. Escribe el código o vuelve a escanear.";
  }
};

window.onLanFound = function (url) {
  if (url) applyFound({ url: url, code: "-", sig: "" });
  state.lanScanDone = true;
};

window.onQrScanned = function (text) {
  const parsed = parsePairText(text);
  const status = document.getElementById("pair_status");
  if ((parsed && parsed.url) || (state.found && state.found.url)) {
    if (status) status.textContent = "QR leído. Vinculando…";
    doPair();
    return;
  }
  if (parsed && parsed.code) {
    if (status) status.textContent = "Código leído. Buscando el PC…";
    doPair();
    return;
  }
  if (status) status.textContent = "QR leído, pero no era el de AutoRewarder. Escribe el código o vuelve a escanear.";
};

function waitForUrl(ms) {
  return new Promise(function (resolve) {
    const start = Date.now();
    const tick = function () {
      if (state.found && state.found.url) return resolve(true);
      if (Date.now() - start >= ms) return resolve(false);
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function doPair() {
  const status = document.getElementById("pair_status");
  if (state.pairing) return;
  const code = String(document.getElementById("pair_code").value || "").replace(/\D/g, "");
  if (code.length !== 6) {
    status.textContent = "Pon el código de 6 dígitos del PC.";
    return;
  }
  state.pairing = true;
  try {
    if (!state.found || !state.found.url) {
      status.textContent = "Buscando el PC…";
      try { if (native() && native().discover) native().discover(); } catch (e) {}
      try { if (native() && native().scanLan) native().scanLan(); } catch (e) {}
      await waitForUrl(8000);
    }
    const found = state.found;
    if (!found || !found.url) {
      status.textContent = "Aún no se ve el PC. En datos móviles pulsa el cuadrado QR y apunta al código del PC. En Wi‑Fi, espera y reintenta.";
      return;
    }
    const urls = [];
    const addUrl = function (u) {
      u = normalizeBase(u);
      if (u && urls.indexOf(u) < 0) urls.push(u);
    };
    addUrl(found.url);
    addUrl(state.lan);
    addUrl(state.base);
    status.textContent = "Vinculando…";
    let data = null;
    let used = "";
    for (let i = 0; i < urls.length; i++) {
      const base = urls[i];
      const payload = {
        code: code,
        sig: found.sig || "",
        url: base,
        name: deviceName(),
        model: deviceModel(),
        android_id: androidId(),
      };
      let text = httpRaw("POST", base + "/pair", payload, "");
      if (text == null) {
        try { text = await fetchRaw("POST", base + "/pair", payload, ""); } catch (e) { continue; }
      }
      try { data = JSON.parse(text || "{}"); } catch (e) { data = null; }
      if (data && data.ok && data.token) {
        used = base;
        break;
      }
    }
    if (!data || !data.ok || !data.token) {
      const msg = (data && (data.message || data.error)) || "";
      if (data && data.error === "no_microsoft_account") {
        status.textContent = data.message || "No hay cuenta Microsoft seleccionada en el PC.";
      } else if (data && data.error === "rate_limit") {
        status.textContent = "Demasiados intentos. Espera un minuto y usa el código nuevo del PC.";
      } else {
        status.textContent = msg || "Código no activo. En el PC: Account → Vincular un celular, y usa ese código.";
      }
      return;
    }
    state.token = data.token;
    state.account = data.account;
    state.membership = data.membership;
    state.phone = data.phone || deviceName();
    state.ready = true;
    state.base = data.public_url || data.url || used;
    state.lan = data.lan_url || (used.indexOf("192.") >= 0 || used.indexOf("10.") >= 0 ? used : state.lan);
    persist();
    showMain();
    log("Linked to " + state.account);
    refreshOverview();
    reportEvent("paired", true, "linked");
    ensureBingSetup(true);
  } catch (e) {
    status.textContent = "No se alcanzó el PC. ¿AutoRewarder abierto? Escanea el QR.";
  } finally {
    state.pairing = false;
  }
}

async function restore() {
  const saved = loadSaved();
  if (!saved || !saved.token) {
    showPair();
    try { if (native() && native().discover) native().discover(); } catch (e) {}
    try { if (native() && native().scanLan) native().scanLan(); } catch (e) {}
    if (state.found && state.found.url) forgetStaleOn(state.found.url);
    return;
  }
  state.base = saved.base || saved.public_url || "";
  state.lan = saved.lan || saved.lan_url || "";
  state.token = saved.token;
  state.account = saved.account;
  state.membership = saved.membership;
  state.phone = saved.phone || deviceName();
  state.bingReady = !!saved.bingReady;
  showMain();
  try { if (native() && native().discover) native().discover(); } catch (e) {}
  try {
    const me = await request("GET", "/me");
    if (!me || !me.ok) throw new Error("auth");
    state.account = me.account || state.account;
    state.membership = me.membership || state.membership;
    state.phone = me.phone || state.phone;
    state.ready = me.ready;
    if (me.ui_locale) set_ui_lang(me.ui_locale);
    if (me.version) {
      const el = document.getElementById("app_version");
      if (el) el.textContent = "Microsoft Rewards · Mobile companion · " + me.version;
    }
    persist();
    refreshOverview();
    ensureBingSetup(false);
  } catch (e) {
    if (isAuthError(e)) {
      dropLink("El PC te desvinculó. Escanea el QR para volver a unir.");
      return;
    }
    log("PC no reachable. La vinculación se guarda; no se pierde al cerrar la app. Escanea el QR si el PC cambió de enlace.");
    const hint = document.getElementById("offline_hint");
    if (hint) {
      hint.hidden = false;
      hint.textContent = "Sin conexión al PC. Abre AutoRewarder en el PC y, si hace falta, escanea el QR otra vez. No se desvincula al cerrar esta app.";
    }
  }
}

async function reconnect() {
  const host = String((document.getElementById("reconnect_host") || {}).value || "").trim();
  if (!host) return;
  state.base = normalizeBase(host.indexOf("http") === 0 || host.indexOf(":") >= 0 ? host : host + ":38471");
  persist();
  try {
    const me = await request("GET", "/me");
    if (me && me.ok) {
      log("Reconectado.");
      const recon = document.getElementById("reconnect_wrap");
      if (recon) recon.hidden = true;
      refreshOverview();
    } else log("Ese enlace no aceptó este teléfono.");
  } catch (e) {
    log("No se pudo reconectar.");
  }
}

async function refreshOverview() {
  try {
    const disc = await request("GET", "/discover");
    if (disc && disc.public_url) {
      state.base = disc.public_url;
      if (disc.lan_url) state.lan = disc.lan_url;
      persist();
    }
  } catch (e) {}
  try {
    const data = await request("GET", "/overview");
    if (!data || !data.ok) return;
    const profile = data.profile || {};
    const progress = data.progress || {};
    const set = function (id, v) {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("rewards_level", profile.membership || state.membership || "Microsoft Rewards");
    set("rewards_region", profile.country || "Colombia");
    const frac = function (obj, fallback) {
      if (obj && typeof obj === "object" && obj.label) return obj.label;
      return fallback || "—";
    };
    set("progress_pc", "PC: " + frac(progress.pc));
    set("progress_mobile", "Mobile: " + frac(progress.mobile));
    set("progress_daily", "Daily: " + (progress.daily || "—"));
    set("progress_visual", "Visual: " + (progress.visual || "—"));
    set("progress_checkin", "Check-in: " + frac(progress.checkin, progress.checkin));
    set("progress_news", "News: " + frac(progress.news, progress.news));
    set("progress_edge", "Edge: " + frac(progress.edge, progress.edge));
    set("progress_reset", progress.reset || "—");
    const st = document.getElementById("status_text");
    const dot = document.getElementById("dot");
    if (st) st.textContent = data.running ? "El PC está corriendo" : "Vinculado al PC · listo";
    if (dot) dot.style.background = data.running ? "var(--warning)" : "var(--success)";
    const hint = document.getElementById("offline_hint");
    if (hint) hint.hidden = true;
    const running = !!data.running;
    ["pc_start_btn", "pc_tasks_btn", "pc_edge_btn"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.disabled = running;
    });
    const stop = document.getElementById("pc_stop_btn");
    if (stop) stop.disabled = !running;
    const derived = data.stats || {};
    if (derived.total_points != null) set("stat_total", String(derived.total_points));
    if (derived.today_points != null) set("stat_today", String(derived.today_points));
    const q = data.queries || {};
    const pcEl = document.getElementById("count_pc");
    const mobEl = document.getElementById("count_mobile");
    if (pcEl && q.pc != null && document.activeElement !== pcEl) pcEl.value = q.pc;
    if (mobEl && q.mobile != null && document.activeElement !== mobEl) mobEl.value = q.mobile;
    const block = data.block;
    const br = document.getElementById("run_block_reason");
    if (br) {
      if (block && block.message) {
        br.hidden = false;
        br.textContent = block.message;
      } else {
        br.hidden = true;
      }
    }
  } catch (e) {}
}

async function saveQueries() {
  const pc = Number((document.getElementById("count_pc") || {}).value || 0);
  const mobile = Number((document.getElementById("count_mobile") || {}).value || 0);
  try {
    await request("POST", "/pc/queries", { pc: pc, mobile: mobile });
    log("Búsquedas: PC " + pc + " / móvil " + mobile);
  } catch (e) {
    log("No se guardaron las búsquedas en el PC.");
  }
}

async function pollJobs() {
  if (!state.token) return;
  try {
    const data = await request("GET", "/jobs");
    const jobs = (data && data.jobs) || [];
    for (let i = 0; i < jobs.length; i++) handleJob(jobs[i]);
  } catch (e) {}
}

function handleJob(job) {
  state.pendingJob = job;
  const kind = job.kind;
  log("PC job: " + kind);
  runPhone(kind);
}

async function finishPending(ok, detail) {
  const job = state.pendingJob;
  if (job && job.id) {
    try {
      await request("POST", "/jobs/" + job.id + "/done", { ok: !!ok, detail: detail || "" });
    } catch (e) {}
  }
  state.pendingJob = null;
  log(ok ? (detail || "Listo") : (detail || "No terminó"));
}

async function runPc(mode) {
  try {
    const data = await request("POST", "/pc/run", { mode: mode });
    if (data && data.ok) log("PC: " + mode);
    else {
      const msg = (data && data.message) || (data && data.error) || "blocked";
      if (data && data.kind === "microsoft") {
        log("No se puede iniciar: " + msg + " (cuenta Microsoft en el PC, no el celular).");
      } else {
        log("No se puede iniciar: " + msg);
      }
    }
    refreshOverview();
  } catch (e) {
    log("No se alcanzó el PC (" + (e.message || e) + ")");
  }
}

async function stopPc() {
  try {
    const data = await request("POST", "/pc/stop", {});
    if (data && (data.ok || data.stopped)) {
      log("PC stop enviado.");
      const st = document.getElementById("status_text");
      if (st) st.textContent = "Stopped";
    } else {
      log("Stop falló: " + JSON.stringify(data));
    }
    refreshOverview();
  } catch (e) {
    log("Stop no llegó al PC: " + (e.message || e));
  }
}

function bingInstalled() {
  try { if (native() && native().hasBing) return !!native().hasBing(); } catch (e) {}
  return false;
}

function setBingBanner(msg, warn) {
  const el = document.getElementById("bing_banner");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.classList.toggle("warn", !!warn);
}

function updateBingUi() {
  const installed = bingInstalled();
  if (!installed) state.bingReady = false;
  const pill = document.getElementById("bing_pill");
  const installBtn = document.getElementById("bing_install_btn");
  const loginBtn = document.getElementById("bing_login_btn");
  const setup = document.getElementById("bing_setup_actions");
  const checkinBtn = document.getElementById("phone_checkin_btn");
  const newsBtn = document.getElementById("phone_news_btn");
  if (pill) {
    pill.textContent = !installed
      ? "Bing: no instalada"
      : (state.bingReady ? "Bing: lista" : "Bing: instalada");
  }
  if (installBtn) installBtn.hidden = installed;
  if (loginBtn) loginBtn.hidden = !installed || !!state.bingReady;
  if (setup) setup.hidden = installed && !!state.bingReady;
  [checkinBtn, newsBtn].forEach(function (el) {
    if (el) el.disabled = !installed || !state.bingReady;
  });
  if (!installed) {
    setBingBanner("Instala Bing (Microsoft). Check-in y noticias solo cuentan en esa app.", true);
  } else if (!state.bingReady) {
    setBingBanner("Abre Bing e inicia sesión con la misma cuenta Microsoft. Luego Check-in / Noticias.", true);
  } else {
    setBingBanner("");
  }
}

function ensureBingSetup(justPaired) {
  updateBingUi();
  if (!bingInstalled()) {
    if (justPaired) {
      log("Bing no está. Abre Play Store para instalarla.");
      installBingApp();
    }
    return;
  }
  if (justPaired && !state.bingReady) {
    log("Abre Bing e inicia sesión con la misma cuenta Microsoft.");
    loginBingApp();
  }
}

function installBingApp() {
  log("Abriendo Play Store para instalar Bing…");
  state.waitingBingInstall = true;
  try {
    if (native() && native().installBing) native().installBing();
  } catch (e) {}
  setBingBanner("Instala Bing y vuelve a AutoRewarder. La UI se actualiza sola.", true);
}

function loginBingApp() {
  log("Abriendo Bing para iniciar sesión…");
  state.waitingBingLogin = true;
  try {
    if (native() && native().openBingApp) native().openBingApp("login");
  } catch (e) {}
  setBingBanner("Inicia sesión en Bing con la misma cuenta Microsoft, luego vuelve.", true);
}

function runPhone(kind) {
  updateBingUi();
  if (!bingInstalled()) {
    state.pendingBingKind = kind;
    log("Bing no está instalada. Hay que instalarla primero.");
    installBingApp();
    return;
  }
  const label = kind === "news" ? "noticias" : "check-in";
  log("Abriendo " + label + " en Bing…");
  setBingBanner("Completa " + label + " en Bing. Al volver, AutoRewarder verifica el progreso.", true);
  reportEvent(kind, true, "opened bing");
  let opened = false;
  try {
    if (native() && native().openBingApp) opened = !!native().openBingApp(kind);
  } catch (e) {}
  if (!opened) {
    if (native() && native().runTask) native().runTask(kind);
    else if (native() && native().openBing) native().openBing(kind);
  }
  state.pendingVerify = kind;
}

window.onBingTask = function (ok, detail) {
  finishPending(!!ok, detail || "");
  reportEvent(state.pendingVerify || "task", !!ok, detail || "");
  refreshAll();
};

function reportEvent(kind, ok, detail) {
  if (!state.token) return;
  request("POST", "/phone/event", {
    kind: kind || "",
    ok: !!ok,
    detail: detail || "",
  }).then(function () {
    refreshOverview();
  }).catch(function () {});
}

function refreshAll() {
  updateBingUi();
  refreshOverview();
  pollJobs();
}

window.onAppResume = function () {
  try { if (native() && native().keepDiscovering) native().keepDiscovering(); } catch (e) {}
  try { if (native() && native().discover) native().discover(); } catch (e) {}
  const hadBing = bingInstalled();
  updateBingUi();
  if (state.waitingBingInstall && hadBing) {
    state.waitingBingInstall = false;
    state.bingReady = false;
    log("Bing instalada. Ahora inicia sesión.");
    loginBingApp();
  } else if (state.waitingBingLogin) {
    state.waitingBingLogin = false;
    state.bingReady = true;
    persist();
    log("Sesión de Bing lista. Ya puedes hacer check-in y noticias.");
    setBingBanner("Bing lista. Pulsa Check-in o Noticias.");
    if (state.pendingBingKind) {
      const kind = state.pendingBingKind;
      state.pendingBingKind = null;
      runPhone(kind);
    }
  } else if (state.pendingVerify) {
    const kind = state.pendingVerify;
    state.pendingVerify = null;
    log("Volviste de Bing. Verificando " + kind + " en Rewards…");
    reportEvent(kind, true, "returned from bing");
  }
  if (state.token) refreshAll();
  checkPhoneUpdate();
};

async function heartbeat() {
  if (!state.token) return;
  try { if (native() && native().keepDiscovering) native().keepDiscovering(); } catch (e) {}
  try {
    await request("GET", "/me");
  } catch (e) {
    if (isAuthError(e)) dropLink("El PC te desvinculó. Escanea el QR para volver a unir.");
  }
}

async function unlinkPhone() {
  try { await request("POST", "/phone/unlink", {}); } catch (e) {}
  dropLink("Desvinculado. Escanea el QR para volver a unir.");
}

function setUpdateBanner(msg, warn) {
  const el = document.getElementById("update_banner");
  const text = document.getElementById("update_text");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    if (text) text.textContent = "";
    return;
  }
  el.hidden = false;
  if (text) text.textContent = msg;
  else el.textContent = msg;
  el.classList.toggle("warn", !!warn);
  const download = document.getElementById("update_download_btn");
  if (download && !state.pendingPhoneUpdate) download.disabled = true;
}

function cancelPhoneUpdate() {
  state.pendingPhoneUpdate = null;
  setUpdateBanner("");
}

function downloadPhoneUpdate() {
  const update = state.pendingPhoneUpdate;
  if (!update || !update.download_url) return;
  setUpdateBanner("Descargando la actualización desde GitHub…");
  const n = native();
  if (n && n.downloadUpdate) {
    n.downloadUpdate(update.download_url);
  } else {
    setUpdateBanner("Esta versión no puede descargar el APK automáticamente.", true);
  }
  state.pendingPhoneUpdate = null;
}

function _phoneVersion(value) {
  const nums = String(value || "").match(/\d+/g) || [];
  return [0, 1, 2].map(function (_, i) { return Number(nums[i] || 0); });
}

function _phoneReleaseNewer(latest, current) {
  const a = _phoneVersion(latest);
  const b = _phoneVersion(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

async function _githubPhoneRelease(repo) {
  const url = "https://api.github.com/repos/" + repo + "/releases/latest";
  let text = httpRaw("GET", url, null, "");
  if (text == null) text = await fetchRaw("GET", url, null, "");
  const data = JSON.parse(text || "{}");
  if (!data || !data.tag_name) return null;
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const apk = assets.find(function (item) {
    return String(item.name || "").toLowerCase().endsWith(".apk");
  });
  return {
    repo: repo,
    tag: data.tag_name,
    url: data.html_url || ("https://github.com/" + repo + "/releases/latest"),
    download_url: apk ? apk.browser_download_url : "",
  };
}

async function checkPhoneUpdate(manual) {
  if (state.phoneUpdateCheckRunning) return;
  state.phoneUpdateCheckRunning = true;
  const button = document.getElementById("updates_btn");
  if (manual && button) { button.disabled = true; button.textContent = "Comprobando…"; }
  const n = native();
  try {
 const mine = n && n.appVersionName ? String(n.appVersionName() || "4.3.4") : "4.3.4";
    const original = await _githubPhoneRelease("safarsin/AutoRewarder");
    const custom = await _githubPhoneRelease("iGlitchOn/AutoRewarder-Mobile");
    if (original && _phoneReleaseNewer(original.tag, "4.3") && !state.originalUpdateNotified) {
      state.originalUpdateNotified = true;
      log("Hay una nueva versión del repositorio original (" + original.tag + "). Notifica al desarrollador; no se instalará.");
    }
    if (custom && _phoneReleaseNewer(custom.tag, mine)) {
      state.pendingPhoneUpdate = custom;
      if (custom.download_url) {
        setUpdateBanner("Nueva actualización propia " + custom.tag + ". ¿Quieres descargarla?");
      } else {
        setUpdateBanner("Nueva versión propia " + custom.tag + ", pero todavía no hay un APK adjunto.", true);
        const download = document.getElementById("update_download_btn");
        if (download) download.disabled = true;
      }
    } else if (manual) {
      setUpdateBanner("No hay una actualización propia disponible.");
      setTimeout(function () { if (!state.pendingPhoneUpdate) setUpdateBanner(""); }, 4000);
    }
  } catch (e) {
    if (manual) setUpdateBanner("No se pudo comprobar GitHub.", true);
  } finally {
    state.phoneUpdateCheckRunning = false;
    if (manual && button) { button.disabled = false; button.textContent = "Buscar updates"; }
  }
}

window.onNativeReady = function () {
  try { if (native() && native().discover) native().discover(); } catch (e) {}
  restore();
  checkPhoneUpdate();
};

window.onUpdateReady = function () {
  setUpdateBanner("Instala la actualización. La sesión se conserva.");
};

window.onUpdateFailed = function (msg) {
  setUpdateBanner(msg || "No se pudo actualizar.", true);
};

try { if (native() && native().discover) native().discover(); } catch (e) {}
restore();
checkPhoneUpdate();
setTimeout(function () {
  restore();
  checkPhoneUpdate();
}, 400);
setInterval(pollJobs, 3000);
setInterval(refreshOverview, 5000);
setInterval(heartbeat, 5000);
setInterval(checkPhoneUpdate, 20000);
