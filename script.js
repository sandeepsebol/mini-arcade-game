const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const bestScoreEl = document.getElementById('best-score');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');

const width = canvas.width;
const height = canvas.height;
const bestScoreKey = 'cosmic-drift-best-score';

let score = 0;
let level = 1;
let lives = 3;
let bestScore = Number(localStorage.getItem(bestScoreKey)) || 0;
let gameRunning = false;
let animationId = null;
let lastFrame = 0;
let lastShot = 0;
let displayMessage = '';
let messageTimer = 0;

const keys = { left: false, right: false, shoot: false };
const stars = [];
const bullets = [];
const enemies = [];
const particles = [];
const powerUps = [];

const player = {
  x: width / 2,
  y: height - 44,
  width: 32,
  height: 28,
  speed: 6.6,
  invulnerable: 0,
  shield: 0,
  rapidFire: 0,
};

function initStars() {
  stars.length = 0;
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.7,
      speed: Math.random() * 1.2 + 0.4,
    });
  }
}

function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  lastShot = 0;
  displayMessage = 'Mission Start';
  messageTimer = 120;
  player.x = width / 2;
  player.invulnerable = 0;
  player.shield = 0;
  player.rapidFire = 0;
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  powerUps.length = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  livesEl.textContent = lives;
  bestScoreEl.textContent = bestScore;
}

function startGame() {
  resetGame();
  gameRunning = true;
  overlay.classList.remove('visible');
  lastFrame = performance.now();
}

function endGame() {
  gameRunning = false;
  bestScore = Math.max(bestScore, score);
  localStorage.setItem(bestScoreKey, String(bestScore));
  updateHud();

  overlay.classList.add('visible');
  overlay.innerHTML = `
    <div class="panel">
      <h1>Mission Failed</h1>
      <p>Final score: <strong>${score}</strong></p>
      <p>Best score: <strong>${bestScore}</strong></p>
      <button id="startButton">Play Again</button>
    </div>
  `;

  document.getElementById('startButton').addEventListener('click', startGame);
}

function spawnEnemy() {
  const size = Math.random() * 18 + 16;
  const speed = Math.random() * 0.8 + 1.1 + level * 0.35;
  enemies.push({
    x: Math.random() * (width - size * 2) + size,
    y: -size,
    radius: size,
    speed,
    drift: (Math.random() - 0.5) * 0.9,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.12,
    type: Math.random() < 0.2 ? 'heavy' : 'normal',
  });
}

function spawnPowerUp() {
  const types = ['shield', 'rapid'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerUps.push({
    x: Math.random() * (width - 28) + 14,
    y: -12,
    radius: 10,
    speed: 2.2,
    type,
    drift: (Math.random() - 0.5) * 1.5,
  });
}

function shoot() {
  if (!gameRunning) return;
  const now = performance.now();
  const cooldown = player.rapidFire > 0 ? 120 : 220;

  if (now - lastShot < cooldown) return;

  lastShot = now;
  bullets.push({
    x: player.x,
    y: player.y - 18,
    radius: 5,
    speed: 9,
  });

  if (player.rapidFire > 0) {
    bullets.push({
      x: player.x - 12,
      y: player.y - 12,
      radius: 4,
      speed: 8.8,
    });
    bullets.push({
      x: player.x + 12,
      y: player.y - 12,
      radius: 4,
      speed: 8.8,
    });
  }
}

function updatePlayer() {
  if (keys.left) player.x -= player.speed;
  if (keys.right) player.x += player.speed;

  player.x = Math.max(player.width / 2, Math.min(width - player.width / 2, player.x));

  player.invulnerable = Math.max(0, player.invulnerable - 1);
  player.shield = Math.max(0, player.shield - 1);
  player.rapidFire = Math.max(0, player.rapidFire - 1);
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed;

    if (bullet.y < -20) {
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.x += enemy.drift;
    enemy.y += enemy.speed;
    enemy.rotation += enemy.spin;

    if (enemy.x < enemy.radius || enemy.x > width - enemy.radius) {
      enemy.drift *= -1;
    }

    if (enemy.y - enemy.radius > height) {
      enemies.splice(i, 1);
      if (!gameRunning) return;
      lives -= 1;
      if (lives <= 0) {
        endGame();
      }
      updateHud();
      return;
    }
  }

  if (Math.random() < 0.035 + level * 0.005) {
    spawnEnemy();
  }
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i -= 1) {
    const item = powerUps[i];
    item.y += item.speed;
    item.x += item.drift;

    if (item.y > height + 20) {
      powerUps.splice(i, 1);
      continue;
    }

    const dx = item.x - player.x;
    const dy = item.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.width / 2 + item.radius + 8) {
      if (item.type === 'shield') {
        player.shield = 420;
        displayMessage = 'Shield online';
      } else {
        player.rapidFire = 420;
        displayMessage = 'Rapid fire';
      }
      messageTimer = 90;
      powerUps.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function handleCollisions() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist < bullet.radius + enemy.radius) {
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score += enemy.type === 'heavy' ? 25 : 10;

        for (let k = 0; k < 14; k += 1) {
          particles.push({
            x: enemy.x,
            y: enemy.y,
            radius: Math.random() * 3 + 1,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 24,
            color: enemy.type === 'heavy' ? '#ff5d73' : '#ffd166',
          });
        }

        if (Math.random() < 0.12) spawnPowerUp();
        updateHud();
        break;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y - player.height / 2;
    const playerBottom = player.y + player.height / 2;
    const closestX = Math.max(playerLeft, Math.min(enemy.x, playerRight));
    const closestY = Math.max(playerTop, Math.min(enemy.y, playerBottom));
    const dx = enemy.x - closestX;
    const dy = enemy.y - closestY;

    if (dx * dx + dy * dy < enemy.radius * enemy.radius) {
      enemies.splice(i, 1);

      if (player.shield > 0) {
        score += 5;
        displayMessage = 'Shield saved you';
        messageTimer = 60;
        updateHud();
      } else {
        if (player.invulnerable <= 0) {
          lives -= 1;
          player.invulnerable = 90;
          displayMessage = 'Hull damaged';
          messageTimer = 60;
          updateHud();
        }
      }

      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }
}

function updateGame() {
  if (!gameRunning) return;

  updateStars();
  updatePlayer();
  updateBullets();
  updateEnemies();
  updatePowerUps();
  handleCollisions();
  updateParticles();

  if (keys.shoot) {
    shoot();
  }

  const targetLevel = Math.floor(score / 200) + 1;
  if (targetLevel > level) {
    level = targetLevel;
    displayMessage = 'Level up';
    messageTimer = 100;
    updateHud();
  }

  if (messageTimer > 0) {
    messageTimer -= 1;
  }
}

function updateStars() {
  for (const star of stars) {
    star.y += star.speed;
    if (star.y > height) {
      star.y = 0;
      star.x = Math.random() * width;
    }
  }
}

function drawBackground() {
  ctx.fillStyle = '#050d1a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(18, 30, 47, 0.9)';
  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const vGradient = ctx.createLinearGradient(0, 0, 0, height);
  vGradient.addColorStop(0, 'rgba(19, 38, 61, 0.2)');
  vGradient.addColorStop(1, 'rgba(7, 12, 20, 0.9)');
  ctx.fillStyle = vGradient;
  ctx.fillRect(0, 0, width, height);
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  ctx.save();
  ctx.translate(x, y);

  if (player.invulnerable > 0 && ((Math.floor(player.invulnerable / 5) % 2) === 0)) {
    ctx.globalAlpha = 0.4;
  }

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.strokeStyle = '#7ee7ff';
    ctx.lineWidth = 3;
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#7ee7ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(16, 16);
  ctx.lineTo(0, 9);
  ctx.lineTo(-16, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ebf7ff';
  ctx.fillRect(-4, 9, 8, 12);
  ctx.restore();
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.fillStyle = '#7ef29a';
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation);

    ctx.fillStyle = enemy.type === 'heavy' ? '#ff5d73' : '#ffd166';
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius * 0.85, -enemy.radius * 0.35);
    ctx.lineTo(enemy.radius, enemy.radius * 0.25);
    ctx.lineTo(enemy.radius * 0.55, enemy.radius);
    ctx.lineTo(-enemy.radius * 0.25, enemy.radius * 0.9);
    ctx.lineTo(-enemy.radius, enemy.radius * 0.2);
    ctx.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function drawPowerUps() {
  for (const item of powerUps) {
    ctx.beginPath();
    ctx.fillStyle = item.type === 'shield' ? '#7ee7ff' : '#7ef29a';
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#081722';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.type === 'shield' ? 'S' : 'R', item.x, item.y + 4);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.beginPath();
    ctx.globalAlpha = Math.max(p.life / 24, 0.15);
    ctx.fillStyle = p.color;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMessage() {
  if (messageTimer <= 0) return;

  ctx.save();
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(displayMessage, width / 2, 50);
  ctx.restore();
}

function render() {
  drawBackground();
  drawParticles();
  drawPowerUps();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawMessage();
}

function gameLoop(timestamp) {
  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (gameRunning) {
    updateGame();
  }

  render();
  animationId = requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === 'a' || event.key === 'ArrowLeft') {
    keys.left = true;
  }

  if (key === 'd' || event.key === 'ArrowRight') {
    keys.right = true;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    keys.shoot = true;
    shoot();
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();

  if (key === 'a' || event.key === 'ArrowLeft') {
    keys.left = false;
  }

  if (key === 'd' || event.key === 'ArrowRight') {
    keys.right = false;
  }

  if (event.code === 'Space') {
    keys.shoot = false;
  }
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
startButton.addEventListener('click', startGame);

bestScoreEl.textContent = bestScore;
initStars();
render();
animationId = requestAnimationFrame(gameLoop);

setInterval(() => {
  if (!gameRunning) return;
  if (Math.random() < 0.26) {
    spawnEnemy();
  }
}, 700);

setInterval(() => {
  if (!gameRunning) return;
  if (Math.random() < 0.14) {
    spawnPowerUp();
  }
}, 9000);
