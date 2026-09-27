// ===================== Renderer / camera setup =====================

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let scene = new THREE.Scene();
let currentRoom = null;
let gameState = 'title'; // title | playing | finale
let uiBlocking = false;
let activeInteractable = null;

// ===================== Small reusable art helpers =====================

function makeToonGradient() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const ctx = c.getContext('2d');
  ['#5a5a5a', '#8f8f8f', '#c9c9c9', '#ffffff'].forEach((color, i) => {
    ctx.fillStyle = color; ctx.fillRect(i, 0, 1, 1);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
const TOON_GRADIENT = makeToonGradient();
function toonMat(color) { return new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRADIENT }); }

// cheap cel-shading outline: a black backface shell, slightly bigger than the mesh
function addOutline(mesh, color = 0x2b2140, scale = 1.08) {
  const outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  outline.scale.setScalar(scale);
  mesh.add(outline);
}

function makeGlowTexture(inner, outer) {
  const size = 128;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeHeartTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(32, 20);
  ctx.bezierCurveTo(32, 6, 0, 6, 0, 26);
  ctx.bezierCurveTo(0, 46, 32, 60, 32, 60);
  ctx.bezierCurveTo(32, 60, 64, 46, 64, 26);
  ctx.bezierCurveTo(64, 6, 32, 6, 32, 20);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

function makeSprite(texture, size, opacity = 1) {
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, size);
  return sprite;
}

const HEART_TEX_PINK = makeHeartTexture('#ff6f91');
const HEART_TEX_GOLD = makeHeartTexture('#ffd166');
const GLOW_TEX_GOLD = makeGlowTexture('rgba(255,224,140,0.95)', 'rgba(255,224,140,0)');
const GLOW_TEX_PURPLE = makeGlowTexture('rgba(200,160,255,0.9)', 'rgba(200,160,255,0)');
const GLOW_TEX_WHITE = makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');

function addBaseLighting(scn, skyColor, groundColor) {
  scn.background = new THREE.Color(skyColor);
  scn.fog = new THREE.Fog(skyColor, 20, 46);
  const hemi = new THREE.HemisphereLight(skyColor, groundColor, 0.55);
  scn.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  sun.position.set(10, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scn.add(sun);
  scn.add(new THREE.AmbientLight(0xffffff, 0.18));
}

function makeGround(color, half = 14) {
  const geo = new THREE.PlaneGeometry(half * 2, half * 2, 1, 1);
  const mesh = new THREE.Mesh(geo, toonMat(color));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function makeTree(x, z, hue = 0x4fae63) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.4, 6), toonMat(0x8a5a34));
  trunk.position.y = 0.7; trunk.castShadow = true; addOutline(trunk);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.0, 7), toonMat(hue));
  leaves.position.y = 2.3; leaves.castShadow = true; addOutline(leaves);
  group.add(trunk, leaves);
  group.position.set(x, 0, z);
  return group;
}

function makeRock(x, z) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), toonMat(0x8b8a9c));
  rock.position.set(x, 0.45, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  addOutline(rock);
  return rock;
}

function makeFlower(x, z, color) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), toonMat(0x4fae63));
  stem.position.y = 0.25;
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), toonMat(color));
  bloom.position.y = 0.55;
  group.add(stem, bloom);
  group.position.set(x, 0, z);
  return group;
}

// ===================== Player character =====================

function makeLimb(w, h, d, mat) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.y = -h / 2;
  mesh.castShadow = true;
  addOutline(mesh);
  pivot.add(mesh);
  return pivot;
}

function buildCharacter() {
  const shirtMat = toonMat(new THREE.Color(GAME_CONTENT.characterShirtColor));
  const skinMat = toonMat(new THREE.Color(GAME_CONTENT.characterSkinColor));
  const hairMat = toonMat(new THREE.Color(GAME_CONTENT.characterHairColor));
  const pantsMat = toonMat(0x3b3b58);

  const root = new THREE.Group();

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), skinMat);
  head.position.y = 1.95; head.castShadow = true; addOutline(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.9), hairMat);
  hair.position.y = 0.38; addOutline(hair);
  head.add(hair);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), shirtMat);
  torso.position.y = 1.15; torso.castShadow = true; addOutline(torso);

  const armL = makeLimb(0.3, 0.95, 0.3, shirtMat); armL.position.set(-0.58, 1.55, 0);
  const armR = makeLimb(0.3, 0.95, 0.3, shirtMat); armR.position.set(0.58, 1.55, 0);
  const legL = makeLimb(0.34, 0.9, 0.34, pantsMat); legL.position.set(-0.24, 0.9, 0);
  const legR = makeLimb(0.34, 0.9, 0.34, pantsMat); legR.position.set(0.24, 0.9, 0);

  root.add(head, torso, armL, armR, legL, legR);
  root.scale.setScalar(0.95);

  return { root, armL, armR, legL, legR };
}

const character = buildCharacter();
const player = character.root;
let walkT = 0;

function animateWalk(moving, dt) {
  if (moving) {
    walkT += dt * 8;
    const swing = Math.sin(walkT) * 0.6;
    character.armL.rotation.x = swing;
    character.armR.rotation.x = -swing;
    character.legL.rotation.x = -swing;
    character.legR.rotation.x = swing;
  } else {
    walkT = 0;
    character.armL.rotation.x *= 0.8;
    character.armR.rotation.x *= 0.8;
    character.legL.rotation.x *= 0.8;
    character.legR.rotation.x *= 0.8;
  }
}

// ===================== Portal / chest builders =====================

function makePortal(locked, glowColor = '#ffd166') {
  const group = new THREE.Group();
  const pillarMat = toonMat(0x746a8f);
  const pillarGeo = new THREE.BoxGeometry(0.6, 4.2, 0.6);
  const pillarL = new THREE.Mesh(pillarGeo, pillarMat); pillarL.position.set(-2.4, 2.1, 0); pillarL.castShadow = true; addOutline(pillarL);
  const pillarR = new THREE.Mesh(pillarGeo, pillarMat); pillarR.position.set(2.4, 2.1, 0); pillarR.castShadow = true; addOutline(pillarR);
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.6, 0.6), pillarMat); top.position.set(0, 4.2, 0); top.castShadow = true; addOutline(top);
  group.add(pillarL, pillarR, top);

  const fieldTex = locked ? makeGlowTexture('rgba(90,80,110,0.5)', 'rgba(90,80,110,0)') : GLOW_TEX_GOLD;
  const field = new THREE.Sprite(new THREE.SpriteMaterial({ map: fieldTex, transparent: true, depthWrite: false }));
  field.scale.set(4.2, 4.2, 1);
  field.position.set(0, 2.1, 0);
  group.add(field);

  let light = null;
  if (!locked) {
    light = new THREE.PointLight(new THREE.Color(glowColor), 1.2, 8);
    light.position.set(0, 2.1, 0);
    group.add(light);
  }

  return { group, field, light, locked };
}

function makeChest() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.0), toonMat(0x9a6a34));
  base.position.y = 0.45; base.castShadow = true; addOutline(base);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.9, -0.5);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.0), toonMat(0xb47f3e));
  lid.position.set(0, 0.25, 0.5);
  lid.castShadow = true; addOutline(lid);
  lidPivot.add(lid);
  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.1), toonMat(0xffd166));
  clasp.position.set(0, 0.75, 0.02);
  group.add(base, lidPivot, clasp);
  return { group, lidPivot };
}

// ===================== Collision / bounds =====================

const ROOM_HALF = 13.2;
const PORTAL_X = 0, PORTAL_Z = -13.4;

function clampToRoom(pos, locked) {
  pos.x = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, pos.x));
  const backLimit = locked ? -11.6 : -15.5;
  pos.z = Math.max(backLimit, Math.min(ROOM_HALF, pos.z));
}

function resolveObstacles(pos, obstacles) {
  for (const o of obstacles) {
    const dx = pos.x - o.x, dz = pos.z - o.z;
    const dist = Math.hypot(dx, dz);
    const minDist = o.r + 0.55;
    if (dist < minDist && dist > 0.0001) {
      const push = minDist - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
    }
  }
}

// ===================== Camera / input =====================

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && activeInteractable && !uiBlocking && gameState === 'playing') {
    activeInteractable.onInteract();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let cameraYaw = Math.PI;
let dragging = false, lastX = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (e) => {
  if (dragging) { cameraYaw -= (e.clientX - lastX) * 0.006; lastX = e.clientX; }
});

function horizDist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

const PLAYER_SPEED = 6.2;

function updatePlayer(dt) {
  const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
  const right = new THREE.Vector3(Math.sin(cameraYaw - Math.PI / 2), 0, Math.cos(cameraYaw - Math.PI / 2));
  const move = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp']) move.add(forward);
  if (keys['KeyS'] || keys['ArrowDown']) move.sub(forward);
  if (keys['KeyA'] || keys['ArrowLeft']) move.sub(right);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);
  const moving = move.lengthSq() > 0 && !uiBlocking;

  if (moving) {
    move.normalize().multiplyScalar(PLAYER_SPEED * dt);
    player.position.add(move);
    const targetAngle = Math.atan2(move.x, move.z);
    player.rotation.y = lerpAngle(player.rotation.y, targetAngle, 0.25);
  }

  if (currentRoom) {
    clampToRoom(player.position, currentRoom.portal ? currentRoom.portal.locked : false);
    resolveObstacles(player.position, currentRoom.obstacles);
  }
  animateWalk(moving, dt);

  const camOffset = new THREE.Vector3(Math.sin(cameraYaw) * -6.5, 4.4, Math.cos(cameraYaw) * -6.5);
  const camTarget = player.position.clone().add(camOffset);
  camera.position.lerp(camTarget, 0.12);
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)));

  if (currentRoom && currentRoom.portal && !currentRoom.portal.locked) {
    if (player.position.z < -13.6 && Math.abs(player.position.x) < 2.6 && currentRoom.onExit) {
      currentRoom.onExit();
    }
  }
}

// ===================== Interaction / UI plumbing =====================

const promptEl = document.getElementById('interact-prompt');
const hudEl = document.getElementById('hud');
const roomLabelEl = document.getElementById('room-label');
const milestoneCounterEl = document.getElementById('milestone-counter');
const fadeEl = document.getElementById('fade-overlay');
const toastEl = document.getElementById('toast');

function updateInteractions() {
  if (uiBlocking || !currentRoom) { promptEl.classList.add('hidden'); activeInteractable = null; return; }
  let nearest = null, nearestDist = 2.1;
  for (const it of currentRoom.interactables) {
    if (it.done) continue;
    const d = horizDist(player.position, it.getPosition());
    if (d < nearestDist) { nearestDist = d; nearest = it; }
  }
  activeInteractable = nearest;
  if (nearest) {
    promptEl.textContent = '[E] ' + nearest.prompt;
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }
}

let toastTimer = null;
function showToast(text, ms = 2400) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
}

// ---- Dialogue sequence ----
const dialogueBoxEl = document.getElementById('dialogue-box');
const dialogueTextEl = document.getElementById('dialogue-text');
const dialogueNextBtn = document.getElementById('dialogue-next');

function playDialogue(lines, onDone) {
  uiBlocking = true;
  let i = 0;
  dialogueBoxEl.classList.remove('hidden');
  dialogueTextEl.textContent = lines[0] || '';
  dialogueNextBtn.textContent = lines.length > 1 ? 'Next ▸' : 'Okay';
  function advance() {
    i++;
    if (i >= lines.length) {
      dialogueBoxEl.classList.add('hidden');
      dialogueNextBtn.removeEventListener('click', advance);
      uiBlocking = false;
      if (onDone) onDone();
      return;
    }
    dialogueTextEl.textContent = lines[i];
    dialogueNextBtn.textContent = i === lines.length - 1 ? 'Okay' : 'Next ▸';
  }
  dialogueNextBtn.addEventListener('click', advance);
}

// ---- Memory card ----
const memoryCardEl = document.getElementById('memory-card');
const memoryTitleEl = document.getElementById('memory-title');
const memoryTextEl = document.getElementById('memory-text');
const memoryCloseBtn = document.getElementById('memory-close');

function showMemoryCard(title, text, onDone) {
  uiBlocking = true;
  memoryTitleEl.textContent = title;
  memoryTextEl.textContent = text;
  memoryCardEl.classList.remove('hidden');
  function close() {
    memoryCardEl.classList.add('hidden');
    memoryCloseBtn.removeEventListener('click', close);
    uiBlocking = false;
    if (onDone) onDone();
  }
  memoryCloseBtn.addEventListener('click', close);
}

// ---- Milestone mini popup ----
const milestonePopupEl = document.getElementById('milestone-popup');
const milestonePopupTitleEl = document.getElementById('milestone-popup-title');
const milestonePopupTextEl = document.getElementById('milestone-popup-text');
let milestonePopupTimer = null;

function showMilestonePopup(title, text) {
  milestonePopupTitleEl.textContent = title;
  milestonePopupTextEl.textContent = text;
  milestonePopupEl.classList.remove('hidden');
  clearTimeout(milestonePopupTimer);
  milestonePopupTimer = setTimeout(() => milestonePopupEl.classList.add('hidden'), 3200);
}

// ---- Riddle modal ----
const riddleModalEl = document.getElementById('riddle-modal');
const riddleIntroEl = document.getElementById('riddle-intro');
const riddleQuestionEl = document.getElementById('riddle-question');
const riddleInputEl = document.getElementById('riddle-input');
const riddleSubmitBtn = document.getElementById('riddle-submit');
const riddleHintBtn = document.getElementById('riddle-hint-btn');
const riddleFeedbackEl = document.getElementById('riddle-feedback');

function openRiddle(content, onCorrect) {
  uiBlocking = true;
  riddleIntroEl.textContent = content.riddleIntro;
  riddleQuestionEl.textContent = content.riddleQuestion;
  riddleInputEl.value = '';
  riddleFeedbackEl.textContent = '';
  riddleFeedbackEl.className = '';
  riddleModalEl.classList.remove('hidden');
  riddleInputEl.focus();

  let wrongAttempts = 0;

  function onSubmit() {
    const answer = riddleInputEl.value.trim().toLowerCase();
    const correct = content.riddleAnswer.trim().toLowerCase();
    if (answer.length && answer === correct) {
      riddleFeedbackEl.textContent = content.correctResponse;
      riddleFeedbackEl.className = 'correct';
      cleanup();
      setTimeout(() => {
        riddleModalEl.classList.add('hidden');
        uiBlocking = false;
        onCorrect();
      }, 1400);
    } else {
      wrongAttempts++;
      riddleFeedbackEl.textContent = 'Not quite... try again!';
      riddleFeedbackEl.className = 'wrong';
      riddleModalEl.querySelector('.riddle-panel').classList.add('shake');
      setTimeout(() => riddleModalEl.querySelector('.riddle-panel').classList.remove('shake'), 400);
    }
  }
  function onHint() {
    riddleFeedbackEl.textContent = 'Hint: ' + content.riddleHint;
    riddleFeedbackEl.className = '';
  }
  function onKey(e) { if (e.key === 'Enter') onSubmit(); }
  function cleanup() {
    riddleSubmitBtn.removeEventListener('click', onSubmit);
    riddleHintBtn.removeEventListener('click', onHint);
    riddleInputEl.removeEventListener('keydown', onKey);
  }
  riddleSubmitBtn.addEventListener('click', onSubmit);
  riddleHintBtn.addEventListener('click', onHint);
  riddleInputEl.addEventListener('keydown', onKey);
}

// ===================== Audio (tiny WebAudio blips) =====================

let audioCtx = null;
function beep(freq, dur = 0.15, type = 'sine', vol = 0.15, delay = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}
function sfxPickup() { beep(660, 0.12, 'triangle', 0.14); beep(880, 0.16, 'triangle', 0.12, 0.08); }
function sfxCorrect() { beep(520, 0.12, 'sine', 0.15); beep(660, 0.12, 'sine', 0.15, 0.1); beep(880, 0.2, 'sine', 0.15, 0.2); }
function sfxWrong() { beep(180, 0.2, 'sawtooth', 0.08); }
function sfxOpen() { beep(300, 0.2, 'triangle', 0.12); beep(500, 0.25, 'triangle', 0.12, 0.15); beep(760, 0.35, 'triangle', 0.14, 0.3); }
function sfxUnlock() { beep(440, 0.15, 'sine', 0.12); beep(660, 0.2, 'sine', 0.12, 0.12); }

// ===================== Confetti =====================

const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiRunning = false;
const CONFETTI_COLORS = ['#ff6f91', '#ffd166', '#b892e8', '#6bcf8f', '#ffffff'];

function startConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.5,
    vy: 2 + Math.random() * 3,
    vx: -1 + Math.random() * 2,
    size: 6 + Math.random() * 7,
    rot: Math.random() * Math.PI,
    vr: -0.15 + Math.random() * 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
  confettiRunning = true;
  requestAnimationFrame(stepConfetti);
}
function stepConfetti() {
  if (!confettiRunning) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let anyAlive = false;
  for (const p of confettiParticles) {
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    if (p.y < confettiCanvas.height + 20) anyAlive = true;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    confettiCtx.restore();
  }
  if (anyAlive && confettiRunning) requestAnimationFrame(stepConfetti);
  else confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// ===================== Room builders =====================

function baseRoomShell(name, sky, ground, half = 14) {
  const scn = new THREE.Scene();
  addBaseLighting(scn, sky, ground);
  scn.add(makeGround(ground, half));
  return scn;
}

function makeAmbientHearts(scn, count, tex, minY, maxY) {
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const s = makeSprite(tex, 0.6 + Math.random() * 0.4, 0.85);
    s.position.set((Math.random() - 0.5) * 24, minY + Math.random() * (maxY - minY), (Math.random() - 0.5) * 24);
    s.userData.phase = Math.random() * Math.PI * 2;
    s.userData.baseY = s.position.y;
    scn.add(s);
    sprites.push(s);
  }
  return sprites;
}

function makeSun(scn, color = GLOW_TEX_GOLD) {
  const sun = makeSprite(color, 10, 1);
  sun.position.set(-18, 20, -22);
  scn.add(sun);
}

function makeStars(scn, count = 60) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const s = makeSprite(GLOW_TEX_WHITE, 0.25 + Math.random() * 0.35, 0.6 + Math.random() * 0.4);
    s.position.set((Math.random() - 0.5) * 60, 8 + Math.random() * 20, (Math.random() - 0.5) * 60);
    group.add(s);
  }
  scn.add(group);
  const moon = makeSprite(GLOW_TEX_WHITE, 6, 0.8);
  moon.position.set(16, 18, -20);
  scn.add(moon);
}

function buildRoom1() {
  const scn = baseRoomShell('room1', 0xbfe3ff, 0x7bc47f);
  const obstacles = [];
  makeSun(scn);

  const treeSpots = [[-10, -4], [10, -6], [-6, 8], [9, 9], [-11, 1], [12, 2]];
  treeSpots.forEach(([x, z]) => { scn.add(makeTree(x, z)); obstacles.push({ x, z, r: 1.1 }); });

  const signpost = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 6), toonMat(0x8a5a34));
  post.position.y = 0.8; post.castShadow = true; addOutline(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.15), toonMat(0xffd166));
  board.position.y = 1.55; board.castShadow = true; addOutline(board);
  signpost.add(post, board);
  signpost.position.set(0, 0, 3);
  scn.add(signpost);

  const rockX = -8, rockZ = -3;
  scn.add(makeRock(rockX, rockZ));
  obstacles.push({ x: rockX, z: rockZ, r: 0.9 });

  const key = new THREE.Group();
  const keyGlow = makeSprite(GLOW_TEX_GOLD, 1.6, 0.9);
  const keyCore = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 16), toonMat(0xffd166));
  keyCore.rotation.x = Math.PI / 2;
  const keyStem = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), toonMat(0xffd166));
  keyStem.position.y = -0.32;
  key.add(keyGlow, keyCore, keyStem);
  key.position.set(rockX + 1.1, 1.1, rockZ + 0.4);
  scn.add(key);

  const ambientHearts = makeAmbientHearts(scn, 8, HEART_TEX_PINK, 3, 8);

  const portalObj = makePortal(true);
  portalObj.group.position.set(PORTAL_X, 0, PORTAL_Z);
  scn.add(portalObj.group);

  const interactables = [
    {
      prompt: 'Talk',
      done: false,
      getPosition: () => signpost.position,
      onInteract() {
        this.done = true;
        playDialogue(GAME_CONTENT.room1.introDialogue);
      },
    },
    {
      prompt: 'Pick up the glowing key',
      done: false,
      getPosition: () => key.position,
      onInteract() {
        this.done = true;
        if (audioCtx) sfxPickup();
        scn.remove(key);
        showMemoryCard(GAME_CONTENT.room1.memoryTitle, GAME_CONTENT.room1.memoryText, () => {
          portalObj.locked = false;
          scn.remove(portalObj.group);
          const unlocked = makePortal(false);
          unlocked.group.position.set(PORTAL_X, 0, PORTAL_Z);
          scn.add(unlocked.group);
          currentRoom.portal = unlocked;
          if (audioCtx) sfxUnlock();
          showToast('The path forward has opened!');
        });
      },
    },
  ];

  return {
    scene: scn,
    name: GAME_CONTENT.room1.name,
    spawn: new THREE.Vector3(0, 0, 11),
    obstacles,
    interactables,
    portal: portalObj,
    update(dt, t) {
      key.rotation.y += dt;
      key.position.y = 1.1 + Math.sin(t * 2) * 0.08;
      ambientHearts.forEach(h => { h.position.y = h.userData.baseY + Math.sin(t + h.userData.phase) * 0.4; });
    },
    onExit() { setRoom(buildRoom2); },
  };
}

function buildRoom2() {
  const scn = baseRoomShell('room2', 0xd9c8f5, 0xc9a7e0);
  const obstacles = [];
  makeSun(scn);

  const flowerColors = [0xff6f91, 0xffd166, 0xffffff, 0xb892e8];
  for (let i = 0; i < 16; i++) {
    const x = (Math.random() - 0.5) * 24;
    const z = (Math.random() - 0.5) * 22;
    if (Math.abs(x) < 2 && z < 4 && z > -14) continue;
    scn.add(makeFlower(x, z, flowerColors[i % flowerColors.length]));
  }

  const rockSpots = [[-9, 5], [9, 6], [-10, -8], [10, -9]];
  rockSpots.forEach(([x, z]) => { scn.add(makeRock(x, z)); obstacles.push({ x, z, r: 0.9 }); });

  const signpost = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 6), toonMat(0x8a5a34));
  post.position.y = 0.8; addOutline(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.15), toonMat(0xb892e8));
  board.position.y = 1.6; addOutline(board);
  signpost.add(post, board);
  signpost.position.set(0, 0, 1);
  scn.add(signpost);

  const portalObj = makePortal(true);
  portalObj.group.position.set(PORTAL_X, 0, PORTAL_Z);
  scn.add(portalObj.group);

  const interactables = [{
    prompt: 'Read the riddle',
    done: false,
    getPosition: () => signpost.position,
    onInteract() {
      openRiddle(GAME_CONTENT.room2, () => {
        this.done = true;
        if (audioCtx) sfxCorrect();
        currentRoom.portal.locked = false;
        scn.remove(currentRoom.portal.group);
        const unlocked = makePortal(false, '#b892e8');
        unlocked.group.position.set(PORTAL_X, 0, PORTAL_Z);
        scn.add(unlocked.group);
        currentRoom.portal = unlocked;
        showToast('The garden path has opened!');
      });
    },
  }];

  return {
    scene: scn,
    name: GAME_CONTENT.room2.name,
    spawn: new THREE.Vector3(0, 0, 11),
    obstacles,
    interactables,
    portal: portalObj,
    update() {},
    onExit() { setRoom(buildRoom3); },
  };
}

function buildRoom3() {
  const scn = baseRoomShell('room3', 0xffd9b3, 0xe8c07d);
  const obstacles = [];
  makeSun(scn);

  const palmSpots = [[12, -10], [-12, -9], [11, 9], [-11, 8]];
  palmSpots.forEach(([x, z]) => { scn.add(makeTree(x, z, 0x7fbf5a)); obstacles.push({ x, z, r: 1.0 }); });

  const orbSpots = [
    { x: 8, z: 4 }, { x: -8, z: 3 }, { x: 5, z: -7 }, { x: -6, z: -8 },
  ];
  const milestones = GAME_CONTENT.room3.milestones;
  let collected = 0;

  const orbMeshes = orbSpots.map((spot, i) => {
    const group = new THREE.Group();
    const glow = makeSprite(GLOW_TEX_GOLD, 1.3, 0.85);
    const heart = makeSprite(HEART_TEX_PINK, 0.7, 1);
    group.add(glow, heart);
    group.position.set(spot.x, 1.4, spot.z);
    group.userData.phase = i * 1.3;
    scn.add(group);
    return { group, milestone: milestones[i] || { title: 'Memory', text: '...' } };
  });

  const interactables = orbMeshes.map((orb) => ({
    prompt: '',
    done: false,
    getPosition: () => orb.group.position,
    auto: true,
    onInteract() {
      this.done = true;
      collected++;
      if (audioCtx) sfxPickup();
      scn.remove(orb.group);
      showMilestonePopup(orb.milestone.title, orb.milestone.text);
      milestoneCounterEl.textContent = `Memories: ${collected}/${orbMeshes.length}`;
      if (collected >= orbMeshes.length) {
        currentRoom.portal.locked = false;
        scn.remove(currentRoom.portal.group);
        const unlocked = makePortal(false, '#ff6f91');
        unlocked.group.position.set(PORTAL_X, 0, PORTAL_Z);
        scn.add(unlocked.group);
        currentRoom.portal = unlocked;
        if (audioCtx) sfxUnlock();
        showToast('All memories collected! The way is open.');
      }
    },
  }));

  const portalObj = makePortal(true);
  portalObj.group.position.set(PORTAL_X, 0, PORTAL_Z);
  scn.add(portalObj.group);

  let introShown = false;

  return {
    scene: scn,
    name: GAME_CONTENT.room3.name,
    spawn: new THREE.Vector3(0, 0, 11),
    obstacles,
    interactables,
    portal: portalObj,
    update(dt, t) {
      orbMeshes.forEach(o => { if (o.group.parent) { o.group.position.y = 1.4 + Math.sin(t * 2 + o.group.userData.phase) * 0.25; o.group.rotation.y += dt; } });
      if (!introShown) { introShown = true; showToast(GAME_CONTENT.room3.introText, 3200); }
    },
    onExit() { setRoom(buildRoom4); },
  };
}

function buildRoom4() {
  const scn = baseRoomShell('room4', 0x1b1642, 0x2c2456, 16);
  const obstacles = [];
  makeStars(scn);

  const pillarSpots = [[-11, -11], [11, -11], [-11, 11], [11, 11]];
  pillarSpots.forEach(([x, z]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 4.5, 8), toonMat(0x5b4f86));
    pillar.position.set(x, 2.25, z);
    pillar.castShadow = true;
    addOutline(pillar);
    scn.add(pillar);
    obstacles.push({ x, z, r: 1.1 });
  });

  const fireflies = [];
  for (let i = 0; i < 14; i++) {
    const f = makeSprite(GLOW_TEX_GOLD, 0.35, 0.8);
    f.position.set((Math.random() - 0.5) * 22, 0.8 + Math.random() * 3, (Math.random() - 0.5) * 22);
    f.userData.phase = Math.random() * Math.PI * 2;
    f.userData.base = f.position.clone();
    scn.add(f);
    fireflies.push(f);
  }

  const chest = makeChest();
  chest.group.position.set(0, 0, -9);
  scn.add(chest.group);

  let opened = false;
  let openProgress = 0;

  const interactables = [{
    prompt: GAME_CONTENT.finale.chestPrompt,
    done: false,
    getPosition: () => chest.group.position,
    onInteract() {
      if (opened) return;
      this.done = true;
      opened = true;
      uiBlocking = true;
      if (audioCtx) sfxOpen();
      const light = new THREE.PointLight(0xffe08c, 0, 10);
      light.position.set(0, 2, -9);
      scn.add(light);
      let t = 0;
      const beamGlow = makeSprite(GLOW_TEX_GOLD, 3, 0);
      beamGlow.position.set(0, 1.5, -9);
      scn.add(beamGlow);
      function burst() {
        t += 0.02;
        light.intensity = Math.min(2.4, t * 6);
        beamGlow.material.opacity = Math.min(1, t * 2);
        if (t < 0.6) requestAnimationFrame(burst);
        else setTimeout(showFinale, 500);
      }
      burst();
    },
  }];

  return {
    scene: scn,
    name: 'The Treasure Room',
    spawn: new THREE.Vector3(0, 0, 10),
    obstacles,
    interactables,
    portal: null,
    update(dt, t) {
      fireflies.forEach(f => {
        f.position.y = f.userData.base.y + Math.sin(t * 1.5 + f.userData.phase) * 0.4;
        f.position.x = f.userData.base.x + Math.sin(t * 0.6 + f.userData.phase) * 0.6;
      });
      if (opened && openProgress < 1) {
        openProgress = Math.min(1, openProgress + dt * 1.2);
        chest.lidPivot.rotation.x = -openProgress * 1.9;
      }
    },
    onExit() {},
  };
}

// ===================== Room switching / finale / title =====================

function setRoom(factory) {
  fadeEl.classList.add('fade-in');
  setTimeout(() => {
    const built = factory();
    scene = built.scene;
    scene.add(player);
    player.position.copy(built.spawn);
    player.rotation.y = Math.PI;
    currentRoom = built;
    roomLabelEl.textContent = built.name;
    milestoneCounterEl.classList.add('hidden');
    if (built.name === GAME_CONTENT.room3.name) {
      milestoneCounterEl.textContent = `Memories: 0/${built.interactables.length}`;
      milestoneCounterEl.classList.remove('hidden');
    }
    setTimeout(() => fadeEl.classList.remove('fade-in'), 50);
  }, 350);
}

const finaleOverlayEl = document.getElementById('finale-overlay');
const letterTitleEl = document.getElementById('letter-title');
const letterBodyEl = document.getElementById('letter-body');
const letterSignoffEl = document.getElementById('letter-signoff');
const replayBtn = document.getElementById('replay-btn');

function showFinale() {
  gameState = 'finale';
  uiBlocking = true;
  letterTitleEl.textContent = GAME_CONTENT.finale.loveLetterTitle;
  letterBodyEl.textContent = GAME_CONTENT.finale.loveLetterBody;
  letterSignoffEl.textContent = GAME_CONTENT.finale.signOff;
  finaleOverlayEl.classList.remove('hidden');
  hudEl.classList.add('hidden');
  startConfetti();
}
replayBtn.addEventListener('click', () => window.location.reload());

// ===================== Title screen =====================

document.getElementById('title-heading').textContent = GAME_CONTENT.titleScreen.heading;
document.getElementById('title-subheading').textContent = GAME_CONTENT.titleScreen.subheading;

document.getElementById('play-btn').addEventListener('click', () => {
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  document.getElementById('title-screen').classList.add('hidden');
  hudEl.classList.remove('hidden');
  gameState = 'playing';
  setRoom(buildRoom1);
});

// ===================== Main loop =====================

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'playing' && currentRoom) {
    updatePlayer(dt);
    updateInteractions();

    if (!uiBlocking) {
      for (const it of currentRoom.interactables) {
        if (it.auto && !it.done && horizDist(player.position, it.getPosition()) < 1.3) {
          it.onInteract();
        }
      }
    }

    currentRoom.update(dt, clock.elapsedTime);
  }

  renderer.render(scene, camera);
}
animate();
