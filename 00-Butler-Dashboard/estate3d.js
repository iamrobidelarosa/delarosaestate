/**
 * Household Command Center — 3D Living Estate Engine (Lively Simulation Edition)
 * Procedural Three.js Isometric Diorama with Full Character Routines, Waypoint Walking,
 * Dynamic Exercise & Cooking Animations, and Billboard Floating Badges.
 * Author: Turing (@code-expert) | Blueprint: Iris (@ui-designer)
 */

(function () {
  'use strict';

  let scene, camera, renderer, controls;
  let container, canvasWrapper;
  let characters = {}; // key -> CharacterGroup
  let rooms = {};
  let animationFrameId;
  let clock;
  let raycaster, mouse;
  let hoveredCharacter = null;
  let selectedCharacter = null;
  let cameraTargetPosition = null;
  let controlsTargetPosition = null;
  let isTransitioningCamera = false;
  let currentAgentsData = {};
  let particlesGroup;
  let directionalLight, ambientLight, rimLight;
  let currentViewMode = 'split';
  let currentLightingMode = 'night';

  // Key Estate Waypoints for Walking Paths
  const WAYPOINTS = {
    foyer:       new THREE.Vector3(0, 0, 0),
    pantry:      new THREE.Vector3(-21, 0, -23),
    kitchen:     new THREE.Vector3(-25, 0, -23),
    gym:         new THREE.Vector3(-23, 0, 0),
    squatRack:   new THREE.Vector3(-25, 0, 0),
    zenGarden:   new THREE.Vector3(0, 0, -23),
    zenCherry:   new THREE.Vector3(-3, 0, -25),
    cyberLab:    new THREE.Vector3(-23, 0, 23),
    opsBunker:   new THREE.Vector3(23, 0, 23),
    musicStudio: new THREE.Vector3(23, 0, -23),
    financeVault:new THREE.Vector3(23, 0, 0),
    southGate:   new THREE.Vector3(0, 0, 32)
  };

  // Staff Metadata & Home Coordinates
  const STAFF_METADATA = {
    'mooji':                { x: 0,   y: 0, z: 0,   name: 'Mooji',    role: 'Main Butler',         icon: '👑', color: 0x6366f1, initialAction: 'Directing Estate' },
    'cook':                 { x: -25, y: 0, z: -23, name: 'Remy',     role: 'Personal Cook',       icon: '🍳', color: 0xf97316, initialAction: 'Sautéing Breakfast' },
    'nutritionist':         { x: -20, y: 0, z: -23, name: 'Sage',     role: 'Macro Specialist',   icon: '🥗', color: 0x10b981, initialAction: 'Juicing Fresh Citrus' },
    'gym-instructor':       { x: -25, y: 0, z: 0,   name: 'Atlas',    role: 'Strength Coach',      icon: '🏋️', color: 0xef4444, initialAction: 'Barbell Power Press' },
    'financial-advisor':    { x: 23,  y: 0, z: 0,   name: 'Sterling', role: 'Wealth Strategist',   icon: '📈', color: 0xf59e0b, initialAction: 'Espresso & Ledger' },
    'code-expert':          { x: -25, y: 0, z: 23,  name: 'Turing',   role: 'Lead Programmer',     icon: '💻', color: 0x06b6d4, initialAction: 'Stretching at Pantry' },
    'ui-designer':          { x: -19, y: 0, z: 23,  name: 'Iris',     role: 'Visual Architect',    icon: '🎨', color: 0xa855f7, initialAction: 'Zen Garden Stroll' },
    'system-administrator': { x: 18,  y: 0, z: 23,  name: 'Argus',    role: 'System Administrator',icon: '🛡️', color: 0x3b82f6, initialAction: 'Treadmill Jog & Ops' },
    'database-administrator':{ x: 23, y: 0, z: 23, name: 'Dexter',   role: 'Database Architect',  icon: '🗄️', color: 0x6366f1, initialAction: 'Terrace Brunch' },
    'network-administrator': { x: 29,  y: 0, z: 23, name: 'Nexus',    role: 'Network Engineer',    icon: '🌐', color: 0x38bdf8, initialAction: 'Perimeter Mesh Walk' },
    'composer':             { x: 23,  y: 0, z: -23, name: 'Lyra',     role: 'Composer & Lyricist', icon: '🎵', color: 0xec4899, initialAction: 'Piano Melody & Mint' },
    'video-creator':        { x: 29,  y: 0, z: -23, name: 'Vega',     role: 'Video Creator',       icon: '🎬', color: 0xf97316, initialAction: 'Storyboarding a Music Video' },
    'comic-creator':        { x: 17,  y: 0, z: -23, name: 'Panel',    role: 'Comic & Manhua Creator', icon: '📚', color: 0xf472b6, initialAction: 'Planning a Comic Chapter' },
    'spiritual-advisor':    { x: 0,   y: 0, z: -24, name: 'Bodhi',    role: 'Mindfulness Guide',   icon: '🧘', color: 0x14b8a6, initialAction: 'Levitation Breathing' },
    'email-manager':        { x: -4.5, y: 0, z: 3.2, name: 'Hermes',  role: 'Executive Mail Sec',  icon: '📬', color: 0xd97706, initialAction: 'Touring Pantry & Gym' },
    'travel-buddy':         { x: 4.5,  y: 0, z: 3.2, name: 'Marco',   role: 'Travel Buddy & Scout',icon: '🧭', color: 0x10b981, initialAction: 'Scouting Food & Routes' },
    'domino-administrator': { x: -4,   y: 0, z: 19,  name: 'Dorian',  role: 'Domino Administrator',icon: '🗄️', color: 0x06b6d4, initialAction: 'Domino Operations' },
    'knowledge-article-author': { x: 0, y: 0, z: 19, name: 'Quill',   role: 'Article Author',      icon: '✍️', color: 0x3b82f6, initialAction: 'Drafting Articles' },
    'knowledge-article-reviewer': { x: 4, y: 0, z: 19, name: 'Verity', role: 'Article Reviewer',    icon: '🔍', color: 0xa855f7, initialAction: 'Reviewing Articles' },
    'knowledge-article-publisher': { x: 0, y: 0, z: 27, name: 'Scribe',role: 'Article Publisher',   icon: '📚', color: 0xec4899, initialAction: 'Publishing Articles' }
  };

  const COLOR_ACTIVE = 0x10b981;
  const COLOR_WAITING = 0xf59e0b;
  const COLOR_IDLE = 0x64748b;

  /**
   * Initializes the 3D Estate Scene
   */
  function init3DEstate() {
    container = document.getElementById('estate-3d-container');
    canvasWrapper = document.getElementById('estate-3d-wrapper');
    if (!container || typeof THREE === 'undefined') {
      console.warn('Three.js or #estate-3d-container not ready.');
      return;
    }

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080b11);
    scene.fog = new THREE.FogExp2(0x080b11, 0.009);

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 500);
    camera.position.set(80, 78, 88);
    fitCameraFieldOfView();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 0, 0);
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minDistance = 15;
      controls.maxDistance = 160;
    }

    setupLighting();
    buildEstateMansion();
    buildAllCharacters();
    buildAtmosphereParticles();
    setupEventListeners();
    setupWanderingRoutines();

    animate();
    console.log('[Estate3D] Lively 3D Living Estate initialized with active routines.');
  }

  function setupLighting() {
    ambientLight = new THREE.AmbientLight(0x1e293b, 1.25);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    directionalLight.position.set(40, 65, 45);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 180;
    const d = 45;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.bias = -0.0005;
    scene.add(directionalLight);

    rimLight = new THREE.DirectionalLight(0x6366f1, 0.75);
    rimLight.position.set(-45, 25, -45);
    scene.add(rimLight);
  }

  function buildEstateMansion() {
    const mansionFloor = new THREE.Mesh(
      new THREE.BoxGeometry(72, 1.8, 72),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.2 })
    );
    mansionFloor.position.set(0, -0.9, 0);
    mansionFloor.receiveShadow = true;
    mansionFloor.castShadow = true;
    scene.add(mansionFloor);

    const roomConfigs = [
      { id: 'culinary', name: 'CULINARY KITCHEN', x: -23, z: -23, color: 0x9a4f24, accent: 0xf97316 },
      { id: 'zen', name: 'ZEN SANCTUARY', x: 0, z: -23, color: 0x22584c, accent: 0x10b981 },
      { id: 'music', name: 'MUSIC CONSERVATORY', x: 23, z: -23, color: 0x612c59, accent: 0xec4899 },
      { id: 'fitness', name: 'FITNESS ROOM', x: -23, z: 0, color: 0x632a30, accent: 0xef4444 },
      { id: 'foyer', name: 'GRAND FOYER', x: 0, z: 0, color: 0x282757, accent: 0xf59e0b },
      { id: 'finance', name: 'FINANCE STUDY', x: 23, z: 0, color: 0x594a25, accent: 0xf59e0b },
      { id: 'cyber', name: 'DEV & DESIGN STUDIO', x: -23, z: 23, color: 0x184653, accent: 0x06b6d4 },
      { id: 'knowledge', name: 'KNOWLEDGE LIBRARY', x: 0, z: 23, color: 0x3e2d5a, accent: 0xa855f7 },
      { id: 'infra', name: 'OPERATIONS ROOM', x: 23, z: 23, color: 0x1e3d59, accent: 0x3b82f6 }
    ];

    roomConfigs.forEach(room => {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(23.4, 0.14, 23.4),
        new THREE.MeshStandardMaterial({ color: room.color, roughness: 0.82, metalness: 0.12 })
      );
      floor.position.set(room.x, 0.02, room.z);
      floor.receiveShadow = true;
      scene.add(floor);
      addRoomSign(room);
    });

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.68, metalness: 0.24 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.32, metalness: 0.78 });
    const wallHeight = 5.8;
    const wallDepth = 0.65;
    const addWall = (horizontal, fixed, start, end, doorway, doorWidth, exterior) => {
      const addSection = (from, to) => {
        if (to <= from) return;
        const length = to - from;
        const wall = new THREE.Mesh(
          horizontal
            ? new THREE.BoxGeometry(length, wallHeight, wallDepth)
            : new THREE.BoxGeometry(wallDepth, wallHeight, length),
          wallMaterial
        );
        wall.position.set(
          horizontal ? (from + to) / 2 : fixed,
          wallHeight / 2,
          horizontal ? fixed : (from + to) / 2
        );
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      };

      if (doorway === null) {
        addSection(start, end);
      } else {
        addSection(start, doorway - doorWidth / 2);
        addSection(doorway + doorWidth / 2, end);
      }

      if (doorway === null) {
        if (exterior) {
          const cap = new THREE.Mesh(
            horizontal
              ? new THREE.BoxGeometry(end - start, 0.24, wallDepth + 0.12)
              : new THREE.BoxGeometry(wallDepth + 0.12, 0.24, end - start),
            trimMaterial
          );
          cap.position.set(horizontal ? (start + end) / 2 : fixed, wallHeight + 0.12, horizontal ? fixed : (start + end) / 2);
          scene.add(cap);
        }
        return;
      }
      const frameX = horizontal ? doorway : fixed;
      const frameZ = horizontal ? fixed : doorway;
      [-1, 1].forEach(side => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.48, wallHeight, 0.72), trimMaterial);
        post.position.set(
          horizontal ? doorway + side * doorWidth / 2 : frameX,
          wallHeight / 2,
          horizontal ? frameZ : doorway + side * doorWidth / 2
        );
        post.castShadow = true;
        scene.add(post);
      });

      const lintel = new THREE.Mesh(
        horizontal
          ? new THREE.BoxGeometry(doorWidth, 0.55, 0.78)
          : new THREE.BoxGeometry(0.78, 0.55, doorWidth),
        trimMaterial
      );
      lintel.position.set(frameX, wallHeight - 0.275, frameZ);
      scene.add(lintel);

      if (exterior) {
        const cap = new THREE.Mesh(
          horizontal
            ? new THREE.BoxGeometry(end - start, 0.24, wallDepth + 0.12)
            : new THREE.BoxGeometry(wallDepth + 0.12, 0.24, end - start),
          trimMaterial
        );
        cap.position.set(horizontal ? (start + end) / 2 : fixed, wallHeight + 0.12, horizontal ? fixed : (start + end) / 2);
        scene.add(cap);
      }
    };

    addWall(true, -35, -35, 35, null, 0, true);
    addWall(true, 35, -35, 35, 0, 8, true);
    [-35, 35].forEach(edge => addWall(false, edge, -35, 35, null, 0, true));
    [-11, 11].forEach(z => [-23, 0, 23].forEach(x => addWall(true, z, x - 12, x + 12, x, 3.8, false)));
    [-11, 11].forEach(x => [-23, 0, 23].forEach(z => addWall(false, x, z - 12, z + 12, z, 3.8, false)));

    buildFoyerProps();
    buildCulinaryProps(-23, -23);
    buildFitnessProps(-23, 0);
    buildFinanceProps(23, 0);
    buildCyberProps(-23, 23);
    buildInfraProps(23, 23);
    buildKnowledgeProps(0, 23);
    buildMusicProps(23, -23);
    buildZenProps(0, -23);
  }

  function addRoomSign(room) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const context = canvas.getContext('2d');
    context.fillStyle = '#0b1220';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#' + room.accent.toString(16).padStart(6, '0');
    context.lineWidth = 8;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.fillStyle = '#f8fafc';
    context.font = 'bold 42px Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(room.name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 1.9),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
    );
    const signX = room.x < 0 ? room.x + 7 : room.x > 0 ? room.x - 9 : room.x + 9;
    const signZ = room.z < 0 || room.z > 0 ? room.z + 12.45 : room.z + 11.45;
    plaque.position.set(signX, 4.35, signZ);
    scene.add(plaque);
  }

  function buildFoyerProps() {
    const foyerGroup = new THREE.Group();
    const colGeo = new THREE.BoxGeometry(0.8, 6.5, 0.8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8, roughness: 0.2 });
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, 3.25, cz);
      col.castShadow = true;
      foyerGroup.add(col);
    });

    const crestGeo = new THREE.OctahedronGeometry(1.6, 0);
    const crestMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, wireframe: true, emissive: 0x4f46e5, emissiveIntensity: 0.6 });
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(0, 4.5, 0);
    crest.name = 'estateCrest';
    foyerGroup.add(crest);

    const lectern = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.0), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
    lectern.position.set(0, 0.7, 2.5);
    lectern.castShadow = true;
    foyerGroup.add(lectern);

    scene.add(foyerGroup);
    rooms['foyer'] = foyerGroup;
  }

  function buildCulinaryProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Marble Island / Cooktop
    const island = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2 }));
    island.position.set(-2, 0.7, 0);
    island.castShadow = true;
    group.add(island);

    // Dynamic Sauté Pan (attached to scene or animated in Remy's hand)
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9 }));
    pan.position.set(-2, 1.55, 0);
    pan.name = 'stovePan';
    group.add(pan);

    // Golden Ingredients jumping in the pan
    const foodGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const foodMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    for (let f = 0; f < 3; f++) {
      const food = new THREE.Mesh(foodGeo, foodMat);
      food.position.set(-2.2 + f * 0.25, 1.7, (f % 2) * 0.2);
      food.name = `sizzleFood_${f}`;
      group.add(food);
    }

    // Sage's Herb Planter
    const planter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 1.4), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    planter.position.set(2.5, 0.45, 0);
    group.add(planter);

    // Orbiting Nutrient Macro Spheres
    const macroColors = [0xef4444, 0xf59e0b, 0x10b981];
    macroColors.forEach((col, i) => {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
      sphere.position.set(2.5 + Math.cos(i * 2.1) * 1.5, 2.8, Math.sin(i * 2.1) * 1.5);
      sphere.name = `macroSphere_${i}`;
      group.add(sphere);
    });

    scene.add(group);
    rooms['culinary'] = group;
  }

  function buildFitnessProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const mat = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.9 }));
    mat.position.set(0, 0.05, 0);
    mat.receiveShadow = true;
    group.add(mat);

    // Squat Cage Posts
    const barMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const postGeo = new THREE.BoxGeometry(0.2, 4.4, 0.2);
    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, barMat);
      post.position.set(px, 2.2, pz);
      group.add(post);
    });

    // Treadmill machine for Argus
    const tmBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 3.2), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }));
    tmBase.position.set(2.5, 0.15, 0);
    group.add(tmBase);

    const tmConsole = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    tmConsole.position.set(2.5, 1.1, -1.4);
    group.add(tmConsole);

    scene.add(group);
    rooms['fitness'] = group;
  }

  function buildFinanceProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 }));
    plinth.position.set(0, 0.4, 0);
    group.add(plinth);

    const doorGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.6, 24);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95, roughness: 0.2 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 2.6, -3.2);
    group.add(door);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3 - r; c++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5), goldMat);
        bar.position.set(2.2 + c * 0.35, 0.9 + r * 0.26, 0.5);
        group.add(bar);
      }
    }

    const chartGroup = new THREE.Group();
    const candleData = [
      { y: 1.2, h: 1.4, col: 0x10b981 },
      { y: 1.6, h: 2.1, col: 0x10b981 },
      { y: 1.4, h: 1.0, col: 0xef4444 },
      { y: 2.2, h: 2.8, col: 0x10b981 }
    ];
    candleData.forEach((c, idx) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, c.h, 0.3), new THREE.MeshBasicMaterial({ color: c.col }));
      mesh.position.set(-2.0 + idx * 0.8, c.y + c.h / 2, 1.2);
      chartGroup.add(mesh);
    });
    chartGroup.name = 'candlestickChart';
    group.add(chartGroup);

    scene.add(group);
    rooms['finance'] = group;
  }

  function buildCyberProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const desk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.3, 2.4), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
    desk.position.set(-1, 0.65, 0);
    group.add(desk);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.15), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    screen.position.set(-2.2, 1.9, -0.4);
    group.add(screen);

    const artCanvas = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.08), new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.85 }));
    artCanvas.position.set(1.5, 2.0, 0.2);
    artCanvas.rotation.y = -0.4;
    group.add(artCanvas);

    const prism = new THREE.Mesh(new THREE.TetrahedronGeometry(0.6), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true }));
    prism.position.set(-1.0, 2.6, 0);
    prism.name = 'cyberPrism';
    group.add(prism);

    scene.add(group);
    rooms['cyber'] = group;
  }

  function buildInfraProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const rackGeo = new THREE.BoxGeometry(1.6, 4.4, 1.4);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    [-3, -0.8].forEach(px => {
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(px, 2.2, -2);
      group.add(rack);
      for (let l = 0; l < 5; l++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: l % 2 === 0 ? 0x10b981 : 0x38bdf8 }));
        led.position.set(px, 0.8 + l * 0.7, -1.28);
        group.add(led);
      }
    });

    const siloGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 16);
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.85 });
    [1.8, 3.6].forEach(px => {
      const silo = new THREE.Mesh(siloGeo, siloMat);
      silo.position.set(px, 1.6, -1.5);
      group.add(silo);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 6, 8), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 }));
    mast.position.set(2.8, 3.0, 1.8);
    group.add(mast);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.6, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 }));
    dish.position.set(2.8, 5.8, 1.8);
    dish.rotation.x = Math.PI / 3;
    dish.name = 'satelliteDish';
    group.add(dish);

    scene.add(group);
    rooms['infra'] = group;
  }

  function buildKnowledgeProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.8, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.45, roughness: 0.35 })
    );
    shelf.position.set(0, 1.4, -1.5);
    group.add(shelf);

    const shelfGlow = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.12, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    shelfGlow.position.set(0, 1.4, -0.96);
    group.add(shelfGlow);

    const bookColors = [0x38bdf8, 0xf59e0b, 0xec4899, 0x10b981];
    bookColors.forEach((color, index) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.9 + (index % 2) * 0.2, 0.55),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
      );
      book.position.set(-1.0 + index * 0.65, 0.8 + (index % 2) * 0.1, -0.8);
      group.add(book);
    });

    scene.add(group);
    rooms['knowledge'] = group;
  }

  function buildMusicProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.8 }));
    pianoBody.position.set(0, 1.2, 0);
    group.add(pianoBody);

    const keys = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }));
    keys.position.set(0, 1.85, 1.0);
    group.add(keys);

    const synth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x2e1065, metalness: 0.6 }));
    synth.position.set(-2.4, 1.6, -1.5);
    group.add(synth);

    const note = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 16), new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0x9d174d, emissiveIntensity: 0.5 }));
    note.position.set(0, 3.6, 0);
    note.name = 'musicNote';
    group.add(note);

    scene.add(group);
    rooms['music'] = group;
  }

  function buildZenProps(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const sandPlinth = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.95 }));
    sandPlinth.position.set(0, 0.25, 0);
    group.add(sandPlinth);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.9 }));
    trunk.position.set(-2.5, 1.85, -2);
    trunk.rotation.z = -0.15;
    group.add(trunk);

    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 });
    const foliage1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6), pinkMat);
    foliage1.position.set(-2.8, 3.8, -2);
    group.add(foliage1);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 });
    [0.7, 0.5, 0.35].forEach((s, idx) => {
      const stone = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), stoneMat);
      stone.scale.set(1.2, 0.6, 1);
      stone.position.set(2.8, 0.6 + idx * 0.45, 1.5);
      group.add(stone);
    });

    const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 }));
    lotus.position.set(0, 0.7, 2.5);
    lotus.rotation.x = Math.PI;
    group.add(lotus);

    scene.add(group);
    rooms['zen'] = group;
  }

  /**
   * Creates a billboard text badge that always faces the camera
   */
  function createCharacterSpriteBadge(name, icon, actionText, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Rounded background box with high contrast
    ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
    ctx.strokeStyle = colorHex || '#6366f1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, 308, 84, 18);
    ctx.fill();
    ctx.stroke();

    // Icon + Name
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${icon} ${name}`, 160, 36);

    // Current Action Subtext
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(actionText, 160, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(5.5, 1.65, 1);
    sprite.position.y = 4.2;
    sprite.name = 'charSprite';
    return sprite;
  }

  function updateCharacterBadge(group, name, icon, actionText, colorHex) {
    const oldSprite = group.getObjectByName('charSprite');
    if (oldSprite) group.remove(oldSprite);
    const newSprite = createCharacterSpriteBadge(name, icon, actionText, colorHex);
    group.add(newSprite);
  }

  /**
   * Procedural character creation with true hip & shoulder pivots for walking
   */
  function createProceduralCharacter(key, meta) {
    const group = new THREE.Group();
    group.name = key;
    group.userData = {
      key: key,
      meta: meta,
      status: 'idle',
      currentAction: meta.initialAction,
      homePos: new THREE.Vector3(meta.x, meta.y, meta.z),
      targetPos: new THREE.Vector3(meta.x, meta.y, meta.z),
      isWalking: false,
      walkSpeed: 3.5,
      walkPhase: Math.random() * Math.PI * 2,
      routineState: 'home',
      stateTimer: 0
    };

    // Ground Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(0.9, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    // Status Aura Ring
    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: COLOR_IDLE, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const statusRing = new THREE.Mesh(ringGeo, ringMat);
    statusRing.rotation.x = -Math.PI / 2;
    statusRing.position.y = 0.03;
    statusRing.name = 'statusRing';
    group.add(statusRing);

    // Body Root
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.8;
    bodyGroup.name = 'bodyGroup';

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.9, 1.2, 0.55);
    const torsoMat = new THREE.MeshStandardMaterial({ color: meta.color, roughness: 0.5 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.95;
    head.castShadow = true;
    bodyGroup.add(head);

    // LEGS (Pivoted from hip at top)
    const legGeo = new THREE.BoxGeometry(0.32, 0.9, 0.35);
    legGeo.translate(0, -0.45, 0); // Translate so pivot is at top
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.25, 0.9, 0);
    leftLegGroup.add(new THREE.Mesh(legGeo, legMat));
    leftLegGroup.name = 'leftLeg';
    bodyGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.25, 0.9, 0);
    rightLegGroup.add(new THREE.Mesh(legGeo, legMat));
    rightLegGroup.name = 'rightLeg';
    bodyGroup.add(rightLegGroup);

    // ARMS (Pivoted from shoulder at top)
    const armGeo = new THREE.BoxGeometry(0.24, 0.85, 0.25);
    armGeo.translate(0, -0.42, 0); // Translate so pivot is at shoulder
    const armMat = torsoMat;

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.6, 1.4, 0);
    leftArmGroup.add(new THREE.Mesh(armGeo, armMat));
    leftArmGroup.name = 'leftArm';
    bodyGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.6, 1.4, 0);
    rightArmGroup.add(new THREE.Mesh(armGeo, armMat));
    rightArmGroup.name = 'rightArm';
    bodyGroup.add(rightArmGroup);

    // Props
    addSignatureProps(key, bodyGroup, head, rightArmGroup);

    group.add(bodyGroup);

    // Billboard Badge
    const badge = createCharacterSpriteBadge(meta.name, meta.icon, meta.initialAction, '#' + meta.color.toString(16).padStart(6, '0'));
    group.add(badge);

    // Raycast Bounding Box
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 2.0;
    hitBox.userData = { characterKey: key };
    group.add(hitBox);

    return group;
  }

  function addSignatureProps(key, bodyGroup, head, rightArmGroup) {
    if (key === 'mooji') {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.35, 5), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 }));
      crown.position.set(0, 2.45, 0);
      crown.rotation.x = Math.PI;
      bodyGroup.add(crown);

      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 }));
      tray.position.set(0, -0.4, 0.4);
      rightArmGroup.add(tray);
    } else if (key === 'cook') {
      const toque = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      toque.position.set(0, 2.5, 0);
      bodyGroup.add(toque);

      // Remy holds a copper skillet in right hand!
      const handPan = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.15, 10), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9 }));
      handPan.position.set(0, -0.5, 0.35);
      handPan.name = 'remyPan';
      rightArmGroup.add(handPan);
    } else if (key === 'gym-instructor') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      band.position.set(0, 2.1, 0);
      bodyGroup.add(band);

      // Barbell attached to Atlas body root
      const bbGroup = new THREE.Group();
      bbGroup.name = 'atlasBarbell';
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 }));
      bar.rotation.z = Math.PI / 2;
      bbGroup.add(bar);

      [-1.4, -1.2, 1.2, 1.4].forEach(px => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }));
        plate.rotation.z = Math.PI / 2;
        plate.position.set(px, 0, 0);
        bbGroup.add(plate);
      });
      bbGroup.position.set(0, 1.4, 0.6);
      bodyGroup.add(bbGroup);
    } else if (key === 'financial-advisor') {
      const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 }));
      monocle.position.set(0.18, 2.0, 0.35);
      bodyGroup.add(monocle);
    } else if (key === 'code-expert') {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.25), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      visor.position.set(0, 2.0, 0.32);
      bodyGroup.add(visor);
    } else if (key === 'ui-designer') {
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.35, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x581c87 }));
      beret.position.set(0.1, 2.4, 0);
      beret.rotation.z = -0.2;
      bodyGroup.add(beret);
    } else if (key === 'spiritual-advisor') {
      const mala = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 12), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      mala.position.set(0, 1.45, 0.25);
      bodyGroup.add(mala);
    } else if (key === 'email-manager') {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
      cap.position.set(0, 2.4, 0);
      bodyGroup.add(cap);

      const mail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
      mail.position.set(0, -0.4, 0.3);
      mail.rotation.y = -0.3;
      rightArmGroup.add(mail);
    } else if (key === 'travel-buddy') {
      // Explorer Safari Fedora
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      hatBrim.position.set(0, 2.3, 0);
      bodyGroup.add(hatBrim);

      const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x92400e }));
      hatCrown.position.set(0, 2.5, 0);
      bodyGroup.add(hatCrown);

      // Navigator Compass in hand
      const compass = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 }));
      compass.position.set(0, -0.4, 0.35);
      rightArmGroup.add(compass);
    }
  }

  function buildAllCharacters() {
    Object.entries(STAFF_METADATA).forEach(([key, meta]) => {
      const charGroup = createProceduralCharacter(key, meta);
      charGroup.position.set(meta.x, meta.y, meta.z);
      scene.add(charGroup);
      characters[key] = charGroup;
    });
  }

  function buildAtmosphereParticles() {
    const particleCount = 220;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 110;
      positions[i + 1] = Math.random() * 35;
      positions[i + 2] = (Math.random() - 0.5) * 110;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 0.45,
      transparent: true,
      opacity: 0.65
    });

    particlesGroup = new THREE.Points(geometry, material);
    scene.add(particlesGroup);
  }

  /**
   * Sets up real-time multi-agent wandering & exercise routines
   */
  function walkCharacterToRoomTarget(character, destination) {
    const roomCenters = [-23, 0, 23];
    const nearestRoomIndex = value => roomCenters.reduce(
      (nearest, center, index) => Math.abs(center - value) < Math.abs(roomCenters[nearest] - value) ? index : nearest,
      0
    );
    const route = [];
    let column = nearestRoomIndex(character.position.x);
    let row = nearestRoomIndex(character.position.z);
    const targetColumn = nearestRoomIndex(destination.x);
    const targetRow = nearestRoomIndex(destination.z);

    while (column !== targetColumn) {
      const nextColumn = column + Math.sign(targetColumn - column);
      const doorway = new THREE.Vector3((roomCenters[column] + roomCenters[nextColumn]) / 2, 0, roomCenters[row]);
      route.push(doorway);
      route.push(new THREE.Vector3(doorway.x + Math.sign(roomCenters[nextColumn] - roomCenters[column]) * 2.5, 0, doorway.z));
      column = nextColumn;
    }

    while (row !== targetRow) {
      const nextRow = row + Math.sign(targetRow - row);
      const doorway = new THREE.Vector3(roomCenters[column], 0, (roomCenters[row] + roomCenters[nextRow]) / 2);
      route.push(doorway);
      route.push(new THREE.Vector3(doorway.x, 0, doorway.z + Math.sign(roomCenters[nextRow] - roomCenters[row]) * 2.5));
      row = nextRow;
    }

    route.push(destination.clone());
    character.userData.routeQueue = route.slice(1);
    character.userData.targetPos.copy(route[0]);
    character.userData.isWalking = true;
  }

  function setupWanderingRoutines() {
    // Schedule periodic waypoints for walking agents
    setInterval(() => {
      const elapsed = clock ? clock.getElapsedTime() : 0;

      // 1. Hermes: Walks from Foyer -> Pantry (breakfast) -> Fitness Arena (workout) -> Foyer
      const hermes = characters['email-manager'];
      if (hermes) {
        const state = Math.floor(elapsed / 12) % 3;
        if (state === 0 && hermes.userData.routineState !== 'pantry') {
          walkCharacterToRoomTarget(hermes, WAYPOINTS.pantry);
          hermes.userData.routineState = 'pantry';
          updateCharacterBadge(hermes, 'Hermes', '📬', 'Visiting Pantry', '#d97706');
        } else if (state === 1 && hermes.userData.routineState !== 'gym') {
          walkCharacterToRoomTarget(hermes, WAYPOINTS.gym);
          hermes.userData.routineState = 'gym';
          updateCharacterBadge(hermes, 'Hermes', '📬', 'Gym Workout', '#ef4444');
        } else if (state === 2 && hermes.userData.routineState !== 'home') {
          walkCharacterToRoomTarget(hermes, hermes.userData.homePos);
          hermes.userData.routineState = 'home';
          updateCharacterBadge(hermes, 'Hermes', '📬', 'Executive Foyer', '#d97706');
        }
      }

      // 2. Turing: Walks Cyber Lab -> Pantry (drinks) -> Fitness Arena -> Cyber Lab
      const turing = characters['code-expert'];
      if (turing) {
        const state = Math.floor(elapsed / 14) % 3;
        if (state === 0 && turing.userData.routineState !== 'pantry') {
          walkCharacterToRoomTarget(turing, WAYPOINTS.pantry);
          turing.userData.routineState = 'pantry';
          updateCharacterBadge(turing, 'Turing', '💻', 'Iced Espresso', '#06b6d4');
        } else if (state === 1 && turing.userData.routineState !== 'gym') {
          walkCharacterToRoomTarget(turing, WAYPOINTS.gym);
          turing.userData.routineState = 'gym';
          updateCharacterBadge(turing, 'Turing', '💻', 'Gym Stretching', '#ef4444');
        } else if (state === 2 && turing.userData.routineState !== 'home') {
          walkCharacterToRoomTarget(turing, turing.userData.homePos);
          turing.userData.routineState = 'home';
          updateCharacterBadge(turing, 'Turing', '💻', 'Cyber Lab', '#06b6d4');
        }
      }

      // 3. Iris: Strolls peacefully to Zen Garden & back
      const iris = characters['ui-designer'];
      if (iris) {
        const state = Math.floor(elapsed / 16) % 2;
        if (state === 0 && iris.userData.routineState !== 'zen') {
          walkCharacterToRoomTarget(iris, WAYPOINTS.zenGarden);
          iris.userData.routineState = 'zen';
          updateCharacterBadge(iris, 'Iris', '🎨', 'Zen Garden Stroll', '#a855f7');
        } else if (state === 1 && iris.userData.routineState !== 'home') {
          walkCharacterToRoomTarget(iris, iris.userData.homePos);
          iris.userData.routineState = 'home';
          updateCharacterBadge(iris, 'Iris', '🎨', 'Design Studio', '#a855f7');
        }
      }

      // 4. Dexter: Walks between Ops Bunker and Culinary Terrace
      const dexter = characters['database-administrator'];
      if (dexter) {
        const state = Math.floor(elapsed / 15) % 2;
        if (state === 0 && dexter.userData.routineState !== 'pantry') {
          walkCharacterToRoomTarget(dexter, WAYPOINTS.pantry);
          dexter.userData.routineState = 'pantry';
          updateCharacterBadge(dexter, 'Dexter', '🗄️', 'Terrace Brunch', '#6366f1');
        } else if (state === 1 && dexter.userData.routineState !== 'home') {
          walkCharacterToRoomTarget(dexter, dexter.userData.homePos);
          dexter.userData.routineState = 'home';
          updateCharacterBadge(dexter, 'Dexter', '🗄️', 'SQL Ops Bunker', '#6366f1');
        }
      }

      // 5. Nexus: Patrol walks perimeter mesh
      const nexus = characters['network-administrator'];
      if (nexus) {
        const state = Math.floor(elapsed / 10) % 4;
        const patrolPoints = [
          new THREE.Vector3(29, 0, 18),
          new THREE.Vector3(16, 0, 23),
          new THREE.Vector3(23, 0, 4),
          nexus.userData.homePos
        ];
        const patrolState = `patrol-${state}`;
        if (nexus.userData.routineState !== patrolState) {
          walkCharacterToRoomTarget(nexus, patrolPoints[state]);
          nexus.userData.routineState = patrolState;
          updateCharacterBadge(nexus, 'Nexus', '🌐', 'Perimeter Survey', '#38bdf8');
        }
      }

    }, 3000);
  }

  function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);
    container.addEventListener('mousemove', onPointerMove, false);
    container.addEventListener('click', onCanvasClick, false);

    const focusButtons = document.querySelectorAll('[data-focus-worker]');
    focusButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-focus-worker');
        focusWorker(key);
      });
    });

    const btnSplit = document.getElementById('btn-mode-split');
    const btnExpanded = document.getElementById('btn-mode-expanded');
    const btnMatrix = document.getElementById('btn-mode-matrix');

    if (btnSplit) btnSplit.addEventListener('click', () => setViewMode('split'));
    if (btnExpanded) btnExpanded.addEventListener('click', () => setViewMode('expanded'));
    if (btnMatrix) btnMatrix.addEventListener('click', () => setViewMode('matrix'));

    const btnLighting = document.getElementById('btn-toggle-lighting');
    if (btnLighting) btnLighting.addEventListener('click', toggleLighting);
  }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    fitCameraFieldOfView();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function fitCameraFieldOfView() {
    const aspect = container.clientWidth / container.clientHeight;
    camera.fov = aspect < 1.4 ? Math.min(60, 40 * 1.4 / aspect) : 40;
    camera.updateProjectionMatrix();
  }

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let foundChar = null;
    for (let hit of intersects) {
      if (hit.object.userData && hit.object.userData.characterKey) {
        foundChar = hit.object.userData.characterKey;
        break;
      }
    }

    if (foundChar) {
      container.style.cursor = 'pointer';
      hoveredCharacter = foundChar;
    } else {
      container.style.cursor = 'default';
      hoveredCharacter = null;
    }
  }

  function onCanvasClick() {
    if (hoveredCharacter) {
      focusWorker(hoveredCharacter);
      highlightDomCard(hoveredCharacter);
    }
  }

  function highlightDomCard(key) {
    const card = document.querySelector(`.worker-card[data-worker="${key}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      card.classList.add('ring-2', 'ring-indigo-500');
      setTimeout(() => card.classList.remove('ring-2', 'ring-indigo-500'), 2500);
    } else if (key === 'mooji') {
      const moojiDeck = document.getElementById('mooji-deck');
      if (moojiDeck) {
        moojiDeck.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        moojiDeck.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => moojiDeck.classList.remove('ring-2', 'ring-indigo-500'), 2500);
      }
    }
  }

  function focusWorker(key) {
    if (!controls) return;

    if (key === 'all') {
      controlsTargetPosition = new THREE.Vector3(0, 0, 0);
      cameraTargetPosition = new THREE.Vector3(80, 78, 88);
      isTransitioningCamera = true;
      selectedCharacter = null;
      updateHudTargetLabel('Full Estate Overview');
      return;
    }

    const group = characters[key];
    if (!group) return;

    selectedCharacter = key;
    const curPos = group.position;
    controlsTargetPosition = new THREE.Vector3(curPos.x, curPos.y + 1.2, curPos.z);
    cameraTargetPosition = new THREE.Vector3(curPos.x + 16, curPos.y + 14, curPos.z + 20);
    isTransitioningCamera = true;

    const meta = group.userData.meta;
    updateHudTargetLabel(`${meta.icon} ${meta.name} — ${group.userData.currentAction || meta.role}`);
  }

  function updateHudTargetLabel(text) {
    const label = document.getElementById('hud-target-name');
    if (label) label.textContent = text;
  }

  function setViewMode(mode) {
    currentViewMode = mode;
    if (!canvasWrapper || !container) return;

    if (mode === 'matrix') {
      container.style.display = 'none';
    } else {
      canvasWrapper.style.display = 'block';
      container.style.display = 'block';
      if (mode === 'expanded') {
        container.style.height = '720px';
      } else {
        container.style.height = '460px';
      }
      setTimeout(onWindowResize, 100);
    }

    ['split', 'expanded', 'matrix'].forEach(m => {
      const btn = document.getElementById(`btn-mode-${m}`);
      if (btn) {
        if (m === mode) {
          btn.classList.add('bg-indigo-600', 'text-white');
          btn.classList.remove('bg-white/5', 'text-slate-300');
        } else {
          btn.classList.remove('bg-indigo-600', 'text-white');
          btn.classList.add('bg-white/5', 'text-slate-300');
        }
      }
    });
  }

  function toggleLighting() {
    const btn = document.getElementById('btn-toggle-lighting');
    if (currentLightingMode === 'night') {
      currentLightingMode = 'dusk';
      scene.background.set(0x180f24);
      scene.fog.color.set(0x180f24);
      directionalLight.color.set(0xfb923c);
      directionalLight.intensity = 1.4;
      ambientLight.color.set(0x382247);
      if (btn) btn.innerHTML = '🌅 Dusk';
    } else if (currentLightingMode === 'dusk') {
      currentLightingMode = 'day';
      scene.background.set(0x0f172a);
      scene.fog.color.set(0x0f172a);
      directionalLight.color.set(0xfff7ed);
      directionalLight.intensity = 1.8;
      ambientLight.color.set(0x475569);
      if (btn) btn.innerHTML = '☀️ Day';
    } else {
      currentLightingMode = 'night';
      scene.background.set(0x080b11);
      scene.fog.color.set(0x080b11);
      directionalLight.color.set(0xfff7ed);
      directionalLight.intensity = 1.2;
      ambientLight.color.set(0x1e293b);
      if (btn) btn.innerHTML = '🌙 Cyber Night';
    }
  }

  function updateAgents(agents) {
    currentAgentsData = agents || {};

    Object.entries(characters).forEach(([key, group]) => {
      const agentData = currentAgentsData[key] || {};
      const status = (agentData.status || 'idle').toLowerCase();
      group.userData.status = status;

      const ring = group.getObjectByName('statusRing');
      if (ring) {
        if (status === 'active') {
          ring.material.color.set(COLOR_ACTIVE);
          ring.material.opacity = 0.85;
        } else if (status === 'waiting') {
          ring.material.color.set(COLOR_WAITING);
          ring.material.opacity = 0.75;
        } else {
          ring.material.color.set(COLOR_IDLE);
          ring.material.opacity = 0.35;
        }
      }
    });
  }

  /**
   * Main Render & Animation Loop with Highly Visible Real-Time Movement
   */
  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // 1. Smooth Camera Transition
    if (isTransitioningCamera && controls && cameraTargetPosition && controlsTargetPosition) {
      camera.position.lerp(cameraTargetPosition, 0.08);
      controls.target.lerp(controlsTargetPosition, 0.08);
      if (camera.position.distanceTo(cameraTargetPosition) < 0.2) {
        isTransitioningCamera = false;
      }
    }

    if (controls) controls.update();

    // 2. Props Animation
    const crest = scene.getObjectByName('estateCrest');
    if (crest) {
      crest.rotation.y = elapsedTime * 0.8;
      crest.position.y = 4.5 + Math.sin(elapsedTime * 2.5) * 0.35;
    }

    const cyberPrism = scene.getObjectByName('cyberPrism');
    if (cyberPrism) {
      cyberPrism.rotation.x = elapsedTime * 1.0;
      cyberPrism.rotation.y = elapsedTime * 1.4;
    }

    const satelliteDish = scene.getObjectByName('satelliteDish');
    if (satelliteDish) {
      satelliteDish.rotation.y = Math.sin(elapsedTime * 0.5) * 0.6;
    }

    const musicNote = scene.getObjectByName('musicNote');
    if (musicNote) {
      musicNote.rotation.y = elapsedTime * 1.5;
      musicNote.position.y = 3.6 + Math.sin(elapsedTime * 3.5) * 0.4;
    }

    // Sizzling Food in Culinary Pan
    for (let f = 0; f < 3; f++) {
      const food = scene.getObjectByName(`sizzleFood_${f}`);
      if (food) {
        food.position.y = 1.7 + Math.abs(Math.sin(elapsedTime * 9 + f * 1.5)) * 0.35;
      }
    }

    // Orbiting Nutrient Spheres for Sage
    for (let i = 0; i < 3; i++) {
      const sphere = scene.getObjectByName(`macroSphere_${i}`);
      if (sphere) {
        const angle = elapsedTime * 1.8 + i * 2.1;
        sphere.position.x = 2.5 + Math.cos(angle) * 1.6;
        sphere.position.z = Math.sin(angle) * 1.6;
        sphere.position.y = 2.8 + Math.sin(elapsedTime * 3 + i) * 0.3;
      }
    }

    // 3. Lively Character Routines, Walking & Actions
    Object.entries(characters).forEach(([key, group]) => {
      const data = group.userData;
      const bodyGroup = group.getObjectByName('bodyGroup');
      const leftLeg = group.getObjectByName('leftLeg');
      const rightLeg = group.getObjectByName('rightLeg');
      const leftArm = group.getObjectByName('leftArm');
      const rightArm = group.getObjectByName('rightArm');
      const ring = group.getObjectByName('statusRing');

      // --- WALKING PATH INTERPOLATION ---
      if (data.isWalking && data.targetPos) {
        const dir = new THREE.Vector3().subVectors(data.targetPos, group.position);
        dir.y = 0;
        const dist = dir.length();

        if (dist > 0.3) {
          dir.normalize();
          group.position.addScaledVector(dir, data.walkSpeed * delta);
          // Rotate body to face walking direction
          group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, Math.atan2(dir.x, dir.z), 0.15);

          // Highly visible leg walking stride!
          const walkFreq = elapsedTime * 10;
          if (leftLeg) leftLeg.rotation.x = Math.sin(walkFreq) * 0.65;
          if (rightLeg) rightLeg.rotation.x = -Math.sin(walkFreq) * 0.65;
          if (leftArm) leftArm.rotation.x = -Math.sin(walkFreq) * 0.55;
          if (rightArm) rightArm.rotation.x = Math.sin(walkFreq) * 0.55;

          // Natural stepping bounce
          if (bodyGroup) bodyGroup.position.y = 0.8 + Math.abs(Math.sin(walkFreq)) * 0.22;
        } else {
          group.position.copy(data.targetPos);
          if (leftLeg) leftLeg.rotation.x = 0;
          if (rightLeg) rightLeg.rotation.x = 0;
          if (leftArm) leftArm.rotation.x = 0;
          if (rightArm) rightArm.rotation.x = 0;
          if (bodyGroup) bodyGroup.position.y = 0.8;
          if (data.routeQueue && data.routeQueue.length) {
            data.targetPos.copy(data.routeQueue.shift());
          } else {
            data.isWalking = false;
            data.routeQueue = [];
          }
        }
      } else {
        // --- STATIONARY SPECIALIZED ACTIONS ---

        // A. ATLAS POWER PRESS & SQUATS (Barbell moving dynamically up and down!)
        if (key === 'gym-instructor') {
          const pressCycle = Math.sin(elapsedTime * 3.5);
          const bb = bodyGroup.getObjectByName('atlasBarbell');
          if (bb) {
            // Barbell presses from chest Y=1.4 to overhead Y=3.0
            bb.position.y = 1.4 + (pressCycle * 0.5 + 0.5) * 1.4;
          }
          if (leftArm) leftArm.rotation.x = (pressCycle * 0.5 + 0.5) * Math.PI * 0.85;
          if (rightArm) rightArm.rotation.x = (pressCycle * 0.5 + 0.5) * Math.PI * 0.85;
          // Knee squat dip
          if (bodyGroup) bodyGroup.position.y = 0.8 - Math.max(0, -pressCycle) * 0.25;
        }

        // B. REMY VIGOROUS FLIP & COOKING
        else if (key === 'cook') {
          const cookSpeed = elapsedTime * 6;
          if (rightArm) {
            rightArm.rotation.x = Math.sin(cookSpeed) * 0.45;
          }
          if (bodyGroup) {
            bodyGroup.position.y = 0.8 + Math.sin(cookSpeed * 2) * 0.08;
          }
        }

        // C. BODHI LEVITATION & MINDFULNESS
        else if (key === 'spiritual-advisor') {
          // Bodhi floats high above the water plinth!
          group.position.y = 1.2 + Math.sin(elapsedTime * 2.0) * 0.6;
          group.rotation.y = elapsedTime * 0.4;
          if (leftArm) leftArm.rotation.z = -0.4 + Math.sin(elapsedTime * 2) * 0.1;
          if (rightArm) rightArm.rotation.z = 0.4 - Math.sin(elapsedTime * 2) * 0.1;
        }

        // D. ARGUS TREADMILL JOGGING IN GYM
        else if (key === 'system-administrator' && data.status === 'active') {
          const jogSpeed = elapsedTime * 11;
          if (leftLeg) leftLeg.rotation.x = Math.sin(jogSpeed) * 0.55;
          if (rightLeg) rightLeg.rotation.x = -Math.sin(jogSpeed) * 0.55;
          if (leftArm) leftArm.rotation.x = -Math.sin(jogSpeed) * 0.5;
          if (rightArm) rightArm.rotation.x = Math.sin(jogSpeed) * 0.5;
          if (bodyGroup) bodyGroup.position.y = 0.8 + Math.abs(Math.sin(jogSpeed)) * 0.18;
        }

        // E. LYRA PIANO PLAYING
        else if (key === 'composer') {
          if (leftArm) leftArm.rotation.x = 0.7 + Math.sin(elapsedTime * 8) * 0.2;
          if (rightArm) rightArm.rotation.x = 0.7 + Math.cos(elapsedTime * 8) * 0.2;
          if (bodyGroup) bodyGroup.position.y = 0.8 + Math.sin(elapsedTime * 4) * 0.05;
        }

        // F. GENERAL GENTLE IDLE / SWAY FOR OTHERS
        else {
          if (bodyGroup) {
            bodyGroup.position.y = 0.8 + Math.sin(elapsedTime * 2.5 + (group.position.x)) * 0.06;
          }
          if (leftArm) leftArm.rotation.x = Math.sin(elapsedTime * 2.0) * 0.12;
          if (rightArm) rightArm.rotation.x = -Math.sin(elapsedTime * 2.0) * 0.12;
        }
      }

      // Status Ring Pulse
      if (ring) {
        if (data.status === 'active') {
          ring.rotation.z = elapsedTime * 2.5;
          ring.scale.setScalar(1.0 + Math.sin(elapsedTime * 5) * 0.18);
        } else if (data.status === 'waiting') {
          ring.material.opacity = 0.45 + Math.sin(elapsedTime * 3) * 0.35;
        }
      }
    });

    // 4. Drift Atmosphere Particles
    if (particlesGroup) {
      particlesGroup.rotation.y = elapsedTime * 0.025;
    }

    renderer.render(scene, camera);
  }

  // Public API
  window.Estate3D = {
    init: init3DEstate,
    updateAgents: updateAgents,
    focusWorker: focusWorker,
    setViewMode: setViewMode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DEstate);
  } else {
    init3DEstate();
  }

})();
