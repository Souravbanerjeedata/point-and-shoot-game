/** @type {HTMLCanvasElement} */

const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d");
const collisionCanvas = document.getElementById("collisionCanvas");
const collisionCtx = collisionCanvas.getContext("2d", {
  willReadFrequently: true,
});

const enemiesConfig = [
  {
    id: "bat",
    name: "Night Bat",
    src: "enemy_bat_3.png",
    thumb: "thumbs/bat.png",
    spriteWidth: 266,
    spriteHeight: 188,
    maxFrame: 5,
    sizeRange: [0.22, 0.42],
  },
  {
    id: "fly",
    name: "Dark Fly",
    src: "enemy_fly.png",
    thumb: "thumbs/fly.png",
    spriteWidth: 60,
    spriteHeight: 44,
    maxFrame: 5,
    sizeRange: [1.0, 1.8],
  },
  {
    id: "ghost2",
    name: "Shadow Eyes",
    src: "enemy_ghost_2.png",
    thumb: "thumbs/ghost2.png",
    spriteWidth: 80,
    spriteHeight: 89,
    maxFrame: 1,
    sizeRange: [0.7, 1.3],
  },
  {
    id: "ghost3",
    name: "Skull Spirit",
    src: "enemy_ghost_3.png",
    thumb: "thumbs/ghost3.png",
    spriteWidth: 87,
    spriteHeight: 70,
    maxFrame: 5,
    sizeRange: [0.85, 1.5],
  },
  {
    id: "ghost4",
    name: "Glowing Eyes",
    src: "enemy_ghost_4.png",
    thumb: "thumbs/ghost4.png",
    spriteWidth: 60,
    spriteHeight: 70,
    maxFrame: 5,
    sizeRange: [0.9, 1.6],
  },
  {
    id: "raven",
    name: "Raven",
    src: "raven.png",
    thumb: "thumbs/raven.png",
    spriteWidth: 271,
    spriteHeight: 194,
    maxFrame: 5,
    sizeRange: [0.2, 0.4],
  },
];

const placesConfig = [
  {
    id: "alien_planet",
    name: "Alien Planet",
    src: "backgrounds/alien_planet.jpg",
  },
  {
    id: "night_hills",
    name: "Night Hills",
    src: "backgrounds/night_hills.jpg",
  },
  {
    id: "forest_clearing",
    name: "Forest Clearing",
    src: "backgrounds/forest_clearing.jpg",
  },
  {
    id: "campfire_forest",
    name: "Campfire Forest",
    src: "backgrounds/campfire_forest.jpg",
  },
  {
    id: "starry_night",
    name: "Starry Night",
    src: "backgrounds/starry_night.jpg",
  },
];

// ===== STATE =====
let selectedEnemy = null;
let selectedPlace = null;
let bgImage = new Image();
let enemyImage = new Image();
let currentEnemyConfig = null;

let timeToNextEnemy = 0;
let enemyInterval = 700;
let lastTime = 0;
let score = 0;
let lives = 5;
let gameOver = false;
let gameStarted = false;

let enemies = [];
let explosions = [];

// ===== DOM =====
const menuEl = document.getElementById("menu");
const enemySelectEl = document.getElementById("enemy-select");
const placeSelectEl = document.getElementById("place-select");
const startBtn = document.getElementById("start-btn");
const gameOverEl = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");

// ===== INIT MENU =====
function buildMenu() {
  enemiesConfig.forEach((cfg) => {
    const card = document.createElement("div");
    card.className = "option-card";
    card.dataset.id = cfg.id;

    card.innerHTML = `<img src="${cfg.thumb}" alt="${cfg.name}" /><span>${cfg.name}</span>`;
    card.addEventListener("click", () => {
      document
        .querySelectorAll("#enemy-select .option-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedEnemy = cfg.id;
      updateStartBtn();
    });
    enemySelectEl.appendChild(card);
  });

  placesConfig.forEach((cfg) => {
    const card = document.createElement("div");
    card.className = "option-card place";
    card.dataset.id = cfg.id;
    card.innerHTML = `<img src="${cfg.src}" alt="${cfg.name}" /><span>${cfg.name}</span>`;
    card.addEventListener("click", () => {
      document
        .querySelectorAll("#place-select .option-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedPlace = cfg.id;
      updateStartBtn();
    });
    placeSelectEl.appendChild(card);
  });
}

function updateStartBtn() {
  startBtn.disabled = !(selectedEnemy && selectedPlace);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => {
  gameOverEl.classList.add("hidden");
  menuEl.style.display = "flex";
  gameStarted = false;
});

function startGame() {
  if (gameStarted) return;
  currentEnemyConfig = enemiesConfig.find((e) => e.id === selectedEnemy);
  const place = placesConfig.find((p) => p.id === selectedPlace);

  enemyImage = new Image();
  bgImage = new Image();

  const loadImg = (img, src) =>
    new Promise((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
      if (img.complete && img.naturalWidth > 0) resolve();
    });

  Promise.all([
    loadImg(enemyImage, currentEnemyConfig.src),
    loadImg(bgImage, place.src),
  ]).then(() => {
    menuEl.style.display = "none";
    resetGame();
    gameStarted = true;
    lastTime = performance.now();
    requestAnimationFrame(animate);
  });
}

function resetGame() {
  score = 0;
  lives = 5;
  gameOver = false;
  enemies = [];
  explosions = [];
  timeToNextEnemy = 0;
  lastTime = 0;
  enemyInterval = 700;
  resizeCanvas();
}

// ===== CANVAS SIZE =====
function getViewportSize() {
  if (window.visualViewport) {
    return {
      w: Math.floor(window.visualViewport.width),
      h: Math.floor(window.visualViewport.height),
    };
  }
  return {
    w: Math.floor(window.innerWidth),
    h: Math.floor(window.innerHeight),
  };
}

function resizeCanvas() {
  const { w, h } = getViewportSize();

  if (canvas.width === w && canvas.height === h) return;
  canvas.width = w;
  canvas.height = h;
  collisionCanvas.width = w;
  collisionCanvas.height = h;
  const base = Math.min(w, h);
  ctx.font = `${Math.max(28, Math.floor(base * 0.06))}px Impact`;
}

window.addEventListener("resize", () => {
  if (gameStarted && !gameOver) resizeCanvas();
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (gameStarted && !gameOver) resizeCanvas();
  });
}

// ===== CLASSES =====
class Enemy {
  constructor() {
    const cfg = currentEnemyConfig;
    this.spriteWidth = cfg.spriteWidth;
    this.spriteHeight = cfg.spriteHeight;
    this.sizeModifier =
      Math.random() * (cfg.sizeRange[1] - cfg.sizeRange[0]) + cfg.sizeRange[0];
    this.width = this.spriteWidth * this.sizeModifier;
    this.height = this.spriteHeight * this.sizeModifier;
    this.x = canvas.width;
    this.y = Math.random() * Math.max(0, canvas.height - this.height);

    const baseMin = 1.25;
    const baseMax = 3.25;
    const finalMin = 2.5;
    const finalMax = 6.5;
    const steps = Math.min(Math.floor(score / 10), 5); // 0..5 steps
    const t = steps / 5; // 0 → 1
    const curMin = baseMin + (finalMin - baseMin) * t;
    const curMax = baseMax + (finalMax - baseMax) * t;
    this.directionX = Math.random() * (curMax - curMin) + curMin;
    this.directionY = Math.random() * 3 - 1.5;

    this.markerForDeletion = false;
    this.image = enemyImage;
    this.frame = 0;
    this.maxFrame = cfg.maxFrame;
    this.timeSinceFlap = 0;
    this.flapInterval = Math.random() * 50 + 40;
    this.randomColors = [
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
    ];
    this.color = `rgb(${this.randomColors[0]},${this.randomColors[1]},${this.randomColors[2]})`;
  }

  update(deltaTime) {
    if (this.y < 0 || this.y > canvas.height - this.height) {
      this.directionY *= -1;
    }
    this.x -= this.directionX;
    this.y += this.directionY;

    this.timeSinceFlap += deltaTime;
    if (this.timeSinceFlap > this.flapInterval) {
      this.frame = this.frame >= this.maxFrame ? 0 : this.frame + 1;
      this.timeSinceFlap = 0;
    }

    // Missed – left the screen
    if (this.x < 0 - this.width) {
      this.markerForDeletion = true;
      if (!gameOver) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameOver = true;
        }
      }
    }
  }

  draw() {
    collisionCtx.fillStyle = this.color;
    collisionCtx.fillRect(this.x, this.y, this.width, this.height);
    ctx.drawImage(
      this.image,
      this.frame * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height,
    );
  }
}

class Explosion {
  constructor(x, y, size) {
    this.image = new Image();
    this.image.src = "boom.png";
    this.spriteWidth = 200;
    this.spriteHeight = 179;
    this.size = size;
    this.x = x;
    this.y = y;
    this.frame = 0;
    this.sound = new Audio("boom.wav");
    this.timeSinceLastFrame = 0;
    this.frameInterval = 180;
    this.markerForDeletion = false;
  }
  update(deltatime) {
    if (this.frame === 0) {
      try {
        this.sound.currentTime = 0;
        this.sound.play().catch(() => {});
      } catch (e) {}
    }
    this.timeSinceLastFrame += deltatime;
    if (this.timeSinceLastFrame > this.frameInterval) {
      this.frame++;
      this.timeSinceLastFrame = 0;
      if (this.frame > 5) this.markerForDeletion = true;
    }
  }
  draw() {
    ctx.drawImage(
      this.image,
      this.frame * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y - this.size / 4,
      this.size,
      this.size,
    );
  }
}

// ===== DRAW UI =====
function drawScoreAndLives() {
  const fontSize = Math.max(
    22,
    Math.floor(Math.min(canvas.width, canvas.height) * 0.055),
  );
  ctx.font = `${fontSize}px Impact`;
  ctx.textAlign = "left";

  // Score left
  ctx.fillStyle = "black";
  ctx.fillText("Score: " + score, 18, fontSize + 12);
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 20, fontSize + 14);

  // Lives right
  const livesText = "Lives: " + lives;
  ctx.textAlign = "right";
  ctx.fillStyle = "black";
  ctx.fillText(livesText, canvas.width - 18, fontSize + 12);
  ctx.fillStyle = lives <= 2 ? "#ff4444" : "white";
  ctx.fillText(livesText, canvas.width - 20, fontSize + 14);

  // small heart indicators
  ctx.textAlign = "right";
  const heartY = fontSize + 14 + fontSize * 0.9;
  let hearts = "";
  for (let i = 0; i < 5; i++) {
    hearts += i < lives ? "♥ " : "♡ ";
  }
  ctx.font = `${Math.max(16, fontSize * 0.7)}px Arial`;
  ctx.fillStyle = lives <= 2 ? "#ff3333" : "#ff6666";
  ctx.fillText(hearts.trim(), canvas.width - 20, heartY);
}

function drawBackground() {
  if (!bgImage.complete || bgImage.naturalWidth === 0) {
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  // cover style
  const imgRatio = bgImage.width / bgImage.height;
  const canvasRatio = canvas.width / canvas.height;
  let drawW,
    drawH,
    offsetX = 0,
    offsetY = 0;
  if (canvasRatio > imgRatio) {
    drawW = canvas.width;
    drawH = canvas.width / imgRatio;
    offsetY = (canvas.height - drawH) / 2;
  } else {
    drawH = canvas.height;
    drawW = canvas.height * imgRatio;
    offsetX = (canvas.width - drawW) / 2;
  }
  ctx.drawImage(bgImage, offsetX, offsetY, drawW, drawH);
  // subtle dark overlay so enemies pop against brighter scenes
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ===== INPUT (pointer events = mouse + touch + pen, no double-fire) =====
function handleShoot(clientX, clientY) {
  if (gameOver || !gameStarted) return;

  const rect = canvas.getBoundingClientRect();
  // Guard against zero-size rect (can happen briefly on mobile orientation change)
  if (rect.width < 1 || rect.height < 1) return;

  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;

  // Clamp to canvas bounds
  const px = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));

  let detectPixelColor;
  try {
    detectPixelColor = collisionCtx.getImageData(px, py, 1, 1);
  } catch (err) {
    return; // security / tainted canvas edge case
  }
  const pc = detectPixelColor.data;

  enemies.forEach((object) => {
    if (
      object.randomColors[0] === pc[0] &&
      object.randomColors[1] === pc[1] &&
      object.randomColors[2] === pc[2]
    ) {
      object.markerForDeletion = true;
      score++;
      explosions.push(new Explosion(object.x, object.y, object.width));
      if (enemyInterval > 350) enemyInterval -= 4;
    }
  });
}

canvas.style.touchAction = "none";
canvas.addEventListener(
  "pointerdown",
  (e) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    handleShoot(e.clientX, e.clientY);
  },
  { passive: false },
);

// Fallback for older browsers that lack Pointer Events
if (!window.PointerEvent) {
  canvas.addEventListener("click", (e) => {
    handleShoot(e.clientX, e.clientY);
  });
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleShoot(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: false },
  );
}

// ===== ANIMATE =====
function animate(timestamp) {
  if (!gameStarted) return;

  drawBackground();
  collisionCtx.clearRect(0, 0, canvas.width, canvas.height);

  let deltaTime = timestamp - lastTime;
  if (deltaTime > 50) deltaTime = 50; // clamp for tab switches
  lastTime = timestamp;

  timeToNextEnemy += deltaTime;
  if (timeToNextEnemy > enemyInterval) {
    enemies.push(new Enemy());
    timeToNextEnemy = 0;
    enemies.sort((a, b) => a.width - b.width);
  }

  drawScoreAndLives();

  [...enemies, ...explosions].forEach((obj) => obj.update(deltaTime));
  [...enemies, ...explosions].forEach((obj) => obj.draw());

  enemies = enemies.filter((o) => !o.markerForDeletion);
  explosions = explosions.filter((o) => !o.markerForDeletion);

  if (!gameOver) {
    requestAnimationFrame(animate);
  } else {
    // show overlay
    finalScoreEl.textContent = "Your score: " + score;
    gameOverEl.classList.remove("hidden");
  }
}

// ===== BOOT =====
buildMenu();
resizeCanvas();
