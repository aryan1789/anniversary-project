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
    obj.rotation.y = entry.rotationY || 0;
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

function addCustomItem(roomKey, itemId, x, z, color, scale, rotationY) {
  if (!customItems[roomKey]) customItems[roomKey] = [];
  customItems[roomKey].push({ itemId, x, z, color, scale: scale || 1, rotationY: rotationY || 0 });
  persistCustomItems();
  rebuildPlacedItems();
}

function clearRoomCustomItems(roomKey) {
  if (!customItems[roomKey] || !customItems[roomKey].length) { showToast('Nothing to clear here.'); return; }
  selectPlacedItem(null);
  customItems[roomKey] = [];
  persistCustomItems();
  rebuildPlacedItems();
  showToast('Cleared everything you built in this room.');
}

function removeCustomItem(roomKey, idx) {
  if (!customItems[roomKey]) return;
  customItems[roomKey].splice(idx, 1);
  persistCustomItems();
  rebuildPlacedItems();
  showToast('Removed.');
}

function onRoomBuilt() {
  hideGhost();
  selectPlacedItem(null);
  rebuildPlacedItems();
}

function updateCustomItems(dt, t) {
  if (selectedPlacedItem && selectionRing) {
    selectionRing.position.set(selectedPlacedItem.position.x, 0.03, selectedPlacedItem.position.z);
    updateItemContextMenuPosition();
  }
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
let pendingRotation = 0;

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
    pendingRotation = 0;
    selectPlacedItem(null);
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

// A HUD panel (help / customize / build) blocks the player while open, but
// clicking a different HUD button should switch straight to it instead of
// doing nothing — this is what makes that possible.
function anyHudPanelOpen() {
  return isHelpOpen() ||
    !document.getElementById('customize-modal').classList.contains('hidden') ||
    buildModeActive;
}
function closeAllPanels() {
  if (isHelpOpen()) closeHelpPanel();
  if (!document.getElementById('customize-modal').classList.contains('hidden')) closeCustomizePanel();
  if (buildModeActive) exitBuildMode();
  if (!emoteTrayEl.classList.contains('hidden')) closeEmoteTray();
  if (!aiModal.classList.contains('hidden')) aiModal.classList.add('hidden');
}

function enterBuildMode() {
  if (gameState !== 'playing') return;
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
  rightDownTarget = null;
  leftDownTarget = null;
  hideGhost();
  document.querySelectorAll('.catalog-item').forEach((b) => b.classList.remove('active'));
  document.getElementById('ai-idea-modal').classList.add('hidden');
  resetPanelPosition(buildTrayEl.querySelector('.build-panel'));
}
const buildClearBtn = document.getElementById('build-clear-btn');
if (buildClearBtn) {
  buildClearBtn.addEventListener('click', () => {
    if (currentRoom) clearRoomCustomItems(currentRoom.key);
  });
}
buildToggleBtn.addEventListener('click', () => {
  if (gameState !== 'playing') return;
  if (buildModeActive) { exitBuildMode(); return; }
  if (uiBlocking && !anyHudPanelOpen()) return;
  closeAllPanels();
  enterBuildMode();
});
buildExitBtn.addEventListener('click', exitBuildMode);

// ===================== Emotes =====================

const emoteToggleBtn = document.getElementById('emote-toggle-btn');
const emoteTrayEl = document.getElementById('emote-tray');
const emoteExitBtn = document.getElementById('emote-exit-btn');

function closeEmoteTray() { emoteTrayEl.classList.add('hidden'); }
emoteToggleBtn.addEventListener('click', () => {
  if (gameState !== 'playing') return;
  if (!emoteTrayEl.classList.contains('hidden')) { closeEmoteTray(); return; }
  if (uiBlocking && !anyHudPanelOpen()) return;
  closeAllPanels();
  emoteTrayEl.classList.remove('hidden');
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

// Right-click a placed item and let go without moving the mouse to remove
// it; right-click, drag, then let go to move it instead. Suppress the
// browser's own context menu in build mode so this doesn't fight it.
let rightDownTarget = null;
let rightDownX = 0, rightDownY = 0;
let rightDragged = false;

// Left-click a placed item (with nothing chosen from the catalog) to select
// it instead of placing something new; drag while selected to move it.
let leftDownTarget = null;
let leftDragged = false;

function screenToGroundPoint(e) {
  const rect = canvas.getBoundingClientRect();
  mouseNDC.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouseNDC, camera);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
}

// ---- Placement ghost: a ring + direction arrow that follows the cursor
// while an item is selected, so you can see where (and which way) it'll
// land before clicking. Scroll wheel rotates it. ----
let ghostGroup = null;
function ensureGhost() {
  if (ghostGroup) return ghostGroup;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.62, 28),
    new THREE.MeshBasicMaterial({ color: 0xff6f91, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.32, 4),
    new THREE.MeshBasicMaterial({ color: 0xff6f91, transparent: true, opacity: 0.8 })
  );
  arrow.rotation.z = -Math.PI / 2;
  arrow.position.set(0, 0.03, 0.72);
  ghostGroup = new THREE.Group();
  ghostGroup.add(ring, arrow);
  ghostGroup.renderOrder = 2;
  return ghostGroup;
}
function updateGhost(e) {
  if (!buildModeActive || !selectedCatalogId || !currentRoom) { hideGhost(); return; }
  const point = screenToGroundPoint(e);
  if (!point) return;
  const ghost = ensureGhost();
  if (!ghost.parent) scene.add(ghost);
  const half = ROOM_HALF - 1.5;
  ghost.position.set(Math.max(-half, Math.min(half, point.x)), 0.03, Math.max(-half, Math.min(11.5, point.z)));
  ghost.rotation.y = pendingRotation;
}
function hideGhost() {
  if (ghostGroup && ghostGroup.parent) ghostGroup.parent.remove(ghostGroup);
}
canvas.addEventListener('wheel', (e) => {
  if (!buildModeActive || !selectedCatalogId) return;
  e.preventDefault();
  pendingRotation += (e.deltaY > 0 ? 1 : -1) * (Math.PI / 8);
  if (ghostGroup) ghostGroup.rotation.y = pendingRotation;
}, { passive: false });

// ---- Selecting a placed item: click it (with no catalog item chosen) to
// select it, which shows a green ring under it plus a small toolbar with
// move / rotate / delete controls. Dragging a selected item with the left
// mouse button moves it; right-click still works as a quick shortcut. ----
let selectedPlacedItem = null;
let selectionRing = null;
const itemContextMenuEl = document.getElementById('item-context-menu');

// Selecting, moving and deleting a placed item works anytime during
// gameplay, not just with the build tray open — build mode is only
// needed to pick something new from the catalog to place.
function selectionAllowed() {
  return gameState === 'playing' && (buildModeActive ? !selectedCatalogId : !uiBlocking);
}
// Right-click never competes with placing a new item (that's always left-click),
// so it stays available even while a catalog item is selected for placing.
function rightClickAllowed() {
  return gameState === 'playing' && (buildModeActive || !uiBlocking);
}

function ensureSelectionRing() {
  if (selectionRing) return selectionRing;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 28),
    new THREE.MeshBasicMaterial({ color: 0x6bcf8f, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  selectionRing = ring;
  return ring;
}

function selectPlacedItem(obj) {
  selectedPlacedItem = obj;
  if (!obj || !currentRoom) {
    if (selectionRing && selectionRing.parent) selectionRing.parent.remove(selectionRing);
    itemContextMenuEl.classList.add('hidden');
    itemContextMenuEl.innerHTML = '';
    return;
  }
  const ring = ensureSelectionRing();
  if (!ring.parent) scene.add(ring);
  ring.position.set(obj.position.x, 0.03, obj.position.z);
  itemContextMenuEl.innerHTML =
    '<button id="selected-rotate-btn" class="item-menu-btn" title="Rotate">↺</button>' +
    '<button id="selected-delete-btn" class="item-menu-btn danger" title="Delete">🗑️</button>';
  itemContextMenuEl.classList.remove('hidden');
  document.getElementById('selected-rotate-btn').addEventListener('click', rotateSelectedItem);
  document.getElementById('selected-delete-btn').addEventListener('click', deleteSelectedItem);
  updateItemContextMenuPosition();
  if (!buildModeActive) {
    try {
      if (!localStorage.getItem('ah_item_select_hint_shown')) {
        showToast('Drag it to move, or use the buttons above to rotate or delete it.', 4000);
        localStorage.setItem('ah_item_select_hint_shown', '1');
      }
    } catch (e) { /* ignore */ }
  }
}

function updateItemContextMenuPosition() {
  if (!selectedPlacedItem || itemContextMenuEl.classList.contains('hidden')) return;
  const pos = selectedPlacedItem.position.clone();
  pos.y += 1.6;
  pos.project(camera);
  if (pos.z > 1) return; // behind the camera — leave the menu where it last was
  const rect = canvas.getBoundingClientRect();
  itemContextMenuEl.style.left = (rect.left + (pos.x * 0.5 + 0.5) * rect.width) + 'px';
  itemContextMenuEl.style.top = (rect.top + (-pos.y * 0.5 + 0.5) * rect.height) + 'px';
}

function reselectByIndex(idx) {
  const obj = placedMeshes.find((m) => m.userData.customIndex === idx);
  selectPlacedItem(obj || null);
}

function rotateSelectedItem() {
  if (!selectedPlacedItem || !currentRoom) return;
  const idx = selectedPlacedItem.userData.customIndex;
  const list = customItems[currentRoom.key];
  if (!list || !list[idx]) return;
  list[idx].rotationY = (list[idx].rotationY || 0) + Math.PI / 8;
  persistCustomItems();
  rebuildPlacedItems();
  reselectByIndex(idx);
}

function deleteSelectedItem() {
  if (!selectedPlacedItem || !currentRoom) return;
  const idx = selectedPlacedItem.userData.customIndex;
  selectPlacedItem(null);
  removeCustomItem(currentRoom.key, idx);
}

function pickPlacedItemAt(e) {
  if (!currentRoom || !placedMeshes.length) return null;
  const rect = canvas.getBoundingClientRect();
  mouseNDC.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(placedMeshes, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && obj.userData.customIndex === undefined) obj = obj.parent;
  return obj || null;
}

canvas.addEventListener('contextmenu', (e) => { if (rightClickAllowed()) e.preventDefault(); });

canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 2) {
    rightDownX = e.clientX; rightDownY = e.clientY;
    rightDragged = false;
    rightDownTarget = rightClickAllowed() ? pickPlacedItemAt(e) : null;
    if (rightDownTarget) dragging = false; // don't let the camera spin while dragging an item
    return;
  }
  if (e.button !== 0) return;
  pointerDownX = e.clientX; pointerDownY = e.clientY;
  leftDragged = false;
  leftDownTarget = selectionAllowed() ? pickPlacedItemAt(e) : null;
  if (leftDownTarget) dragging = false;
});
canvas.addEventListener('pointermove', (e) => {
  updateGhost(e);
  if (rightDownTarget) {
    if (!rightDragged && Math.hypot(e.clientX - rightDownX, e.clientY - rightDownY) > 6) rightDragged = true;
    if (rightDragged) {
      hideGhost();
      const point = screenToGroundPoint(e);
      if (point) {
        const half = ROOM_HALF - 1.5;
        rightDownTarget.position.x = Math.max(-half, Math.min(half, point.x));
        rightDownTarget.position.z = Math.max(-half, Math.min(11.5, point.z));
      }
    }
    return;
  }
  if (leftDownTarget) {
    if (!leftDragged && Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) leftDragged = true;
    if (leftDragged) {
      hideGhost();
      const point = screenToGroundPoint(e);
      if (point) {
        const half = ROOM_HALF - 1.5;
        leftDownTarget.position.x = Math.max(-half, Math.min(half, point.x));
        leftDownTarget.position.z = Math.max(-half, Math.min(11.5, point.z));
        if (selectionRing) selectionRing.position.set(leftDownTarget.position.x, 0.03, leftDownTarget.position.z);
      }
    }
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (e.button === 2) {
    if (!rightDownTarget || !currentRoom) { rightDownTarget = null; return; }
    const idx = rightDownTarget.userData.customIndex;
    const list = customItems[currentRoom.key];
    if (rightDragged) {
      if (list && list[idx]) {
        list[idx].x = rightDownTarget.position.x;
        list[idx].z = rightDownTarget.position.z;
        persistCustomItems();
        rebuildPlacedItems();
        if (selectedPlacedItem && selectedPlacedItem.userData.customIndex === idx) reselectByIndex(idx);
        showToast('Moved.');
      }
    } else {
      if (selectedPlacedItem && selectedPlacedItem.userData.customIndex === idx) selectPlacedItem(null);
      removeCustomItem(currentRoom.key, idx);
    }
    rightDownTarget = null;
    return;
  }
  if (e.button !== 0) return;
  if (gameState !== 'playing') return;
  const dragDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
  if (buildModeActive && selectedCatalogId) {
    if (dragDist > 6) return; // was a look-drag, not a click
    handleBuildClick(e);
    leftDownTarget = null;
    return;
  }
  if (leftDownTarget) {
    const idx = leftDownTarget.userData.customIndex;
    const list = currentRoom && customItems[currentRoom.key];
    if (leftDragged) {
      if (list && list[idx]) {
        list[idx].x = leftDownTarget.position.x;
        list[idx].z = leftDownTarget.position.z;
        persistCustomItems();
        rebuildPlacedItems();
        reselectByIndex(idx);
        showToast('Moved.');
      }
    } else {
      selectPlacedItem(leftDownTarget);
    }
  } else if (dragDist <= 6 && selectionAllowed()) {
    selectPlacedItem(null); // clicked empty ground — deselect
  }
  leftDownTarget = null;
});

function handleBuildClick(e) {
  if (!currentRoom) return;
  if (!selectedCatalogId) { showToast('Pick something from the tray first!'); return; }
  const rect = canvas.getBoundingClientRect();
  mouseNDC.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouseNDC, camera);
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
  addCustomItem(currentRoom.key, selectedCatalogId, point.x, point.z, selectedColor, selectedScale, pendingRotation);
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

// ---- Draggable popups: grab a panel by its header/title and move it
// anywhere on screen, so it never has to sit wherever it opened if that's
// in the way. Dragging converts the panel to a fixed left/top position on
// the fly, regardless of however its CSS normally places it; closing the
// panel puts that back so it reopens in its default spot next time. ----
function makePanelDraggable(panelEl, handleEl) {
  let dragState = null;
  handleEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const rect = panelEl.getBoundingClientRect();
    panelEl.style.position = 'fixed';
    panelEl.style.left = rect.left + 'px';
    panelEl.style.top = rect.top + 'px';
    panelEl.style.right = 'auto';
    panelEl.style.bottom = 'auto';
    panelEl.style.margin = '0';
    dragState = { offX: e.clientX - rect.left, offY: e.clientY - rect.top };
    handleEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handleEl.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    const maxX = window.innerWidth - panelEl.offsetWidth;
    const maxY = window.innerHeight - panelEl.offsetHeight;
    panelEl.style.left = Math.max(0, Math.min(maxX, e.clientX - dragState.offX)) + 'px';
    panelEl.style.top = Math.max(0, Math.min(maxY, e.clientY - dragState.offY)) + 'px';
  });
  handleEl.addEventListener('pointerup', () => { dragState = null; });
  handleEl.addEventListener('pointercancel', () => { dragState = null; });
}
function resetPanelPosition(panelEl) {
  if (!panelEl) return;
  ['position', 'left', 'top', 'right', 'bottom', 'margin'].forEach((p) => panelEl.style.removeProperty(p));
}
makePanelDraggable(document.querySelector('#customize-modal .customize-panel'), document.querySelector('#customize-modal .customize-panel h2'));
makePanelDraggable(buildTrayEl.querySelector('.build-panel'), buildTrayEl.querySelector('.build-header'));

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
  uiBlocking = true;
  customizeZoom = true;
  document.getElementById('customize-modal').classList.remove('hidden');
}
function closeCustomizePanel() {
  document.getElementById('customize-modal').classList.add('hidden');
  uiBlocking = false;
  customizeZoom = false;
  resetPanelPosition(document.querySelector('#customize-modal .customize-panel'));
}
document.getElementById('customize-hud-btn').addEventListener('click', () => {
  if (gameState !== 'playing') return;
  if (!document.getElementById('customize-modal').classList.contains('hidden')) { closeCustomizePanel(); return; }
  if (uiBlocking && !anyHudPanelOpen()) return;
  closeAllPanels();
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
