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
  "update.title": { en: "Updating AutoRewarder", es: "Actualizando AutoRewarder", pt: "Atualizando o AutoRewarder", zh: "正在更新 AutoRewarder" },
  "update.downloading": { en: "Downloading…", es: "Descargando…", pt: "Baixando…", zh: "正在下载…" },
  "update.installing": { en: "Installing", es: "Instalando", pt: "Instalando", zh: "正在安装" },
  "update.replacing": { en: "Replacing old version", es: "Borrando versión vieja", pt: "Substituindo a versão antiga", zh: "正在替换旧版本" },
  "update.cleaning": { en: "Cleaning up", es: "Limpiando archivos anteriores", pt: "Limpando arquivos anteriores", zh: "正在清理旧文件" },
  "update.finished": { en: "Finished", es: "Finalizado", pt: "Finalizado", zh: "已完成" },
  "update.error": { en: "The update could not be installed.", es: "No se pudo instalar la actualización.", pt: "Não foi possível instalar a atualização.", zh: "无法安装更新。" },
  "update.detail": { en: "Please keep AutoRewarder open.", es: "Mantén AutoRewarder abierto.", pt: "Mantenha o AutoRewarder aberto.", zh: "请保持 AutoRewarder 打开。" },
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

  // Runtime-rendered copy. Keep these keys here instead of relying on the
  // reverse text lookup: values containing account names, counts or status
  // labels cannot be translated reliably after interpolation.
  "run.loading_short": { en: "Loading…", es: "Cargando…", pt: "Carregando…", zh: "正在加载…" },
  "run.stopping_short": { en: "Stopping…", es: "Deteniendo…", pt: "Parando…", zh: "正在停止…" },
  "run.ready_to_run": { en: "Ready to run", es: "Listo para ejecutar", pt: "Pronto para executar", zh: "可以运行" },
  "run.setup_pending": { en: "Setup pending", es: "Configuración pendiente", pt: "Configuração pendente", zh: "等待设置" },
  "status.pending": { en: "pending", es: "pendiente", pt: "pendente", zh: "待处理" },
  "status.done": { en: "done", es: "hecho", pt: "concluído", zh: "已完成" },
  "status.partial": { en: "partial", es: "parcial", pt: "parcial", zh: "部分完成" },
  "status.unknown": { en: "unknown", es: "desconocido", pt: "desconhecido", zh: "未知" },
  "status.resets_midnight": { en: "resets at midnight", es: "se reinicia a medianoche", pt: "reinicia à meia-noite", zh: "午夜重置" },
  "status.current": { en: "Current", es: "Actual", pt: "Atual", zh: "当前" },
  "account.ready": { en: "Ready", es: "Listo", pt: "Pronto", zh: "就绪" },
  "account.ready_to_run": { en: "Ready to run", es: "Listo para ejecutar", pt: "Pronto para executar", zh: "可以运行" },
  "account.setup_pending": { en: "Setup pending", es: "Configuración pendiente", pt: "Configuração pendente", zh: "等待设置" },
  "account.no_account": { en: "No account yet", es: "Aún no hay cuenta", pt: "Ainda não há conta", zh: "暂无账户" },
  "account.select_below": { en: "Select one below", es: "Selecciona una cuenta abajo", pt: "Selecione uma conta abaixo", zh: "请在下方选择账户" },
  "account.add_first": { en: "Add your first account", es: "Agrega tu primera cuenta", pt: "Adicione sua primeira conta", zh: "添加你的第一个账户" },
  "account.current": { en: "Current · ", es: "Actual · ", pt: "Atual · ", zh: "当前 · " },
  "account.rename": { en: "Rename", es: "Renombrar", pt: "Renomear", zh: "重命名" },
  "account.rerun_setup": { en: "Re-run setup", es: "Repetir configuración", pt: "Executar configuração novamente", zh: "重新设置" },
  "account.run_setup": { en: "Run setup", es: "Configurar", pt: "Executar configuração", zh: "运行设置" },
  "account.delete": { en: "Delete", es: "Eliminar", pt: "Excluir", zh: "删除" },
  "account.delete_question": { en: "Delete \"{name}\"?", es: "¿Eliminar \"{name}\"?", pt: "Excluir \"{name}\"?", zh: "删除“{name}”？" },
  "account.rename_prompt": { en: "Enter a new name for \"{name}\".", es: "Escribe un nombre nuevo para \"{name}\".", pt: "Digite um novo nome para \"{name}\".", zh: "请输入“{name}”的新名称。" },
  "account.opening_setup": { en: "Opening browser to set up \"{name}\"…", es: "Abriendo el navegador para configurar \"{name}\"…", pt: "Abrindo o navegador para configurar \"{name}\"…", zh: "正在打开浏览器设置“{name}”…" },
  "account.same_microsoft": { en: "Same Microsoft account · companion APK", es: "Misma cuenta Microsoft · APK complementaria", pt: "Mesma conta Microsoft · APK complementar", zh: "同一个 Microsoft 账户 · 配套 APK" },
  "phone.online": { en: "Online", es: "En línea", pt: "Online", zh: "在线" },
  "phone.offline": { en: "Offline", es: "Desconectado", pt: "Offline", zh: "离线" },
  "phone.link_another": { en: "Link another phone", es: "Vincular otro celular", pt: "Vincular outro celular", zh: "关联另一部手机" },
  "phone.ready": { en: "Ready to run", es: "Listo para ejecutar", pt: "Pronto para executar", zh: "可以运行" },
  "phone.setup_pending": { en: "Setup pending", es: "Configuración pendiente", pt: "Configuração pendente", zh: "等待设置" },
  "phone.linked": { en: "Linked to PC", es: "Vinculado al PC", pt: "Vinculado ao PC", zh: "已关联到电脑" },
  "phone.this_device": { en: "This device", es: "Este dispositivo", pt: "Este dispositivo", zh: "此设备" },
  "phone.same_account": { en: "Same Microsoft account", es: "Misma cuenta Microsoft", pt: "Mesma conta Microsoft", zh: "同一个 Microsoft 账户" },
  "phone.companion": { en: "Mobile companion", es: "Compañero móvil", pt: "Companheiro móvel", zh: "移动助手" },
  "phone.pc_running": { en: "PC is running", es: "El PC está ejecutándose", pt: "O PC está executando", zh: "电脑正在运行" },
  "phone.linked_ready": { en: "Linked to PC · ready", es: "Vinculado al PC · listo", pt: "Vinculado ao PC · pronto", zh: "已关联到电脑 · 就绪" },
  "phone.bing_not_installed": { en: "Bing: not installed", es: "Bing: no instalado", pt: "Bing: não instalado", zh: "Bing：未安装" },
  "phone.bing_ready": { en: "Bing: ready", es: "Bing: listo", pt: "Bing: pronto", zh: "Bing：就绪" },
  "phone.bing_installed": { en: "Bing: installed", es: "Bing: instalado", pt: "Bing: instalado", zh: "Bing：已安装" },
  "phone.searches_saved": { en: "Searches: PC {pc} / mobile {mobile}", es: "Búsquedas: PC {pc} / móvil {mobile}", pt: "Pesquisas: PC {pc} / celular {mobile}", zh: "搜索：电脑 {pc} / 手机 {mobile}" },
  "phone.pc_job": { en: "PC task: {kind}", es: "Tarea del PC: {kind}", pt: "Tarefa do PC: {kind}", zh: "电脑任务：{kind}" },
  "phone.bind_pc": { en: "Link to PC", es: "Vincular al PC", pt: "Vincular ao PC", zh: "关联到电脑" },
  "phone.pair_hint": { en: "On the PC: Account → Link a phone. Enter the code or tap the square to scan the QR.", es: "En el PC: Cuenta → Vincular un celular. Escribe el código o pulsa el cuadrado para escanear el QR.", pt: "No PC: Conta → Vincular um celular. Digite o código ou toque no quadrado para escanear o QR.", zh: "在电脑上：账户 → 关联手机。输入代码，或点击方框扫描二维码。" },
  "phone.pair": { en: "Link", es: "Vincular", pt: "Vincular", zh: "关联" },
  "phone.code": { en: "Code", es: "Código", pt: "Código", zh: "代码" },
  "phone.points": { en: "Points", es: "Puntos", pt: "Pontos", zh: "积分" },
  "phone.total": { en: "Total", es: "Total", pt: "Total", zh: "总计" },
  "phone.today": { en: "Today", es: "Hoy", pt: "Hoje", zh: "今天" },
  "phone.on_device": { en: "On this phone", es: "En este celular", pt: "Neste celular", zh: "在此手机上" },
  "phone.run_on_pc": { en: "Run on PC", es: "Correr en el PC", pt: "Executar no PC", zh: "在电脑上运行" },
  "phone.edge_30": { en: "Edge 30 min", es: "Edge 30 min", pt: "Edge 30 min", zh: "Edge 30 分钟" },
  "phone.activity": { en: "Activity", es: "Actividad", pt: "Atividade", zh: "活动" },
  "phone.unlink_this": { en: "Unlink this phone", es: "Desvincular este celular", pt: "Desvincular este celular", zh: "取消关联此手机" },
  "scan_qr": { en: "Scan QR", es: "Escanear QR", pt: "Escanear QR", zh: "扫描二维码" },
  "settings.detected_language": { en: "Detected language: {locale}. Leave \"auto\" to follow your system, or enter a locale like fr-FR.", es: "Idioma detectado: {locale}. Deja \"auto\" para seguir tu sistema o escribe una región como fr-FR.", pt: "Idioma detectado: {locale}. Deixe \"auto\" para seguir o sistema ou informe uma região como fr-FR.", zh: "检测到的语言：{locale}。保留“auto”以使用系统设置，或输入类似 fr-FR 的区域。" },
  "settings.windows_only": { en: "Available on Windows only.", es: "Disponible solo en Windows.", pt: "Disponível apenas no Windows.", zh: "仅适用于 Windows。" },
  "settings.windows_linux": { en: "Available on Windows and Linux only.", es: "Disponible solo en Windows y Linux.", pt: "Disponível apenas no Windows e Linux.", zh: "仅适用于 Windows 和 Linux。" },
  "settings.background_hint": { en: "Automatically run AutoRewarder in the background at each account's scheduled time.", es: "Ejecuta AutoRewarder automáticamente en segundo plano a la hora programada de cada cuenta.", pt: "Executa o AutoRewarder automaticamente em segundo plano no horário programado de cada conta.", zh: "在每个账户的计划时间于后台自动运行 AutoRewarder。" },
  "settings.login_hint": { en: "When you sign in to Windows, run leftover searches and daily tasks. If everything is already done, AutoRewarder closes.", es: "Al iniciar sesión en Windows, ejecuta las búsquedas y tareas diarias pendientes. Si todo está listo, AutoRewarder se cierra.", pt: "Ao entrar no Windows, executa pesquisas e tarefas diárias pendentes. Se tudo já estiver concluído, o AutoRewarder fecha.", zh: "登录 Windows 时运行剩余搜索和每日任务。如果全部完成，AutoRewarder 会关闭。" },
  "settings.preparing_driver": { en: "Preparing the browser driver…", es: "Preparando el controlador del navegador…", pt: "Preparando o driver do navegador…", zh: "正在准备浏览器驱动…" },
  "tasks.open": { en: "Open", es: "Abrir", pt: "Abrir", zh: "打开" },
  "tasks.ignore": { en: "Ignore", es: "Ignorar", pt: "Ignorar", zh: "忽略" },
  "tasks.unignore": { en: "Unignore", es: "Dejar de ignorar", pt: "Deixar de ignorar", zh: "取消忽略" },
  "tasks.remove": { en: "Remove", es: "Eliminar", pt: "Remover", zh: "移除" },
  "tasks.detecting": { en: "Detecting quests automatically from Rewards /earn…", es: "Detectando misiones automáticamente desde Rewards /earn…", pt: "Detectando missões automaticamente no Rewards /earn…", zh: "正在从 Rewards /earn 自动检测任务…" },
  "tasks.empty": { en: "No open quests detected yet. The list refreshes automatically.", es: "Aún no se detectaron misiones abiertas. La lista se actualiza automáticamente.", pt: "Nenhuma missão aberta detectada. A lista é atualizada automaticamente.", zh: "尚未检测到开放任务。列表会自动刷新。" },
  "left": { en: "left", es: "restantes", pt: "restantes", zh: "剩余" },
  "by_microsoft": { en: "by Microsoft", es: "por Microsoft", pt: "pela Microsoft", zh: "由 Microsoft 提供" },
  "hide_browser_on": { en: "Hide browser on. Saved.", es: "Navegador oculto. Guardado.", pt: "Navegador oculto. Salvo.", zh: "已隐藏浏览器。已保存。" },
  "hide_browser_off": { en: "Hide browser off. Saved.", es: "Navegador visible. Guardado.", pt: "Navegador visível. Salvo.", zh: "已显示浏览器。已保存。" },
  "schedule_off": { en: "Schedule off", es: "Horario apagado", pt: "Agendamento desativado", zh: "计划已关闭" },
};

Object.assign(UI_COPY, {
  "balance_not_verified": { en: "Balance not verified", es: "Saldo no verificado", pt: "Saldo não verificado", zh: "余额尚未验证" },
  "balance_not_found": { en: "Balance not found", es: "Saldo no encontrado", pt: "Saldo não encontrado", zh: "未找到余额" },
  "diagnostic": { en: "Diagnostic", es: "Diagnóstico", pt: "Diagnóstico", zh: "诊断" },
  "landed_page": { en: "Landed page:", es: "Página cargada:", pt: "Página carregada:", zh: "打开的页面：" },
  "selector_matches": { en: "Selector matches:", es: "Coincidencias del selector:", pt: "Correspondências do seletor:", zh: "选择器匹配：" },
  "real_balance": { en: "Real balance", es: "Saldo real", pt: "Saldo real", zh: "实际余额" },
  "balance_updated": { en: "Real balance · updated {when}", es: "Saldo real · actualizado {when}", pt: "Saldo real · atualizado {when}", zh: "实际余额 · 更新于 {when}" },
  "today": { en: "Today", es: "Hoy", pt: "Hoje", zh: "今天" },
  "no_activity_today": { en: "No activity recorded today", es: "No hay actividad registrada hoy", pt: "Nenhuma atividade registrada hoje", zh: "今天没有记录的活动" },
  "news_reads": { en: "News reads", es: "Noticias leídas", pt: "Notícias lidas", zh: "新闻阅读" },
  "daily": { en: "Daily", es: "Diario", pt: "Diário", zh: "每日" },
  "earn": { en: "Earn", es: "Ganancias", pt: "Ganhos", zh: "赚取" },
  "quests": { en: "Quests", es: "Misiones", pt: "Missões", zh: "任务" },
  "searches": { en: "Searches", es: "Búsquedas", pt: "Pesquisas", zh: "搜索" },
  "no_accounts_period": { en: "No accounts yet.", es: "Aún no hay cuentas.", pt: "Ainda não há contas.", zh: "还没有账户。" },
  "refresh_failed": { en: "Refresh failed.", es: "Falló la actualización.", pt: "Falha ao atualizar.", zh: "刷新失败。" },
  "refresh_error_no_account": { en: "No account selected.", es: "No hay cuenta seleccionada.", pt: "Nenhuma conta selecionada.", zh: "未选择账户。" },
  "refresh_error_setup": { en: "Complete First Setup for this account first.", es: "Completa primero la configuración inicial de esta cuenta.", pt: "Conclua primeiro a configuração inicial desta conta.", zh: "请先完成此账户的初始设置。" },
  "refresh_error_busy": { en: "Browser busy (a run or startup is using it) — try again in a moment.", es: "El navegador está ocupado (lo usa una ejecución o el inicio); inténtalo en un momento.", pt: "O navegador está ocupado (uma execução ou inicialização o está usando); tente novamente em instantes.", zh: "浏览器正忙（运行或启动正在使用它），请稍后重试。" },
  "refresh_error_not_found": { en: "Couldn't read the balance from the rewards page.", es: "No se pudo leer el saldo de la página de recompensas.", pt: "Não foi possível ler o saldo da página de recompensas.", zh: "无法从奖励页面读取余额。" },
  "refresh_error_driver": { en: "Could not open the browser to read the balance.", es: "No se pudo abrir el navegador para leer el saldo.", pt: "Não foi possível abrir o navegador para ler o saldo.", zh: "无法打开浏览器读取余额。" },
  "refresh_error_changed": { en: "Account changed during refresh — try again.", es: "La cuenta cambió durante la actualización; inténtalo de nuevo.", pt: "A conta mudou durante a atualização; tente novamente.", zh: "刷新期间账户发生变化，请重试。" },
  "no_points_match": { en: "(no .pointsValue elements matched)", es: "(no coincidió ningún elemento .pointsValue)", pt: "(nenhum elemento .pointsValue correspondeu)", zh: "（没有匹配 .pointsValue 元素）" },
  "unknown": { en: "(unknown)", es: "(desconocido)", pt: "(desconhecido)", zh: "（未知）" },
  "none": { en: "(none)", es: "(ninguno)", pt: "(nenhum)", zh: "（无）" },
  "title_statistics": { en: "Statistics", es: "Estadísticas", pt: "Estatísticas", zh: "统计" },
  "title_history": { en: "Execution History", es: "Historial de ejecuciones", pt: "Histórico de execuções", zh: "执行历史" },
  "filter_history": { en: "Filter history", es: "Filtrar historial", pt: "Filtrar histórico", zh: "筛选历史记录" },
  "no_runs_yet": { en: "No runs yet. Start one from the main window.", es: "Aún no hay ejecuciones. Inicia una desde la ventana principal.", pt: "Ainda não há execuções. Inicie uma pela janela principal.", zh: "还没有运行记录。请从主窗口开始运行。" },
  "no_errors_history": { en: "No errors in this history.", es: "No hay errores en este historial.", pt: "Não há erros neste histórico.", zh: "此历史记录中没有错误。" },
  "no_success_history": { en: "No successful entries in this history.", es: "No hay entradas exitosas en este historial.", pt: "Não há entradas bem-sucedidas neste histórico.", zh: "此历史记录中没有成功项目。" },
  "title": { en: "Title:", es: "Título:", pt: "Título:", zh: "标题：" },
  "dismiss": { en: "Dismiss", es: "Descartar", pt: "Dispensar", zh: "关闭" },
  "update_download_failed": { en: "Download failed: {error}", es: "Falló la descarga: {error}", pt: "Falha no download: {error}", zh: "下载失败：{error}" },
  "update_no_custom": { en: "No custom update is available.", es: "No hay una actualización propia disponible.", pt: "Não há atualização própria disponível.", zh: "没有可用的自定义更新。" },
  "update_github_failed": { en: "Could not check GitHub.", es: "No se pudo consultar GitHub.", pt: "Não foi possível consultar o GitHub.", zh: "无法检查 GitHub。" },
  "schedule_enable": { en: "Enable schedule", es: "Activar horario", pt: "Ativar agendamento", zh: "启用计划" },
  "schedule_enable_for": { en: "Enable schedule for {name}", es: "Activar horario para {name}", pt: "Ativar agendamento para {name}", zh: "为 {name} 启用计划" },
  "schedule_dashboard": { en: "Rewards dashboard", es: "Panel de recompensas", pt: "Painel de recompensas", zh: "奖励面板" },
  "dashboard_auto": { en: "Auto (detect)", es: "Automático (detectar)", pt: "Automático (detectar)", zh: "自动（检测）" },
  "dashboard_legacy": { en: "Legacy", es: "Anterior", pt: "Legado", zh: "旧版" },
  "dashboard_new": { en: "New", es: "Nuevo", pt: "Novo", zh: "新版" },
  "advanced_scheduling": { en: "Advanced scheduling (drip-feed across duration)", es: "Programación avanzada (distribuir durante la duración)", pt: "Agendamento avançado (distribuir durante a duração)", zh: "高级计划（在整个时长内分批运行）" },
  "daily_run_time": { en: "Daily run time", es: "Hora de ejecución diaria", pt: "Horário da execução diária", zh: "每日运行时间" },
  "run_duration": { en: "Run duration (h)", es: "Duración (h)", pt: "Duração (h)", zh: "运行时长（小时）" },
  "queries_hour": { en: "Queries / hour", es: "Búsquedas / hora", pt: "Pesquisas / hora", zh: "搜索次数/小时" },
  "copy_all": { en: "Copy all", es: "Copiar todo", pt: "Copiar tudo", zh: "全部复制" },
  "phone_offline_toast": { en: "Phone offline", es: "Celular desconectado", pt: "Celular offline", zh: "手机离线" },
  "phone_unlink_failed": { en: "Could not unlink the phone.", es: "No se pudo desvincular el celular.", pt: "Não foi possível desvincular o celular.", zh: "无法取消关联手机。" },
  "phone_already_unlinked": { en: "Phone was already unlinked or could not be removed.", es: "El celular ya estaba desvinculado o no se pudo eliminar.", pt: "O celular já estava desvinculado ou não pôde ser removido.", zh: "手机已取消关联或无法移除。" },
  "pair_failed": { en: "Could not start pairing.", es: "No se pudo iniciar la vinculación.", pt: "Não foi possível iniciar a vinculação.", zh: "无法开始关联。" },
  "phone_online_close": { en: "Phone online. If it already joined, you can close this.", es: "Celular en línea. Si ya entró, puedes cerrar esto.", pt: "Celular online. Se já entrou, você pode fechar.", zh: "手机已上线。如果已经加入，可以关闭此窗口。" },
  "phone.by_phone": { en: "by phone", es: "por celular", pt: "pelo celular", zh: "由手机" },
  "status.ok": { en: "OK", es: "OK", pt: "OK", zh: "成功" },
  "status.skipped": { en: "Skipped", es: "Omitido", pt: "Ignorado", zh: "已跳过" },
  "status.error_prefix": { en: "[ERROR]", es: "[ERROR]", pt: "[ERRO]", zh: "[错误]" },
  "status.warning_prefix": { en: "[WARNING]", es: "[ADVERTENCIA]", pt: "[AVISO]", zh: "[警告]" },
  "account_switch_error": { en: "Could not switch account. Is the bot running?", es: "No se pudo cambiar de cuenta. ¿El bot está ejecutándose?", pt: "Não foi possível trocar de conta. O bot está em execução?", zh: "无法切换账户。机器人正在运行吗？" },
  "account_delete_error": { en: "Could not delete the account. Stop the run and try again.", es: "No se pudo borrar la cuenta. Detén la ejecución e inténtalo de nuevo.", pt: "Não foi possível excluir a conta. Pare a execução e tente novamente.", zh: "无法删除账户。请停止运行后重试。" },
  "account_deleted": { en: "Account \"{name}\" was deleted.", es: "La cuenta \"{name}\" fue eliminada.", pt: "A conta \"{name}\" foi excluída.", zh: "账户“{name}”已删除。" },
  "add_account_title": { en: "Add a new account", es: "Agregar una cuenta nueva", pt: "Adicionar uma nova conta", zh: "添加新账户" },
  "add_account_hint": { en: "Give this account a name — you can rename it later.", es: "Dale un nombre a esta cuenta; podrás cambiarlo después.", pt: "Dê um nome para esta conta — você poderá alterá-lo depois.", zh: "为此账户命名，之后可以重命名。" },
  "continue": { en: "Continue", es: "Continuar", pt: "Continuar", zh: "继续" },
  "account_open_login": { en: "Opening the browser for \"{name}\". Sign in, then close the window.", es: "Abriendo el navegador para \"{name}\". Inicia sesión y cierra la ventana.", pt: "Abrindo o navegador para \"{name}\". Entre e feche a janela.", zh: "正在为“{name}”打开浏览器。登录后关闭窗口。" },
  "account_bot_running": { en: "Cannot add an account while the bot is running.", es: "No puedes agregar una cuenta mientras el bot está ejecutándose.", pt: "Não é possível adicionar uma conta enquanto o bot está em execução.", zh: "机器人运行时无法添加账户。" },
  "account_setup_failed": { en: "Setup cancelled — account not created.", es: "Configuración cancelada: la cuenta no fue creada.", pt: "Configuração cancelada — a conta não foi criada.", zh: "设置已取消，未创建账户。" },
  "account_created": { en: "Account \"{name}\" is ready.", es: "La cuenta \"{name}\" está lista.", pt: "A conta \"{name}\" está pronta.", zh: "账户“{name}”已准备就绪。" },
  "settings_load_error": { en: "Could not load settings.", es: "No se pudo cargar la configuración.", pt: "Não foi possível carregar as configurações.", zh: "无法加载设置。" },
  "schedule_pc_range": { en: "PC queries must be between 0 and 130.", es: "Las búsquedas de PC deben estar entre 0 y 130.", pt: "As pesquisas no PC devem estar entre 0 e 130.", zh: "电脑搜索次数必须在 0 到 130 之间。" },
  "schedule_mobile_range": { en: "Mobile queries must be between 0 and 99.", es: "Las búsquedas móviles deben estar entre 0 y 99.", pt: "As pesquisas móveis devem estar entre 0 e 99.", zh: "手机搜索次数必须在 0 到 99 之间。" },
  "schedule_choose_queries": { en: "Set at least one of PC or Mobile queries above 0.", es: "Configura búsquedas de PC o móvil por encima de 0.", pt: "Defina pesquisas no PC ou celular acima de 0.", zh: "请将电脑或手机搜索次数至少设置为 1。" },
  "schedule_time_invalid": { en: "Daily run time must be a valid HH:MM value.", es: "La hora diaria debe tener un formato HH:MM válido.", pt: "O horário diário deve ter um valor HH:MM válido.", zh: "每日运行时间必须是有效的 HH:MM。" },
  "schedule_duration_range": { en: "Run duration must be between 1 and 24 hours.", es: "La duración debe estar entre 1 y 24 horas.", pt: "A duração deve estar entre 1 e 24 horas.", zh: "运行时长必须在 1 到 24 小时之间。" },
  "schedule_qph_range": { en: "Queries per hour must be between 1 and 99.", es: "Las búsquedas por hora deben estar entre 1 y 99.", pt: "As pesquisas por hora devem estar entre 1 e 99.", zh: "每小时搜索次数必须在 1 到 99 之间。" },
  "schedules_saved": { en: "Schedules saved.", es: "Horarios guardados.", pt: "Agendamentos salvos.", zh: "计划已保存。" },
  "schedules_failed": { en: "{count} schedule(s) failed to save.", es: "No se pudieron guardar {count} horario(s).", pt: "Falha ao salvar {count} agendamento(s).", zh: "{count} 个计划保存失败。" },
  "settings_saved_startup_failed": { en: "Schedules saved, but a startup setting failed.", es: "Horarios guardados, pero falló una configuración de inicio.", pt: "Agendamentos salvos, mas uma configuração de inicialização falhou.", zh: "计划已保存，但启动设置失败。" },
  "activity_log_empty": { en: "Activity log is empty.", es: "El registro de actividad está vacío.", pt: "O registro de atividade está vazio.", zh: "活动记录为空。" },
  "activity_log_copied": { en: "Activity log copied.", es: "Registro de actividad copiado.", pt: "Registro de atividade copiado.", zh: "活动记录已复制。" },
  "activity_copy_failed": { en: "Could not copy the activity log.", es: "No se pudo copiar el registro de actividad.", pt: "Não foi possível copiar o registro de atividade.", zh: "无法复制活动记录。" },
  "checkin_sent": { en: "Check-in sent to the phone.", es: "Check-in enviado al celular.", pt: "Check-in enviado para o celular.", zh: "签到请求已发送到手机。" },
  "news_sent": { en: "Read-to-earn sent to the phone.", es: "Lectura para ganar enviada al celular.", pt: "Leitura para ganhar enviada para o celular.", zh: "阅读赚取请求已发送到手机。" },
  "phone_unlinked": { en: "Phone unlinked. Microsoft account kept.", es: "Celular desvinculado. La cuenta Microsoft se conservó.", pt: "Celular desvinculado. A conta Microsoft foi mantida.", zh: "手机已取消关联，Microsoft 账户保留。" },
});

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
  if (typeof refresh_phone_ui === "function") refresh_phone_ui();
  if (typeof render_current_stats === "function" && typeof _last_dashboard_stats !== "undefined" && _last_dashboard_stats) render_current_stats(_last_dashboard_stats);
  if (typeof render_history === "function") render_history();
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
