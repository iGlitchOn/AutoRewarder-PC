// =========================================================================
// AutoRewarder — UI script
// =========================================================================

let accountsCache = [];
let currentAccountId = null;
// True while the background WebDriver warmup (which also refreshes the balance)
// is running at launch. Start must stay disabled until it finishes, so a run
// can't open a second driver on the same Edge profile.
let driverWarmingUp = false;
// True while a balance scrape holds a driver (launch refresh, manual refresh,
// or account-switch refresh). Start must stay disabled during it too.
let balanceFetching = false;
let runInProgress = false;

// =========================================================================
// Toasts
// =========================================================================

const TOAST_ICONS = {
  info:    '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  error:   '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

function show_toast(message, type, opts) {
  const kind = TOAST_ICONS[type] ? type : 'info';
  const duration = (opts && opts.duration) || (kind === 'error' ? 5000 : 3500);

  const container = document.getElementById('toast_container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast ' + kind;
  toast.innerHTML =
    TOAST_ICONS[kind] +
    '<div class="toast-msg"></div>' +
    '<button class="toast-close" aria-label="Dismiss">&times;</button>';

  toast.querySelector('.toast-msg').textContent = message;

  const dismiss = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  container.appendChild(toast);

  if (duration > 0) setTimeout(dismiss, duration);
}

// =========================================================================
// Generic modal (prompt/confirm replacement)
// =========================================================================

let _modalResolve = null;

function open_modal(opts) {
  const backdrop = document.getElementById('app_modal');
  const title = document.getElementById('modal_title');
  const message = document.getElementById('modal_message');
  const input = document.getElementById('modal_input');
  const confirmBtn = document.getElementById('modal_confirm');
  const cancelBtn = document.getElementById('modal_cancel');

  title.textContent = opts.title || '';
  message.textContent = opts.message || '';

  const withInput = Boolean(opts.withInput);
  input.hidden = !withInput;
  input.value = opts.inputDefault || '';
  input.placeholder = opts.inputPlaceholder || '';

  confirmBtn.textContent = opts.confirmLabel || 'OK';
  cancelBtn.textContent = opts.cancelLabel || 'Cancel';
  cancelBtn.hidden = Boolean(opts.hideCancel);
  confirmBtn.className = 'btn-primary' + (opts.danger ? ' danger' : '');

  backdrop.hidden = false;
  setTimeout(() => (withInput ? input : confirmBtn).focus(), 30);

  return new Promise((resolve) => { _modalResolve = resolve; });
}

function close_modal(result) {
  const backdrop = document.getElementById('app_modal');
  backdrop.hidden = true;
  if (_modalResolve) {
    const r = _modalResolve;
    _modalResolve = null;
    r(result);
  }
}

function prompt_modal(title, message, inputDefault, opts) {
  return open_modal({
    title: title,
    message: message || '',
    withInput: true,
    inputDefault: inputDefault || '',
    inputPlaceholder: (opts && opts.placeholder) || '',
    confirmLabel: (opts && opts.confirmLabel) || 'OK',
  });
}

function confirm_modal(title, message, opts) {
  return open_modal({
    title: title,
    message: message || '',
    withInput: false,
    confirmLabel: (opts && opts.confirmLabel) || 'Confirm',
    danger: Boolean(opts && opts.danger),
  });
}

// =========================================================================
// Avatars
// =========================================================================

const AVATAR_PALETTE = [
  '#5b8eff', '#e879a0', '#f59e0b', '#34d399',
  '#a78bfa', '#fbbf24', '#fb7185', '#22d3ee',
];

function avatar_color(id) {
  if (!id) return AVATAR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function avatar_initials(label) {
  const s = (label || '?').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]);
}

function make_avatar(account, size) {
  const el = document.createElement('span');
  el.className = 'avatar' + (size ? ' avatar-' + size : '');
  el.style.backgroundColor = avatar_color(account ? account.id : '');
  el.textContent = account ? avatar_initials(account.label) : '?';
  return el;
}

// Backwards compat alias.
function create_avatar(account, size) { return make_avatar(account, size); }

// =========================================================================
// Activity log
//
// Security: log messages can contain user-controlled strings (account labels
// entered via the "Add/Rename" modals, Python exception messages, etc.).
// We therefore build the log line node with textContent/createElement only —
// never innerHTML — so a crafted account name like `<img src=x onerror=...>`
// renders as literal text. For the one legitimate case where we need a
// clickable element (update-available notice), see `update_log_link` below,
// which builds the anchor via createElement so the URL is never parsed as
// HTML.
// =========================================================================

function detect_log_severity(msg) {
  const s = String(msg);
  if (/\[ERROR\]/i.test(s)) return 'error';
  if (/\[WARNING\]/i.test(s)) return 'warning';
  if (/completed|success|done!|ready/i.test(s)) return 'success';
  return '';
}

function _new_log_line(message) {
  const severity = detect_log_severity(message);
  const line = document.createElement('div');
  line.className = 'log-line' + (severity ? ' ' + severity : '');

  // Preserve newlines without HTML: split → text nodes separated by <br>.
  const parts = String(message).split('\n');
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) line.appendChild(document.createElement('br'));
    line.appendChild(document.createTextNode(parts[i]));
  }
  return line;
}

function update_log(message) {
  const logDiv = document.getElementById('log_area');
  if (!logDiv) return;

  logDiv.appendChild(_new_log_line(message));
  logDiv.scrollTop = logDiv.scrollHeight;
}

/**
 * Append a log line with a trailing clickable link. Only the `text` portion
 * is user-facing content (still safely inserted as text); the anchor is
 * built via createElement so the URL cannot be interpreted as HTML.
 * Called from Python via evaluate_js when an app update is available.
 */
function update_log_link(text, linkLabel, url) {
  const logDiv = document.getElementById('log_area');
  if (!logDiv) return;

  const line = _new_log_line(text);
  line.appendChild(document.createTextNode(' '));

  const a = document.createElement('a');
  a.href = '#';
  a.textContent = String(linkLabel);
  a.addEventListener('click', function (e) {
    e.preventDefault();
    if (window.pywebview && pywebview.api && typeof pywebview.api.open_link === 'function') {
      pywebview.api.open_link(String(url));
    }
  });
  line.appendChild(a);

  logDiv.appendChild(line);
  logDiv.scrollTop = logDiv.scrollHeight;
}

const _loggedOnce = new Set();
function update_log_once(message) {
  if (_loggedOnce.has(message)) return;
  _loggedOnce.add(message);
  update_log(message);
}

let _custom_update_url = '';

function _update_panel(message, url) {
  const panel = document.getElementById('updates_panel');
  const text = document.getElementById('updates_message');
  const download = document.getElementById('updates_download_btn');
  if (!panel || !text) return;
  text.textContent = message || '';
  _custom_update_url = String(url || '');
  if (download) download.disabled = !_custom_update_url;
  panel.hidden = !message;
}

function cancel_custom_update() {
  _custom_update_url = '';
  const panel = document.getElementById('updates_panel');
  if (panel) panel.hidden = true;
}

function download_custom_update() {
  if (!_custom_update_url) return;
  const url = _custom_update_url;
  const download = document.getElementById('updates_download_btn');
  const text = document.getElementById('updates_message');
  if (download) download.disabled = true;
  const api = window.pywebview && pywebview.api;
  const finish = function () {
    if (download) download.disabled = !_custom_update_url;
  };
  if (!api || typeof api.open_update_asset !== 'function') {
    if (api && typeof api.open_link === 'function') api.open_link(url);
    finish();
    return;
  }
  api.open_update_asset(url).then(function (result) {
    if (result && result.ok) {
      if (text) text.textContent = 'El navegador está abriendo el instalador. Cancela cuando termines.';
    } else {
      _update_panel('El archivo ya no está en GitHub. Vuelve a Check updates.', '');
    }
    finish();
  }).catch(function () {
    if (text) text.textContent = 'No se pudo comprobar el archivo en GitHub.';
    finish();
  });
}

function show_update_notice(result, manual) {
  result = result || {};
  const releases = Array.isArray(result.releases) ? result.releases : [];
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const original = releases.find(function (item) { return item.kind === 'original' && item.newer; });
  const custom = releases.find(function (item) { return item.kind === 'custom' && item.newer; });
  if (original) {
    update_log_once('Hay una nueva versión del repositorio original (' + original.tag + '). Notifica al desarrollador; no se instalará automáticamente.');
  }
  if (custom) {
    const fileUrl = String(custom.download_url || '');
    if (fileUrl) {
      _update_panel('Nueva actualización propia ' + custom.tag + '. ¿Quieres descargarla?', fileUrl);
    } else {
      _update_panel('Nueva versión propia ' + custom.tag + ', pero no hay un instalador adjunto.', '');
    }
  } else if (manual) {
    const customErr = errors.some(function (item) { return item.kind === 'custom'; });
    if (customErr) {
      _update_panel('No se pudo comprobar GitHub.', '');
    } else {
      _update_panel('No hay una actualización propia disponible.', '');
    }
    setTimeout(cancel_custom_update, 4000);
    if (original) update_log('También hay una actualización del repositorio original para notificar al desarrollador.');
  } else {
    cancel_custom_update();
  }
  return result;
}

function check_updates_manual() {
  const button = document.getElementById('updates_btn');
  if (button) { button.disabled = true; button.textContent = 'Checking…'; }
  const done = function () {
    if (button) { button.disabled = false; button.textContent = 'Check updates'; }
  };
  try {
    if (!window.pywebview || !pywebview.api || typeof pywebview.api.check_updates !== 'function') {
      update_log('No se pudo consultar GitHub desde esta versión.');
      done();
      return;
    }
    pywebview.api.check_updates().then(function (result) {
      show_update_notice(result, true);
      done();
    }).catch(function () {
      update_log('No se pudo comprobar GitHub.');
      done();
    });
  } catch (e) {
    update_log('No se pudo comprobar GitHub.');
    done();
  }
}

// =========================================================================
// Start / bot control
// =========================================================================

function start_block_reason() {
  if (runInProgress) return t('run.already_running');
  if (driverWarmingUp) return t('run.browser_loading');
  if (balanceFetching) return t('run.browser_busy');
  if (!currentAccountId) return t('run.no_microsoft');
  const current = accountsCache.find(a => a.id === currentAccountId);
  if (!current) return t('run.no_microsoft');
  if (!current.first_setup_done) return t('run.microsoft_setup');
  return null;
}

function show_run_block_reason() {
  const el = document.getElementById('run_block_reason');
  if (!el) return;
  const reason = start_block_reason();
  if (reason && !runInProgress) {
    el.hidden = false;
    el.textContent = reason;
  } else {
    el.hidden = true;
    el.textContent = '';
  }
}

function set_running_ui(on) {
  runInProgress = Boolean(on);
  const startBtn = document.getElementById('start_btn');
  const tasksBtn = document.getElementById('tasks_only_btn');
  const stopBtn = document.getElementById('stop_btn');
  const label = startBtn && startBtn.querySelector('.btn-label');
  if (runInProgress) {
    if (startBtn) startBtn.disabled = true;
    if (label) label.textContent = t('run.running');
    if (tasksBtn) tasksBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    update_status_indicator('executing');
  } else {
    enable_start_button();
  }
  show_run_block_reason();
}

function start_bot() {
  const reason = start_block_reason();
  if (reason) {
    show_toast(reason, 'warning');
    show_run_block_reason();
    return;
  }

  const pc = parseInt(document.getElementById('count_pc').value, 10);
  const mobile = parseInt(document.getElementById('count_mobile').value, 10);

  const pcValid = !isNaN(pc) && pc >= 0 && pc <= 130;
  const mobileValid = !isNaN(mobile) && mobile >= 0 && mobile <= 99;
  if (!pcValid) {
    show_toast('PC must be between 0 and 130.', 'warning');
    return;
  }
  if (!mobileValid) {
    show_toast('Mobile must be between 0 and 99.', 'warning');
    return;
  }
  if (pc + mobile === 0) {
    show_toast('Set at least one of PC or Mobile above 0.', 'warning');
    return;
  }

  if (runInProgress) return;
  set_running_ui(true);
  update_status_indicator('executing');
  pywebview.api.set_queries_counts(pc, mobile).then(function (ok) {
    if (!ok) show_toast('Could not save query counts.', 'warning');
    return pywebview.api.start_run(pc, mobile, false);
  }).then(function (result) {
    if (result && result.started === false) {
      show_toast((result && result.message) || 'A run is already in progress.', 'warning');
      enable_start_button();
    }
  }).catch(function (err) {
    console.error(err);
    show_toast('Could not start the run.', 'error');
    enable_start_button();
  });
}

function start_tasks_only() {
  const reason = start_block_reason();
  if (reason) {
    show_toast(reason, 'warning');
    show_run_block_reason();
    return;
  }
  if (runInProgress) return;

  set_running_ui(true);
  update_log('Starting remaining daily tasks only…');
  pywebview.api.start_run(0, 0, true).then(function (result) {
    if (result && result.started === false) {
      show_toast((result && result.message) || 'A run is already in progress.', 'warning');
      enable_start_button();
    }
  }).catch(function (err) {
    console.error(err);
    show_toast('Could not start tasks.', 'error');
    enable_start_button();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  // Auto-save query counts when they change (on blur).
  const pcField = document.getElementById('count_pc');
  const mobileField = document.getElementById('count_mobile');
  const save_counts = () => {
    if (pcField && mobileField) {
      const pc = parseInt(pcField.value, 10);
      const mobile = parseInt(mobileField.value, 10);
      if (!isNaN(pc) && !isNaN(mobile) && pc >= 0 && pc <= 130 && mobile >= 0 && mobile <= 99) {
        pywebview.api.set_queries_counts(pc, mobile).then(ok => {
          if (!ok) console.error('Failed to auto-save query counts (backend returned false).');
        }).catch(err => {
          console.error('Failed to auto-save query counts:', err);
        });
      }
    }
  };
  if (pcField) pcField.addEventListener('blur', save_counts);
  if (mobileField) mobileField.addEventListener('blur', save_counts);
});

function enable_start_button() {
  runInProgress = false;
  const btn = document.getElementById('start_btn');
  const label = btn.querySelector('.btn-label');
  if (label) label.textContent = t('run.start');
  const reason = start_block_reason();
  const canRun = !reason;
  btn.disabled = !canRun;
  const tasksBtn = document.getElementById('tasks_only_btn');
  if (tasksBtn) {
    tasksBtn.disabled = !canRun;
    tasksBtn.textContent = t('run.tasks');
  }
  show_run_block_reason();

  // Stop button is meaningful only while a run is in progress.
  const stopBtn = document.getElementById('stop_btn');
  if (stopBtn) {
    stopBtn.disabled = true;
    const stopLabel = stopBtn.querySelector('.stop-label');
    if (stopLabel) stopLabel.textContent = t('run.stop');
  }
  update_status_indicator();
  refresh_stats_ui();
  refresh_rewards_overview();
}

function stop_bot() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.stop) {
    show_toast('Stop is not available.', 'error');
    enable_start_button();
    return;
  }
  const stopBtn = document.getElementById('stop_btn');
  if (stopBtn) {
    stopBtn.disabled = true;
    const stopLabel = stopBtn.querySelector('.stop-label');
    if (stopLabel) stopLabel.textContent = 'Stopping…';
  }
  update_status_indicator('executing');
  const text = document.getElementById('status_text');
  if (text) text.textContent = 'Stopping…';
  // Mark this as a user stop so a login-triggered run does not close the GUI.
  pywebview.api.stop(true).catch(function (err) {
    console.error('stop failed:', err);
    show_toast('Stop failed.', 'error');
    enable_start_button();
  });
}

function update_status_indicator(forceState) {
  const dot = document.getElementById('dot');
  const text = document.getElementById('status_text');
  if (!dot || !text) return;

  dot.classList.remove('active', 'ready', 'warning');

  let state = forceState;
  if (!state) {
    const current = accountsCache.find(a => a.id === currentAccountId);
    if (!current) state = 'empty';
    else if (!current.first_setup_done) state = 'setup';
    else state = 'ready';
  }

  set_hide_browser_toggle_enabled(state !== 'executing');

  switch (state) {
    case 'executing':
      dot.classList.add('active');
      text.textContent = 'Running…';
      break;
    case 'ready':
      dot.classList.add('ready');
      text.textContent = 'Ready';
      break;
    case 'setup':
      dot.classList.add('warning');
      text.textContent = 'Setup needed';
      break;
    case 'empty':
    default:
      text.textContent = 'No account selected';
      break;
  }
}

function show_history() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.open_history_window) {
    show_toast('History is not available.', 'error');
    return;
  }
  Promise.resolve(pywebview.api.open_history_window()).catch(function () {
    show_toast('Could not open history.', 'error');
  });
}

function show_stats() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.open_stats_window) {
    show_toast('Stats are not available.', 'error');
    return;
  }
  Promise.resolve(pywebview.api.open_stats_window()).catch(function () {
    show_toast('Could not open stats.', 'error');
  });
}

/**
 * Format a points number for the compact card: thousands separators, with a
 * leading "~" when the figure is an estimate (no real balance scraped yet).
 */
function _fmt_points(value, isEstimate) {
  if (value == null || isNaN(value)) return '—';
  const sign = value > 0 && isEstimate === 'delta' ? '+' : '';
  const prefix = (isEstimate === true && value > 0) ? '~' : '';
  return prefix + sign + Number(value).toLocaleString();
}

/**
 * Toggle the compact stats card's "searching" animation. Called from Python
 * while it scrapes the real balance (at launch, or on a manual refresh).
 */
function set_stats_loading(on) {
  balanceFetching = Boolean(on);
  const card = document.getElementById('stats_card');
  if (card) card.classList.toggle('stats-loading', balanceFetching);

  // A balance scrape holds a driver on the profile → block Start meanwhile.
  const btn = document.getElementById('start_btn');
  if (!btn) return;
  const label = btn.querySelector('.btn-label');
  const txt = label ? label.textContent : '';
  if (txt === 'Running…') return;  // a run owns the button; leave it alone
  if (balanceFetching) {
    btn.disabled = true;
    if (label) label.textContent = 'Loading…';
  } else {
    const current = accountsCache.find(a => a.id === currentAccountId);
    btn.disabled = !(current && current.first_setup_done) || driverWarmingUp;
    if (label && !driverWarmingUp) label.textContent = 'Start run';
  }
}

/**
 * Refresh the compact stats card for the current account. Called on load,
 * after switching accounts, and (from Python) at the end of every run.
 */
function refresh_stats_ui() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.get_stats) return;
  const totalEl = document.getElementById('stat_total');
  const sessionEl = document.getElementById('stat_session');
  const totalLabel = document.getElementById('stat_total_label');

  pywebview.api.get_stats().then(function (stats) {
    // Drop a response that arrived after the user switched accounts, so stale
    // data can't overwrite the card for the now-active account.
    if (stats && stats.account && stats.account.id !== currentAccountId) return;
    if (!stats || !stats.derived) {
      if (totalEl) totalEl.textContent = '—';
      if (sessionEl) sessionEl.textContent = '—';
      if (totalLabel) totalLabel.textContent = 'Total points';
      const dateEl = document.getElementById('stat_session_date');
      if (dateEl) dateEl.textContent = '';
      return;
    }
    const d = stats.derived;
    if (totalEl) totalEl.textContent = _fmt_points(d.total_points, d.is_estimate);
    if (totalLabel) {
      totalLabel.textContent = d.is_estimate ? 'Total points (est.)' : 'Total points';
    }
    if (sessionEl) {
      const flag = d.session_is_estimate ? true : 'delta';
      sessionEl.textContent = _fmt_points(d.today_points != null ? d.today_points : d.session_points, flag);
    }
    const dateEl = document.getElementById('stat_session_date');
    if (dateEl) {
      dateEl.textContent = d.last_run_date ? `(${d.last_run_date})` : '';
    }
  }).catch(function (err) {
    console.error('refresh_stats_ui failed:', err);
    if (totalEl) totalEl.textContent = '—';
    if (sessionEl) sessionEl.textContent = '—';
  });
}

function refresh_rewards_overview() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.get_rewards_overview) return;
  pywebview.api.get_rewards_overview().then(function (info) {
    if (!info || !info.account || info.account.id !== currentAccountId) return;
    const profile = info.profile || {};
    const progress = info.progress || {};
    const estimate = info.estimate || {};
    const level = profile.membership || (profile.level ? `Level ${profile.level}` : 'Membership unavailable');
    const region = profile.country || profile.locale || 'Region unknown';
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('rewards_level', level);
    set('rewards_region', region);
    set('rewards_estimate', `Search estimate: ~${estimate.search_points || 0} pts/day`);
    const leftover = (obj, fallback) => {
      if (obj && typeof obj === 'object' && obj.label) {
        const left = obj.left;
        if (left > 0) return `${obj.label} (${left} left)`;
        return `${obj.label} done`;
      }
      const s = String(fallback || obj || '');
      const m = s.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        const left = Math.max(0, parseInt(m[2], 10) - parseInt(m[1], 10));
        return left ? `${m[1]}/${m[2]} (${left} left)` : `${m[1]}/${m[2]} done`;
      }
      return s || 'pending';
    };
    set('progress_pc', `PC: ${leftover(progress.pc, (progress.pc || {}).label)}`);
    set('progress_mobile', `Mobile: ${leftover(progress.mobile, (progress.mobile || {}).label)}`);
    set('progress_daily', `Daily: ${progress.daily || 'unknown'}`);
    set('progress_visual', `Visual: ${progress.visual || 'pending'}`);
    set('progress_checkin', `Check-in: ${leftover(progress.checkin, progress.checkin)}`);
    set('progress_news', `News: ${leftover(progress.news, progress.news)}`);
    set('progress_edge', `Edge: ${leftover(progress.edge, progress.edge)}`);
    set('progress_reset', `Daily set ${progress.reset || 'resets at midnight'}`);
    refresh_manual_tasks();
    const pill = document.getElementById('daily_task_pill');
    if (pill) {
      const state = progress.daily_state || 'pending';
      pill.dataset.state = state;
      if (state === 'done') pill.textContent = 'Daily tasks: done';
      else if (state === 'partial') pill.textContent = `Daily tasks: ${progress.daily || 'partial'}`;
      else pill.textContent = 'Daily tasks: pending (will verify live)';
    }
    const current = accountsCache.find(a => a.id === currentAccountId);
    const meta = document.getElementById('current_meta');
    if (current && meta) {
      meta.textContent = `${current.first_setup_done ? 'Ready to run' : 'Setup pending'} · ${level} · ${region} · by Microsoft`;
    }
    refresh_phone_ui();
  }).catch(function (err) { console.error('refresh_rewards_overview failed:', err); });
}

function set_hide_browser_toggle_enabled(enabled) {
  const toggle = document.getElementById('hideBrowserToggle');
  if (!toggle) return;
  toggle.disabled = !enabled;
  toggle.setAttribute('aria-disabled', String(!enabled));
  const row = toggle.closest('.settings-row') || toggle.closest('.toggle-row');
  if (row) row.classList.toggle('row-disabled', !enabled);
}

function hideBrowserToggle() {
  // Preview only. Persist happens in save_settings so Cancel can revert.
}

// =========================================================================
// Custom account dropdown
// =========================================================================

function toggle_account_menu(force) {
  const trigger = document.getElementById('account_trigger');
  const menu = document.getElementById('account_menu');
  if (!trigger || !menu) return;

  const shouldOpen = force === undefined ? menu.hidden : force;
  menu.hidden = !shouldOpen;
  trigger.setAttribute('aria-expanded', String(shouldOpen));
}

function render_account_menu() {
  const menu = document.getElementById('account_menu');
  if (!menu) return;

  menu.innerHTML = '';

  if (accountsCache.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'accounts-empty';
    empty.textContent = 'No accounts yet';
    menu.appendChild(empty);
  } else {
    for (const acc of accountsCache) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'account-option' + (acc.is_current ? ' current' : '');
      btn.setAttribute('role', 'option');

      btn.appendChild(make_avatar(acc));

      const info = document.createElement('span');
      info.className = 'account-option-info';
      const name = document.createElement('span');
      name.className = 'account-option-name';
      name.textContent = acc.label;
      const meta = document.createElement('span');
      meta.className = 'account-option-meta';
      meta.textContent = acc.first_setup_done ? 'Ready' : 'Setup pending';
      info.appendChild(name);
      info.appendChild(meta);
      btn.appendChild(info);

      const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      check.setAttribute('class', 'account-option-check');
      check.setAttribute('width', '14');
      check.setAttribute('height', '14');
      check.setAttribute('viewBox', '0 0 24 24');
      check.setAttribute('fill', 'none');
      check.setAttribute('stroke', 'currentColor');
      check.setAttribute('stroke-width', '2.5');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round');
      check.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
      btn.appendChild(check);

      btn.addEventListener('click', () => {
        toggle_account_menu(false);
        if (acc.id !== currentAccountId) {
          pywebview.api.switch_account(acc.id).then(ok => {
            if (!ok) show_toast('Could not switch account. Is the bot running?', 'warning');
          }).catch(function () {
            show_toast('Could not switch account.', 'error');
          });
        }
      });

      menu.appendChild(btn);
    }
  }

  // Divider + actions.
  if (accountsCache.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'menu-divider';
    menu.appendChild(divider);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'menu-action';
  addBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    '<span>Add account</span>';
  addBtn.addEventListener('click', () => {
    toggle_account_menu(false);
    prompt_and_create_account();
  });
  menu.appendChild(addBtn);

  if (accountsCache.length > 0) {
    const manageBtn = document.createElement('button');
    manageBtn.type = 'button';
    manageBtn.className = 'menu-action';
    manageBtn.style.color = 'var(--text-muted)';
    manageBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
      '<span>Manage accounts…</span>';
    manageBtn.addEventListener('click', () => {
      toggle_account_menu(false);
      open_accounts_modal();
    });
    menu.appendChild(manageBtn);
  }
}

function render_account_trigger() {
  const avatarEl = document.getElementById('current_avatar');
  const labelEl = document.getElementById('current_label');
  const metaEl = document.getElementById('current_meta');
  const trigger = document.getElementById('account_trigger');
  if (!avatarEl || !labelEl || !metaEl || !trigger) return;

  const current = accountsCache.find(a => a.id === currentAccountId);

  if (current) {
    avatarEl.textContent = avatar_initials(current.label);
    avatarEl.style.backgroundColor = avatar_color(current.id);
    labelEl.textContent = current.label;
    metaEl.textContent = current.first_setup_done ? 'Ready to run · by Microsoft' : 'Setup pending · by Microsoft';
    trigger.disabled = false;
  } else {
    avatarEl.textContent = '+';
    avatarEl.style.backgroundColor = 'var(--surface-3)';
    labelEl.textContent = 'No account yet';
    metaEl.textContent = accountsCache.length ? 'Select one below' : 'Add your first account';
    trigger.disabled = accountsCache.length === 0 && false; // keep clickable to open menu
  }
}

// =========================================================================
// Account creation
// =========================================================================

let accountCreating = false;

async function prompt_and_create_account() {
  if (accountCreating) {
    show_toast('An account setup is already in progress.', 'warning');
    return;
  }
  const defaultLabel = `Account ${accountsCache.length + 1}`;
  const label = await prompt_modal(
    'Add a new account',
    'Give this account a name — you can rename it later.',
    defaultLabel,
    { placeholder: defaultLabel, confirmLabel: 'Continue' }
  );
  if (label === null) return;
  const trimmed = String(label).trim() || defaultLabel;

  show_toast(`Opening browser for "${trimmed}". Log in, then close the window.`, 'info', { duration: 6000 });
  accountCreating = true;

  pywebview.api.create_account(trimmed).then(result => {
    if (!result || !result.ok) {
      if (result && result.error === 'bot_running') {
        show_toast('Cannot add an account while the bot is running.', 'warning');
      } else if (result && result.error === 'setup_failed') {
        show_toast('Setup cancelled — account not created.', 'warning');
      } else {
        show_toast('Could not create account.', 'error');
      }
    } else {
      show_toast(`Account "${result.label}" is ready.`, 'success');
    }
    refresh_account_ui();
  }).catch(function (err) {
    console.error('create_account failed:', err);
    show_toast('Could not create account.', 'error');
    refresh_account_ui();
  }).then(function () {
    accountCreating = false;
  });
}

// =========================================================================
// Accounts management modal (opens from the header button or dropdown action)
// =========================================================================

function open_accounts_modal() {
  const backdrop = document.getElementById('accounts_modal');
  if (!backdrop) return;
  backdrop.hidden = false;
  if (typeof render_accounts_section === 'function') {
    render_accounts_section(accountsCache);
  }
}

function close_accounts_modal() {
  const backdrop = document.getElementById('accounts_modal');
  if (backdrop) backdrop.hidden = true;
}

// =========================================================================
// Settings modal (general + scheduled run)
// =========================================================================

function open_settings_modal() {
  const backdrop = document.getElementById('settings_modal');
  if (!backdrop) return;

  Promise.all([
    pywebview.api.get_all_schedules(),
    pywebview.api.get_launch_on_startup(),
    pywebview.api.get_open_on_login(),
    pywebview.api.get_close_to_tray(),
    pywebview.api.get_llm_config(),
    pywebview.api.get_force_tasks(),
    pywebview.api.get_settings(),
  ]).then(([schedules, startup, openOnLogin, closeToTray, llmConfig, forceTasks, settings]) => {
    render_schedule_cards(schedules || []);

    // Start-with-Windows toggle — disable row on unsupported OS.
    const startupToggle = document.getElementById('startupToggle');
    const startupRow = startupToggle.closest('.settings-row');
    const startupHint = document.getElementById('startup_hint');
    startupToggle.checked = Boolean(startup && startup.enabled);
    if (startup && !startup.supported) {
      startupRow.classList.add('row-disabled');
      startupToggle.disabled = true;
      startupHint.textContent = 'Available on Windows and Linux only.';
    } else {
      startupRow.classList.remove('row-disabled');
      startupToggle.disabled = false;
      startupHint.textContent = "Automatically run AutoRewarder in the background at each account's scheduled time.";
    }

    const openOnLoginToggle = document.getElementById('openOnLoginToggle');
    const openOnLoginRow = openOnLoginToggle.closest('.settings-row');
    const openOnLoginHint = document.getElementById('open_on_login_hint');
    openOnLoginToggle.checked = Boolean(openOnLogin && openOnLogin.enabled);
    if (openOnLogin && !openOnLogin.supported) {
      openOnLoginRow.classList.add('row-disabled');
      openOnLoginToggle.disabled = true;
      openOnLoginHint.textContent = 'Available on Windows only.';
    } else {
      openOnLoginRow.classList.remove('row-disabled');
      openOnLoginToggle.disabled = false;
      openOnLoginHint.textContent = 'When you sign in to Windows, run leftover searches and daily tasks. If everything is already done, AutoRewarder closes.';
    }

    // Close-to-tray toggle — default to true if the API failed.
    const trayToggle = document.getElementById('closeToTrayToggle');
    if (trayToggle) {
      trayToggle.checked = closeToTray !== false;
    }

    const hideToggle = document.getElementById('hideBrowserToggle');
    if (hideToggle) {
      hideToggle.checked = Boolean(settings && settings.hide_browser);
    }

    // Force toggles — default to off if the API failed.
    const force = forceTasks || {};
    const forceDailyToggle = document.getElementById('forceDailyToggle');
    const forceVisualToggle = document.getElementById('forceVisualToggle');
    if (forceDailyToggle) forceDailyToggle.checked = Boolean(force.force_daily_tasks);
    if (forceVisualToggle) forceVisualToggle.checked = Boolean(force.force_visual_search);

    // LLM search-term generation.
    const cfg = llmConfig || {};
    const llmToggle = document.getElementById('llmToggle');
    const providerSel = document.getElementById('llmProvider');
    const modelInput = document.getElementById('llmModel');
    const keyInput = document.getElementById('llmApiKey');
    const localeInput = document.getElementById('llmLocale');
    const localeHint = document.getElementById('llm_locale_hint');
    if (llmToggle) llmToggle.checked = Boolean(cfg.use_llm_queries);
    if (providerSel && cfg.llm_provider) providerSel.value = cfg.llm_provider;
    if (modelInput) modelInput.value = cfg.llm_model || '';
    if (keyInput) keyInput.value = cfg.llm_api_key || '';
    if (localeInput) localeInput.value = cfg.search_locale || 'auto';
    if (localeHint) {
      const eff = cfg.effective_locale || 'en-US';
      localeHint.textContent =
        `Detected language: ${eff}. Leave "auto" to follow your system, or enter a locale like fr-FR.`;
    }
    apply_llm_field_state();
  }).catch(err => {
    console.error('Failed to load settings:', err);
    show_toast('Could not load settings.', 'error');
  });

  backdrop.hidden = false;
}

function close_settings_modal() {
  const backdrop = document.getElementById('settings_modal');
  if (backdrop) backdrop.hidden = true;
  if (!window.pywebview || !pywebview.api || !pywebview.api.get_settings) return;
  pywebview.api.get_settings().then(function (settings) {
    const toggle = document.getElementById('hideBrowserToggle');
    if (toggle) toggle.checked = Boolean(settings && settings.hide_browser);
  }).catch(function () {});
}

// Dim + disable the LLM config fields when the feature is toggled off.
function apply_llm_field_state() {
  const toggle = document.getElementById('llmToggle');
  const fields = document.getElementById('llm_fields');
  if (!fields) return;
  fields.classList.toggle('dim', !(toggle && toggle.checked));
}

function render_schedule_cards(schedules) {
  const container = document.getElementById('schedule_accounts_list');
  const empty = document.getElementById('schedule_empty');
  if (!container || !empty) return;

  container.innerHTML = '';

  if (!schedules || schedules.length === 0) {
    container.hidden = true;
    empty.hidden = false;
    return;
  }
  container.hidden = false;
  empty.hidden = true;

  for (const item of schedules) {
    const card = build_schedule_card(item);
    container.appendChild(card);
  }
}

function format_schedule_summary(item, sched, enabled) {
  const prefix = item.first_setup_done ? '' : 'Setup pending · ';
  if (!enabled) return prefix + 'Schedule off';
  const pc = sched.queries_pc != null ? sched.queries_pc : 15;
  const mobile = sched.queries_mobile != null ? sched.queries_mobile : 15;
  const time = (sched.run_time && /^\d{2}:\d{2}$/.test(sched.run_time)) ? sched.run_time : '09:00';
  if (sched.advancedScheduling) {
    const dur = sched.runDuration != null ? sched.runDuration : 3;
    const qph = sched.queriesPerHour != null ? sched.queriesPerHour : 10;
    return `${prefix}${time} · PC ${pc} / Mobile ${mobile} · ${dur}h @ ${qph}/h`;
  }
  return `${prefix}${time} · PC ${pc} / Mobile ${mobile}`;
}

function build_schedule_card(item) {
  const acc = { id: item.id, label: item.label };
  const sched = item.schedule || {};

  const card = document.createElement('div');
  card.className = 'schedule-card' + (sched.enabled ? '' : ' disabled');
  card.dataset.id = item.id;

  // Header: accordion trigger (avatar + info + chevron) + enable toggle.
  const header = document.createElement('div');
  header.className = 'schedule-card-header';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'schedule-card-trigger';
  trigger.setAttribute('aria-expanded', 'false');

  trigger.appendChild(make_avatar(acc));

  const title = document.createElement('div');
  title.className = 'schedule-card-title';
  const name = document.createElement('div');
  name.className = 'schedule-card-name';
  name.textContent = acc.label;
  const status = document.createElement('div');
  status.className = 'schedule-card-status';
  status.textContent = format_schedule_summary(item, sched, Boolean(sched.enabled));
  title.appendChild(name);
  title.appendChild(status);
  trigger.appendChild(title);

  const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chev.setAttribute('class', 'schedule-card-chev');
  chev.setAttribute('width', '14');
  chev.setAttribute('height', '14');
  chev.setAttribute('viewBox', '0 0 24 24');
  chev.setAttribute('fill', 'none');
  chev.setAttribute('stroke', 'currentColor');
  chev.setAttribute('stroke-width', '2');
  chev.setAttribute('stroke-linecap', 'round');
  chev.setAttribute('stroke-linejoin', 'round');
  chev.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
  trigger.appendChild(chev);

  header.appendChild(trigger);

  const toggleWrap = document.createElement('label');
  toggleWrap.className = 'toggle-compact';
  toggleWrap.title = 'Enable schedule';
  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.className = 'schedule-enabled';
  toggleInput.checked = Boolean(sched.enabled);
  toggleInput.setAttribute('aria-label', 'Enable schedule for ' + acc.label);
  const togglePill = document.createElement('span');
  togglePill.className = 'toggle-pill';
  toggleWrap.appendChild(toggleInput);
  toggleWrap.appendChild(togglePill);
  header.appendChild(toggleWrap);

  card.appendChild(header);

  // Body (collapsed by default via CSS).
  const body = document.createElement('div');
  body.className = 'schedule-card-body';

  // Dashboard variant row (applies to any run, not just scheduled ones):
  // which Microsoft Rewards dashboard this account uses for the Daily Set.
  const DASHBOARD_VARIANTS = ['auto', 'legacy', 'new'];
  const dashDefault = DASHBOARD_VARIANTS.includes(item.dashboard_variant)
    ? item.dashboard_variant : 'auto';
  body.appendChild(make_select_field('Rewards dashboard', 'schedule-dashboard', dashDefault, [
    { value: 'auto', label: 'Auto (detect)' },
    { value: 'legacy', label: 'Legacy' },
    { value: 'new', label: 'New' },
  ]));

  // Advanced scheduling sub-toggle row.
  const advRow = document.createElement('label');
  advRow.className = 'sched-adv-row';
  const advInput = document.createElement('input');
  advInput.type = 'checkbox';
  advInput.className = 'schedule-advanced';
  advInput.checked = Boolean(sched.advancedScheduling);
  const advPill = document.createElement('span');
  advPill.className = 'toggle-pill';
  const advLabel = document.createElement('span');
  advLabel.className = 'sched-adv-label';
  advLabel.textContent = 'Advanced scheduling (drip-feed across duration)';
  const advWrap = document.createElement('span');
  advWrap.className = 'toggle-compact';
  advWrap.appendChild(advInput);
  advWrap.appendChild(advPill);
  advRow.appendChild(advWrap);
  advRow.appendChild(advLabel);
  body.appendChild(advRow);

  // PC + Mobile row.
  const rowPcMobile = document.createElement('div');
  rowPcMobile.className = 'form-grid-2';
  const pcDefault = sched.queries_pc != null ? sched.queries_pc : 15;
  const mobileDefault = sched.queries_mobile != null ? sched.queries_mobile : 15;
  rowPcMobile.appendChild(make_form_field('PC queries', 'number', 'schedule-queries-pc', pcDefault, { min: 0, max: 130 }));
  rowPcMobile.appendChild(make_form_field('Mobile queries', 'number', 'schedule-queries-mobile', mobileDefault, { min: 0, max: 99 }));
  body.appendChild(rowPcMobile);

  // Daily fire time row — when the OS-level scheduled task triggers for
  // this account. Only effective when the global Start-with-Windows
  // toggle is on AND this account's schedule is enabled.
  const timeDefault = (sched.run_time && /^\d{2}:\d{2}$/.test(sched.run_time)) ? sched.run_time : '09:00';
  body.appendChild(make_form_field('Daily run time', 'time', 'schedule-run-time', timeDefault, {}));

  // Duration + qph row (only meaningful when advancedScheduling is on).
  const rowAdv = document.createElement('div');
  rowAdv.className = 'form-grid-2 sched-adv-fields';
  const durDefault = sched.runDuration != null ? sched.runDuration : 3;
  const qphDefault = sched.queriesPerHour != null ? sched.queriesPerHour : 10;
  rowAdv.appendChild(make_form_field('Run duration (h)', 'number', 'schedule-run-duration', durDefault, { min: 1, max: 24 }));
  rowAdv.appendChild(make_form_field('Queries / hour', 'number', 'schedule-queries-per-hour', qphDefault, { min: 1, max: 99 }));
  if (!advInput.checked) rowAdv.classList.add('dim');
  body.appendChild(rowAdv);

  card.appendChild(body);

  // Accordion expand/collapse on trigger click — one open at a time.
  trigger.addEventListener('click', () => {
    const wasExpanded = card.classList.contains('expanded');
    const container = document.getElementById('schedule_accounts_list');
    if (container) {
      container.querySelectorAll('.schedule-card.expanded').forEach(other => {
        other.classList.remove('expanded');
        const otherTrig = other.querySelector('.schedule-card-trigger');
        if (otherTrig) otherTrig.setAttribute('aria-expanded', 'false');
      });
    }
    if (!wasExpanded) {
      card.classList.add('expanded');
      trigger.setAttribute('aria-expanded', 'true');
      // Bring the freshly-expanded card into view inside its scrollable
      // container so its body fields aren't clipped when there are many
      // accounts. Wait for the max-height transition to start so we know
      // the final layout height.
      setTimeout(() => {
        try {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_) { /* older webview engines */ }
      }, 240);
    }
  });

  // Live summary refresh whenever a field changes.
  const refreshSummary = () => {
    const liveSched = {
      advancedScheduling: advInput.checked,
      queries_pc: parseInt(card.querySelector('.schedule-queries-pc').value, 10),
      queries_mobile: parseInt(card.querySelector('.schedule-queries-mobile').value, 10),
      runDuration: parseInt(card.querySelector('.schedule-run-duration').value, 10),
      queriesPerHour: parseInt(card.querySelector('.schedule-queries-per-hour').value, 10),
      run_time: card.querySelector('.schedule-run-time').value,
    };
    status.textContent = format_schedule_summary(item, liveSched, toggleInput.checked);
  };

  toggleInput.addEventListener('change', () => {
    card.classList.toggle('disabled', !toggleInput.checked);
    refreshSummary();
  });
  advInput.addEventListener('change', () => {
    rowAdv.classList.toggle('dim', !advInput.checked);
    refreshSummary();
  });
  body.querySelectorAll('input[type="number"], input[type="time"]').forEach(f => {
    f.addEventListener('input', refreshSummary);
  });

  return card;
}

function make_select_field(labelText, className, value, options) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.appendChild(label);

  const select = document.createElement('select');
  select.className = className;
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    select.appendChild(o);
  });
  wrap.appendChild(select);

  return wrap;
}

function make_form_field(labelText, inputType, className, value, opts) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';

  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.appendChild(label);

  const input = document.createElement('input');
  input.type = inputType;
  input.className = className;
  input.value = value;
  if (opts) {
    if (opts.min !== undefined) input.min = opts.min;
    if (opts.max !== undefined) input.max = opts.max;
  }
  wrap.appendChild(input);

  return wrap;
}

async function save_settings() {
  const saveBtn = document.getElementById('settingsSave');
  if (saveBtn && saveBtn.disabled) return;
  if (saveBtn) saveBtn.disabled = true;
  try {
  const cards = Array.from(document.querySelectorAll('#schedule_accounts_list .schedule-card'));
  const closeToTrayWanted = document.getElementById('closeToTrayToggle').checked;
  const startupWanted = document.getElementById('startupToggle').checked;
  const openOnLoginWanted = document.getElementById('openOnLoginToggle').checked;

  // Validate + collect payloads per account.
  const payloads = [];
  for (const card of cards) {
    const id = card.dataset.id;
    const enabled = card.querySelector('.schedule-enabled').checked;
    const advancedScheduling = card.querySelector('.schedule-advanced').checked;
    const pc = parseInt(card.querySelector('.schedule-queries-pc').value, 10);
    const mobile = parseInt(card.querySelector('.schedule-queries-mobile').value, 10);
    const runDuration = parseInt(card.querySelector('.schedule-run-duration').value, 10);
    const queriesPerHour = parseInt(card.querySelector('.schedule-queries-per-hour').value, 10);
    const runTime = card.querySelector('.schedule-run-time').value;
    const dashEl = card.querySelector('.schedule-dashboard');
    const dashboardVariant = dashEl && ['auto', 'legacy', 'new'].includes(dashEl.value)
      ? dashEl.value : 'auto';

    if (enabled) {
      if (isNaN(pc) || pc < 0 || pc > 130) {
        show_toast('PC queries must be between 0 and 130.', 'warning');
        return;
      }
      if (isNaN(mobile) || mobile < 0 || mobile > 99) {
        show_toast('Mobile queries must be between 0 and 99.', 'warning');
        return;
      }
      if ((pc || 0) + (mobile || 0) === 0) {
        show_toast('Set at least one of PC or Mobile queries above 0.', 'warning');
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(runTime || '')) {
        show_toast('Daily run time must be a valid HH:MM value.', 'warning');
        return;
      }
      if (advancedScheduling) {
        if (isNaN(runDuration) || runDuration < 1 || runDuration > 24) {
          show_toast('Run duration must be between 1 and 24 hours.', 'warning');
          return;
        }
        if (isNaN(queriesPerHour) || queriesPerHour < 1 || queriesPerHour > 99) {
          show_toast('Queries per hour must be between 1 and 99.', 'warning');
          return;
        }
      }
    }

    payloads.push({
      id: id,
      dashboardVariant: dashboardVariant,
      payload: {
        enabled: enabled,
        advancedScheduling: advancedScheduling,
        queries_pc: isNaN(pc) ? 15 : pc,
        queries_mobile: isNaN(mobile) ? 15 : mobile,
        runDuration: isNaN(runDuration) ? 3 : runDuration,
        queriesPerHour: isNaN(queriesPerHour) ? 10 : queriesPerHour,
        run_time: /^([01]\d|2[0-3]):[0-5]\d$/.test(runTime || '') ? runTime : '09:00',
      },
    });
  }

  try {
    // Persist each account's dashboard choice first (independent of the
    // schedule payload; kept out of the results[] slicing below).
    await Promise.all(payloads.map(p =>
      pywebview.api.set_dashboard_variant(p.id, p.dashboardVariant)
    ));

    // Persist the force toggles (independent of the schedule slicing).
    const forceDailyEl = document.getElementById('forceDailyToggle');
    const forceVisualEl = document.getElementById('forceVisualToggle');
    await pywebview.api.set_force_tasks(
      Boolean(forceDailyEl && forceDailyEl.checked),
      Boolean(forceVisualEl && forceVisualEl.checked)
    );

    const hideEl = document.getElementById('hideBrowserToggle');
    if (hideEl) {
      await pywebview.api.set_hide_browser(Boolean(hideEl.checked));
    }
    const langEl = document.getElementById('uiLanguageSelect');
    if (langEl && pywebview.api.set_ui_language) {
      const r = await pywebview.api.set_ui_language(langEl.value);
      if (r && r.ui_locale) set_ui_lang(r.ui_locale);
    }

    // Persist LLM search-term config (independent of the schedule slicing).
    const llmToggleEl = document.getElementById('llmToggle');
    await pywebview.api.set_llm_config(
      Boolean(llmToggleEl && llmToggleEl.checked),
      document.getElementById('llmProvider').value,
      document.getElementById('llmModel').value,
      document.getElementById('llmApiKey').value,
      document.getElementById('llmLocale').value
    );

    const scheduleCalls = payloads.map(p =>
      pywebview.api.set_schedule(p.id, p.payload)
    );

    const startupInfo = await pywebview.api.get_launch_on_startup();
    let startupCall = Promise.resolve(true);
    if (startupInfo && startupInfo.supported && startupInfo.enabled !== startupWanted) {
      startupCall = pywebview.api.set_launch_on_startup(startupWanted);
    }

    const openOnLoginInfo = await pywebview.api.get_open_on_login();
    let openOnLoginCall = Promise.resolve(true);
    if (
      openOnLoginInfo && openOnLoginInfo.supported
      && openOnLoginInfo.enabled !== openOnLoginWanted
    ) {
      openOnLoginCall = pywebview.api.set_open_on_login(openOnLoginWanted);
    }

    // Close-to-tray: persist unconditionally. The backend reads it at next
    // app launch, so saving each time is cheap and avoids a stale state.
    const closeToTrayCall = pywebview.api.set_close_to_tray(closeToTrayWanted);

    const results = await Promise.all([
      ...scheduleCalls, startupCall, openOnLoginCall, closeToTrayCall,
    ]);
    const startupOk = results[scheduleCalls.length];
    const openOnLoginOk = results[scheduleCalls.length + 1];
    const scheduleResults = results.slice(0, scheduleCalls.length);
    const failures = scheduleResults.filter(ok => !ok).length;

    if (failures > 0) {
      show_toast(`${failures} schedule${failures > 1 ? 's' : ''} failed to save.`, 'error');
      return;
    }
    if (
      (!startupOk && startupInfo && startupInfo.supported)
      || (!openOnLoginOk && openOnLoginInfo && openOnLoginInfo.supported)
    ) {
      show_toast('Schedules saved, but a startup setting failed.', 'warning');
    } else {
      show_toast('Settings saved.', 'success');
    }
    close_settings_modal();
  } catch (err) {
    console.error('save_settings failed:', err);
    const detail = (err && (err.message || err)) ? String(err.message || err) : '';
    show_toast(detail ? ('Save failed: ' + detail) : 'Save failed.', 'error');
  }
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// =========================================================================
// Master UI refresh
// =========================================================================

function refresh_account_ui() {
  if (!window.pywebview || !pywebview.api) return;

  pywebview.api.list_accounts().then(accounts => {
    accountsCache = Array.isArray(accounts) ? accounts : [];
    currentAccountId = null;
    for (const acc of accountsCache) {
      if (acc.is_current) { currentAccountId = acc.id; break; }
    }

    render_account_trigger();
    render_account_menu();

    // Empty state overlay.
    const emptyState = document.getElementById('empty_state');
    if (accountsCache.length === 0) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
    }

    if (!runInProgress) {
      show_run_block_reason();
      const startBtn = document.getElementById('start_btn');
      const label = startBtn && startBtn.querySelector('.btn-label');
      const busy = driverWarmingUp || balanceFetching;
      const reason = start_block_reason();
      if (label && (label.textContent === t('run.start') || label.textContent === t('run.loading') || label.textContent === 'Start run' || label.textContent === 'Loading…')) {
        startBtn.disabled = Boolean(reason);
        label.textContent = busy ? t('run.loading') : t('run.start');
      }
      const tasksBtn = document.getElementById('tasks_only_btn');
      if (tasksBtn && (!label || label.textContent === t('run.start') || label.textContent === t('run.loading') || label.textContent === 'Start run')) {
        tasksBtn.disabled = Boolean(reason);
      }
    }

    update_status_indicator();

    // Stats are per-account — refresh the compact card for the new selection.
    refresh_stats_ui();
    refresh_rewards_overview();
    refresh_phone_ui();

    // Re-render the accounts management modal list if open.
    if (typeof render_accounts_section === 'function') {
      render_accounts_section(accountsCache);
    }
  }).catch(err => {
    console.error('refresh_account_ui failed:', err);
  });
}

// =========================================================================
// Driver warmup loader
// =========================================================================

let loaderInterval;

function start_loader() {
  clearInterval(loaderInterval);

  driverWarmingUp = true;
  const startedAt = Date.now();
  if (!runInProgress) {
    const startBtn = document.getElementById('start_btn');
    if (startBtn) {
      startBtn.disabled = true;
      const label = startBtn.querySelector('.btn-label');
      if (label) label.textContent = t('run.loading');
    }
    const tasksBtn = document.getElementById('tasks_only_btn');
    if (tasksBtn) tasksBtn.disabled = true;
  }

  const tryShowLoader = () => {
    if (Date.now() - startedAt > 60000) {
      stop_loader();
      return;
    }
    pywebview.api.check_driver_status().then(isLoading => {
      if (isLoading === true && !document.getElementById('inline_loader')) {
        const logDiv = document.getElementById('log_area');
        const loader = document.createElement('div');
        loader.id = 'inline_loader';
        loader.className = 'loader-line';
        loader.innerHTML = '<span class="spinner"></span><span>Preparing the browser driver…</span>';
        logDiv.appendChild(loader);
        logDiv.scrollTop = logDiv.scrollHeight;
      }
      if (isLoading === false) stop_loader();
    }).catch(err => {
      console.error('Failed to check driver status:', err);
      stop_loader();
    });
  };

  tryShowLoader();
  loaderInterval = setInterval(tryShowLoader, 500);
}

function stop_loader() {
  clearInterval(loaderInterval);
  driverWarmingUp = false;

  const inline = document.getElementById('inline_loader');
  if (inline) inline.remove();

  if (!runInProgress) enable_start_button();
  update_status_indicator();
}

// =========================================================================
// Boot
// =========================================================================

document.addEventListener('DOMContentLoaded', function() {
  // Hide-browser toggle.
  const toggle = document.getElementById('hideBrowserToggle');
  if (toggle) toggle.addEventListener('change', hideBrowserToggle);

  // Empty-state CTA.
  const cta = document.getElementById('empty_cta');
  if (cta) cta.addEventListener('click', prompt_and_create_account);

  // Account trigger opens the custom dropdown.
  const trigger = document.getElementById('account_trigger');
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle_account_menu();
    });
  }

  // Click outside closes the dropdown.
  document.addEventListener('click', (e) => {
    const picker = document.getElementById('account_picker');
    if (picker && !picker.contains(e.target)) toggle_account_menu(false);
  });

  // Escape closes the dropdown.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle_account_menu(false);
  });

  // Header "manage accounts" button.
  const manageBtn = document.getElementById('manageBtn');
  if (manageBtn) manageBtn.addEventListener('click', open_accounts_modal);

  // Header settings button.
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', open_settings_modal);

  // Settings modal close + save.
  const settingsClose = document.getElementById('settingsModalClose');
  if (settingsClose) settingsClose.addEventListener('click', close_settings_modal);
  const settingsCancel = document.getElementById('settingsCancel');
  if (settingsCancel) settingsCancel.addEventListener('click', close_settings_modal);
  const settingsSave = document.getElementById('settingsSave');
  if (settingsSave) settingsSave.addEventListener('click', save_settings);

  // LLM feature toggle dims/undims its config fields live.
  const llmToggle = document.getElementById('llmToggle');
  if (llmToggle) llmToggle.addEventListener('change', apply_llm_field_state);
  const settingsModal = document.getElementById('settings_modal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) close_settings_modal();
    });
  }
  // Accounts modal close.
  const accountsModalClose = document.getElementById('accountsModalClose');
  if (accountsModalClose) accountsModalClose.addEventListener('click', close_accounts_modal);
  const accountsModal = document.getElementById('accounts_modal');
  if (accountsModal) {
    accountsModal.addEventListener('click', (e) => {
      if (e.target === accountsModal) close_accounts_modal();
    });
  }

  // Generic modal wiring.
  const modalConfirm = document.getElementById('modal_confirm');
  const modalCancel = document.getElementById('modal_cancel');
  const modalInput = document.getElementById('modal_input');
  const modalBackdrop = document.getElementById('app_modal');

  if (modalConfirm) {
    modalConfirm.addEventListener('click', () => {
      const input = document.getElementById('modal_input');
      const value = input.hidden ? true : input.value;
      close_modal(value);
    });
  }
  if (modalCancel) modalCancel.addEventListener('click', () => close_modal(null));
  if (modalInput) {
    modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); modalConfirm.click(); }
      else if (e.key === 'Escape') modalCancel.click();
    });
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) close_modal(null);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.hidden) close_modal(null);
  });
});

window.addEventListener('pywebviewready', function() {
  // Report the OS/browser language so LLM query generation can default to it.
  try {
    if (navigator && navigator.language &&
        typeof pywebview.api.set_detected_locale === 'function') {
      pywebview.api.set_detected_locale(navigator.language);
    }
  } catch (e) {
    console.error('Failed to report locale:', e);
  }

  pywebview.api.get_settings().then(function(settings) {
    const toggle = document.getElementById('hideBrowserToggle');
    if (toggle) toggle.checked = Boolean(settings.hide_browser);
    const ver = document.getElementById('app_version');
    if (ver && settings.app_version) {
      ver.textContent = 'Microsoft Rewards · PC control · ' + settings.app_version;
    }
    const langSel = document.getElementById('uiLanguageSelect');
    if (langSel) {
      langSel.value = settings.ui_language || 'auto';
      langSel.onchange = function () {
        pywebview.api.set_ui_language(langSel.value).then(function (r) {
          const loc = r && r.ui_locale ? r.ui_locale : resolve_lang_from_settings({
            ui_language: langSel.value,
            windows_locale: settings.windows_locale,
            detected_locale: settings.detected_locale,
          });
          set_ui_lang(loc);
        });
      };
    }
    set_ui_lang(resolve_lang_from_settings(settings));
  });

  // Load saved query counts from global settings.
  pywebview.api.get_queries_counts().then(function(counts) {
    const pcField = document.getElementById('count_pc');
    const mobileField = document.getElementById('count_mobile');
    if (pcField) pcField.value = counts.queries_pc;
    if (mobileField) mobileField.value = counts.queries_mobile;
  }).catch(err => {
    console.error('Failed to load query counts:', err);
  });

  refresh_account_ui();
  start_loader();
  setup_activity_context_menu();
  refresh_manual_tasks();
  refresh_phone_ui();
  setInterval(function () {
    const modal = document.getElementById('phone_pair_modal');
    if (modal && !modal.hidden) refresh_phone_ui();
  }, 2000);
  setInterval(refresh_phone_ui, 8000);

  try {
    if (typeof pywebview.api.gui_ready === 'function') {
      pywebview.api.gui_ready().then(function (autorun) {
        if (autorun) set_running_ui(true);
      }).catch(function () {});
    }
  } catch (e) {
    console.error('gui_ready failed:', e);
  }
});

function switch_app_tab(name) {
  const isManual = name === 'manual';
  const run = document.getElementById('panel_run');
  const man = document.getElementById('panel_manual');
  const btnRun = document.getElementById('tab_btn_run');
  const btnMan = document.getElementById('tab_btn_manual');
  if (run) run.hidden = isManual;
  if (man) man.hidden = !isManual;
  if (btnRun) {
    btnRun.classList.toggle('is-active', !isManual);
    btnRun.setAttribute('aria-selected', String(!isManual));
  }
  if (btnMan) {
    btnMan.classList.toggle('is-active', isManual);
    btnMan.setAttribute('aria-selected', String(isManual));
  }
  if (isManual) refresh_manual_tasks();
}

function refresh_manual_tasks() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.get_manual_tasks) return;
  pywebview.api.get_manual_tasks().then(render_manual_tasks).catch(function () {
    show_toast('Could not load For you tasks.', 'error');
  });
}

function render_manual_tasks(data) {
  const list = document.getElementById('manual_task_list');
  const ignoredList = document.getElementById('manual_ignored_list');
  const badge = document.getElementById('manual_badge');
  if (!list) return;
  const tasks = (data && data.tasks) || [];
  const active = tasks.filter(function (t) { return !t.ignored; });
  const ignored = tasks.filter(function (t) { return t.ignored; });
  if (badge) {
    badge.textContent = String(active.length);
    badge.hidden = active.length === 0;
  }
  list.innerHTML = '';
  if (!active.length) {
    const empty = document.createElement('p');
    empty.className = 'manual-empty';
    empty.textContent = 'No open quests yet. Run Tasks only to load them from your Rewards /earn page.';
    list.appendChild(empty);
  }
  active.forEach(function (t) { list.appendChild(_manual_row(t, false)); });
  if (ignoredList) {
    ignoredList.innerHTML = '';
    ignored.forEach(function (t) { ignoredList.appendChild(_manual_row(t, true)); });
    const wrap = document.getElementById('manual_ignored_wrap');
    if (wrap) wrap.hidden = ignored.length === 0;
  }
}

function _manual_row(task, isIgnored) {
  const row = document.createElement('div');
  row.className = 'manual-row' + (isIgnored ? ' is-ignored' : '');
  const body = document.createElement('div');
  body.className = 'manual-row-text';
  const title = document.createElement('div');
  title.className = 'manual-row-title';
  title.textContent = task.title || task.id;
  const detail = document.createElement('div');
  detail.className = 'manual-row-detail';
  detail.textContent = task.detail || '';
  body.appendChild(title);
  body.appendChild(detail);
  const actions = document.createElement('div');
  actions.className = 'manual-row-actions';
  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'btn-secondary';
  openBtn.textContent = 'Open';
  openBtn.onclick = function () {
    if (!window.pywebview || !pywebview.api || !pywebview.api.open_manual_task) {
      show_toast('Could not open this task.', 'error');
      return;
    }
    pywebview.api.open_manual_task(task.id).then(function (res) {
      if (res && res.ok === false) {
        show_toast(res.error || res.message || 'Could not open this task.', 'error');
      }
    }).catch(function () {
      show_toast('Could not open this task.', 'error');
    });
  };
  actions.appendChild(openBtn);
  if (isIgnored) {
    const un = document.createElement('button');
    un.type = 'button';
    un.className = 'ghost-link';
    un.textContent = 'Unignore';
    un.onclick = function () {
      pywebview.api.ignore_manual_task(task.id, false).then(render_manual_tasks).catch(function () {
        show_toast('Could not update this task.', 'error');
      });
    };
    actions.appendChild(un);
  } else {
    const ign = document.createElement('button');
    ign.type = 'button';
    ign.className = 'ghost-link';
    ign.textContent = 'Ignore';
    ign.onclick = function () {
      pywebview.api.ignore_manual_task(task.id, true).then(render_manual_tasks).catch(function () {
        show_toast('Could not ignore this task.', 'error');
      });
    };
    actions.appendChild(ign);
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'ghost-link danger-link';
    rm.textContent = 'Remove';
    rm.onclick = function () {
      pywebview.api.remove_manual_task(task.id).then(render_manual_tasks).catch(function () {
        show_toast('Could not remove this task.', 'error');
      });
    };
    actions.appendChild(rm);
  }
  row.appendChild(body);
  row.appendChild(actions);
  return row;
}

function open_kick() {
  try {
    if (window.pywebview && pywebview.api && typeof pywebview.api.open_link === 'function') {
      pywebview.api.open_link('https://kick.com/iGlitchOff');
    }
  } catch (e) {}
  return false;
}

function copy_activity_log() {
  const logDiv = document.getElementById('log_area');
  const text = logDiv ? (logDiv.innerText || '').trim() : '';
  if (!text) {
    show_toast('Activity log is empty.', 'info');
    return;
  }
  const done = () => show_toast('Activity log copied.', 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
  function fallbackCopy() {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch (err) {
      show_toast('Could not copy the activity log.', 'error');
    }
    ta.remove();
  }
}

function setup_activity_context_menu() {
  const logDiv = document.getElementById('log_area');
  if (!logDiv) return;

  let menu = document.getElementById('activity_ctx_menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'activity_ctx_menu';
    menu.className = 'ctx-menu';
    menu.hidden = true;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy all';
    btn.addEventListener('click', () => {
      menu.hidden = true;
      copy_activity_log();
    });
    menu.appendChild(btn);
    document.body.appendChild(menu);
  }

  const hide = () => { menu.hidden = true; };
  logDiv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.hidden = false;
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 48);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  });
  document.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
}

// =========================================================================
// Linked phone (same Microsoft account, companion APK)
// =========================================================================

let _phoneCache = null;

function refresh_phone_ui() {
  if (!window.pywebview || !pywebview.api || !pywebview.api.get_phone_bridge) return;
  pywebview.api.get_phone_bridge().then(render_phone_device).catch(function () {});
}

function render_phone_device(info) {
  _phoneCache = info || null;
  const wrap = document.getElementById('phone_device_wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const phones = (info && info.phones) || [];
  const membership = (info && info.membership) || 'Microsoft Rewards';
  const region = (info && info.region) || '';
  const ready = info && info.account && info.account.first_setup_done;
  const readyLabel = ready ? 'Ready to run' : 'Setup pending';
  const suffix = region ? ` · ${membership} · ${region} · by phone` : ` · ${membership} · by phone`;

  if (!phones.length) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'phone-row is-empty';
    btn.innerHTML =
      '<span class="avatar" aria-hidden="true">+</span>' +
      '<span class="account-info"><span class="account-name">Link a phone</span>' +
      '<span class="account-meta">Same Microsoft account · companion APK</span></span>';
    btn.addEventListener('click', begin_phone_pairing);
    wrap.appendChild(btn);
  } else {
    phones.forEach(function (phone) {
      const row = document.createElement('div');
      row.className = 'phone-row';
      const avatar = document.createElement('span');
      avatar.className = 'avatar phone-ico';
      avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>';
      const infoEl = document.createElement('span');
      infoEl.className = 'account-info';
      const name = document.createElement('span');
      name.className = 'account-name';
      name.textContent = phone.name || 'Phone';
      const meta = document.createElement('span');
      meta.className = 'account-meta';
      meta.textContent = readyLabel + suffix;
      infoEl.appendChild(name);
      infoEl.appendChild(meta);
      const dot = document.createElement('span');
      dot.className = 'phone-dot' + (phone.online ? ' on' : '');
      dot.title = phone.online ? 'Online' : 'Offline';
      const actions = document.createElement('div');
      actions.className = 'phone-row-actions';
      const ask = document.createElement('button');
      ask.type = 'button';
      ask.className = 'phone-mini';
      ask.textContent = 'Check-in';
      ask.title = 'Ask this phone to open Bing check-in';
      ask.disabled = !phone.online;
      ask.addEventListener('click', function () {
        if (ask.disabled) return;
        ask.disabled = true;
        pywebview.api.send_phone_job('checkin').then(function (r) {
          if (!r || !r.ok) {
            show_toast((r && r.error) || 'Phone offline', 'warning');
            ask.disabled = false;
          } else {
            show_toast('Check-in sent to the phone.', 'success');
            refresh_phone_ui();
          }
        }).catch(function () {
          show_toast('Could not send check-in.', 'error');
          ask.disabled = false;
        });
      });
      const news = document.createElement('button');
      news.type = 'button';
      news.className = 'phone-mini';
      news.textContent = 'News';
      news.disabled = !phone.online;
      news.addEventListener('click', function () {
        if (news.disabled) return;
        news.disabled = true;
        pywebview.api.send_phone_job('news').then(function (r) {
          if (!r || !r.ok) {
            show_toast((r && r.error) || 'Phone offline', 'warning');
            news.disabled = false;
          } else {
            show_toast('Read-to-earn sent to the phone.', 'success');
            refresh_phone_ui();
          }
        }).catch(function () {
          show_toast('Could not send news.', 'error');
          news.disabled = false;
        });
      });
      const unlink = document.createElement('button');
      unlink.type = 'button';
      unlink.className = 'phone-mini';
      unlink.textContent = 'Unlink';
      unlink.addEventListener('click', function () {
        unlink.disabled = true;
        pywebview.api.unlink_phone(phone.id).then(function (info) {
          if (!info || info.phone_unlinked !== true) {
            show_toast('Phone was already unlinked or could not be removed.', 'warning');
            unlink.disabled = false;
            refresh_account_ui();
            return;
          }
          show_toast('Phone unlinked. Microsoft account kept.', 'info');
          refresh_phone_ui();
          // Re-read accounts and Start/Tasks eligibility after the phone-only
          // mutation.  The phone must never determine whether a Microsoft
          // account exists or whether PC work can start.
          refresh_account_ui();
        }).catch(function (err) {
          console.error('unlink_phone failed:', err);
          show_toast('Could not unlink the phone.', 'error');
          unlink.disabled = false;
          refresh_account_ui();
        });
      });
      actions.appendChild(ask);
      actions.appendChild(news);
      actions.appendChild(unlink);
      row.appendChild(avatar);
      row.appendChild(infoEl);
      row.appendChild(dot);
      row.appendChild(actions);
      wrap.appendChild(row);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'phone-mini';
    add.textContent = 'Link another phone';
    add.addEventListener('click', begin_phone_pairing);
    wrap.appendChild(add);
  }

  const modal = document.getElementById('phone_pair_modal');
  if (modal && !modal.hidden) {
    const codeEl = document.getElementById('phone_pair_code');
    const metaEl = document.getElementById('phone_pair_meta');
    if (info && info.pairing && info.code) {
      if (codeEl) {
        codeEl.textContent = info.code;
        codeEl.onclick = copy_pair_code;
      }
      const qr = document.getElementById('phone_pair_qr');
      if (qr) {
        if (info.qr) {
          qr.src = info.qr;
          qr.hidden = false;
        } else {
          qr.hidden = true;
        }
      }
      if (metaEl) {
        metaEl.textContent = info.public_url || info.tunnel === 'error'
          ? t('pair.ready')
          : t('pair.waiting');
      }
    } else if (phones.some(function (p) { return p.online; })) {
      if (metaEl) metaEl.textContent = 'Celular en línea. Si el teléfono ya entró, puedes cerrar.';
    }
  }
}

let phonePairingBusy = false;
function begin_phone_pairing() {
  if (!window.pywebview || !pywebview.api) return;
  if (phonePairingBusy) return;
  phonePairingBusy = true;
  pywebview.api.begin_phone_pairing().then(function (info) {
    if (!info || info.ok === false) {
      const msg = (info && (info.message || info.error)) || 'Could not start pairing.';
      show_toast(msg === 'no_account' ? 'Select a Microsoft account first.' : msg, 'error');
      return;
    }
    const modal = document.getElementById('phone_pair_modal');
    if (modal) modal.hidden = false;
    render_phone_device(info);
  }).catch(function (err) {
    show_toast('Could not start pairing.', 'error');
    console.error(err);
  }).then(function () {
    phonePairingBusy = false;
  });
}

function copy_pair_code() {
  const el = document.getElementById('phone_pair_code');
  const code = el ? String(el.textContent || '').replace(/\D/g, '') : '';
  if (!code || code === '------') {
    show_toast('No pairing code yet.', 'warning');
    return;
  }
  const done = function () { show_toast(t('pair.copied'), 'success'); };
  const fallback = function () {
    try {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch (e) {
      show_toast('Could not copy the code.', 'error');
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done).catch(fallback);
  } else {
    fallback();
  }
}

function cancel_phone_pairing(quiet) {
  const modal = document.getElementById('phone_pair_modal');
  if (modal) modal.hidden = true;
  if (quiet) return;
  if (!window.pywebview || !pywebview.api || !pywebview.api.cancel_phone_pairing) return;
  pywebview.api.cancel_phone_pairing().then(refresh_phone_ui).catch(function () {
    show_toast('Could not cancel pairing.', 'error');
  });
}
