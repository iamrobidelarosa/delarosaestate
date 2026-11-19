/**
 * Household Command Center — Application Controller
 * Real-time household polling and specialist room navigation.
 * Author: Turing (@code-expert) | Design: Iris (@ui-designer)
 */

(function () {
  'use strict';

  // --- Configuration ---
  const STATUS_ENDPOINT = 'status.json';
  const POLL_INTERVAL_SECONDS = 3;
  const DISMISSED_NOTIFICATIONS_KEY = 'estate-dashboard-dismissed-notifications';

  // --- Worker Roster Metadata (Fixed domain mapping & avatar icons) ---
  const WORKER_ROSTER = [
    {
      key: 'cook',
      defaultName: 'Remy',
      defaultRole: 'Personal Cook & Kitchen Manager',
      domain: '01-Kitchen-and-Nutrition/',
      icon: '🍳',
      accent: 'amber'
    },
    {
      key: 'nutritionist',
      defaultName: 'Sage',
      defaultRole: 'Nutritionist & Macro Specialist',
      domain: '01-Kitchen-and-Nutrition/',
      icon: '🥗',
      accent: 'emerald'
    },
    {
      key: 'gym-instructor',
      defaultName: 'Atlas',
      defaultRole: 'Personal Gym Instructor & Strength Coach',
      domain: '02-Fitness/',
      icon: '🏋️',
      accent: 'red'
    },
    {
      key: 'financial-advisor',
      defaultName: 'Sterling',
      defaultRole: 'Financial Advisor & Wealth Strategist',
      domain: '03-Finance/',
      icon: '📈',
      accent: 'indigo'
    },
    {
      key: 'code-expert',
      defaultName: 'Turing',
      defaultRole: 'Code Expert & Lead Programmer',
      domain: '04-Dev-and-Design/',
      icon: '💻',
      accent: 'blue'
    },
    {
      key: 'ui-designer',
      defaultName: 'Iris',
      defaultRole: 'UI/UX Designer & Visual Architect',
      domain: '04-Dev-and-Design/',
      icon: '🎨',
      accent: 'purple'
    },
    {
      key: 'system-administrator',
      defaultName: 'Argus',
      defaultRole: 'System Administrator & Operations Lead',
      domain: '04-Dev-and-Design/',
      icon: '🛡️',
      accent: 'cyan'
    },
    {
      key: 'database-administrator',
      defaultName: 'Dexter',
      defaultRole: 'Database Administrator & Data Architect',
      domain: '04-Dev-and-Design/',
      icon: '🗄️',
      accent: 'indigo'
    },
    {
      key: 'network-administrator',
      defaultName: 'Nexus',
      defaultRole: 'Network Administrator & Connectivity Engineer',
      domain: '04-Dev-and-Design/',
      icon: '🌐',
      accent: 'sky'
    },
    {
      key: 'composer',
      defaultName: 'Lyra',
      defaultRole: 'Composer & Lyricist',
      domain: '05-Music-Studio/',
      icon: '🎵',
      accent: 'pink'
    },
    {
      key: 'video-creator',
      defaultName: 'Vega',
      defaultRole: 'Video Creation Specialist',
      domain: '05-Music-Studio/',
      icon: '🎬',
      accent: 'purple'
    },
    {
      key: 'comic-creator',
      defaultName: 'Panel',
      defaultRole: 'Comic & Manhua Creator',
      domain: '04-Dev-and-Design/',
      icon: '📚',
      accent: 'rose'
    },
    {
      key: 'spiritual-advisor',
      defaultName: 'Bodhi',
      defaultRole: 'Spiritual Advisor & Mindfulness Guide',
      domain: '06-Spiritual-Journal/',
      icon: '🧘',
      accent: 'teal'
    },
    {
      key: 'email-manager',
      defaultName: 'Hermes',
      defaultRole: 'Executive Mail Secretary & Inbox Manager',
      domain: '07-Inbox-and-Mail/',
      icon: '📬',
      accent: 'amber'
    },
    {
      key: 'travel-buddy',
      defaultName: 'Marco',
      defaultRole: 'Personal Travel Buddy & Culinary Navigator',
      domain: '08-Travel-and-Exploration/',
      icon: '🧭',
      accent: 'emerald'
    },
    {
      key: 'domino-administrator',
      defaultName: 'Dorian',
      defaultRole: 'HCL Domino and Notes Administrator',
      domain: '04-Dev-and-Design/',
      icon: '🗄️',
      accent: 'cyan'
    },
    {
      key: 'knowledge-article-author',
      defaultName: 'Quill',
      defaultRole: 'Knowledge Article Author',
      domain: '04-Dev-and-Design/',
      icon: '✍️',
      accent: 'blue'
    },
    {
      key: 'knowledge-article-reviewer',
      defaultName: 'Verity',
      defaultRole: 'Knowledge Article Reviewer',
      domain: '04-Dev-and-Design/',
      icon: '🔍',
      accent: 'purple'
    },
    {
      key: 'knowledge-article-publisher',
      defaultName: 'Scribe',
      defaultRole: 'Knowledge Article Publisher',
      domain: '04-Dev-and-Design/',
      icon: '📚',
      accent: 'pink'
    }
  ];

  const SPECIALIST_ROOMS = {
    'financial-advisor': { href: 'sterling.html', label: 'Finance room' },
    'composer': { href: 'lyra.html', label: 'Music room' },
    'video-creator': { href: 'lyra.html', label: 'Music & Video' },
    'comic-creator': { href: 'comic-creator.html', label: 'Comic studio' },
    'knowledge-article-author': { href: 'knowledge-team.html', label: 'Team room' },
    'knowledge-article-reviewer': { href: 'knowledge-team.html', label: 'Team room' },
    'knowledge-article-publisher': { href: 'knowledge-team.html', label: 'Team room' }
  };

  // --- Application State ---
  let lastRawPayload = null;
  let lastNotificationPayload = null;
  let lastNotificationData = null;
  let dismissedNotificationState = { date: '', ids: [] };
  let countdownRemaining = POLL_INTERVAL_SECONDS;
  let isFetching = false;
  let isFetchingNotifications = false;
  let countdownTimer = null;

  // --- Utilities ---

  /**
   * Computes human-friendly relative time (e.g., "just now", "2m ago").
   */
  function formatRelativeTime(isoString) {
    if (!isoString) return 'Unknown';
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffSecs = Math.max(0, Math.floor((now - past) / 1000));

      if (diffSecs < 10) return 'Just now';
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return isoString;
    }
  }

  /**
   * Updates the digital header clock and calendar date.
   */
  function updateLiveClock() {
    const clockEl = document.getElementById('live-clock');
    const dateEl = document.getElementById('live-date');
    if (!clockEl || !dateEl) return;

    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Generates badge HTML for active, waiting, and idle states.
   */
  function renderStatusBadge(status) {
    const s = (status || 'idle').toLowerCase();
    if (s === 'active') {
      return `
        <span class="status-badge active">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ACTIVE</span>
        </span>`;
    } else if (s === 'waiting') {
      return `
        <span class="status-badge waiting">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>WAITING</span>
        </span>`;
    } else {
      return `
        <span class="status-badge idle">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          <span>IDLE</span>
        </span>`;
    }
  }

  // --- DOM Rendering & Updating (Zero Flicker) ---

  /**
   * Updates the status counters in the header.
   */
  function updateCounters(agents) {
    let active = 0, waiting = 0, idle = 0;
    Object.values(agents).forEach(agent => {
      const s = (agent.status || 'idle').toLowerCase();
      if (s === 'active') active++;
      else if (s === 'waiting') waiting++;
      else idle++;
    });

    const activeEl = document.getElementById('count-active');
    const waitingEl = document.getElementById('count-waiting');
    const idleEl = document.getElementById('count-idle');

    if (activeEl) activeEl.textContent = active;
    if (waitingEl) waitingEl.textContent = waiting;
    if (idleEl) idleEl.textContent = idle;
  }

  /**
   * Updates Mooji Hero Card.
   */
  function updateMoojiDeck(mooji) {
    if (!mooji) return;

    const nameEl = document.getElementById('mooji-name');
    const taskEl = document.getElementById('mooji-task');
    const updatedEl = document.getElementById('mooji-updated-time');
    const badgeEl = document.getElementById('mooji-badge');
    const statusTextEl = document.getElementById('mooji-status-text');

    if (nameEl) nameEl.textContent = mooji.name || 'Mooji';
    if (taskEl) taskEl.textContent = mooji.last_task || 'Supervising household operations.';
    if (updatedEl) {
      updatedEl.textContent = `Updated ${formatRelativeTime(mooji.timestamp)}`;
      updatedEl.title = mooji.timestamp || '';
    }

    const s = (mooji.status || 'idle').toLowerCase();
    if (badgeEl && statusTextEl) {
      badgeEl.className = `px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider uppercase rounded-full flex items-center space-x-1.5 ${
        s === 'active'
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : s === 'waiting'
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-slate-700/20 text-slate-400 border border-slate-600/30'
      }`;
      statusTextEl.textContent = s.toUpperCase();
    }
  }

  /**
   * Renders the specialist workers grid.
   */
  function renderWorkersGrid(agents) {
    const gridEl = document.getElementById('workers-grid');
    if (!gridEl) return;

    const cardsHtml = WORKER_ROSTER.map(worker => {
      const data = agents[worker.key] || {};
      const name = data.name || worker.defaultName;
      const role = data.role || worker.defaultRole;
      const status = data.status || 'idle';
      const lastTask = data.last_task || 'Awaiting task allocation.';
      const timestamp = data.timestamp || '';
      const relativeTime = formatRelativeTime(timestamp);
      const searchableText = [name, role, status, lastTask, worker.domain].join(' ');
      const room = SPECIALIST_ROOMS[worker.key];
      const specialistAction = room
        ? `<a href="${room.href}" class="dashboard-action-button" aria-label="Open ${escapeHtml(name)} room">${escapeHtml(room.label)}</a>`
        : '';

      return `
        <article class="worker-card group" data-worker="${worker.key}" data-status="${escapeHtml(String(status).toLowerCase())}" data-search="${escapeHtml(searchableText.toLowerCase())}">
          <!-- Top Row: Avatar, Identity, Status -->
          <div>
            <div class="flex items-start justify-between gap-3 mb-2.5">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform duration-200">
                  ${worker.icon}
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                    ${escapeHtml(name)}
                  </h4>
                  <p class="text-[11px] text-slate-400 font-medium leading-tight line-clamp-1">
                    ${escapeHtml(role)}
                  </p>
                </div>
              </div>
              <div>
                ${renderStatusBadge(status)}
              </div>
            </div>

            <!-- Domain Pill -->
            <div class="mb-3">
              <span class="domain-pill" title="Obsidian Domain Workspace">
                ${escapeHtml(worker.domain)}
              </span>
            </div>

            <!-- Last / Current Task Box -->
            <div class="bg-slate-950/50 border border-white/5 rounded-lg p-2.5 mb-3.5">
              <div class="text-[9px] font-mono uppercase tracking-wider text-slate-500 mb-1">Last Task</div>
              <p class="task-box text-slate-300" title="${escapeHtml(lastTask)}">
                ${escapeHtml(lastTask)}
              </p>
            </div>
          </div>

          <!-- Bottom Row: Specialist Action & Relative Time -->
          <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
            ${specialistAction}
            <span class="text-[10px] font-mono text-slate-500 flex-shrink-0" title="${escapeHtml(timestamp)}">
              ${relativeTime}
            </span>
          </div>
        </article>
      `;
    }).join('');

    const staffTotalEl = document.getElementById('staff-total-badge');
    if (staffTotalEl) staffTotalEl.textContent = `${WORKER_ROSTER.length} Staff`;
    gridEl.innerHTML = cardsHtml;
    applyWorkerFilters();
  }

  /**
   * Escapes HTML entities to prevent any injection.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function applyWorkerFilters() {
    const searchEl = document.getElementById('worker-search');
    const statusEl = document.getElementById('worker-status-filter');
    const summaryEl = document.getElementById('worker-results-summary');
    const emptyEl = document.getElementById('workers-empty-state');
    const cards = Array.from(document.querySelectorAll('.worker-card'));
    const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const statusFilter = statusEl ? statusEl.value : 'all';
    let visibleCount = 0;

    cards.forEach(card => {
      const matchesSearch = (card.getAttribute('data-search') || '').includes(query);
      const matchesStatus = statusFilter === 'all' || card.getAttribute('data-status') === statusFilter;
      card.hidden = !matchesSearch || !matchesStatus;
      if (!card.hidden) visibleCount++;
    });

    if (summaryEl) {
      summaryEl.textContent = cards.length
        ? `Showing ${visibleCount} of ${cards.length} specialists.`
        : 'No specialists loaded.';
    }
    if (emptyEl) emptyEl.hidden = visibleCount !== 0 || cards.length === 0;
  }

  function setNotificationStorageWarning(message) {
    const warningEl = document.getElementById('daily-notifications-storage-warning');
    if (!warningEl) return;
    warningEl.textContent = message;
    warningEl.hidden = !message;
  }

  function loadDismissedNotifications() {
    try {
      const saved = window.localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.date === 'string' && Array.isArray(parsed.ids) &&
          parsed.ids.every(id => typeof id === 'string')) {
        dismissedNotificationState = {
          date: parsed.date,
          ids: Array.from(new Set(parsed.ids))
        };
        return;
      }

      throw new Error('Saved dismissal data has an invalid format.');
    } catch (error) {
      console.warn('Could not load cleared notification previews:', error.message);
      setNotificationStorageWarning('Your browser could not restore saved preview settings. You can still clear previews for this visit.');
    }
  }

  function saveDismissedNotifications() {
    try {
      window.localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissedNotificationState));
      setNotificationStorageWarning('');
    } catch (error) {
      console.warn('Could not save cleared notification previews:', error.message);
      setNotificationStorageWarning('Your browser could not save this change. Cleared previews may return after you leave or refresh the dashboard.');
    }
  }

  function renderNotificationDetails(notification) {
    if (notification.kind === 'daily-bread') {
      return `
        <blockquote class="notification-verse">
          <p>“${escapeHtml(notification.verse)}”</p>
          <cite>${escapeHtml(notification.reference)} · ${escapeHtml(notification.translation)}</cite>
        </blockquote>
        <div class="notification-detail-block">
          <h4>Today’s reflection</h4>
          <p>${escapeHtml(notification.homily)}</p>
        </div>`;
    }

    if (notification.kind === 'daily-food') {
      if (!Array.isArray(notification.meals)) {
        throw new Error(`Food notification "${notification.id}" is missing its meals.`);
      }

      return `
        <div class="notification-meal-list">
          ${notification.meals.map(meal => `
            <div class="notification-meal">
              <span>${escapeHtml(meal.label)}</span>
              <p>${escapeHtml(meal.text)}</p>
            </div>`).join('')}
        </div>
        <p class="notification-note">${escapeHtml(notification.note)}</p>`;
    }

    if (notification.kind === 'daily-exercise') {
      if (!Array.isArray(notification.routine)) {
        throw new Error(`Exercise notification "${notification.id}" is missing its routine.`);
      }

      return `
        <div class="notification-duration"><span>Duration</span><strong>${escapeHtml(notification.duration)}</strong></div>
        <div class="notification-detail-block">
          <h4>Warm-up</h4>
          <p>${escapeHtml(notification.warmup)}</p>
        </div>
        <div class="notification-detail-block">
          <h4>Routine</h4>
          <ol>${notification.routine.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
        </div>
        <div class="notification-detail-block">
          <h4>Cool-down</h4>
          <p>${escapeHtml(notification.cooldown)}</p>
        </div>
        <p class="notification-note">${escapeHtml(notification.note)}</p>`;
    }

    throw new Error(`Unsupported daily notification type: ${notification.kind || 'unknown'}`);
  }

  function renderNotificationCard(notification) {
    const status = (notification.status || 'ready').toLowerCase();
    return `
      <article class="daily-notification-card notification-${escapeHtml(notification.kind)}" data-notification-id="${escapeHtml(notification.id)}">
        <div class="notification-card-heading">
          <div class="notification-agent">
            <span class="notification-agent-icon">${escapeHtml(notification.icon)}</span>
            <div>
              <p>${escapeHtml(notification.source)} <span>· ${escapeHtml(notification.role)}</span></p>
              <span class="notification-category">${escapeHtml(notification.kind.replace('daily-', '').replace('-', ' '))}</span>
            </div>
          </div>
          <div class="notification-card-actions">
            <span class="notification-state ${status === 'ready' ? 'ready' : ''}">${escapeHtml(status)}</span>
            <button type="button" class="notification-dismiss-button" data-dismiss-notification="${escapeHtml(notification.id)}" aria-label="Clear ${escapeHtml(notification.title)} preview" title="Clear this preview">×</button>
          </div>
        </div>
        <h3>${escapeHtml(notification.title)}</h3>
        <p class="notification-summary">${escapeHtml(notification.summary)}</p>
        ${renderNotificationDetails(notification)}
      </article>`;
  }

  function renderDailyNotifications(data) {
    if (!data || !Array.isArray(data.notifications)) {
      throw new Error('The daily notification feed must contain a notifications list.');
    }
    if (data.notifications.some(notification => !notification || typeof notification.id !== 'string' || !notification.id.trim())) {
      throw new Error('Every daily notification must have a non-empty ID.');
    }

    const dateEl = document.getElementById('daily-notifications-date');
    const countEl = document.getElementById('daily-notifications-count');
    const updatedEl = document.getElementById('daily-notifications-updated');
    const gridEl = document.getElementById('daily-notifications-grid');
    const errorEl = document.getElementById('daily-notifications-error');
    if (!gridEl) return;

    const currentDate = data.date || 'Daily briefing';
    if (dismissedNotificationState.date !== currentDate) {
      dismissedNotificationState = { date: currentDate, ids: [] };
    }

    const dismissedIds = new Set(dismissedNotificationState.ids);
    const visibleNotifications = data.notifications.filter(notification => !dismissedIds.has(notification.id));
    const hiddenCount = data.notifications.length - visibleNotifications.length;
    const clearButton = document.getElementById('btn-clear-notifications');
    const restoreButton = document.getElementById('btn-restore-notifications');

    if (dateEl) dateEl.textContent = currentDate;
    if (countEl) {
      countEl.textContent = hiddenCount
        ? `${visibleNotifications.length} visible · ${hiddenCount} cleared`
        : `${visibleNotifications.length} ${visibleNotifications.length === 1 ? 'update' : 'updates'} ready`;
    }
    if (updatedEl) updatedEl.textContent = data.updated_at ? `Updated ${formatRelativeTime(data.updated_at)}` : '';
    if (clearButton) clearButton.disabled = visibleNotifications.length === 0;
    if (restoreButton) restoreButton.hidden = hiddenCount === 0;
    gridEl.innerHTML = visibleNotifications.length
      ? visibleNotifications.map(renderNotificationCard).join('')
      : data.notifications.length
        ? '<p class="notification-loading">All previews are cleared. Use Restore previews to show them again.</p>'
        : '<p class="notification-loading">No daily notifications are available yet.</p>';
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
  }

  function dismissDailyNotification(notificationId) {
    if (!lastNotificationData) return;

    const currentDate = lastNotificationData.date || 'Daily briefing';
    if (dismissedNotificationState.date !== currentDate) {
      dismissedNotificationState = { date: currentDate, ids: [] };
    }

    const currentIds = lastNotificationData.notifications.map(notification => notification.id);
    const dismissedIds = new Set(dismissedNotificationState.ids);
    const idsToDismiss = notificationId
      ? currentIds.filter(id => id === notificationId)
      : currentIds.filter(id => !dismissedIds.has(id));
    if (!idsToDismiss.length) return;

    idsToDismiss.forEach(id => dismissedIds.add(id));
    dismissedNotificationState.ids = Array.from(dismissedIds);
    saveDismissedNotifications();
    renderDailyNotifications(lastNotificationData);

    const statusEl = document.getElementById('daily-notifications-clear-status');
    if (statusEl) {
      statusEl.textContent = notificationId
        ? 'Preview cleared. Use Restore previews to bring it back.'
        : `${idsToDismiss.length} previews cleared. The source feed was not changed.`;
    }
  }

  function restoreDailyNotifications() {
    if (!lastNotificationData || !dismissedNotificationState.ids.length) return;

    dismissedNotificationState = {
      date: lastNotificationData.date || 'Daily briefing',
      ids: []
    };
    saveDismissedNotifications();
    renderDailyNotifications(lastNotificationData);

    const statusEl = document.getElementById('daily-notifications-clear-status');
    if (statusEl) statusEl.textContent = 'Daily previews restored.';
  }

  async function fetchDailyNotifications() {
    if (isFetchingNotifications) return;
    isFetchingNotifications = true;

    const errorEl = document.getElementById('daily-notifications-error');
    try {
      const response = await fetch(`daily-notifications.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (text !== lastNotificationPayload) {
        const data = JSON.parse(text);
        lastNotificationData = data;
        renderDailyNotifications(data);
        lastNotificationPayload = text;
      }
    } catch (err) {
      console.warn('Daily notification poll warning:', err.message);
      if (errorEl) {
        errorEl.textContent = `Daily previews could not be loaded: ${err.message}`;
        errorEl.hidden = false;
      }
    } finally {
      isFetchingNotifications = false;
    }
  }

  // --- Core Polling Engine ---

  async function fetchStatus(isManual = false) {
    if (isFetching) return;
    isFetching = true;

    const syncIcon = document.getElementById('sync-icon');
    const connectionPill = document.getElementById('connection-pill');

    if (isManual && syncIcon) {
      syncIcon.classList.add('spin-active');
      setTimeout(() => syncIcon.classList.remove('spin-active'), 800);
    }

    try {
      const response = await fetch(`${STATUS_ENDPOINT}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();

      // Only perform heavy DOM rerender if payload has actually changed
      if (text !== lastRawPayload) {
        lastRawPayload = text;
        const data = JSON.parse(text);
        const agents = data.agents || {};

        // Update counters
        updateCounters(agents);

        // Update Mooji
        updateMoojiDeck(agents.mooji);

        // Render Specialists
        renderWorkersGrid(agents);

        // Synchronize 3D Living Estate Canvas
        if (window.Estate3D && typeof window.Estate3D.updateAgents === 'function') {
          window.Estate3D.updateAgents(agents);
        }
      } else {
        // Fast path: Just refresh relative times without touching DOM structure
        if (lastRawPayload) {
          const data = JSON.parse(lastRawPayload);
          const agents = data.agents || {};
          if (agents.mooji) {
            const updatedEl = document.getElementById('mooji-updated-time');
            if (updatedEl) {
              updatedEl.textContent = `Updated ${formatRelativeTime(agents.mooji.timestamp)}`;
            }
          }
          document.querySelectorAll('.worker-card').forEach(card => {
            const key = card.getAttribute('data-worker');
            const agent = agents[key];
            if (agent && agent.timestamp) {
              const timeSpan = card.querySelector('span[title]');
              if (timeSpan) {
                timeSpan.textContent = formatRelativeTime(agent.timestamp);
              }
            }
          });
        }
      }

      // Connection healthy
      if (connectionPill) {
        connectionPill.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Online</span>
        `;
        connectionPill.className = 'inline-flex items-center space-x-1.5 text-emerald-400';
      }
    } catch (err) {
      console.warn('Status poll warning:', err.message);
      if (connectionPill) {
        connectionPill.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Retrying...</span>
        `;
        connectionPill.className = 'inline-flex items-center space-x-1.5 text-amber-400';
      }
    } finally {
      isFetching = false;
      countdownRemaining = POLL_INTERVAL_SECONDS;
      updateCountdownDisplay();
    }
  }

  function updateCountdownDisplay() {
    const el = document.getElementById('sync-seconds');
    if (el) el.textContent = countdownRemaining;
  }

  function startCountdownTimer() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdownRemaining = Math.max(0, countdownRemaining - 1);
      updateCountdownDisplay();
      if (countdownRemaining === 0) {
        fetchStatus(false);
        fetchDailyNotifications();
      }
    }, 1000);
  }

  // --- Initialization ---
  function init() {
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
    loadDismissedNotifications();

    const syncBtn = document.getElementById('btn-manual-sync');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        countdownRemaining = POLL_INTERVAL_SECONDS;
        fetchStatus(true);
        fetchDailyNotifications();
      });
    }

    const clearNotificationsBtn = document.getElementById('btn-clear-notifications');
    if (clearNotificationsBtn) {
      clearNotificationsBtn.addEventListener('click', () => dismissDailyNotification(null));
    }

    const restoreNotificationsBtn = document.getElementById('btn-restore-notifications');
    if (restoreNotificationsBtn) {
      restoreNotificationsBtn.addEventListener('click', restoreDailyNotifications);
    }

    const notificationsGrid = document.getElementById('daily-notifications-grid');
    if (notificationsGrid) {
      notificationsGrid.addEventListener('click', event => {
        const dismissButton = event.target.closest('[data-dismiss-notification]');
        if (dismissButton) {
          dismissDailyNotification(dismissButton.getAttribute('data-dismiss-notification'));
        }
      });
    }

    const workerSearch = document.getElementById('worker-search');
    if (workerSearch) workerSearch.addEventListener('input', applyWorkerFilters);

    const workerStatusFilter = document.getElementById('worker-status-filter');
    if (workerStatusFilter) workerStatusFilter.addEventListener('change', applyWorkerFilters);

    const resetWorkerFiltersBtn = document.getElementById('btn-reset-worker-filters');
    if (resetWorkerFiltersBtn) {
      resetWorkerFiltersBtn.addEventListener('click', () => {
        if (workerSearch) workerSearch.value = '';
        if (workerStatusFilter) workerStatusFilter.value = 'all';
        applyWorkerFilters();
        if (workerSearch) workerSearch.focus();
      });
    }

    // Connect Specialist Cards to 3D Camera Focus
    const workersGrid = document.getElementById('workers-grid');
    if (workersGrid) {
      workersGrid.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // Ignore link clicks
        const card = e.target.closest('.worker-card');
        if (card && window.Estate3D && typeof window.Estate3D.focusWorker === 'function') {
          const key = card.getAttribute('data-worker');
          window.Estate3D.focusWorker(key);
        }
      });
    }

    // Initial fetch
    fetchStatus(false);
    fetchDailyNotifications();
    startCountdownTimer();
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
