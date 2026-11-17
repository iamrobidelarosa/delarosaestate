/**
 * Household Command Center — Application Controller
 * High-performance ES6 real-time polling engine & Obsidian vault bridge.
 * Author: Turing (@code-expert) | Design: Iris (@ui-designer)
 */

(function () {
  'use strict';

  // --- Configuration ---
  const VAULT_NAME = 'My-Obsidian-Vault';
  const STATUS_ENDPOINT = 'status.json';
  const POLL_INTERVAL_SECONDS = 3;

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

  // --- Application State ---
  let lastRawPayload = null;
  let countdownRemaining = POLL_INTERVAL_SECONDS;
  let isFetching = false;
  let countdownTimer = null;

  // --- Utilities ---

  /**
   * Generates native Obsidian URI from a wikilink string.
   */
  function resolveObsidianUri(wikilink) {
    if (!wikilink) return '#';
    const clean = wikilink.replace(/\[\[|\]\]/g, '').trim();
    return `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(clean)}`;
  }

  /**
   * Extracts clean display text from a wikilink.
   */
  function cleanWikilinkDisplay(wikilink) {
    if (!wikilink) return 'None';
    const clean = wikilink.replace(/\[\[|\]\]/g, '').trim();
    const parts = clean.split('/');
    return parts[parts.length - 1];
  }

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
    const wikilinkTag = document.getElementById('mooji-wikilink-tag');
    const wikilinkText = document.getElementById('mooji-wikilink-text');
    const obsidianAction = document.getElementById('mooji-obsidian-action');
    const badgeEl = document.getElementById('mooji-badge');
    const statusTextEl = document.getElementById('mooji-status-text');

    if (nameEl) nameEl.textContent = mooji.name || 'Mooji';
    if (taskEl) taskEl.textContent = mooji.last_task || 'Supervising household operations.';
    if (updatedEl) {
      updatedEl.textContent = `Updated ${formatRelativeTime(mooji.timestamp)}`;
      updatedEl.title = mooji.timestamp || '';
    }

    const uri = resolveObsidianUri(mooji.last_note);
    if (wikilinkTag) wikilinkTag.href = uri;
    if (wikilinkText) wikilinkText.textContent = cleanWikilinkDisplay(mooji.last_note);
    if (obsidianAction) obsidianAction.href = uri;

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
      const lastNote = data.last_note || '[[AGENTS]]';
      const timestamp = data.timestamp || '';
      const obsidianUri = resolveObsidianUri(lastNote);
      const cleanNoteName = cleanWikilinkDisplay(lastNote);
      const relativeTime = formatRelativeTime(timestamp);

      return `
        <article class="worker-card group" data-worker="${worker.key}">
          <!-- Top Row: Avatar, Identity, Status -->
          <div>
            <div class="flex items-start justify-between gap-3 mb-2.5">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform duration-200">
                  ${worker.icon}
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                    ${name}
                  </h4>
                  <p class="text-[11px] text-slate-400 font-medium leading-tight line-clamp-1">
                    ${role}
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
                ${worker.domain}
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

          <!-- Bottom Row: Obsidian Wikilink & Relative Time -->
          <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
            <div class="flex items-center space-x-1.5 min-w-0">
              <a href="${obsidianUri}" class="wikilink-chip" title="Open note [[${cleanNoteName}]] in Obsidian">
                <span class="text-indigo-400 text-[10px]">[[</span>
                <span class="truncate">${cleanNoteName}</span>
                <span class="text-indigo-400 text-[10px]">]]</span>
              </a>
              <a href="${obsidianUri}" class="obsidian-link-btn" title="Open in Obsidian Vault" aria-label="Open in Obsidian">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
            <span class="text-[10px] font-mono text-slate-500 flex-shrink-0" title="${timestamp}">
              ${relativeTime}
            </span>
          </div>
        </article>
      `;
    }).join('');

    const staffTotalEl = document.getElementById('staff-total-badge');
    if (staffTotalEl) staffTotalEl.textContent = `${WORKER_ROSTER.length} Staff`;
    gridEl.innerHTML = cardsHtml;
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
      }
    }, 1000);
  }

  // --- Initialization ---
  function init() {
    updateLiveClock();
    setInterval(updateLiveClock, 1000);

    const syncBtn = document.getElementById('btn-manual-sync');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        countdownRemaining = POLL_INTERVAL_SECONDS;
        fetchStatus(true);
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
    startCountdownTimer();
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
