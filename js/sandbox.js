/*
  ============================================================
  Build mode + character customization + "ask Claude" helper.
  Loaded after game.js — reuses its globals (THREE, scene,
  currentRoom, camera, canvas, character, the prop-builder
  functions, showToast, sfxPickup, etc.) directly, since
  game.js is a plain classic script (no module wrapper).
  ============================================================
*/

// ===================== Placeable item catalog =====================

const CATALOG = [
  { id: 'tree', label: 'Tree', icon: '🌳', colorable: true, defaultColor: 0x4fae63, obstacleR: 1.1,
    build: (x, z, c) => makeTree(x, z, c || 0x4fae63) },
  { id: 'bush', label: 'Bush', icon: '🌿', colorable: true, defaultColor: 0x4fae63, obstacleR: 0.7,
    build: (x, z, c) => makeBush(x, z, c || 0x4fae63) },
  { id: 'flower', label: 'Flower', icon: '🌸', colorable: true, defaultColor: 0xff6f91, obstacleR: 0,
    build: (x, z, c) => makeFlower(x, z, c || 0xff6f91) },
  { id: 'rock', label: 'Rock', icon: '🪨', colorable: false, obstacleR: 0.7,
    build: (x, z) => makeRock(x, z) },
  { id: 'bench', label: 'Bench', icon: '🪑', colorable: false, obstacleR: 0.6,
    build: (x, z) => makeBench(x, z, Math.random() * Math.PI * 2) },
  { id: 'crate', label: 'Crate', icon: '📦', colorable: false, obstacleR: 0.5,
    build: (x, z) => makeCrate(x, z) },
  { id: 'barrel', label: 'Barrel', icon: '🛢️', colorable: false, obstacleR: 0.5,
    build: (x, z) => makeBarrel(x, z) },
  { id: 'umbrella', label: 'Umbrella', icon: '⛱️', colorable: true, defaultColor: 0xffb3d1, obstacleR: 0.5,
    build: (x, z, c) => makeUmbrella(x, z, c || 0xffb3d1) },
  { id: 'gem', label: 'Gem', icon: '💎', colorable: true, defaultColor: 0xffd166, obstacleR: 0, animated: true,
    build: (x, z, c) => makeGem(x, 1.3, z, c || 0xffd166, GLOW_TEX_GOLD) },
  { id: 'butterfly', label: 'Butterfly', icon: '🦋', colorable: true, defaultColor: 0xff6f91, obstacleR: 0, animated: true,
    build: (x, z, c) => { const b = makeButterfly(hexToCss(c || 0xff6f91)); b.position.set(x, 1.4, z); return b; } },
  { id: 'cloud', label: 'Cloud', icon: '☁️', colorable: false, obstacleR: 0, animated: true,
    build: (x, z) => makeCloud(x, 6 + Math.random() * 2, z, 1) },
  { id: 'torch', label: 'Lamp', icon: '🔥', colorable: false, obstacleR: 0.3, animated: true,
    build: (x, z) => {
      const t = makeTorch(x, 1.1, z);
      t.group.userData.flameGlow = t.flameGlow;
      const light = new THREE.PointLight(0xffb35c, 0.8, 8);
      light.position.y = 0.7;
      t.group.add(light);
      return t.group;
    } },
  { id: 'banner', label: 'Banner', icon: '🚩', colorable: true, defaultColor: 0xff6f91, obstacleR: 0,
    build: (x, z, c) => makeBanner(x, 2.2, z, Math.random() * Math.PI * 2, c || 0xff6f91, 0xffd166) },
  { id: 'treasure', label: 'Treasure', icon: '🪙', colorable: false, obstacleR: 0.5,
    build: (x, z) => makeTreasurePile(x, z) },
  { id: 'heart', label: 'Heart', icon: '💗', colorable: false, obstacleR: 0,
    build: (x, z) => { const s = makeSprite(HEART_TEX_PINK, 0.7, 0.9); s.position.set(x, 1.3, z); return s; } },
  { id: 'balloon', label: 'Balloons', icon: '🎈', colorable: true, defaultColor: 0xff6f91, obstacleR: 0, animated: true,
    build: (x, z, c) => {
      const group = new THREE.Group();
      const mat = toonMat(c || 0xff6f91);
      [[-0.2, 0], [0.2, 0.15], [0, 0.3]].forEach(([ox, oy]) => {
        const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat);
        balloon.position.set(ox, 1.6 + oy, 0);
        addOutline(balloon);
        group.add(balloon);
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), toonMat(0x8a8a8a));
        string.position.set(ox, 0.9 + oy * 0.5, 0);
        group.add(string);
      });
      group.position.set(x, 0, z);
      return group;
    } },
  { id: 'mailbox', label: 'Mailbox', icon: '📮', colorable: false, obstacleR: 0.35,
    build: (x, z) => {
      const group = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), toonMat(0x8a5a34));
      post.position.y = 0.5; addOutline(post);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.55), toonMat(0xff6f91));
      box.position.y = 1.05; addOutline(box);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), toonMat(0xffd166));
      flag.position.set(0.22, 1.1, 0.3); addOutline(flag);
      group.add(post, box, flag);
      group.position.set(x, 0, z);
      return group;
    } },
  { id: 'sparkle', label: 'Sparkle', icon: '✨', colorable: true, defaultColor: 0xffffff, obstacleR: 0, animated: true,
    build: (x, z, c) => {
      const s = makeSprite(GLOW_TEX_WHITE, 0.8, 0.9);
      s.material.color.set(c || 0xffffff);
      s.position.set(x, 1.6, z);
      return s;
    } },
];
const CATALOG_BY_ID = {};
CATALOG.forEach((c) => { CATALOG_BY_ID[c.id] = c; });

// ===================== Persisted custom items =====================

function loadCustomItems() {
  try { return JSON.parse(localStorage.getItem('ah_custom_items_v1')) || {}; } catch (e) { return {}; }
}
function persistCustomItems() {
  try { localStorage.setItem('ah_custom_items_v1', JSON.stringify(customItems)); } catch (e) { /* ignore */ }
}
let customItems = loadCustomItems();
let placedMeshes = [];
let animatedItems = [];

function rebuildPlacedItems() {
  placedMeshes.forEach((m) => scene.remove(m));
  placedMeshes = [];
  animatedItems = [];
  if (!currentRoom) return;
  currentRoom.obstacles = currentRoom.obstacles.filter((o) => !o.__custom);

  const list = (currentRoom.key && customItems[currentRoom.key]) || [];
  list.forEach((entry, idx) => {
    const def = CATALOG_BY_ID[entry.itemId];
    if (!def) return;
    const obj = def.build(entry.x, entry.z, entry.color);
    obj.userData.customIndex = idx;
    obj.scale.setScalar(entry.scale || 1);
    // An invisible, generously-sized hit target — some props (flowers, gems) are
    // too small to reliably click on directly, but invisible meshes still raycast.
    const hitProxy = new THREE.Mesh(new THREE.SphereGeometry(0.7 / (entry.scale || 1), 6, 6), new THREE.MeshBasicMaterial());
    hitProxy.visible = false;
    hitProxy.position.y = 0.5;
    obj.add(hitProxy);
    scene.add(obj);
    placedMeshes.push(obj);
    if (def.obstacleR) currentRoom.obstacles.push({ x: entry.x, z: entry.z, r: def.obstacleR, __custom: true });
    if (def.animated) animatedItems.push({ object: obj, itemId: entry.itemId, phase: Math.random() * Math.PI * 2 });
  });
}

function addCustomItem(roomKey, itemId, x, z, color, scale) {
  if (!customItems[roomKey]) customItems[roomKey] = [];
  customItems[roomKey].push({ itemId, x, z, color, scale: scale || 1 });
  persistCustomItems();
  rebuildPlacedItems();
}

function removeCustomItem(roomKey, idx) {
  if (!customItems[roomKey]) return;
  customItems[roomKey].splice(idx, 1);
  persistCustomItems();
  rebuildPlacedItems();
  showToast('Removed.');
}

function onRoomBuilt() {
  rebuildPlacedItems();
}

function updateCustomItems(dt, t) {
  animatedItems.forEach((a) => {
    const o = a.object;
    if (a.itemId === 'gem') {
      o.rotation.y += dt * 1.2;
      o.position.y = 1.3 + Math.sin(t * 1.6 + a.phase) * 0.15;
    } else if (a.itemId === 'butterfly') {
      if (!o.userData.base) o.userData.base = o.position.clone();
      const t2 = t * 1.6 + a.phase;
      o.position.x = o.userData.base.x + Math.sin(t2) * 0.8;
      o.position.z = o.userData.base.z + Math.cos(t2 * 0.7) * 0.8;
      o.position.y = o.userData.base.y + Math.sin(t2 * 3) * 0.15;
    } else if (a.itemId === 'cloud') {
      o.position.x += dt * 0.3;
      if (o.position.x > 22) o.position.x = -22;
    } else if (a.itemId === 'torch' && o.userData.flameGlow) {
      o.userData.flameGlow.material.opacity = 0.75 + Math.sin(t * 8 + a.phase) * 0.15;
    } else if (a.itemId === 'balloon') {
      o.position.y = Math.sin(t * 1.2 + a.phase) * 0.1;
      o.rotation.y = Math.sin(t * 0.8 + a.phase) * 0.1;
    } else if (a.itemId === 'sparkle') {
      o.material.opacity = 0.45 + Math.sin(t * 3 + a.phase) * 0.4;
    }
  });
}

// ===================== Build mode UI =====================

let buildModeActive = false;
let selectedCatalogId = null;
let selectedColor = null;
let selectedScale = 1;
let wasBlockingBeforeOverlay = false;

const buildToggleBtn = document.getElementById('build-toggle-btn');
const buildTrayEl = document.getElementById('build-tray');
const buildExitBtn = document.getElementById('build-exit-btn');
const buildCatalogEl = document.getElementById('build-catalog');
const buildColorsEl = document.getElementById('build-colors');

CATALOG.forEach((def) => {
  const btn = document.createElement('button');
  btn.className = 'catalog-item';
  btn.innerHTML = `<span class="catalog-icon">${def.icon}</span><span class="catalog-label">${def.label}</span>`;
  btn.addEventListener('click', () => {
    selectedCatalogId = def.id;
    document.querySelectorAll('.catalog-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
  buildCatalogEl.appendChild(btn);
});

const BUILD_COLORS = ['#ff6f91', '#ffd166', '#b892e8', '#6bcf8f', '#7fd8e8', '#ffffff', '#3b3b58'];
BUILD_COLORS.forEach((hex) => {
  const sw = document.createElement('button');
  sw.className = 'color-swatch';
  sw.style.background = hex;
  sw.addEventListener('click', () => {
    selectedColor = new THREE.Color(hex).getHex();
    document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
    sw.classList.add('active');
  });
  buildColorsEl.appendChild(sw);
});
const resetColorBtn = document.createElement('button');
resetColorBtn.className = 'color-swatch reset-swatch';
resetColorBtn.textContent = '↺';
resetColorBtn.title = 'Use the natural color';
resetColorBtn.addEventListener('click', () => {
  selectedColor = null;
  document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
  resetColorBtn.classList.add('active');
});
buildColorsEl.appendChild(resetColorBtn);
resetColorBtn.classList.add('active');

const SCALE_OPTIONS = [
  { id: 'small', label: 'Small', value: 0.7 },
  { id: 'normal', label: 'Normal', value: 1 },
  { id: 'large', label: 'Large', value: 1.4 },
];
const buildScaleEl = document.getElementById('build-scale');
SCALE_OPTIONS.forEach((opt) => {
  const btn = document.createElement('button');
  btn.className = 'scale-btn' + (opt.value === 1 ? ' active' : '');
  btn.textContent = opt.label;
  btn.addEventListener('click', () => {
    selectedScale = opt.value;
    document.querySelectorAll('.scale-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
  buildScaleEl.appendChild(btn);
});

function enterBuildMode() {
  if (gameState !== 'playing' || uiBlocking) return;
  buildModeActive = true;
  uiBlocking = true;
  buildTrayEl.classList.remove('hidden');
  canvas.style.cursor = 'crosshair';
}
function exitBuildMode() {
  buildModeActive = false;
  uiBlocking = false;
  buildTrayEl.classList.add('hidden');
  canvas.style.cursor = '';
  selectedCatalogId = null;
  document.querySelectorAll('.catalog-item').forEach((b) => b.classList.remove('active'));
  document.getElementById('ai-idea-modal').classList.add('hidden');
}
buildToggleBtn.addEventListener('click', () => { buildModeActive ? exitBuildMode() : enterBuildMode(); });
buildExitBtn.addEventListener('click', exitBuildMode);

// ===================== Emotes =====================

const emoteToggleBtn = document.getElementById('emote-toggle-btn');
const emoteTrayEl = document.getElementById('emote-tray');
const emoteExitBtn = document.getElementById('emote-exit-btn');

function closeEmoteTray() { emoteTrayEl.classList.add('hidden'); }
emoteToggleBtn.addEventListener('click', () => {
  if (gameState !== 'playing' || uiBlocking) return;
  emoteTrayEl.classList.toggle('hidden');
});
emoteExitBtn.addEventListener('click', closeEmoteTray);
document.querySelectorAll('.emote-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    playEmote(btn.dataset.emote);
    closeEmoteTray();
  });
});

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let pointerDownX = 0, pointerDownY = 0;

canvas.addEventListener('pointerdown', (e) => { pointerDownX = e.clientX; pointerDownY = e.clientY; });
canvas.addEventListener('pointerup', (e) => {
  if (!buildModeActive) return;
  if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) return; // was a look-drag, not a click
  handleBuildClick(e);
});

function handleBuildClick(e) {
  if (!currentRoom) return;
  const rect = canvas.getBoundingClientRect();
  mouseNDC.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouseNDC, camera);

  if (placedMeshes.length) {
    const hits = raycaster.intersectObjects(placedMeshes, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && obj.userData.customIndex === undefined) obj = obj.parent;
      if (obj && obj.userData.customIndex !== undefined) {
        removeCustomItem(currentRoom.key, obj.userData.customIndex);
        return;
      }
    }
  }

  if (!selectedCatalogId) { showToast('Pick something from the tray first!'); return; }
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  const hitGround = raycaster.ray.intersectPlane(groundPlane, point);
  if (!hitGround) { showToast('Click somewhere lower, on the ground.'); return; }

  // A click near the top of the screen is a ray nearly parallel to the
  // ground, which can intersect it very far away. Cap the distance along
  // the ray itself (preserving direction) before falling back to clamping
  // x/z independently — clamping alone would snap far-off clicks to a
  // room corner instead of roughly where you actually pointed.
  const MAX_PLACE_DIST = 22;
  const dist = raycaster.ray.origin.distanceTo(point);
  if (dist > MAX_PLACE_DIST) {
    point.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, MAX_PLACE_DIST);
  }

  const half = ROOM_HALF - 1.5;
  point.x = Math.max(-half, Math.min(half, point.x));
  point.z = Math.max(-half, Math.min(11.5, point.z));
  if (Math.abs(point.x) < 3.2 && point.z < -11.5) { showToast("That's too close to the portal!"); return; }
  addCustomItem(currentRoom.key, selectedCatalogId, point.x, point.z, selectedColor, selectedScale);
  if (audioCtx) sfxPickup();
}

function randomOpenSpot() {
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * (ROOM_HALF * 1.6);
    const z = (Math.random() - 0.5) * 18;
    let ok = true;
    for (const o of currentRoom.obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 1) { ok = false; break; }
    }
    if (ok) return { x, z };
  }
  return { x: 0, z: 0 };
}

// ===================== Character customization =====================

const SKIN_SWATCHES = ['#ffdbac', '#f2c9a0', '#e0ac69', '#c68642', '#8d5524', '#3b2314'];
const HAIR_COLOR_SWATCHES = ['#3b2314', '#0b0b0b', '#8a5a34', '#ffd166', '#b892e8', '#ff6f91', '#f5efe0'];
const SHIRT_SWATCHES = ['#ff6f91', '#6bcf8f', '#b892e8', '#ffd166', '#7fd8e8', '#f5efe0', '#2b2140'];
const PANTS_SWATCHES = ['#3b3b58', '#2b2140', '#5b4326', '#6bcf8f', '#b892e8', '#f5efe0'];
const HAIRSTYLES = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'buns', label: 'Buns' },
  { id: 'bob', label: 'Bob' },
  { id: 'curly', label: 'Curly' },
  { id: 'bald', label: 'Bald' },
];
const ACCESSORY_OPTIONS = [
  { id: 'none', label: '🚫 None' },
  { id: 'bow', label: '🎀 Bow' },
  { id: 'cap', label: '🧢 Cap' },
  { id: 'headband', label: '➰ Headband' },
];
const ACCESSORY_COLOR_SWATCHES = ['#ff6f91', '#ffd166', '#b892e8', '#6bcf8f', '#7fd8e8', '#2b2140'];
// Real previews of the drawn face (not emoji, which don't match the in-game art at all) —
// each button renders the exact FACE_STYLES output at the player's current skin tone.
const FACE_OPTIONS = [
  { id: 'happy', label: 'Happy' },
  { id: 'wink', label: 'Wink' },
  { id: 'loved', label: 'Loved' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'grin', label: 'Grin' },
  { id: 'calm', label: 'Calm' },
  { id: 'blush', label: 'Blush' },
  { id: 'cheeky', label: 'Cheeky' },
];

function renderFaceIcon(canvas, faceId, skinCss) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / 128, canvas.height / 128);
  (FACE_STYLES[faceId] || FACE_STYLES.happy)(ctx, skinCss);
  ctx.restore();
}

function renderFaceOptions(container) {
  container.innerHTML = '';
  const skinCss = hexToCss(currentAppearance.skinColor);
  FACE_OPTIONS.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'face-choice-btn' + (currentAppearance.faceStyle === opt.id ? ' active' : '');
    const canvas = document.createElement('canvas');
    canvas.width = 48; canvas.height = 48;
    canvas.className = 'face-preview-canvas';
    renderFaceIcon(canvas, opt.id, skinCss);
    const label = document.createElement('span');
    label.textContent = opt.label;
    b.appendChild(canvas);
    b.appendChild(label);
    b.addEventListener('click', () => {
      currentAppearance.faceStyle = opt.id;
      applyAppearance(currentAppearance);
      saveAppearance(currentAppearance);
      container.querySelectorAll('.face-choice-btn').forEach((s) => s.classList.remove('active'));
      b.classList.add('active');
    });
    container.appendChild(b);
  });
}

function renderColorSwatchRow(container, colors, key, onChange) {
  container.innerHTML = '';
  colors.forEach((hex) => {
    const b = document.createElement('button');
    b.className = 'swatch-btn';
    b.style.background = hex;
    if (currentAppearance[key] && currentAppearance[key].toLowerCase() === hex.toLowerCase()) b.classList.add('active');
    b.addEventListener('click', () => {
      currentAppearance[key] = hex;
      applyAppearance(currentAppearance);
      saveAppearance(currentAppearance);
      container.querySelectorAll('.swatch-btn').forEach((s) => s.classList.remove('active'));
      b.classList.add('active');
      if (onChange) onChange();
    });
    container.appendChild(b);
  });
}
function renderChoiceRow(container, options, key) {
  container.innerHTML = '';
  options.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = opt.label;
    if (currentAppearance[key] === opt.id) b.classList.add('active');
    b.addEventListener('click', () => {
      currentAppearance[key] = opt.id;
      applyAppearance(currentAppearance);
      saveAppearance(currentAppearance);
      container.querySelectorAll('.choice-btn').forEach((s) => s.classList.remove('active'));
      b.classList.add('active');
    });
    container.appendChild(b);
  });
}

function openCustomizePanel() {
  const faceContainer = document.getElementById('face-swatches');
  renderColorSwatchRow(document.getElementById('skin-swatches'), SKIN_SWATCHES, 'skinColor', () => renderFaceOptions(faceContainer));
  renderColorSwatchRow(document.getElementById('hair-color-swatches'), HAIR_COLOR_SWATCHES, 'hairColor');
  renderChoiceRow(document.getElementById('hair-style-swatches'), HAIRSTYLES, 'hairStyle');
  renderColorSwatchRow(document.getElementById('shirt-swatches'), SHIRT_SWATCHES, 'shirtColor');
  renderColorSwatchRow(document.getElementById('pants-swatches'), PANTS_SWATCHES, 'pantsColor');
  renderChoiceRow(document.getElementById('accessory-swatches'), ACCESSORY_OPTIONS, 'accessory');
  renderColorSwatchRow(document.getElementById('accessory-color-swatches'), ACCESSORY_COLOR_SWATCHES, 'accessoryColor');
  renderFaceOptions(faceContainer);
  wasBlockingBeforeOverlay = uiBlocking;
  uiBlocking = true;
  document.getElementById('customize-modal').classList.remove('hidden');
}
function closeCustomizePanel() {
  document.getElementById('customize-modal').classList.add('hidden');
  uiBlocking = wasBlockingBeforeOverlay;
}
document.getElementById('customize-title-btn').addEventListener('click', openCustomizePanel);
document.getElementById('customize-hud-btn').addEventListener('click', () => {
  if (gameState !== 'playing' || (uiBlocking && !buildModeActive)) return;
  openCustomizePanel();
});
document.getElementById('customize-done-btn').addEventListener('click', closeCustomizePanel);

// ===================== "Ask Claude" idea helper =====================
// Calls the Anthropic API directly from the browser using her own API key
// (entered once, saved only in this browser's localStorage on this laptop).
// This needs an internet connection to work.

function loadAiSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('ah_ai_settings_v1')) || {}; } catch (e) { /* ignore */ }
  return { apiKey: s.apiKey || '', model: s.model || 'claude-opus-5-5' };
}
function saveAiSettings(s) {
  try { localStorage.setItem('ah_ai_settings_v1', JSON.stringify(s)); } catch (e) { /* ignore */ }
}
let aiSettings = loadAiSettings();

const aiModal = document.getElementById('ai-idea-modal');
const aiKeySetup = document.getElementById('ai-key-setup');
const aiChat = document.getElementById('ai-chat');
const aiKeyInput = document.getElementById('ai-key-input');
const aiModelSelect = document.getElementById('ai-model-select');
const aiResultEl = document.getElementById('ai-result');

function refreshAiPanel() {
  if (aiSettings.apiKey) {
    aiKeySetup.classList.add('hidden');
    aiChat.classList.remove('hidden');
    aiModelSelect.value = aiSettings.model;
  } else {
    aiKeySetup.classList.remove('hidden');
    aiChat.classList.add('hidden');
  }
}

document.getElementById('build-ai-btn').addEventListener('click', () => {
  refreshAiPanel();
  aiResultEl.innerHTML = '';
  aiModal.classList.remove('hidden');
});
document.getElementById('ai-close-btn').addEventListener('click', () => aiModal.classList.add('hidden'));
document.getElementById('ai-key-save-btn').addEventListener('click', () => {
  const key = aiKeyInput.value.trim();
  if (!key) return;
  aiSettings = { apiKey: key, model: aiModelSelect.value };
  saveAiSettings(aiSettings);
  aiKeyInput.value = '';
  refreshAiPanel();
});
document.getElementById('ai-forget-key-btn').addEventListener('click', () => {
  aiSettings = { apiKey: '', model: aiSettings.model };
  saveAiSettings(aiSettings);
  refreshAiPanel();
});
document.getElementById('ai-model-select').addEventListener('change', (e) => {
  aiSettings.model = e.target.value;
  saveAiSettings(aiSettings);
});

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function flowerSpinnerHtml() {
  return '<div class="flower-spinner small"><span class="petal"></span><span class="petal"></span>' +
    '<span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span>' +
    '<span class="petal"></span><span class="petal"></span><span class="core"></span></div>';
}

async function askClaudeForIdea() {
  const promptInput = document.getElementById('ai-prompt-input');
  const userWish = promptInput.value.trim();
  aiResultEl.innerHTML = `${flowerSpinnerHtml()}<p class="ai-loading-text">Thinking of something cute...</p>`;

  const roomName = currentRoom ? currentRoom.name : 'this room';
  const itemList = CATALOG.map((c) => c.id).join(', ');
  const system = `You are a cheerful creative helper inside a cozy Roblox-style 3D treasure hunt game, built as a one-year anniversary gift. The player is decorating the room "${roomName}" and wants a small, sweet decoration idea that fits a cute blocky pastel-colored world. Reply in EXACTLY this three-line format and nothing else:\nIDEA: <one warm, playful sentence describing the idea, written directly to the player>\nITEM: <exactly one of: ${itemList}>\nCOLOR: <a hex color like #ff6f91>`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: aiSettings.model || 'claude-opus-5-5',
        max_tokens: 300,
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: userWish || 'Surprise me with something sweet for this room.' }],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => null);
      const msg = errBody && errBody.error && errBody.error.message ? errBody.error.message : `Request failed (${resp.status})`;
      aiResultEl.innerHTML = `<p class="ai-error">That didn't work: ${escapeHtml(msg)}</p>`;
      return;
    }

    const data = await resp.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const text = textBlock ? textBlock.text : '';
    const ideaMatch = text.match(/IDEA:\s*(.+)/i);
    const itemMatch = text.match(/ITEM:\s*(\w+)/i);
    const colorMatch = text.match(/COLOR:\s*(#[0-9a-fA-F]{6})/);

    const idea = ideaMatch ? ideaMatch[1].trim() : (text.trim() || "Here's a little something for the room!");
    const itemId = (itemMatch && CATALOG_BY_ID[itemMatch[1].toLowerCase()]) ? itemMatch[1].toLowerCase() : 'flower';
    const def = CATALOG_BY_ID[itemId];
    const color = colorMatch ? new THREE.Color(colorMatch[1]).getHex() : (def.defaultColor || 0xff6f91);

    aiResultEl.innerHTML = `
      <p class="ai-idea-text">${escapeHtml(idea)}</p>
      <button id="ai-add-btn" class="chunky-btn small">✨ Add ${def.icon} to the room</button>
    `;
    document.getElementById('ai-add-btn').addEventListener('click', () => {
      const spot = randomOpenSpot();
      addCustomItem(currentRoom.key, itemId, spot.x, spot.z, color);
      showToast('Added to the room!');
      aiModal.classList.add('hidden');
    });
  } catch (err) {
    aiResultEl.innerHTML = '<p class="ai-error">Couldn\'t reach Claude — check your internet connection and API key.</p>';
  }
}
document.getElementById('ai-ask-btn').addEventListener('click', askClaudeForIdea);
