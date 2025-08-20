const canvas = document.querySelector("#ultimo-Sobrevivente");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const menu = document.querySelector("#menu");

const playerImg = new Image();
playerImg.src = "sprites/nave.png";
const enemyImg = new Image();
enemyImg.src = "sprites/invader2.png";

const degToRad = deg => deg * Math.PI / 180;

const initialPlayer = () => ({
  x: canvas.width / 2,
  y: canvas.height / 2,
  w: 50,
  h: 40,
  angle: 0,
  speed: 0,
  maxSpeed: 220,
  cooldown: 0,
  lives: 3
});

const initialState = () => ({
  running: false,
  lastTime: 0,
  player: initialPlayer(),
  bullets: [],
  enemies: [],
  enemyBullets: [],
  score: 0
});

let state = initialState();

const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup", e => { keys[e.code] = false; });

// Função pura para spawnar inimigo em borda aleatória
const spawnEnemy = canvas => {
  const side = Math.floor(Math.random() * 4);
  return {
    x: side === 0 ? Math.random() * canvas.width : (side === 1 ? canvas.width : (side === 2 ? Math.random() * canvas.width : 0)),
    y: side === 0 ? 0 : (side === 1 ? Math.random() * canvas.height : (side === 2 ? canvas.height : Math.random() * canvas.height)),
    w: 36,
    h: 28,
    speed: 60 + Math.random() * 60,
    alive: true
  };
};

// Função pura para atualizar jogador
const updatePlayer = (player, keys, dt, canvas) => {
  const angle = player.angle + (keys["KeyA"] ? -180 * dt : 0) + (keys["KeyD"] ? 180 * dt : 0);
  const move = keys["KeyW"] ? player.maxSpeed : (keys["KeyS"] ? -player.maxSpeed : 0);
  const rad = degToRad(angle);
  const x = Math.max(0, Math.min(canvas.width, player.x + Math.cos(rad) * move * dt));
  const y = Math.max(0, Math.min(canvas.height, player.y + Math.sin(rad) * move * dt));
  const cooldown = Math.max(0, player.cooldown - dt);
  return { ...player, x, y, angle, speed: move, cooldown };
};

// Função pura para atirar
const tiro = (state) => {
  if (state.player.cooldown > 0) return state;
  const rad = degToRad(state.player.angle);
  const bullet = {
    x: state.player.x + Math.cos(rad) * 30,
    y: state.player.y + Math.sin(rad) * 30,
    dx: Math.cos(rad) * 400,
    dy: Math.sin(rad) * 400,
    w: 6,
    h: 6
  };
  return {
    ...state,
    player: { ...state.player, cooldown: 0.25 },
    bullets: state.bullets.concat([bullet])
  };
};

// Função pura para atualizar balas
const updateBullets = (bullets, dt, canvas) =>
  bullets
    .map(b => ({ ...b, x: b.x + b.dx * dt, y: b.y + b.dy * dt }))
    .filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);

// Função pura para atualizar inimigos
const updateEnemies = (enemies, player, dt) =>
  enemies.map(e => {
    if (!e.alive) return e;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * e.speed * dt;
    const vy = (dy / dist) * e.speed * dt;
    return { ...e, x: e.x + vx, y: e.y + vy };
  });

// Função pura para inimigos atirarem
const enemyShoot = (enemies, player, enemyBullets) =>
  enemies.reduce((bullets, e) => {
    if (e.alive && Math.hypot(player.x - e.x, player.y - e.y) < 200 && Math.random() < 0.01) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      return bullets.concat([{
        x: e.x + dx / dist * 20,
        y: e.y + dy / dist * 20,
        dx: (dx / dist) * 200,
        dy: (dy / dist) * 200,
        w: 5, h: 5
      }]);
    }
    return bullets;
  }, enemyBullets);

// Função pura para colisão bala x inimigo
const processBullets = (bullets, enemies, score) => {
  const newEnemies = enemies.map(e => ({ ...e }));
  const newBullets = [];
  let newScore = score;
  bullets.forEach(b => {
    let hit = false;
    for (const e of newEnemies) {
      if (e.alive &&
        b.x < e.x + e.w && b.x + b.w > e.x &&
        b.y < e.y + e.h && b.y + b.h > e.y) {
        e.alive = false;
        newScore += 10;
        hit = true;
        break;
      }
    }
    if (!hit) newBullets.push(b);
  });
  return { bullets: newBullets, enemies: newEnemies, score: newScore };
};

// Função pura para colisão bala inimiga x jogador
const processPlayerHit = (player, enemyBullets) => {
  let lives = player.lives;
  const newBullets = [];
  enemyBullets.forEach(b => {
    if (
      b.x < player.x + player.w &&
      b.x + b.w > player.x &&
      b.y < player.y + player.h &&
      b.y + b.h > player.y
    ) {
      lives -= 1;
    } else {
      newBullets.push(b);
    }
  });
  return { player: { ...player, lives }, enemyBullets: newBullets };
};

// Função para gerar vários inimigos de uma vez nas bordas
const spawnEnemiesWave = (canvas, quantidade = 5) =>
  Array.from({ length: quantidade }, () => spawnEnemy(canvas));






// Função pura de atualização principal
const nextState = (state, keys, dt, canvas) => {
    // Se não há inimigos, cria uma leva inicial
    const precisaSpawnInicial = state.enemies.length === 0;
    const todosMortos = state.enemies.length > 0 && state.enemies.every(e => !e.alive);

    const novosInimigos = (precisaSpawnInicial || todosMortos)
        ? spawnEnemiesWave(canvas, 5 + Math.floor(state.score / 50))
        : [];

    // Mantém inimigos vivos + novos
    const enemies = state.enemies.filter(e => e.alive).concat(novosInimigos);

    // ...restante do código igual...
    const player = updatePlayer(state.player, keys, dt, canvas);
    const stateAfterTiro = keys["Space"] ? tiro({ ...state, player, bullets: state.bullets }) : { ...state, player, bullets: state.bullets };
    const bullets = updateBullets(stateAfterTiro.bullets, dt, canvas);
    const movedEnemies = updateEnemies(enemies, player, dt);
    const enemyBullets = enemyShoot(movedEnemies, player, updateBullets(state.enemyBullets, dt, canvas));
    const bulletResult = processBullets(bullets, movedEnemies, state.score);
    const playerHitResult = processPlayerHit(player, enemyBullets);
    const running = playerHitResult.player.lives > 0;

    return {
        ...state,
        player: playerHitResult.player,
        bullets: bulletResult.bullets,
        enemies: bulletResult.enemies,
        enemyBullets: playerHitResult.enemyBullets,
        score: bulletResult.score,
        running
    };
};

// --- Renderização ---
const render = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(state.player.x, state.player.y);
  ctx.rotate(degToRad(state.player.angle) + Math.PI / 2); // Ajuste para frente do sprite coincidir com o movimento
  ctx.drawImage(playerImg, -state.player.w / 2, -state.player.h / 2, state.player.w, state.player.h);
  ctx.restore();

  state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));
  state.enemyBullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#ff5470"));

  state.enemies.forEach(e => {
    if (e.alive) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText("Vidas: " + state.player.lives, 10, 20);
  ctx.fillText("Score: " + state.score, 10, 40);

  if (!state.running) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff5470";
    ctx.font = "34px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Clique em Play para reiniciar", canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = "start";
  }
};

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// --- Loop principal ---
const loop = (ts) => {
  if (!state.running) return;
  const dt = Math.min(0.05, (ts - (state.lastTime || ts)) / 1000);
  state = { ...state, lastTime: ts };
  state = nextState(state, keys, dt, canvas);
  render();
  requestAnimationFrame(loop);
};

playBtn.addEventListener("click", () => {
  menu.style.display = "none";
  canvas.style.display = "block";
  state = initialState();
  state = { ...state, running: true };
  requestAnimationFrame(loop);
});