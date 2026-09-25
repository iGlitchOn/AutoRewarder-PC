/* AutoRewarder UI strings. Default language is auto (Windows / region). */
const I18N = {
  en: {
    "run.start": "Start run",
    "run.tasks": "Tasks only",
    "run.stop": "Stop",
    "run.running": "Running…",
    "run.loading": "Loading…",
    "run.stopping": "Stopping…",
    "run.no_microsoft": "No Microsoft account selected.",
    "run.microsoft_setup": "Microsoft account setup is not finished.",
    "run.already_running": "A run is already in progress.",
    "run.browser_loading": "Wait for the browser to finish loading.",
    "run.browser_busy": "Wait for the browser to finish.",
    "run.phone_offline": "No phone linked, or the phone is offline.",
    "run.no_phone": "No phone linked to this Microsoft account.",
    "pair.title": "Link a phone",
    "pair.hint": "On the phone, enter or scan this code. The phone finds this PC by itself (remote tunnel). Same Microsoft account — not a second login.",
    "pair.copy": "Copy code",
    "pair.copied": "Code copied.",
    "pair.waiting": "Starting remote link…",
    "pair.ready": "Scan the QR or type the code on the phone.",
    "settings.language": "Language",
    "settings.language_hint": "Automatic uses Windows / region. Applies to this PC and the linked phone.",
    "settings.language_auto": "Automatic (Windows / region)",
    "settings.language_en": "English",
    "settings.language_es": "Spanish",
    "label.pc": "PC",
    "label.mobile": "Mobile",
    "status.daily": "Daily tasks",
    "rewards.estimate": "Search estimate",
    "rewards.region_unknown": "Region unknown",
    "progress.daily": "Daily",
    "progress.visual": "Visual",
    "progress.checkin": "Check-in",
    "progress.news": "News",
    "progress.edge": "Edge",
    "progress.reset": "Daily set",
    "activity": "Activity",
    "history": "View history",
  },
  es: {
    "run.start": "Iniciar",
    "run.tasks": "Solo tareas",
    "run.stop": "Parar",
    "run.running": "Ejecutando…",
    "run.loading": "Cargando…",
    "run.stopping": "Parando…",
    "run.no_microsoft": "No hay cuenta Microsoft seleccionada.",
    "run.microsoft_setup": "Falta terminar el setup de la cuenta Microsoft.",
    "run.already_running": "Ya hay una ejecución en curso.",
    "run.browser_loading": "Espera a que termine de cargar el navegador.",
    "run.browser_busy": "Espera a que el navegador termine.",
    "run.phone_offline": "No hay celular vinculado, o está desconectado.",
    "run.no_phone": "No hay celular vinculado a esta cuenta Microsoft.",
    "pair.title": "Vincular un celular",
    "pair.hint": "En el celular, escribe o escanea este código. El teléfono encuentra este PC solo (túnel remoto). Misma cuenta Microsoft — no es un segundo inicio de sesión.",
    "pair.copy": "Copiar código",
    "pair.copied": "Código copiado.",
    "pair.waiting": "Preparando enlace remoto…",
    "pair.ready": "Escanea el QR o escribe el código en el celular.",
    "settings.language": "Idioma",
    "settings.language_hint": "Automático usa Windows / región. Aplica a este PC y al celular vinculado.",
    "settings.language_auto": "Automático (Windows / región)",
    "settings.language_en": "Inglés",
    "settings.language_es": "Español",
    "label.pc": "PC",
    "label.mobile": "Móvil",
    "status.daily": "Tareas del día",
    "rewards.estimate": "Estimado de búsquedas",
    "rewards.region_unknown": "Región desconocida",
    "progress.daily": "Diarias",
    "progress.visual": "Visual",
    "progress.checkin": "Check-in",
    "progress.news": "Noticias",
    "progress.edge": "Edge",
    "progress.reset": "Tareas del día",
    "activity": "Actividad",
    "history": "Ver historial",
  },
};

let _uiLang = "en";

function t(key) {
  const pack = I18N[_uiLang] || I18N.en;
  return pack[key] || (I18N.en[key] || key);
}

function set_ui_lang(lang) {
  _uiLang = lang === "es" ? "es" : "en";
  document.documentElement.lang = _uiLang;
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  const startLabel = document.querySelector("#start_btn .btn-label");
  if (
    startLabel &&
    typeof runInProgress !== "undefined" &&
    !runInProgress &&
    typeof driverWarmingUp !== "undefined" &&
    !driverWarmingUp
  ) {
    startLabel.textContent = t("run.start");
  }
  const tasksBtn = document.getElementById("tasks_only_btn");
  if (tasksBtn) tasksBtn.textContent = t("run.tasks");
  const stopLabel = document.querySelector("#stop_btn .stop-label");
  if (stopLabel && !/Stopping|Parando/.test(stopLabel.textContent)) stopLabel.textContent = t("run.stop");
  if (typeof update_status_indicator === "function") update_status_indicator();
  if (typeof refresh_rewards_overview === "function") refresh_rewards_overview();
}

function resolve_lang_from_settings(settings) {
  const pref = (settings && settings.ui_language) || "auto";
  if (pref === "en" || pref === "es") return pref;
  const blob = String(
    (settings && (settings.windows_locale || settings.detected_locale)) ||
      (typeof navigator !== "undefined" ? navigator.language : "") ||
      ""
  ).toLowerCase();
  if (blob.indexOf("es") === 0 || blob.indexOf("-es") >= 0 || blob.indexOf("_es") >= 0) return "es";
  return "en";
}
