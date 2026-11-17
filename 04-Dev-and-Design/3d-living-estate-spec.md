# 3D Living Estate Canvas — UI/UX Specification & Procedural Three.js Blueprint

**Document ID:** `04-DEV-UI-3D-ESTATE-001`  
**Author:** Iris (`@ui-designer`)  
**Target Engineers:** Turing (`@code-expert`), Argus (`@system-administrator`)  
**Dashboard Directory:** `00-Butler-Dashboard/`  
**Data Engine:** `00-Butler-Dashboard/status.json`  
**Related Notes:** [[AGENTS]], [[04-Dev-and-Design/household-command-center-spec]]

---

## 1. Executive Vision & Aesthetic Philosophy

### 1.1 Aesthetic: "Cyber-Luxe Low-Poly Mansion Cutaway"
The **3D Living Estate** transforms our Command Center into an interactive, real-time spatial digital twin of the Dela Rosa Residence. The scene is one continuous, open-roof mansion: a single foundation, connected room floors, visible walls and framed doorways, and a clear front entrance. The visual aesthetic fuses:
- **Low-Poly Minimalist Geometry:** Crisp faceted polygonal surfaces, beveled stone plinths, clean geometric character silhouettes that run smoothly at 60 FPS on any browser with zero external assets.
- **Cyber-Luxe Obsidian Palette:** Frosted dark slate foundation (`#080B11`, `#0F172A`), individually colored room floors and nameplates, warm estate lighting (`#F59E0B`), and vibrant emerald status beacons (`#10B981`).
- **Zero-Dependency Procedural Construction:** 100% created through standard Three.js primitives (`BoxGeometry`, `CylinderGeometry`, `SphereGeometry`, `ConeGeometry`, `TorusGeometry`, `BufferGeometry`). No external `.gltf` or `.obj` network dependencies, eliminating loading spinners, CORS issues, or 404 missing asset errors.

---

## 2. Spatial Layout & Estate Grid Coordinates

The estate is a single 72-by-72-unit mansion footprint on a continuous obsidian foundation. Its nine square rooms form a readable three-by-three plan, joined by open framed doorways; the Grand Foyer is the central hub and the south entrance opens into the Knowledge Library. Low walls, contrasting room floors, room nameplates, and recognizable furnishings define each space. There are no separate islands, pod platforms, or exterior bridges.

### 2.1 World Space Coordinate Map (X, Y, Z)
*Coordinate System:* $X$ is West (-) to East (+), $Y$ is Elevation / Height, $Z$ is North (-) to South (+). Ground level is $Y = 0$.

```text
                               [NORTH: -Z]
                                    ▲
                                    │
 [CULINARY KITCHEN] [ZEN SANCTUARY] [MUSIC CONSERVATORY]
       Remy, Sage         Bodhi              Lyra
            ┌──────────────┬──────────────┐
 [FITNESS ROOM] ─────── [GRAND FOYER] ─────── [FINANCE STUDY]
       Atlas                Mooji                 Sterling
            ├──────────────┼──────────────┤
 [DEV & DESIGN] ────── [KNOWLEDGE LIBRARY] ───── [OPERATIONS]
     Turing, Iris      Dorian, Quill, Verity, Scribe   Argus, Dexter, Nexus
                          FRONT ENTRANCE
```

### 2.2 Room Dimension & Position Matrix
| Room ID | Room Name | Staff Present | Center $(X, Y, Z)$ | Interior Size | Theme Accent Color |
|---|---|---|---|---|---|
| `room-foyer` | **Grand Foyer** | Mooji, Hermes, Marco | $(0, 0, 0)$ | $23.4 \times 23.4$ | Royal Indigo & Gold (`#6366F1` / `#F59E0B`) |
| `room-culinary` | **Culinary Kitchen** | Remy, Sage | $(-23, 0, -23)$ | $23.4 \times 23.4$ | Warm Amber & Emerald (`#F97316` / `#10B981`) |
| `room-zen` | **Zen Sanctuary** | Bodhi | $(0, 0, -23)$ | $23.4 \times 23.4$ | Serene Mint & Cherry (`#34D399` / `#F472B6`) |
| `room-music` | **Music Conservatory** | Lyra | $(+23, 0, -23)$ | $23.4 \times 23.4$ | Radiant Rose & Violet (`#EC4899` / `#8B5CF6`) |
| `room-fitness` | **Fitness Room** | Atlas | $(-23, 0, 0)$ | $23.4 \times 23.4$ | Crimson & Steel (`#EF4444` / `#94A3B8`) |
| `room-finance` | **Finance Study** | Sterling | $(+23, 0, 0)$ | $23.4 \times 23.4$ | Sovereign Gold & Navy (`#F59E0B` / `#1E3A8A`) |
| `room-cyber` | **Dev & Design Studio** | Turing, Iris | $(-23, 0, +23)$ | $23.4 \times 23.4$ | Electric Cyan & Violet (`#06B6D4` / `#A855F7`) |
| `room-knowledge` | **Knowledge Library** | Dorian, Quill, Verity, Scribe | $(0, 0, +23)$ | $23.4 \times 23.4$ | Violet & Blue (`#A855F7` / `#3B82F6`) |
| `room-infra` | **Operations Room** | Argus, Dexter, Nexus | $(+23, 0, +23)$ | $23.4 \times 23.4$ | Cyber Blue & Emerald (`#3B82F6` / `#10B981`) |

---

## 3. Room Architecture & Props Specification

Each room is a distinct low-poly architectural vignette constructed on the shared mansion floor. Muted colored floor inlays, illuminated room nameplates, perimeter walls, and interior partitions make room boundaries legible. The central doors align on a shared grid; each room has a 3.8-unit framed doorway and the south-facing main entrance is 8 units wide. Wandering routes pass through the aligned door centers rather than crossing room walls.

### 3.1 Grand Foyer (Mooji, Hermes & Marco)
- **Base:** Royal-indigo inlaid floor at the center of the connected house.
- **Architecture:** Four slender modern square columns and a light cornice establish the mansion's central hall.
- **Props:**
  - Floating holographic Estate Crest rotating slowly at $Y = 3.5$.
  - Master Executive lectern / control console with glowing ledger display.
  - Low-poly luxury lounge chairs and potted geometric cypress topiaries.
  - Gold-trimmed open doorways connect the foyer to its four neighboring rooms, with a continuous hall to the front entrance.

### 3.2 Culinary Kitchen (Remy & Sage)
- **Base:** Warm terracotta and slate inlay enclosed by the north-west room walls.
- **Remy's Station (Kitchen):**
  - Stainless steel / dark marble cooktop island with simmering copper saucepans.
  - Open stone hearth with glowing orange embers (`PointLight` with subtle flicker).
  - Floating sauté pan with stylized low-poly steam particles (tiny floating white spheres with opacity decay).
- **Sage's Station (Nutrition & Macros):**
  - Herb garden planters with geometric fresh herbs and fruit crates.
  - Laboratory macro-analysis balance scale and floating color-coded nutrient spheres (Protein = Red, Carb = Amber, Fat = Cyan).

### 3.3 Fitness Room (Atlas)
- **Base:** High-durability charcoal rubberized grid mat with white sports court boundary lines.
- **Props:**
  - Heavy power rack / squat cage with low-poly barbell loaded with bumper plates.
  - Dumbbell rack with hexagonal weights.
  - Pull-up rig and chalk bowl pedestal with gentle white dust particle emission.
  - Low-poly digital timer scoreboard mounted on a stanchion.

### 3.4 Finance Study (Sterling)
- **Base:** Fortified titanium-vault plinth with sunken floor and security lasers (`LineBasicMaterial` glowing red/gold).
- **Props:**
  - Massive circular vault door with heavy geared locking pins and combination wheel.
  - Pallet of stacked 24k gold bullion bars (`MeshStandardMaterial`, roughness 0.1, metalness 0.95).
  - Holographic financial candlestick chart hovering above an obsidian pedestal with moving green/red trend pillars.

### 3.5 Dev & Design Studio (Turing & Iris)
- **Base:** Frosted glass platform with embedded neon circuitry pathways running under translucent floor tiles.
- **Turing's Station (Code Expert):**
  - Ultrawide curved multi-monitor battlestation with glowing green monospace code glyph textures.
  - Holographic holographic wireframe tetrahedron spinning on the desk.
  - Cybernetic terminal tower with blinking status LEDs.
- **Iris's Station (UI/UX Designer):**
  - Ergonomic drafting easel with a large interactive glass tablet displaying color palettes and wireframe grids.
  - Giant floating RGB color prism wheel casting prismatic refractions.
  - Holographic floating mobile/desktop device mockups.

### 3.6 Operations Room (Argus, Dexter, Nexus)
- **Base:** Heavy industrial reinforced concrete deck with yellow/black hazard perimeter stripes.
- **Argus's Station (System Administrator):**
  - Master SysAdmin console flanked by twin server rack towers with blinking multi-color LED server blades.
  - High-intensity sweeping blue radar searchlight cone scanning for anomalies.
- **Dexter's Station (Database Administrator):**
  - Trio of cylindrical SQL data silo storage units with pulsing vertical data-fill indicator bars.
  - Flowing particle stream tubes conveying data packets between server nodes.
- **Nexus's Station (Network Administrator):**
  - Tall microwave / satellite communication mast with blinking aviation warning beacon at the tip.
  - Network router node cluster with animated fiber-optic pulsing lines flowing to all other estate zones.

### 3.7 Music Conservatory (Lyra)
- **Base:** Rich mahogany and ivory acoustic parquet platform surrounded by crystalline sound-baffle glass partitions.
- **Props:**
  - Sleek low-poly grand piano in obsidian gloss finish with open lid.
  - Modern synthesizer keyboard stand with dual audio monitors and mixer dials.
  - Floating holographic musical treble clefs and eighth notes that gently rise and fade into the air.

### 3.8 Zen Sanctuary (Bodhi)
- **Base:** Raked-sand garden inlay within the north-center room, accented with concentric rings and low-poly lily pads.
- **Props:**
  - Stylized low-poly cherry blossom / bonsai tree with soft pink foliage blocks.
  - Smoothed stacked river stones (cairn).
  - Bamboo water fountain (*shishi-odoshi*) and floating glowing pink lotus flower.
  - Floating meditation stone pedestal with soft levitation aura.

### 3.9 Knowledge Library (Dorian, Quill, Verity & Scribe)
- **Base:** Violet-and-blue floor inlay in the south-center room, immediately inside the front entrance and south of the foyer.
- **Architecture:** Shelving and illuminated book-display bays identify it as a working library while leaving a clear central path to the foyer doorway.
- **Props:** The existing knowledge shelves and book collection remain; all four knowledge specialists are placed together in this room.

---

## 4. Procedural Character Models Specification

To ensure low download lag and high visual charm, all 18 household characters (Mooji and 17 specialists) are procedurally generated using stylized geometric primitives (Box, Cylinder, Sphere, Cone).

### 4.1 Universal Base Anatomy & Rigging
All characters share a unified low-poly anatomical hierarchy:
```text
CharacterGroup (Root)
├── ShadowDisc (Translucent dark circle on floor)
├── StatusAuraDisc (Glowing ring on floor)
├── FloatingBadge (HTML or Sprite above head with Icon + Name)
└── BodyMeshGroup (Elevated at Y = 0.8)
    ├── Torso (BoxGeometry)
    ├── Head (BoxGeometry or Chamfered Cylinder)
    │   ├── Hair / Headwear (Unique Prop)
    │   └── Face (Visor, Glasses, or Stylized Eyes)
    ├── LeftArm & RightArm (Cylinder / Box with pivot at shoulders)
    ├── LeftLeg & RightLeg (Cylinder / Box with pivot at hips)
    └── SignaturePropsGroup (Held in hands or orbiting)
```

### 4.2 Worker Signature Character Specs & Palette
| Character | Palette (Clothes/Hair) | Headwear / Signature Prop | Idle Stance / Animation | Active Animation |
|---|---|---|---|---|
| **Mooji** | Midnight Navy Tuxedo (`#1E1B4B`), Gold Accents, White Shirt | Sovereign Crown / Gold Crest (`#F59E0B`), Silver butler service tray with crystal decanter | Dignified butler upright stance, gentle tray sway | Consults glowing holographic tablet, authoritative nod, commands dispatch |
| **Remy** | Crisp Chef Whites (`#F8FAFC`), French Blue Apron (`#2563EB`) | Tall pleated Chef's Toque (`#FFFFFF`), Cast iron skillet with sizzling golden ingredients | Hands on hips, admiring kitchen aroma, light head bob | Tosses skillet with energetic arm flip, sautéing ingredients flying in arc |
| **Sage** | Sage Green Tunic (`#059669`), Cream Trousers (`#F1F5F9`) | Botanical headband, digital clipboard tablet, hovering nutrient macro spheres | Checking tablet, rotating macro spheres in slow orbit | Calibrating dietary balance, sorting green/amber protein cubes |
| **Atlas** | Charcoal Athletic Tank (`#1E293B`), Crimson Trim (`#EF4444`) | Crimson Headband (`#DC2626`), Weighted wrist wraps, Barbell / Dual Heavy Dumbbells | Bouncing on toes, stretching arms, breathing chest expansion | Dynamic bicep curls or clean-and-press barbell repetition |
| **Sterling** | Pinstripe Charcoal Suit (`#334155`), Gold Tie (`#F59E0B`) | Golden Monocle on right eye, reinforced leather briefcase, floating coin stacks | Checking gold pocketwatch, crossing arms, calculating gaze | Manipulating floating golden market trend bars, counting bullion |
| **Turing** | Cyberpunk Slate Hoodie (`#0F172A`), Neon Cyan Cuffs (`#06B6D4`) | Cyber Visor with cyan glowing HUD scanlines, mechanical cyber-deck | Typing on floating neon holographic keyboard | Rapid typing flurry, terminal code streams ascending rapidly |
| **Iris** | Chic French Violet Smock (`#7C3AED`), Dark Jeans (`#1E293B`) | Velvet Artist Beret (`#581C87`), Holographic stylus pen, Floating color wheel | Inspecting design swatch, tilting head critically | Drawing glowing UI bezier curves in 3D space with stylus |
| **Argus** | High-Vis Cobalt Ops Vest (`#1D4ED8`), Utility Belt (`#475569`) | Tactical headset with boom mic, holographic riot shield / system radar | Scanning horizon with radar, vigilant patrol stance | Swiping through server diagnostic alerts, locking down ports |
| **Dexter** | Indigo Architect Smock (`#4338CA`), Amber Lanyard (`#D97706`) | Round spectacles, holographic data caliper, floating SQL query cubes | Monitoring data tank pressure gauges, calibrating values | Aligning data pipeline conduits, triggering query optimization pulse |
| **Nexus** | Cyan Flight Jumpsuit (`#0284C7`), White Accents | Augmented Reality Visor, Handheld spectrum analyzer with twin antennas | Checking wireless signal strength meter, adjusting antenna | Emitting high-frequency data pulse wave that travels along network lines |
| **Lyra** | Bohemian Violet & Rose Robes (`#9333EA`), Gold Trim | Golden Lyre hair pin, floating crystalline conductor baton | Listening with eyes closed, gentle rhythmic swaying | Playing grand piano keys or waving baton with musical notes erupting |
| **Bodhi** | Saffron & Ochre Monk Wrap (`#EA580C`), Sand Sash | Wooden mala beads around neck, floating lotus flower in palm | Floating in serene crossed-leg lotus pose 0.4 units above ground | Slow levitation breathing cycle, ring of cherry blossom petals circling |

### Additional Household Characters
| Character | Palette | Signature Prop | Idle Stance | Active Animation |
|---|---|---|---|---|
| **Hermes** | Executive Amber & Charcoal | Mail satchel and brass dispatch pin | Checks correspondence in the foyer | Delivers messages between the kitchen and fitness room |
| **Marco** | Explorer Emerald & Brass | Compass and traveler's field kit | Studies the mansion routes | Scouts the connected rooms and plans itineraries |
| **Dorian** | Domino slate and teal | Domino server-admin insignia | Checks platform services | Monitors the Domino operations |
| **Quill** | Writer's blue and parchment | Fountain pen and draft folio | Composes article drafts | Writes and revises knowledge articles |
| **Verity** | Reviewer violet and silver | Magnifying glass and proof sheets | Checks references | Reviews and annotates knowledge articles |
| **Scribe** | Publisher rose and ink | Bound volume and publishing seal | Organizes finished volumes | Prepares articles for publication |

---

## 5. Animation State Machine & Status FX Engine

The 3D Canvas dynamically reads the `status` (`active`, `idle`, or `waiting`) of each worker from `status.json` and updates their visuals every frame ($t$ via `requestAnimationFrame`):

```text
               ┌───────────────┐
               │  status.json  │
               └───────┬───────┘
                       │ Polled every 3s
                       ▼
         ┌───────────────────────────┐
         │ Worker Status Evaluator   │
         └──┬────────────┬─────────┬─┘
            │            │         │
    "active"│   "waiting"│   "idle"│
            ▼            ▼         ▼
    ┌──────────────┐ ┌───────────┐ ┌─────────────┐
    │ High Energy  │ │ Attentive │ │ Gentle Sway │
    │ Work Loop    │ │ Holding   │ │ Ambient     │
    │ + Emerald    │ │ + Amber   │ │ + Slate     │
    │   Pulsing    │ │   Breathe │ │   Aura      │
    │   Beacon     │ │   Ring    │ │             │
    └──────────────┘ └───────────┘ └─────────────┘
```

### 5.1 Status Visual Signatures
1. **`active` State (In High-Productivity Flight):**
   - **Ground Beacon:** Dual concentric emerald rings (`#10B981`). Inner ring spins clockwise; outer ring expands and fades (`scale: 1.0 -> 2.2`, `opacity: 0.8 -> 0.0`).
   - **Head Indicator:** Vertical emerald beam of light (translucent cylinder) shooting 3 units skyward with a pulsing beacon crown.
   - **Animation Loop:** Speed factor $\times 1.8$. Specific active character work loop executed (Atlas pressing barbell, Remy tossing pan, Turing typing furiously, etc.).
   - **Audio/Visual Spark:** Subtle green micro-particles emit upward.

2. **`waiting` State (Standing Attentive / Blocked / Awaiting Input):**
   - **Ground Beacon:** Warm amber breathing aura disc (`#F59E0B`). Sine wave opacity breathing between $0.35$ and $0.85$ at $1.5\text{ Hz}$.
   - **Head Indicator:** Glowing amber floating hourglass or ellipsis badge `[...]` gently bobbing up and down.
   - **Animation Loop:** Character taps foot, crosses arms, checks wristwatch / datapad, looking left and right expectantly.

3. **`idle` State (Available / On Standby / Ambient Patrol):**
   - **Ground Beacon:** Calm slate/indigo subtle outline ring (`#64748B`, opacity 0.3).
   - **Head Indicator:** Soft white/slate micro-dot.
   - **Animation Loop:** Organic idle breathing loop ($\sin(t \times 2) \times 0.05$ height translation), gentle arm sway, occasional head tilt or ambient 1-step weight shift.

---

## 6. Interactive Viewport HUD & User Controls

The 3D Estate canvas is embedded seamlessly into `00-Butler-Dashboard/` above the Specialist Matrix.

### 6.1 Viewport Controls Header Bar
A dedicated HUD glass bar floats over the top of the 3D Canvas:

```text
+----------------------------------------------------------------------------------------------------+
| [3D LIVING ESTATE MANSION]  ● Camera: ISO ORBIT    [720p Expanded] [◫ Split View] [☰ Matrix Only] |
| Focus: [Overview] [Mooji] [Remy] [Sage] [Atlas] [Sterling] [Turing] [Iris] ... [Dorian] [Quill] [Verity] [Scribe] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|                                       [ THREE.JS 3D WORLD ]                                        |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### 6.2 View Mode Layout States
1. **Split View (Default Recommended):**
   - 3D Estate Canvas height: `460px`, pinned smoothly above the Specialist Worker cards.
   - User can pan/zoom the 3D world while scrolling the cards matrix below.
2. **Expanded View:**
   - 3D Estate Canvas expands to `720px` above the Specialist Worker cards.
   - The Expanded button toggles back to Split View without changing card contents.
3. **Matrix Only Mode:**
   - Hides the 3D viewport while leaving the HUD controls and specialist matrix available, so another view mode remains selectable.

### 6.3 Camera Navigation & Smooth Interpolation
- **Default Camera Position:** Mansion-wide isometric framing for the complete 72-by-72-unit footprint and every outer wall:
  - `camera.position.set(80, 78, 88);`
- The vertical field of view widens on narrow viewports to keep the full mansion inside the Overview frame.
  - `controls.target.set(0, 0, 0);`
- **Controls Tuning:**
  - `controls.enableDamping = true;`
  - `controls.dampingFactor = 0.05;`
  - `controls.maxPolarAngle = Math.PI / 2.15;` (prevents camera dipping below ground horizon)
  - `controls.minDistance = 15;`
  - `controls.maxDistance = 160;`
- The Overview button restores the full-mansion framing. Specialist focus buttons and character clicks interpolate to the selected character in their room.

### 6.4 Two-Way Synchronized Selection (3D <-> DOM)
1. **Click 3D Character -> Highlight DOM Card:**
   - Raycasting mouse click against character bounding boxes.
   - Highlights the 3D character with a spotlight and pulsing ring.
   - Dispatches DOM event to highlight the matching card in the matrix with a glowing indigo border and auto-scrolls it into view (`card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`).
   - Spawns a floating 3D speech bubble tooltip showing worker name, role, and current task snippet.
2. **Click DOM Card -> Focus 3D Character:**
   - Clicking any worker card in the HTML grid immediately calls `focusOnTarget(workerCoords)` in the 3D scene, centers the camera, and triggers an excited character gesture (e.g. wave or jump).

---

## 7. Lighting, Atmosphere & Shaders

### 7.1 Lighting Rig
- **Ambient Light:** `THREE.AmbientLight(0x1e293b, 0.85)` — Deep obsidian/slate base illumination.
- **Key Sun Light:** `THREE.DirectionalLight(0xfff7ed, 1.4)` positioned at $(35, 60, 40)$ with soft shadow mapping enabled (`shadow.mapSize: 2048x2048`, `bias: -0.0005`).
- **Accent Cyber Rim Light:** `THREE.DirectionalLight(0x6366f1, 0.8)` positioned at $(-40, 20, -40)$ casting cool violet/cyan edge highlights.
- **Room Accents:** Individual room floor colors, wall-mounted nameplates, and existing character status rings distinguish rooms without changing status synchronization.

### 7.2 Post-Processing / Visual Polish (Lightweight)
- Starfield / Cyber Dust: 220 floating ambient particles (`PointsMaterial`) provide a subtle atmospheric backdrop.

---

## 8. Turing's Implementation Architecture Blueprint

Turing (`@code-expert`) can implement this cleanly and efficiently with **zero external model files**:

### 8.1 File Structure in `00-Butler-Dashboard/`
```text
00-Butler-Dashboard/
├── index.html          # Add #estate-3d-container + Viewport HUD bar
├── style.css           # Add 3D canvas styles, HUD glass buttons, split-view classes
├── app.js              # Existing live sync + 3D event bridge hooks
├── estate3d.js         # Modular Three.js engine (Scene, Mansion Rooms, Procedural Characters, Raycaster)
├── server.py           # Existing Python server
└── status.json         # State source
```

### 8.2 Three.js Script Imports (Zero Dependency CDN)
In `index.html`:
```html
<!-- Three.js Core & OrbitControls (r128 CDN) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<!-- 3D Living Estate Engine -->
<script src="estate3d.js"></script>
```

---

## 9. Verification & Acceptance Checklist

- [x] **Mansion Plan Mapped:** One continuous foundation, nine connected rooms, interior doorways, an exterior entry, and coordinates for all 18 household characters.
- [x] **Procedural Models Detailed:** Distinctive character identities and accessories retained for the full staff.
- [x] **Animation Loops Defined:** Distinct `active`, `waiting`, and `idle` behaviors with emerald, amber, and slate status beacon FX.
- [x] **UI Controls Documented:** OrbitControls, Focus Jump Bar, 2-way click-to-select, Split/Expanded/Matrix view switcher, and cyclic lighting modes.
- [x] **Zero-Asset Three.js CDN Architecture:** Pure standard webgl, no external glTF models required.

*Specification authored with artistic precision by Iris (@ui-designer).*
