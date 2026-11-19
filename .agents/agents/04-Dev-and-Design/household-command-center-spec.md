# Household Command Center — UI/UX Specification & Architecture

**Document ID:** `04-DEV-UI-CMD-001`  
**Designer:** Iris (`@ui-designer`)  
**Status:** Approved for Implementation by `@code-expert` (Turing)  
**Target Directory:** `00-Butler-Dashboard/`  
**Data Source:** `00-Butler-Dashboard/status.json`  
**Related Notes:** [[AGENTS]], [[00-Butler-Dashboard/status.json]]

---

## 1. Executive Summary & Vision

The **Household Command Center** is a high-density, mission-control web dashboard providing real-time visibility into the activities of Mooji (Main Butler & Chief of Staff) and the 8 household specialist workers. It combines the sleek aesthetic of modern developer platforms (Vercel/Linear) with executive luxury command displays (dark obsidian glassmorphism, pulsing status beacons, micro-interactions, and live time synchronization).

### Core Objectives
1. **Single Pane of Glass:** Immediate situational awareness of who is working (`active`), who is available (`idle`), and who is blocked or awaiting input (`waiting`).
2. **Coordinator Focus:** Elevate Mooji as the central nervous system coordinating the estate.
3. **Deep Link Integration:** Instant one-click obsidian vault navigation via Obsidian URIs (`obsidian://open?vault=...`) alongside clean visual `[[wikilink]]` chips.
4. **Resilient Auto-Sync:** Zero-flicker background polling with a visual refresh countdown gauge.

---

## 2. Information Architecture & Layout Wireframe

### 2.1 Screen Composition
The layout adopts a single-viewport responsive desktop dashboard (fluid down to tablet and mobile):
1. **Estate Master Header (Top Bar):** Brand crest, real-time clock, status counters (Active/Idle/Waiting), and sync countdown badge.
2. **Coordinator Tier (Hero Banner):** Mooji's Command Deck with master control indicators, current task, and system coordination telemetry.
3. **Specialist Workers Matrix (Grid 4x2 on Desktop, 2x4 on Tablet, 1x8 on Mobile):** The 8 specialist workers categorized by operational domain.
4. **Global Footer:** Vault path info, status.json health monitor, and manual refresh controls.

### 2.2 Wireframe (ASCII Diagram)

```text
+---------------------------------------------------------------------------------------------------------+
| [CREST] DELA ROSA RESIDENCE & COMMAND          [● 2 Active | ○ 6 Idle | ◐ 1 Waiting]    12:45:08 PM EDT |
| Live System Telemetry                          Next Sync: 3s [↻ Sync]                 Mon, Nov 16, 2026 |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  +===================================================================================================+  |
|  | [★ MOOJI] MAIN BUTLER & CHIEF OF STAFF                                  [ STATUS: ACTIVE (PULSING)]|  |
|  | "Coordinating household operations and specialist dispatch"                                       |  |
|  | Current Task: Commissioned Iris for Command Center UI spec & coordinating handoff to Turing        |  |
|  | Last Note: [[AGENTS]]  (obsidian://open)              | Updated: 2026-11-16 07:26:20 (2m ago)     |  |
|  +===================================================================================================+  |
|                                                                                                         |
|  SPECIALIST WORKERS (8)                                                                                  |
|  +------------------------------+  +------------------------------+  +------------------------------+   |
|  | [🍳 REMY] Personal Cook      |  | [🥗 SAGE] Nutritionist       |  | [🏋️ ATLAS] Gym Coach        |   |
|  | Domain: Kitchen & Nutrition   |  | Domain: Kitchen & Nutrition   |  | Domain: Fitness              |   |
|  | Badge: [ IDLE ]              |  | Badge: [ IDLE ]              |  | Badge: [ IDLE ]              |   |
|  | Last Task: Initialized roster|  | Last Task: Initialized roster|  | Last Task: Initialized roster|   |
|  | Note: [[AGENTS]]             |  | Note: [[AGENTS]]             |  | Note: [[AGENTS]]             |   |
|  | Updated: 5m ago              |  | Updated: 5m ago              |  | Updated: 5m ago              |   |
|  +------------------------------+  +------------------------------+  +------------------------------+   |
|  +------------------------------+  +------------------------------+  +------------------------------+   |
|  | [📈 STERLING] Finance        |  | [💻 TURING] Code Expert      |  | [🎨 IRIS] UI/UX Designer     |   |
|  | Domain: Wealth & Strategy    |  | Domain: Dev & Design         |  | Domain: Dev & Design         |   |
|  | Badge: [ IDLE ]              |  | Badge: [ WAITING (AMBER) ]   |  | Badge: [ ACTIVE (EMERALD) ]  |   |
|  | Last Task: Initialized roster|  | Last Task: Standing by spec  |  | Last Task: Drafting UI Spec  |   |
|  | Note: [[AGENTS]]             |  | Note: [[AGENTS]]             |  | Note: [[AGENTS]]             |   |
|  | Updated: 5m ago              |  | Updated: 1m ago              |  | Updated: Just now            |   |
|  +------------------------------+  +------------------------------+  +------------------------------+   |
|  +------------------------------+  +------------------------------+                                     |
|  | [🎵 LYRA] Composer           |  | [🧘 BODHI] Spiritual Advisor |                                     |
|  | Domain: Music Studio         |  | Domain: Mindfulness Journal  |                                     |
|  | Badge: [ IDLE ]              |  | Badge: [ IDLE ]              |                                     |
|  | Last Task: Initialized roster|  | Last Task: Initialized roster|                                     |
|  | Note: [[AGENTS]]             |  | Note: [[AGENTS]]             |                                     |
|  | Updated: 5m ago              |  | Updated: 5m ago              |                                     |
|  +------------------------------+  +------------------------------+                                     |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
| [VAULT: My-Obsidian-Vault] • Status Stream: 00-Butler-Dashboard/status.json • Engine: Vanilla ES6/Tailwind|
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Design Tokens & Visual Hierarchy

### 3.1 Color Palette (Dark Obsidian / Cyber Luxe)
- **Background Base:** `#080B11` (Deep Space Obsidian)
- **Card Background:** `rgba(17, 24, 39, 0.72)` (Frosted Midnight Slate)
- **Card Border:** `rgba(255, 255, 255, 0.08)`
- **Card Hover Border:** `rgba(99, 102, 241, 0.35)`
- **Header Surface:** `rgba(15, 23, 42, 0.85)` with `backdrop-filter: blur(20px)`

### 3.2 Dynamic Status Indicator Tokens
| Status | Badge Background | Badge Text | Ring / Glow Animation | Icon / Dot |
|---|---|---|---|---|
| `active` | `rgba(16, 185, 129, 0.15)` | `#34D399` (Emerald 400) | `0 0 12px rgba(16, 185, 129, 0.4)` + CSS Pulse Ping | 🟢 Pulsing |
| `waiting` | `rgba(245, 158, 11, 0.15)` | `#FBBF24` (Amber 400) | `0 0 10px rgba(245, 158, 11, 0.3)` | 🟡 Breathing Amber |
| `idle` | `rgba(100, 116, 139, 0.15)` | `#94A3B8` (Slate 400) | None / Clean border | ⚪ Muted Slate |

### 3.3 Typography
- **Primary Font Stack:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Stack (Timestamps, Keys, Code):** `"JetBrains Mono", "SF Mono", Consolas, monospace`
- **Sizes & Weights:**
  - Estate Title: `20px` / Font-Weight `700` / Tracking `+0.05em`
  - Mooji Hero Title: `18px` / Font-Weight `600`
  - Worker Name: `15px` / Font-Weight `600`
  - Role Subtitle: `12px` / Font-Weight `400` / Color `#94A3B8`
  - Task Description: `13px` / Line-Height `1.45` / Color `#E2E8F0`
  - Meta/Wikilinks: `11px` / Monospace / Font-Weight `500`

### 3.4 Spacing & Grid Specs
- Max container width: `1440px` (centered with auto margin)
- Outer padding: `1.5rem` (24px)
- Hero Card: Full-width spanning 12 columns
- Specialist Grid:
  - Desktop (`>= 1280px`): `grid-template-columns: repeat(4, minmax(0, 1fr))` (2 rows of 4)
  - Laptop (`>= 1024px`): `grid-template-columns: repeat(3, minmax(0, 1fr))`
  - Tablet (`>= 768px`): `grid-template-columns: repeat(2, minmax(0, 1fr))`
  - Mobile (`< 768px`): `grid-template-columns: 1fr`
- Grid Gap: `1rem` (16px)

---

## 4. Component Specification

### 4.1 Header Bar (`#header-bar`)
- **Left:** Estate Icon (shield/crown SVG) + "ESTATE COMMAND CENTER" + Live Pulse dot.
- **Center:** Quick Status Pill Counter:
  - Active: Pill with glowing green number
  - Waiting: Pill with amber number
  - Idle: Pill with muted slate number
- **Right:**
  - Live Clock: Digital HH:MM:SS with 12-hour AM/PM format + Date.
  - Refresh Progress: Tiny circular SVG or countdown bar (5s reset loop) + "↻ Sync" manual click trigger.

### 4.2 Mooji Coordinator Deck (`#mooji-card`)
- Distinctive visual elevation: Indigo-violet subtle gradient accent (`linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.06))`).
- Border: `1px solid rgba(99, 102, 241, 0.3)`.
- Left: Mooji portrait badge (Butler icon / Monogram `MJ`).
- Middle:
  - Role: "MAIN BUTLER & CHIEF OF STAFF" (uppercase tracker badge).
  - Current Directive / Task: Prominent callout container with soft dark inset.
- Right:
  - Status Badge (`active` / `idle` / `waiting`).
  - Active links to `[[AGENTS]]` and Obsidian URI launcher.
  - Timestamp with human relative time ("2 mins ago").

### 4.3 Specialist Worker Cards (`.worker-card`)
Each worker card contains:
1. **Card Header:**
   - Avatar icon / Domain emoji (🍳 Remy, 🥗 Sage, 🏋️ Atlas, 📈 Sterling, 💻 Turing, 🎨 Iris, 🎵 Lyra, 🧘 Bodhi).
   - Worker Name + Role title.
   - Status Badge pinned to top-right.
2. **Domain Pill:**
   - E.g., `04-Dev-and-Design/` in monospace micro-tag.
3. **Current / Last Task Box:**
   - Min height `54px` to ensure visual alignment across cards.
   - Truncated with ellipsis if > 3 lines, with tooltip on hover.
4. **Last Note & Obsidian Bridge:**
   - Clean obsidian chip: `[[NoteName]]`.
   - Clicking triggers `obsidian://open?vault=My-Obsidian-Vault&file=<CleanFileName>`.
   - External file link fallback button (opens in system explorer or markdown viewer).
5. **Card Footer:**
   - Relative timestamp with live ticking update ("just now", "3m ago").
   - Absolute ISO timestamp on tooltip.

---

## 5. Technical Implementation Blueprint for `@code-expert` (Turing)

### 5.1 Architecture & Stack
- **Target Location:** `00-Butler-Dashboard/`
- **File Structure:**
  ```text
  00-Butler-Dashboard/
  ├── index.html          # Core semantic structure + Tailwind CSS CDN + Google Fonts
  ├── style.css           # Glassmorphism, animations, keyframes, scrollbars
  ├── app.js              # State manager, JSON parser, countdown, DOM diffing
  ├── server.py           # Self-contained zero-dependency Python 3 HTTP server with no-cache headers
  └── status.json         # Real-time state file read by app.js
  ```
- **Server Choice:** Python 3 standard library `http.server` with custom headers (`Cache-Control: no-cache, no-store, must-revalidate`) or Node.js lightweight static server. Python is ideal as it runs on any workstation with `python server.py`.

### 5.2 `status.json` Schema Parsing
The frontend must reliably parse:
```json
{
  "updated_at": "ISO-8601 string",
  "agents": {
    "mooji": { "name": "...", "role": "...", "status": "active|idle|waiting", "last_task": "...", "last_note": "[[wikilink]]", "timestamp": "..." },
    "cook": { ... },
    "nutritionist": { ... },
    "gym-instructor": { ... },
    "financial-advisor": { ... },
    "code-expert": { ... },
    "ui-designer": { ... },
    "composer": { ... },
    "spiritual-advisor": { ... }
  }
}
```

### 5.3 Obsidian URI Resolver
When converting `last_note` (e.g. `[[AGENTS]]` or `[[04-Dev-and-Design/household-command-center-spec]]`):
```javascript
function resolveObsidianUri(vaultName, wikilink) {
  // Strip [[ and ]]
  const clean = wikilink.replace(/\[\[|\]\]/g, '').trim();
  const encoded = encodeURIComponent(clean);
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encoded}`;
}
```

### 5.4 Auto-Polling & Smooth Rendering
- Set polling interval to **3 seconds** via `fetch('status.json?t=' + Date.now(), { cache: 'no-store' })`.
- Compare previous JSON string with incoming response. **Do not re-render DOM if data hasn't changed** (prevents UI flicker and preserves text selection).
- Animate status badge transitions smoothly (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`).
- Error handling: If `status.json` is temporarily locked during write, keep stale data visible, show subtle yellow connection dot in header, and retry next tick without crashing.

---

## 6. Acceptance Criteria
- [x] UI/UX specification complete with ASCII wireframe.
- [x] Design tokens documented (colors, fonts, glassmorphism, animations).
- [x] Mooji featured as master coordinator above specialist matrix.
- [x] All 8 workers mapped with domain folders and distinct icons.
- [x] Dynamic badges for `active`, `idle`, and `waiting` states.
- [x] Obsidian URI + `[[wikilink]]` support detailed.
- [x] Zero-dependency server implementation guidance for Turing.

*Design specification prepared by Iris (@ui-designer). Ready for Turing (@code-expert) execution.*
