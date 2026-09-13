/* AutoRewarder phone companion — LAN or remote HTTPS tunnel. */
function native() {
  try { return window.Android || null; } catch (e) { return null; }
}
const PHONE_PROTOCOL = 2;
const PHONE_JOB_KINDS = { checkin: 1, news: 1 };
const state = {
  base: "",
  lan: "",
  token: "",
  account: "",
  membership: "",
  phone: "",
  pendingJob: null,
  pairing: false,
  scanningQr: false,
  pcBusy: false,
  pendingPhoneUpdate: null,
  phoneUpdateCheckRunning: false,
  phoneUpdateDownloading: false,
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

async function fetchRaw(method, url, body, token, timeoutMs) {
  const github = String(url || "").indexOf("api.github.com") >= 0;
  const headers = {
    "Content-Type": "application/json",
    Accept: github ? "application/vnd.github+json" : "application/json",
  };
  if (token) headers.Authorization = "Bearer " + token;
  const ms = timeoutMs || 10000;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms) : null;
  try {
    const res = await fetch(url, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    });
    const text = await res.text();
    if (res.ok) return text;
    try {
      const data = JSON.parse(text || "{}");
      if (data && typeof data === "object") {
        if (data.status == null) data.status = res.status;
        if (data.ok == null) data.ok = false;
        if (!data.error) data.error = "http";
        return JSON.stringify(data);
      }
    } catch (e) {}
    return JSON.stringify({ ok: false, status: res.status, error: "http" });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isAuthError(e) {
  return String((e && e.message) || e) === "auth";
}

function isPcAppError(data) {
  if (!data || data.ok !== false || !data.error) return false;
  const known = {
    already_running: 1,
    no_microsoft_account: 1,
    microsoft_setup_pending: 1,
    browser_loading: 1,
    bad_code: 1,
    rate_limit: 1,
    expired: 1,
    no_account: 1,
    busy: 1,
    unknown_job: 1,
    protocol: 1,
    already_done: 1,
  };
  return !!known[data.error];
}

function protocolOk(data) {
  if (!data || data.protocol == null || data.protocol === "") return true;
  const p = Number(data.protocol);
  if (!isFinite(p)) return true;
  if (p > PHONE_PROTOCOL) {
    log("El PC usa protocolo " + p + ". Actualiza AutoRewarder Mobile.");
    return false;
  }
  return true;
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
        if (!protocolOk(data)) throw new Error("protocol");
        if (isPcAppError(data)) return data;
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
  const until = parts.length >= 5 ? Number(parts[4] || 0) : 0;
  if (until && until * 1000 < Date.now() - 30000) return;
  applyFound({
    url: parts[1],
    code: parts[2],
    sig: parts[3] || "",
    until: until || 0,
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

function setPairBusy(busy) {
  const btn = document.querySelector("#pair_screen .primary-btn-lg");
  const qr = document.querySelector("#pair_screen .qr-square");
  if (btn) btn.disabled = !!busy;
  if (qr) qr.disabled = !!busy;
}

function scanQr() {
  if (state.scanningQr || state.pairing) return;
  const status = document.getElementById("pair_status");
  if (status) status.textContent = "Abriendo la cámara…";
  if (native() && native().scanQr) {
    state.scanningQr = true;
    setPairBusy(true);
    native().scanQr();
    return;
  }
  if (status) status.textContent = "La cámara solo está en la app Android.";
}

window.onQrScanFailed = function (msg) {
  state.scanningQr = false;
  if (!state.pairing) setPairBusy(false);
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
  state.scanningQr = false;
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
  setPairBusy(true);
  try {
    if (!state.found || !state.found.url) {
      status.textContent = "Buscando el PC…";
      try { if (native() && native().discover) native().discover(); } catch (e) {}
      try { if (native() && native().scanLan) native().scanLan(); } catch (e) {}
      await waitForUrl(8000);
    }
    const found = state.found;
    if (!found || !found.url) {
      status.textContent = "Aún no se ve el PC. AutoRewarder en el PC tiene que ser 4.3 o más (el 4.2 no tiene puente). En Wi‑Fi reintenta; en datos, escanea el QR.";
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
        protocol: PHONE_PROTOCOL,
      };
      let text = httpRaw("POST", base + "/pair", payload, "");
      if (text == null) {
        try { text = await fetchRaw("POST", base + "/pair", payload, ""); } catch (e) { continue; }
      }
      try { data = JSON.parse(text || "{}"); } catch (e) { data = null; }
      if (data && !protocolOk(data)) {
        status.textContent = "Este PC usa un protocolo más nuevo. Actualiza la app.";
        return;
      }
      if (data && data.ok && data.token) {
        used = base;
        break;
      }
    }
    if (!data || !data.ok || !data.token) {
      const msg = (data && (data.message || data.error)) || "";
      if (!data) {
        status.textContent = "No hay puente en ese PC (¿versión 4.2?). Actualiza AutoRewarder a 4.3 o más.";
      } else if (data.error === "no_microsoft_account") {
        status.textContent = data.message || "No hay cuenta Microsoft seleccionada en el PC.";
      } else if (data.error === "rate_limit") {
        status.textContent = "Demasiados intentos. Espera un minuto y usa el código nuevo del PC.";
      } else if (data.error === "expired") {
        status.textContent = data.message || "Ese código ya caducó. En el PC abre Account → Vincular un celular otra vez.";
      } else if (data.error === "protocol") {
        status.textContent = data.message || "Actualiza AutoRewarder en el PC.";
      } else {
        status.textContent = msg || "Código no activo. En el PC: Account → Vincular un celular, y usa ese código.";
      }
      return;
    }
    state.token = data.token;
    state.account = data.account;
    state.membership = data.membership;
    state.phone = data.phone || deviceName();
    state.ready = !!data.ready;
    state.base = data.public_url || data.url || used;
    state.lan = data.lan_url || (used.indexOf("192.") >= 0 || used.indexOf("10.") >= 0 ? used : state.lan);
    persist();
    showMain();
    log("Linked to " + state.account);
    refreshOverview();
    reportEvent("paired", true, "linked");
    ensureBingSetup(true);
  } catch (e) {
    status.textContent = "No se alcanzó el PC. ¿AutoRewarder 4.3+ abierto en la misma red? El 4.2 no tiene puente. Escanea el QR si hace falta.";
  } finally {
    state.pairing = false;
    setPairBusy(false);
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
    if (me && me.error === "auth") throw new Error("auth");
    if (!me || !me.ok) throw new Error("unreachable");
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
    log("PC no reachable. Reintentando con la última URL…");
    const again = await reconnect(state.lan || state.base);
    if (again) return;
    const hint = document.getElementById("offline_hint");
    if (hint) {
      hint.hidden = false;
      hint.textContent = "Sin conexión al PC. Abre AutoRewarder en el PC y, si hace falta, escanea el QR otra vez. No se desvincula al cerrar esta app.";
    }
  }
}

async function reconnect(hostOverride) {
  const typed = String((document.getElementById("reconnect_host") || {}).value || "").trim();
  const host = hostOverride || typed || state.lan || state.base;
  if (!host) return false;
  state.base = normalizeBase(host.indexOf("http") === 0 || host.indexOf(":") >= 0 ? host : host + ":38471");
  persist();
  try {
    const me = await request("GET", "/me");
    if (me && me.ok) {
      log("Reconectado.");
      const recon = document.getElementById("reconnect_wrap");
      if (recon) recon.hidden = true;
      const hint = document.getElementById("offline_hint");
      if (hint) hint.hidden = true;
      refreshOverview();
      return true;
    }
    log("Ese enlace no aceptó este teléfono.");
  } catch (e) {
    log("No se pudo reconectar.");
  }
  return false;
}

async function refreshOverview() {
  try {
    const disc = await request("GET", "/discover");
    if (disc) {
      const next = disc.public_url || disc.lan_url || disc.url;
      if (next) state.base = next;
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
      if (obj && typeof obj === "object") return obj.label || fallback || "—";
      if (obj != null && obj !== "") return String(obj);
      return fallback || "—";
    };
    set("progress_pc", "PC: " + frac(progress.pc));
    set("progress_mobile", "Mobile: " + frac(progress.mobile));
    set("progress_daily", "Daily: " + frac(progress.daily));
    set("progress_visual", "Visual: " + frac(progress.visual));
    set("progress_checkin", "Check-in: " + frac(progress.checkin));
    set("progress_news", "News: " + frac(progress.news));
    set("progress_edge", "Edge: " + frac(progress.edge));
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
  const pcEl = document.getElementById("count_pc");
  const mobEl = document.getElementById("count_mobile");
  let pc = Math.max(0, Math.min(130, Math.floor(Number((pcEl || {}).value || 0))));
  let mobile = Math.max(0, Math.min(99, Math.floor(Number((mobEl || {}).value || 0))));
  if (pcEl) pcEl.value = pc;
  if (mobEl) mobEl.value = mobile;
  try {
    const data = await request("POST", "/pc/queries", { pc: pc, mobile: mobile });
    if (data && data.pc != null) pc = data.pc;
    if (data && data.mobile != null) mobile = data.mobile;
    if (pcEl) pcEl.value = pc;
    if (mobEl) mobEl.value = mobile;
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
  if (!job || typeof job !== "object") return;
  const id = String(job.id || "").trim();
  const kind = String(job.kind || "");
  if (!id) {
    log("PC job ignorado (sin id)");
    return;
  }
  if (!PHONE_JOB_KINDS[kind]) {
    log("PC job ignorado (kind desconocido): " + kind);
    request("POST", "/jobs/" + encodeURIComponent(id) + "/done", { ok: false, detail: "unknown_job" }).catch(function () {});
    return;
  }
  state.pendingJob = job;
  log("PC job: " + kind);
  const banner = document.getElementById("job_banner");
  if (banner) {
    banner.hidden = false;
    banner.textContent = "PC job: " + kind;
  }
  runPhone(kind);
}

async function finishPending(ok, detail) {
  const job = state.pendingJob;
  const id = job ? String(job.id || "").trim() : "";
  if (id) {
    try {
      await request("POST", "/jobs/" + encodeURIComponent(id) + "/done", { ok: !!ok, detail: detail || "" });
    } catch (e) {}
  }
  state.pendingJob = null;
  const banner = document.getElementById("job_banner");
  if (banner) {
    banner.hidden = true;
    banner.textContent = "";
  }
  log(ok ? (detail || "Listo") : (detail || "No terminó"));
}

async function runPc(mode) {
  if (state.pcBusy) return;
  state.pcBusy = true;
  ["pc_start_btn", "pc_tasks_btn", "pc_edge_btn"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
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
  } finally {
    state.pcBusy = false;
  }
}

async function stopPc() {
  if (state.pcBusy) return;
  state.pcBusy = true;
  const stop = document.getElementById("pc_stop_btn");
  if (stop) stop.disabled = true;
  try {
    const data = await request("POST", "/pc/stop", { manual: true });
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
  } finally {
    state.pcBusy = false;
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
  let ok = true;
  try {
    if (native() && native().installBing) ok = native().installBing() !== false;
  } catch (e) {
    ok = false;
  }
  if (!ok) {
    state.waitingBingInstall = false;
    log("No se pudo abrir Play Store.");
    setBingBanner("No se pudo abrir Play Store.", true);
    return;
  }
  setBingBanner("Instala Bing y vuelve a AutoRewarder. La UI se actualiza sola.", true);
}

function loginBingApp() {
  log("Abriendo Bing para iniciar sesión…");
  state.waitingBingLogin = true;
  let ok = true;
  try {
    if (native() && native().openBingApp) ok = native().openBingApp("login") !== false;
  } catch (e) {
    ok = false;
  }
  if (!ok) {
    state.waitingBingLogin = false;
    log("No se pudo abrir Bing.");
    setBingBanner("No se pudo abrir Bing.", true);
    return;
  }
  setBingBanner("Inicia sesión en Bing con la misma cuenta Microsoft, luego vuelve.", true);
}

function runPhone(kind) {
  if (state.pendingVerify) {
    log("Ya hay una tarea de Bing abierta.");
    return;
  }
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
  const kind = state.pendingVerify || "task";
  state.pendingVerify = null;
  finishPending(!!ok, detail || "");
  reportEvent(kind, !!ok, detail || "");
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
    if (hadBing) {
      state.bingReady = true;
      persist();
      log("Sesión de Bing lista. Ya puedes hacer check-in y noticias.");
      setBingBanner("Bing lista. Pulsa Check-in o Noticias.");
      if (state.pendingBingKind) {
        const kind = state.pendingBingKind;
        state.pendingBingKind = null;
        runPhone(kind);
      }
    } else {
      log("Volviste, pero Bing no está instalada.");
      setBingBanner("Instala Bing para continuar.", true);
    }
  } else if (state.pendingVerify) {
    const kind = state.pendingVerify;
    state.pendingVerify = null;
    log("Volviste de Bing. Completa el check-in o las noticias en Bing si aún no lo hiciste.");
    reportEvent(kind, false, "returned from bing, not verified");
    finishPending(false, "returned from bing, not verified");
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
  try {
    const data = await request("POST", "/phone/unlink", {});
    if (!data || !data.ok) {
      log("No se pudo desvincular en el PC. Inténtalo de nuevo.");
      return;
    }
  } catch (e) {
    if (isAuthError(e)) {
      dropLink("El PC te desvinculó. Escanea el QR para volver a unir.");
      return;
    }
    log("No se pudo desvincular: " + (e.message || e));
    return;
  }
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
  if (download) {
    download.disabled = !(state.pendingPhoneUpdate && state.pendingPhoneUpdate.download_url);
  }
}

function cancelPhoneUpdate() {
  state.phoneUpdateDownloading = false;
  state.pendingPhoneUpdate = null;
  try {
    const n = native();
    if (n && n.cancelDownloadUpdate) n.cancelDownloadUpdate();
  } catch (e) {}
  setUpdateBanner("");
}

function downloadPhoneUpdate() {
  const update = state.pendingPhoneUpdate;
  if (!update || !update.download_url || state.phoneUpdateDownloading) return;
  state.phoneUpdateDownloading = true;
  setUpdateBanner(update.source === "pc" ? "Descargando la actualización desde el PC…" : "Descargando la actualización desde GitHub…");
  const download = document.getElementById("update_download_btn");
  if (download) download.disabled = true;
  const n = native();
  if (n && n.downloadUpdate) {
    n.downloadUpdate(update.download_url);
  } else {
    state.phoneUpdateDownloading = false;
    setUpdateBanner("Esta versión no puede descargar el APK automáticamente.", true);
  }
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

async function _pcPhoneUpdate() {
  const urls = bases();
  for (let i = 0; i < urls.length; i++) {
    try {
      let text = httpRaw("GET", urls[i] + "/update", null, "");
      if (text == null) text = await fetchRaw("GET", urls[i] + "/update", null, "");
      const data = JSON.parse(text || "{}");
      if (!data || data.ok === false) continue;
      const name = String(data.versionName || data.versionCode || "");
      if (!name) continue;
      const apk = String(data.apk || "/update/apk");
      const path = apk.indexOf("http") === 0 ? apk : (urls[i] + (apk.charAt(0) === "/" ? apk : "/" + apk));
      return {
        repo: "pc",
        tag: name,
        url: path,
        download_url: path,
        source: "pc",
      };
    } catch (e) {}
  }
  return null;
}

async function _githubPhoneRelease(repo) {
  try {
    const url = "https://api.github.com/repos/" + repo + "/releases/latest";
    let text = httpRaw("GET", url, null, "");
    if (text == null) text = await fetchRaw("GET", url, null, "");
    const data = JSON.parse(text || "{}");
    if (data && data.ok === false && !data.tag_name) {
      return { error: data.error || "github", repo: repo };
    }
    if (data && data.message && !data.tag_name) return { error: "github", repo: repo };
    if (!data || !data.tag_name) return { error: "no_tag", repo: repo };
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
  } catch (e) {
    return { error: "network", repo: repo };
  }
}

async function checkPhoneUpdate(manual) {
  if (state.phoneUpdateCheckRunning || state.phoneUpdateDownloading) return;
  state.phoneUpdateCheckRunning = true;
  const watchdog = setTimeout(function () { state.phoneUpdateCheckRunning = false; }, 25000);
  const button = document.getElementById("updates_btn");
  if (manual && button) { button.disabled = true; button.textContent = "Comprobando…"; }
  const n = native();
  try {
    const mine = n && n.appVersionName ? String(n.appVersionName() || "4.3.18") : "4.3.18";
    const pcUpdate = await _pcPhoneUpdate();
    const original = await _githubPhoneRelease("safarsin/AutoRewarder");
    const custom = await _githubPhoneRelease("iGlitchOn/AutoRewarder-Mobile");
    const customFailed = !!(custom && custom.error);
    if (original && original.tag && _phoneReleaseNewer(original.tag, "4.3") && !state.originalUpdateNotified) {
      state.originalUpdateNotified = true;
      log("Hay una nueva versión del repositorio original (" + original.tag + "). Notifica al desarrollador; no se instalará.");
    }
    if (pcUpdate && _phoneReleaseNewer(pcUpdate.tag, mine)) {
      state.pendingPhoneUpdate = pcUpdate;
      setUpdateBanner("Nueva actualización del PC " + pcUpdate.tag + ". ¿Quieres descargarla?");
    } else if (custom && custom.tag && _phoneReleaseNewer(custom.tag, mine)) {
      state.pendingPhoneUpdate = custom;
      if (custom.download_url) {
        setUpdateBanner("Nueva actualización propia " + custom.tag + ". ¿Quieres descargarla?");
      } else {
        setUpdateBanner("Nueva versión propia " + custom.tag + ", pero todavía no hay un APK adjunto.", true);
      }
    } else if (manual) {
      state.pendingPhoneUpdate = null;
      if (customFailed) {
        setUpdateBanner("No se pudo comprobar GitHub.", true);
      } else {
        setUpdateBanner("No hay una actualización propia disponible.");
        setTimeout(function () { if (!state.pendingPhoneUpdate) setUpdateBanner(""); }, 4000);
      }
    } else {
      state.pendingPhoneUpdate = null;
      setUpdateBanner("");
    }
  } catch (e) {
    if (manual) setUpdateBanner("No se pudo comprobar GitHub.", true);
    else {
      state.pendingPhoneUpdate = null;
      setUpdateBanner("");
    }
  } finally {
    clearTimeout(watchdog);
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
  state.phoneUpdateDownloading = false;
  state.pendingPhoneUpdate = null;
  setUpdateBanner("Instala la actualización. La sesión se conserva.");
};

window.onUpdateFailed = function (msg) {
  state.phoneUpdateDownloading = false;
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
