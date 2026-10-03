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
    "settings.language_pt": "Portuguese",
    "settings.language_zh": "Chinese",
    "label.pc": "PC",
    "label.mobile": "Mobile",
    "status.daily": "Daily tasks",
    "rewards.estimate": "Search estimate",
    "rewards.region_unknown": "Region unknown",
    "rewards.unverified": "Not verified",
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
    "settings.language_pt": "Portugués",
    "settings.language_zh": "Chino",
    "label.pc": "PC",
    "label.mobile": "Móvil",
    "status.daily": "Tareas del día",
    "rewards.estimate": "Estimado de búsquedas",
    "rewards.region_unknown": "Región desconocida",
    "rewards.unverified": "No verificado",
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

I18N.pt = {
  ...I18N.en,
  "run.start": "Iniciar execução", "run.tasks": "Somente tarefas", "run.stop": "Parar",
  "run.running": "Executando…", "run.loading": "Carregando…", "run.stopping": "Parando…",
  "run.no_microsoft": "Nenhuma conta Microsoft selecionada.", "run.microsoft_setup": "A configuração da conta Microsoft não terminou.",
  "run.already_running": "Já existe uma execução em andamento.", "run.browser_loading": "Aguarde o navegador terminar de carregar.",
  "run.browser_busy": "Aguarde o navegador terminar.", "run.phone_offline": "Nenhum celular vinculado ou o celular está offline.",
  "run.no_phone": "Nenhum celular vinculado a esta conta Microsoft.", "pair.title": "Vincular um celular",
  "pair.hint": "No celular, digite ou escaneie este código. O celular encontra este PC sozinho. Mesma conta Microsoft, não é um segundo login.",
  "pair.copy": "Copiar código", "pair.copied": "Código copiado.", "pair.waiting": "Iniciando vínculo remoto…",
  "pair.ready": "Escaneie o QR ou digite o código no celular.", "settings.language": "Idioma",
  "settings.language_hint": "Automático usa o Windows / região. Aplica-se a este PC e ao celular vinculado.",
  "settings.language_auto": "Automático (Windows / região)", "settings.language_en": "Inglês", "settings.language_es": "Espanhol",
  "settings.language_pt": "Português", "settings.language_zh": "Chinês", "label.mobile": "Celular",
  "status.daily": "Tarefas diárias", "rewards.estimate": "Estimativa de pesquisas", "rewards.region_unknown": "Região desconhecida",
  "rewards.unverified": "Não verificado", "progress.daily": "Diárias", "progress.visual": "Visual",
  "progress.checkin": "Check-in", "progress.news": "Notícias", "progress.edge": "Edge", "progress.reset": "Conjunto diário",
  "activity": "Atividade", "history": "Ver histórico",
};

I18N.zh = {
  ...I18N.en,
  "run.start": "开始运行", "run.tasks": "仅任务", "run.stop": "停止", "run.running": "运行中…", "run.loading": "加载中…", "run.stopping": "正在停止…",
  "run.no_microsoft": "未选择 Microsoft 帐户。", "run.microsoft_setup": "Microsoft 帐户设置尚未完成。", "run.already_running": "已有任务正在运行。",
  "run.browser_loading": "请等待浏览器加载完成。", "run.browser_busy": "请等待浏览器完成当前操作。", "run.phone_offline": "未连接手机，或手机处于离线状态。",
  "run.no_phone": "此 Microsoft 帐户没有关联手机。", "pair.title": "关联手机", "pair.hint": "在手机上输入或扫描此代码。手机会自动找到这台电脑。使用同一个 Microsoft 帐户。",
  "pair.copy": "复制代码", "pair.copied": "代码已复制。", "pair.waiting": "正在启动远程连接…", "pair.ready": "扫描二维码或在手机上输入代码。",
  "settings.language": "语言", "settings.language_hint": "自动模式使用 Windows / 地区设置。应用于此电脑和已关联的手机。",
  "settings.language_auto": "自动（Windows / 地区）", "settings.language_en": "英语", "settings.language_es": "西班牙语",
  "settings.language_pt": "葡萄牙语", "settings.language_zh": "中文", "label.mobile": "手机", "status.daily": "每日任务",
  "rewards.estimate": "搜索估计", "rewards.region_unknown": "未知地区", "rewards.unverified": "未验证", "progress.daily": "每日",
  "progress.visual": "视觉", "progress.checkin": "签到", "progress.news": "新闻", "progress.edge": "Edge", "progress.reset": "每日任务集",
  "activity": "活动", "history": "查看历史记录",
};

let _uiLang = "en";

function t(key) {
  const pack = I18N[_uiLang] || I18N.en;
  return pack[key] || (I18N.en[key] || key);
}

function set_ui_lang(lang) {
  _uiLang = ["en", "es", "pt", "zh"].indexOf(lang) >= 0 ? lang : "en";
  document.documentElement.lang = _uiLang;
  refresh_language_options();
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
  if (["en", "es", "pt", "zh"].indexOf(pref) >= 0) return pref;
  const blob = String(
    (settings && (settings.windows_locale || settings.detected_locale)) ||
      (typeof navigator !== "undefined" ? navigator.language : "") ||
      ""
  ).toLowerCase();
  if (blob.indexOf("es") === 0 || blob.indexOf("-es") >= 0 || blob.indexOf("_es") >= 0) return "es";
  if (blob.indexOf("pt") === 0 || blob.indexOf("-pt") >= 0 || blob.indexOf("_pt") >= 0) return "pt";
  if (blob.indexOf("zh") === 0 || blob.indexOf("-zh") >= 0 || blob.indexOf("_zh") >= 0) return "zh";
  return "en";
}

const UI_LANGUAGE_NAMES = {
  en: { native: "English", en: "English", es: "Inglés", pt: "Inglês", zh: "英语" },
  es: { native: "Español", en: "Spanish", es: "Español", pt: "Espanhol", zh: "西班牙语" },
  pt: { native: "Português", en: "Portuguese", es: "Portugués", pt: "Português", zh: "葡萄牙语" },
  zh: { native: "中文", en: "Chinese", es: "Chino", pt: "Chinês", zh: "中文" },
};

function refresh_language_options() {
  const selector = document.getElementById("uiLanguageSelect");
  if (!selector) return;
  const systemLanguage = resolve_lang_from_settings({
    ui_language: "auto",
    windows_locale: typeof navigator !== "undefined" ? navigator.language : "en",
  });
  selector.querySelectorAll("option[data-language-option]").forEach(function (option) {
    const code = option.getAttribute("data-language-option");
    const names = UI_LANGUAGE_NAMES[code] || UI_LANGUAGE_NAMES.en;
    option.textContent = `${names.native} (${names[systemLanguage] || names.en})`;
  });
}
