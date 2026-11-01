const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const overlay = document.getElementById('overlay');

const width = canvas.width;
const height = canvas.height;
const bestScoreKey = 'monster-dash-best-time';
const directions = ['up', 'down', 'left', 'right'];
const keys = new Set();
const heldButtons = new Set();
const rocks = [
  { x: 175, y: 145, radius: 34 },
  { x: 340, y: 250, radius: 29 },
  { x: 570, y: 135, radius: 38 },
  { x: 745, y: 290, radius: 31 },
  { x: 155, y: 430, radius: 39 },
  { x: 390, y: 465, radius: 32 },
  { x: 620, y: 385, radius: 36 },
  { x: 790, y: 500, radius: 28 },
];

let bestTime = Number(localStorage.getItem(bestScoreKey)) || 0;
let elapsed = 0;
let gameRunning = false;
let lastFrame = 0;

const human = { x: 450, y: 510, radius: 13, speed: 245 };
const monster = { x: 450, y: 82, radius: 23, speed: 100 };

function updateHud() {
  scoreEl.textContent = `${elapsed.toFixed(1)}s`;
  bestScoreEl.textContent = `${bestTime.toFixed(1)}s`;
}

function resetGame() {
  elapsed = 0;
  human.x = 450;
  human.y = 510;
  monster.x = 450;
  monster.y = 82;
  keys.clear();
  heldButtons.clear();
  updateHud();
}

function startGame() {
  resetGame();
  gameRunning = true;
  overlay.classList.remove('visible');
  lastFrame = performance.now();
}

function endGame(reason) {
  if (!gameRunning) return;

  gameRunning = false;
  bestTime = Math.max(bestTime, elapsed);
  localStorage.setItem(bestScoreKey, String(bestTime));
  updateHud();

  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">Run over</p>
      <h1>The monster got you!</h1>
      <p>${reason}</p>
      <p>You lasted <strong>${elapsed.toFixed(1)} seconds</strong>.</p>
      <button id="startButton">Run again</button>
    </div>
  `;
  overlay.classList.add('visible');
}

function circleTouches(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

function isMoving(direction) {
  return keys.has(direction) || heldButtons.has(direction);
}

function updateGame(delta) {
  elapsed += delta;

  let dx = Number(isMoving('right')) - Number(isMoving('left'));
  let dy = Number(isMoving('down')) - Number(isMoving('up'));
  const distance = Math.hypot(dx, dy);

  if (distance > 0) {
    dx /= distance;
    dy /= distance;
    human.x += dx * human.speed * delta;
    human.y += dy * human.speed * delta;
  }

  human.x = Math.max(human.radius, Math.min(width - human.radius, human.x));
  human.y = Math.max(human.radius, Math.min(height - human.radius, human.y));

  const monsterDx = human.x - monster.x;
  const monsterDy = human.y - monster.y;
  const monsterDistance = Math.hypot(monsterDx, monsterDy);

  if (monsterDistance > 0) {
    monster.x += (monsterDx / monsterDistance) * monster.speed * delta;
    monster.y += (monsterDy / monsterDistance) * monster.speed * delta;
  }

  if (circleTouches(human, monster)) {
    endGame('The monster caught up with you.');
  } else if (rocks.some((rock) => circleTouches(human, rock))) {
    endGame('You bumped into a rock.');
  }

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#d96865';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let x = 30; x < width; x += 62) {
    for (let y = 28; y < height; y += 58) {
      ctx.beginPath();
      ctx.arc(x + ((y / 58) % 2) * 20, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(105, 35, 44, 0.2)';
  ctx.fillRect(0, 0, width, 16);
  ctx.fillRect(0, height - 16, width, 16);
  ctx.fillRect(0, 0, 16, height);
  ctx.fillRect(width - 16, 0, 16, height);
}

function drawRock(rock, index) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.fillStyle = 'rgba(43, 59, 49, 0.22)';
  ctx.beginPath();
  ctx.ellipse(3, rock.radius * 0.64, rock.radius * 1.08, rock.radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = index % 2 === 0 ? '#758477' : '#858b7b';
  ctx.strokeStyle = '#59685c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const irregularity = i % 2 === 0 ? 1 : 0.83;
    const x = Math.cos(angle) * rock.radius * irregularity;
    const y = Math.sin(angle) * rock.radius * irregularity;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-rock.radius * 0.18, -rock.radius * 0.25, rock.radius * 0.35, rock.radius * 0.17, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCharacter(character, isMonster) {
  const { x, y, radius } = character;
  const fur = isMonster ? '#6d43a1' : '#f5bc70';
  const trim = isMonster ? '#482d6b' : '#c77946';

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(41, 67, 45, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.95, radius * 1.08, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = fur;
  ctx.strokeStyle = trim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fffdf1';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.34, -radius * 0.16, radius * 0.22, radius * 0.29, -0.16, 0, Math.PI * 2);
  ctx.ellipse(radius * 0.34, -radius * 0.16, radius * 0.22, radius * 0.29, 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#293342';
  ctx.beginPath();
  ctx.arc(-radius * 0.31, -radius * 0.1, radius * 0.095, 0, Math.PI * 2);
  ctx.arc(radius * 0.31, -radius * 0.1, radius * 0.095, 0, Math.PI * 2);
  ctx.fill();

  if (isMonster) {
    ctx.fillStyle = '#fffdf1';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, radius * 0.38);
    ctx.lineTo(-radius * 0.2, radius * 0.78);
    ctx.lineTo(0, radius * 0.42);
    ctx.lineTo(radius * 0.2, radius * 0.78);
    ctx.lineTo(radius * 0.4, radius * 0.38);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#c45758';
    ctx.beginPath();
    ctx.arc(0, radius * 0.36, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function draw() {
  drawBackground();
  rocks.forEach(drawRock);
  drawCharacter(human, false);
  drawCharacter(monster, true);

  ctx.fillStyle = 'rgba(39, 68, 42, 0.72)';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('HUMAN', human.x - 26, human.y - human.radius - 11);
  ctx.fillText('MONSTER', monster.x - 38, monster.y - monster.radius - 12);
}

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  if (gameRunning) updateGame(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function directionForKey(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') return 'up';
  if (key === 'arrowdown' || key === 's') return 'down';
  if (key === 'arrowleft' || key === 'a') return 'left';
  if (key === 'arrowright' || key === 'd') return 'right';
  return null;
}

window.addEventListener('keydown', (event) => {
  const direction = directionForKey(event);
  if (!direction) return;
  event.preventDefault();
  keys.add(direction);
});

window.addEventListener('keyup', (event) => {
  const direction = directionForKey(event);
  if (direction) keys.delete(direction);
});

window.addEventListener('blur', () => keys.clear());

overlay.addEventListener('click', (event) => {
  if (event.target.closest('#startButton')) startGame();
});

document.querySelectorAll('.control-button').forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    heldButtons.add(direction);
  });
  const release = () => heldButtons.delete(direction);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

bestScoreEl.textContent = `${bestTime.toFixed(1)}s`;
updateHud();
draw();
requestAnimationFrame((timestamp) => {
  lastFrame = timestamp;
  gameLoop(timestamp);
});
