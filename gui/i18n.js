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

// All visible UI copy lives here. Unlike the original small data-i18n list,
// this table also covers labels produced later by JavaScript and the companion,
// history and dashboard windows. The reverse index below lets a screen start
// in English or Spanish and still change cleanly to any supported language.
const UI_COPY = {
  "app.title": { en: "Rewards Control", es: "Control de recompensas", pt: "Controle de recompensas", zh: "奖励控制中心" },
  "app.companion": { en: "Rewards Companion", es: "Compañero de recompensas", pt: "Companheiro de recompensas", zh: "奖励助手" },
  "settings": { en: "Settings", es: "Configuración", pt: "Configurações", zh: "设置" },
  "general": { en: "General", es: "General", pt: "Geral", zh: "常规" },
  "account": { en: "Account", es: "Cuenta", pt: "Conta", zh: "账户" },
  "accounts": { en: "Your accounts", es: "Tus cuentas", pt: "Suas contas", zh: "你的账户" },
  "add_account": { en: "Add account", es: "Agregar cuenta", pt: "Adicionar conta", zh: "添加账户" },
  "no_accounts": { en: "No accounts yet", es: "Aún no hay cuentas", pt: "Ainda não há contas", zh: "还没有账户" },
  "no_account": { en: "No account", es: "Sin cuenta", pt: "Sem conta", zh: "没有账户" },
  "add_first_account": { en: "Add your first Microsoft account to get started.", es: "Agrega tu primera cuenta Microsoft para comenzar.", pt: "Adicione sua primeira conta Microsoft para começar.", zh: "添加你的第一个 Microsoft 账户即可开始。" },
  "manage_accounts": { en: "Manage accounts", es: "Administrar cuentas", pt: "Gerenciar contas", zh: "管理账户" },
  "delete_account": { en: "Delete this account", es: "Eliminar esta cuenta", pt: "Excluir esta conta", zh: "删除此账户" },
  "close": { en: "Close", es: "Cerrar", pt: "Fechar", zh: "关闭" },
  "cancel": { en: "Cancel", es: "Cancelar", pt: "Cancelar", zh: "取消" },
  "save": { en: "Save", es: "Guardar", pt: "Salvar", zh: "保存" },
  "confirm": { en: "Confirm", es: "Confirmar", pt: "Confirmar", zh: "确认" },
  "download": { en: "Download", es: "Descargar", pt: "Baixar", zh: "下载" },
  "checking": { en: "Checking…", es: "Buscando…", pt: "Verificando…", zh: "正在检查…" },
  "downloading": { en: "Downloading…", es: "Descargando…", pt: "Baixando…", zh: "正在下载…" },
  "check_updates": { en: "Check updates", es: "Buscar actualizaciones", pt: "Verificar atualizações", zh: "检查更新" },
  "run": { en: "Run", es: "Ejecutar", pt: "Executar", zh: "运行" },
  "start_run": { en: "Start run", es: "Iniciar ejecución", pt: "Iniciar execução", zh: "开始运行" },
  "manual_tasks": { en: "Manual tasks", es: "Tareas manuales", pt: "Tarefas manuais", zh: "手动任务" },
  "activity": { en: "Activity", es: "Actividad", pt: "Atividade", zh: "活动" },
  "stats": { en: "Stats", es: "Estadísticas", pt: "Estatísticas", zh: "统计" },
  "dashboard": { en: "Dashboard", es: "Panel", pt: "Painel", zh: "仪表板" },
  "history": { en: "View history", es: "Ver historial", pt: "Ver histórico", zh: "查看历史记录" },
  "queries": { en: "Queries", es: "Búsquedas", pt: "Pesquisas", zh: "搜索次数" },
  "total_points": { en: "Total points", es: "Puntos totales", pt: "Pontos totais", zh: "总积分" },
  "earned_today": { en: "Earned today", es: "Ganado hoy", pt: "Ganhos hoje", zh: "今日获得" },
  "rewards_overview": { en: "Rewards overview", es: "Resumen de recompensas", pt: "Visão geral das recompensas", zh: "奖励概览" },
  "search_estimate": { en: "Search estimate", es: "Estimado de búsquedas", pt: "Estimativa de pesquisas", zh: "搜索估算" },
  "daily_tasks": { en: "Daily tasks", es: "Tareas diarias", pt: "Tarefas diárias", zh: "每日任务" },
  "ready": { en: "Ready", es: "Listo", pt: "Pronto", zh: "就绪" },
  "ready_to_run": { en: "Ready to run", es: "Listo para ejecutar", pt: "Pronto para executar", zh: "可以运行" },
  "setup_pending": { en: "Setup pending", es: "Configuración pendiente", pt: "Configuração pendente", zh: "等待设置" },
  "loading": { en: "Loading…", es: "Cargando…", pt: "Carregando…", zh: "正在加载…" },
  "detecting": { en: "Detecting…", es: "Detectando…", pt: "Detectando…", zh: "正在检测…" },
  "membership_unavailable": { en: "Membership unavailable", es: "Membresía no disponible", pt: "Associação indisponível", zh: "会员信息不可用" },
  "needs_you": { en: "Needs you", es: "Necesita tu intervención", pt: "Precisa de você", zh: "需要你处理" },
  "ignored": { en: "Ignored", es: "Ignoradas", pt: "Ignoradas", zh: "已忽略" },
  "open": { en: "Open", es: "Abrir", pt: "Abrir", zh: "打开" },
  "ignore": { en: "Ignore", es: "Ignorar", pt: "Ignorar", zh: "忽略" },
  "unignore": { en: "Unignore", es: "Dejar de ignorar", pt: "Deixar de ignorar", zh: "取消忽略" },
  "remove": { en: "Remove", es: "Eliminar", pt: "Remover", zh: "移除" },
  "copy_all": { en: "Copy all", es: "Copiar todo", pt: "Copiar tudo", zh: "全部复制" },
  "copy_code": { en: "Copy code", es: "Copiar código", pt: "Copiar código", zh: "复制代码" },
  "link_phone": { en: "Link a phone", es: "Vincular un celular", pt: "Vincular um celular", zh: "关联手机" },
  "unlink": { en: "Unlink", es: "Desvincular", pt: "Desvincular", zh: "取消关联" },
  "unlink_phone": { en: "Unlink this phone", es: "Desvincular este celular", pt: "Desvincular este celular", zh: "取消关联此手机" },
  "link_another_phone": { en: "Link another phone", es: "Vincular otro celular", pt: "Vincular outro celular", zh: "关联另一部手机" },
  "phone": { en: "Phone", es: "Celular", pt: "Celular", zh: "手机" },
  "this_device": { en: "This device", es: "Este dispositivo", pt: "Este dispositivo", zh: "此设备" },
  "install_bing": { en: "Install Bing", es: "Instalar Bing", pt: "Instalar Bing", zh: "安装 Bing" },
  "login_bing": { en: "Sign in to Bing", es: "Iniciar sesión en Bing", pt: "Entrar no Bing", zh: "登录 Bing" },
  "run_on_pc": { en: "Run on PC", es: "Ejecutar en PC", pt: "Executar no PC", zh: "在电脑上运行" },
  "start_on_pc": { en: "Start on PC", es: "Iniciar en PC", pt: "Iniciar no PC", zh: "在电脑上开始" },
  "tasks_only": { en: "Tasks only", es: "Solo tareas", pt: "Somente tarefas", zh: "仅任务" },
  "stop": { en: "Stop", es: "Detener", pt: "Parar", zh: "停止" },
  "checkin": { en: "Check-in", es: "Check-in", pt: "Check-in", zh: "签到" },
  "news": { en: "News", es: "Noticias", pt: "Notícias", zh: "新闻" },
  "all": { en: "All", es: "Todas", pt: "Todos", zh: "全部" },
  "success": { en: "Success", es: "Correcto", pt: "Sucesso", zh: "成功" },
  "errors": { en: "Errors", es: "Errores", pt: "Erros", zh: "错误" },
  "date": { en: "Date", es: "Fecha", pt: "Data", zh: "日期" },
  "time": { en: "Time", es: "Hora", pt: "Hora", zh: "时间" },
  "status": { en: "Status", es: "Estado", pt: "Status", zh: "状态" },
  "statistics": { en: "Statistics", es: "Estadísticas", pt: "Estatísticas", zh: "统计" },
  "execution_history": { en: "Execution History", es: "Historial de ejecuciones", pt: "Histórico de execuções", zh: "执行历史" },
  "refresh_balance": { en: "Refresh balance", es: "Actualizar saldo", pt: "Atualizar saldo", zh: "刷新余额" },
  "refreshing": { en: "Refreshing…", es: "Actualizando…", pt: "Atualizando…", zh: "正在刷新…" },
  "no_activity": { en: "No activity recorded today", es: "No hay actividad registrada hoy", pt: "Nenhuma atividade registrada hoje", zh: "今天没有记录的活动" },
  "no_activity_yet": { en: "No activity recorded yet. Start a run from the main window.", es: "Aún no hay actividad registrada. Inicia una ejecución desde la ventana principal.", pt: "Ainda não há atividade registrada. Inicie uma execução na janela principal.", zh: "尚无活动记录。请从主窗口开始运行。" },
  "language": { en: "Language", es: "Idioma", pt: "Idioma", zh: "语言" },
  "provider": { en: "Provider", es: "Proveedor", pt: "Provedor", zh: "提供商" },
  "model": { en: "Model", es: "Modelo", pt: "Modelo", zh: "模型" },
  "api_key": { en: "API key", es: "Clave API", pt: "Chave da API", zh: "API 密钥" },
  "default_provider": { en: "Default for provider", es: "Predeterminado del proveedor", pt: "Padrão do provedor", zh: "使用提供商默认值" },
  "your_api_key": { en: "Your own API key", es: "Tu propia clave API", pt: "Sua própria chave da API", zh: "你的 API 密钥" },
  "close_to_tray": { en: "Close to tray", es: "Cerrar a la bandeja", pt: "Fechar na bandeja", zh: "关闭到系统托盘" },
  "hide_browser": { en: "Hide browser", es: "Ocultar navegador", pt: "Ocultar navegador", zh: "隐藏浏览器" },
  "force_daily": { en: "Force daily tasks", es: "Forzar tareas diarias", pt: "Forçar tarefas diárias", zh: "强制每日任务" },
  "force_visual": { en: "Force visual search", es: "Forzar búsqueda visual", pt: "Forçar pesquisa visual", zh: "强制视觉搜索" },
  "run_running": { en: "Running…", es: "Ejecutando…", pt: "Executando…", zh: "正在运行…" },
  "run_stopping": { en: "Stopping…", es: "Deteniendo…", pt: "Parando…", zh: "正在停止…" },
  "status_running": { en: "Running", es: "En ejecución", pt: "Em execução", zh: "正在运行" },
  "status_ready": { en: "Ready", es: "Listo", pt: "Pronto", zh: "就绪" },
  "status_setup": { en: "Setup required", es: "Configuración requerida", pt: "Configuração necessária", zh: "需要设置" },
  "status_no_account": { en: "No account selected", es: "No hay cuenta seleccionada", pt: "Nenhuma conta selecionada", zh: "未选择账户" },
  "done": { en: "done", es: "completadas", pt: "concluídas", zh: "已完成" },
  "partial": { en: "partial", es: "parcial", pt: "parcial", zh: "部分完成" },
  "pending": { en: "pending", es: "pendiente", pt: "pendente", zh: "待处理" },
  "no_phone_offline": { en: "Phone offline", es: "Celular desconectado", pt: "Celular offline", zh: "手机离线" },
  "no_phone_linked": { en: "No phone linked", es: "No hay celular vinculado", pt: "Nenhum celular vinculado", zh: "未关联手机" },
  "activity_empty": { en: "Activity log is empty.", es: "El registro de actividad está vacío.", pt: "O registro de atividade está vazio.", zh: "活动记录为空。" },
  "activity_copied": { en: "Activity log copied.", es: "Registro de actividad copiado.", pt: "Registro de atividade copiado.", zh: "活动记录已复制。" },
  "settings_saved": { en: "Settings saved.", es: "Configuración guardada.", pt: "Configurações salvas.", zh: "设置已保存。" },
  "save_failed": { en: "Save failed.", es: "No se pudo guardar.", pt: "Não foi possível salvar.", zh: "保存失败。" },
  "settings_load_failed": { en: "Could not load settings.", es: "No se pudo cargar la configuración.", pt: "Não foi possível carregar as configurações.", zh: "无法加载设置。" },
  "account_switch_failed": { en: "Could not switch account. Is the bot running?", es: "No se pudo cambiar de cuenta. ¿El bot está ejecutándose?", pt: "Não foi possível trocar de conta. O bot está em execução?", zh: "无法切换账户。机器人正在运行吗？" },
  "account_create_failed": { en: "Could not create account.", es: "No se pudo crear la cuenta.", pt: "Não foi possível criar a conta.", zh: "无法创建账户。" },
  "account_create_running": { en: "Cannot add an account while the bot is running.", es: "No puedes agregar una cuenta mientras el bot está ejecutándose.", pt: "Não é possível adicionar uma conta enquanto o bot está em execução.", zh: "机器人运行时无法添加账户。" },
  "account_setup_cancelled": { en: "Setup cancelled — account not created.", es: "Configuración cancelada: la cuenta no fue creada.", pt: "Configuração cancelada — a conta não foi criada.", zh: "设置已取消，未创建账户。" },
  "hide_browser_on": { en: "Hide browser on. Saved.", es: "Ocultar navegador activado. Guardado.", pt: "Ocultar navegador ativado. Salvo.", zh: "已开启隐藏浏览器并保存。" },
  "hide_browser_off": { en: "Hide browser off. Saved.", es: "Ocultar navegador desactivado. Guardado.", pt: "Ocultar navegador desativado. Salvo.", zh: "已关闭隐藏浏览器并保存。" },
  "pc_range": { en: "PC must be between 0 and 130.", es: "PC debe estar entre 0 y 130.", pt: "PC deve estar entre 0 e 130.", zh: "电脑数量必须在 0 到 130 之间。" },
  "mobile_range": { en: "Mobile must be between 0 and 99.", es: "Móvil debe estar entre 0 y 99.", pt: "Celular deve estar entre 0 e 99.", zh: "手机数量必须在 0 到 99 之间。" },
  "choose_queries": { en: "Set at least one of PC or Mobile above 0.", es: "Configura PC o móvil por encima de 0.", pt: "Defina PC ou celular acima de 0.", zh: "请将电脑或手机中的至少一项设为大于 0。" },
  "phone_pc_found": { en: "PC found. Confirm the code and link.", es: "PC encontrado. Confirma el código y vincula.", pt: "PC encontrado. Confirme o código e vincule.", zh: "已找到电脑。请确认代码并关联。" },
  "phone_pairing": { en: "Linking…", es: "Vinculando…", pt: "Vinculando…", zh: "正在关联…" },
  "phone_searching": { en: "Looking for the PC…", es: "Buscando el PC…", pt: "Procurando o PC…", zh: "正在查找电脑…" },
  "camera_opening": { en: "Opening camera…", es: "Abriendo la cámara…", pt: "Abrindo a câmera…", zh: "正在打开相机…" },
  "camera_android_only": { en: "Camera is only available in the Android app.", es: "La cámara solo está en la app Android.", pt: "A câmera só está disponível no app Android.", zh: "相机仅在 Android 应用中可用。" },
  "background_run": { en: "Enable Background Auto-Run", es: "Activar ejecución automática en segundo plano", pt: "Ativar execução automática em segundo plano", zh: "启用后台自动运行" },
  "scheduled_runs": { en: "Scheduled runs", es: "Ejecuciones programadas", pt: "Execuções agendadas", zh: "计划运行" },
  "open_on_login": { en: "Open AutoRewarder when you sign in", es: "Abrir AutoRewarder al iniciar sesión", pt: "Abrir o AutoRewarder ao entrar", zh: "登录时打开 AutoRewarder" },
  "search_terms": { en: "Search terms", es: "Términos de búsqueda", pt: "Termos de pesquisa", zh: "搜索词" },
  "ai_terms": { en: "Generate search terms with AI (LLM)", es: "Generar términos de búsqueda con IA (LLM)", pt: "Gerar termos de pesquisa com IA (LLM)", zh: "使用 AI（LLM）生成搜索词" },
  "welcome": { en: "Welcome to Rewards Control", es: "Bienvenido al control de recompensas", pt: "Bem-vindo ao Controle de recompensas", zh: "欢迎使用奖励控制中心" },
  "person_icon_accounts": { en: "Use the person icon at the top to add or manage accounts.", es: "Usa el icono de persona de la parte superior para agregar o administrar cuentas.", pt: "Use o ícone de pessoa no topo para adicionar ou gerenciar contas.", zh: "使用顶部的人像图标添加或管理账户。" },
  "automatic_language": { en: "Automatic (Windows / region)", es: "Automático (Windows / región)", pt: "Automático (Windows / região)", zh: "自动（Windows / 地区）" },
  "language_hint": { en: "Automatic uses Windows / region. Applies to this PC and the linked phone.", es: "Automático usa Windows / región. Aplica a este PC y al celular vinculado.", pt: "Automático usa Windows / região. Aplica-se a este PC e ao celular vinculado.", zh: "自动模式使用 Windows / 地区设置，并应用于此电脑和关联手机。" },
  "close_to_tray_hint": { en: "Clicking X minimizes to the system tray instead of quitting. Takes effect on next launch.", es: "Al pulsar X se minimiza a la bandeja del sistema en vez de cerrar. Se aplica en el próximo inicio.", pt: "Clicar no X minimiza para a bandeja do sistema em vez de fechar. Vale na próxima abertura.", zh: "点击 X 会最小化到系统托盘而不是退出。下次启动时生效。" },
  "llm_key_hint": { en: "Your API key is stored locally in settings.json (plain text). Requests only send a prompt asking for queries — no personal data.", es: "Tu clave API se guarda localmente en settings.json (texto plano). Las solicitudes solo envían un mensaje para pedir búsquedas, sin datos personales.", pt: "Sua chave da API é armazenada localmente em settings.json (texto simples). As solicitações enviam apenas um pedido de pesquisas, sem dados pessoais.", zh: "你的 API 密钥仅以纯文本保存在本地 settings.json 中。请求只会发送生成搜索词的提示，不含个人数据。" },
  "manual_tasks_hint": { en: "Quests and leftover cards from your live /earn page that still need you (or that the bot could not finish). The list is detected and refreshed automatically in the background. Ignore hides until you unignore; Remove hides for good.", es: "Misiones y tarjetas pendientes de tu página /earn que aún necesitan tu intervención (o que el bot no pudo terminar). La lista se detecta y actualiza automáticamente en segundo plano. Ignorar las oculta hasta que dejes de ignorarlas; Eliminar las oculta definitivamente.", pt: "Missões e cartões pendentes da sua página /earn que ainda precisam de você (ou que o bot não conseguiu concluir). A lista é detectada e atualizada automaticamente em segundo plano. Ignorar oculta até você reativar; Remover oculta definitivamente.", zh: "这是你的 /earn 页面中仍需要你处理或机器人未能完成的任务和卡片。列表会在后台自动检测和刷新。忽略会隐藏直到你取消忽略；移除会永久隐藏。" },
  "all_accounts": { en: "All accounts", es: "Todas las cuentas", pt: "Todas as contas", zh: "所有账户" },
  "lifetime_activity": { en: "Lifetime activity", es: "Actividad total", pt: "Atividade total", zh: "累计活动" },
  "recent_activity": { en: "Recent activity (estimated points / day)", es: "Actividad reciente (puntos estimados / día)", pt: "Atividade recente (pontos estimados / dia)", zh: "近期活动（估计积分/天）" },
  "pc_searches": { en: "PC searches", es: "Búsquedas en PC", pt: "Pesquisas no PC", zh: "电脑搜索" },
  "mobile_searches": { en: "Mobile searches", es: "Búsquedas móviles", pt: "Pesquisas no celular", zh: "手机搜索" },
  "daily_cards": { en: "Daily cards", es: "Tarjetas diarias", pt: "Cartões diários", zh: "每日卡片" },
  "earn_cards": { en: "Earn cards", es: "Tarjetas de ganancias", pt: "Cartões de ganhos", zh: "赚取卡片" },
  "quest_tasks": { en: "Quest tasks", es: "Tareas de misiones", pt: "Tarefas de missões", zh: "任务挑战" },
  "visual_searches": { en: "Visual searches", es: "Búsquedas visuales", pt: "Pesquisas visuais", zh: "视觉搜索" },
  "edge_minutes": { en: "Edge minutes", es: "Minutos de Edge", pt: "Minutos do Edge", zh: "Edge 分钟数" },
  "runs": { en: "Runs", es: "Ejecuciones", pt: "Execuções", zh: "运行次数" },
};

const _copyIndex = Object.create(null);
Object.keys(UI_COPY).forEach(function (key) {
  Object.keys(UI_COPY[key]).forEach(function (locale) {
    const value = UI_COPY[key][locale];
    if (value) _copyIndex[String(value).trim()] = key;
  });
});

// Keep the first-generation data-i18n attributes working while all new text
// uses the shared UI_COPY table above.
const LEGACY_COPY_KEYS = {
  "stats.total": "total_points",
  "stats.today": "earned_today",
  "stats.dashboard": "dashboard",
  "rewards": "rewards_overview",
  "activity": "activity",
  "history": "history",
  "queries": "queries",
};
Object.keys(LEGACY_COPY_KEYS).forEach(function (legacyKey) {
  const copyKey = LEGACY_COPY_KEYS[legacyKey];
  ["en", "es", "pt", "zh"].forEach(function (locale) {
    I18N[locale][legacyKey] = UI_COPY[copyKey][locale];
  });
});

function tr(value) {
  const source = String(value == null ? "" : value);
  const key = _copyIndex[source.trim()];
  return key ? (UI_COPY[key][_uiLang] || UI_COPY[key].en || source) : source;
}

function tf(key, values) {
  let text = t(key);
  Object.keys(values || {}).forEach(function (name) {
    text = text.replace(new RegExp("\\{" + name + "\\}", "g"), values[name]);
  });
  return text;
}

let _uiLang = "en";

function t(key) {
  const pack = I18N[_uiLang] || I18N.en;
  if (pack[key]) return pack[key];
  if (I18N.en[key]) return I18N.en[key];
  if (UI_COPY[key]) return UI_COPY[key][_uiLang] || UI_COPY[key].en || key;
  return key;
}

function set_ui_lang(lang) {
  _uiLang = ["en", "es", "pt", "zh"].indexOf(lang) >= 0 ? lang : "en";
  document.documentElement.lang = _uiLang;
  refresh_language_options();
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const translated = t(key);
    // A missing legacy key must keep its original HTML text: the universal
    // translator below can still translate that text, while rendering the key
    // itself would expose implementation details to the user.
    if (translated === key) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = translated;
    } else if (el.children.length) {
      if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
        el.firstChild.nodeValue = translated + " ";
      }
    } else {
      el.textContent = translated;
    }
  });
  translate_document();
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

function translate_node(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  if (["SCRIPT", "STYLE", "CODE", "PRE"].indexOf(node.tagName) >= 0) return;
  ["title", "placeholder", "aria-label", "alt"].forEach(function (name) {
    if (node.hasAttribute && node.hasAttribute(name)) {
      const current = node.getAttribute(name);
      const translated = tr(current);
      if (translated !== current) node.setAttribute(name, translated);
    }
  });
  Array.prototype.forEach.call(node.childNodes, function (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      const translated = tr(child.nodeValue);
      if (translated !== child.nodeValue) child.nodeValue = translated;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      translate_node(child);
    }
  });
}

function translate_document() {
  if (typeof document === "undefined" || !document.body) return;
  document.title = tr(document.title);
  translate_node(document.body);
}

let _translationObserver = null;
function start_translation_observer() {
  if (_translationObserver || typeof MutationObserver === "undefined" || !document.body) return;
  _translationObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "CODE", "PRE"].indexOf(parent.tagName) >= 0) return;
        const translated = tr(mutation.target.nodeValue);
        if (translated !== mutation.target.nodeValue) mutation.target.nodeValue = translated;
      }
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) translate_node(node);
        if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          const translated = tr(node.nodeValue);
          if (translated !== node.nodeValue) node.nodeValue = translated;
        }
      });
    });
  });
  _translationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

window.addEventListener("DOMContentLoaded", function () {
  translate_document();
  start_translation_observer();
});

window.addEventListener("pywebviewready", function () {
  if (!window.pywebview || !pywebview.api || !pywebview.api.get_settings) return;
  pywebview.api.get_settings().then(function (settings) {
    set_ui_lang(resolve_lang_from_settings(settings || {}));
  }).catch(function () {
    translate_document();
  });
});

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
