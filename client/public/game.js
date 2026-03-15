(function () {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const FOV = Math.PI / 3;
  const RAYS = 320;
  const MAX_DEPTH = 30;

  const PLAYER_SPEED = 0.35;
  const BASE_DT = 1 / 60;
  const MINIMAP_SIZE = 140;
  const MINIMAP_CELL = 2;

  // ---------------------------------------------------------------------------
  // ENEMY TYPES - Sprites por tipo (spriteSrc: caminho da imagem)
  // ---------------------------------------------------------------------------
  const enemyTypes = {
    zombie: { name: "Zombie", speed: 2.5, health: 1, attackCooldown: 60, damage: 1, attackRange: 0.5, color: "red", spawnChance: 0.6, spriteKey: "zombie", spriteSrc: "mike.jpg" },
    runner: { name: "Runner", speed: 4.5, health: 1, attackCooldown: 80, damage: 1, attackRange: 0.4, color: "#FF6B00", spawnChance: 0.25, spriteKey: "runner", spriteSrc: "mike.jpg" },
    tank: { name: "Tank", speed: 1.2, health: 3, attackCooldown: 40, damage: 2, attackRange: 0.6, color: "darkred", spawnChance: 0.1, spriteKey: "tank", spriteSrc: "mike.jpg" },
    ranged: { name: "Ranged", speed: 1.8, health: 1, attackCooldown: 100, damage: 1, attackRange: 3.0, color: "#FF00FF", spawnChance: 0.05, spriteKey: "ranged", spriteSrc: "mike.jpg" },
  };

  // Cache de sprites por spriteKey (carrega sob demanda)
  const spriteCache = {};
  function getEnemySprite(typeData) {
    const key = typeData.spriteKey || typeData.spriteSrc || "default";
    if (!spriteCache[key]) {
      const img = new Image();
      img.src = typeData.spriteSrc || "mike.jpg";
      spriteCache[key] = img;
    }
    return spriteCache[key];
  }

  const difficultySettings = {
    easy: { enemySpeedMultiplier: 0.5, scoreMultiplier: 0.5, name: "EASY" },
    normal: { enemySpeedMultiplier: 1.0, scoreMultiplier: 1.0, name: "NORMAL" },
    hard: { enemySpeedMultiplier: 1.5, scoreMultiplier: 1.5, name: "HARD" },
    nightmare: { enemySpeedMultiplier: 2.0, scoreMultiplier: 2.0, name: "NIGHTMARE" },
  };

  // ---------------------------------------------------------------------------
  // MAP
  // ---------------------------------------------------------------------------
  function generateMap() {
    const width = 84;
    const height = 54;
    const map = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) row.push(1);
        else row.push(0);
      }
      map.push(row);
    }
    for (let y = 5; y < height - 5; y += 8) {
      for (let x = 5; x < width - 5; x += 10) {
        const roomSize = Math.random() > 0.5 ? 3 : 4;
        const roomType = Math.floor(Math.random() * 3);
        if (roomType === 0) {
          for (let ry = 0; ry < roomSize; ry++)
            for (let rx = 0; rx < roomSize; rx++)
              if (y + ry < height - 1 && x + rx < width - 1) map[y + ry][x + rx] = 1;
        } else if (roomType === 1) {
          for (let i = 0; i < roomSize + 2; i++) {
            if (y + i < height - 1) map[y + i][x] = 1;
            if (x + i < width - 1) map[y][x + i] = 1;
          }
        } else {
          for (let i = 0; i < roomSize; i++) {
            if (y + i < height - 1) map[y + i][x] = 1;
            if (x + i < width - 1) map[y][x + i] = 1;
          }
        }
      }
    }
    return map;
  }

  const map = generateMap();

  function isWall(x, y) {
    const row = Math.floor(y);
    const col = Math.floor(x);
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return true;
    return map[row][col] === 1;
  }

  // ---------------------------------------------------------------------------
  // PLAYER - Movimento com wall sliding (eixos X e Y independentes)
  // ---------------------------------------------------------------------------
  class Player {
    constructor() {
      this.x = 3;
      this.y = 3;
      this.angle = 0;
    }

    move(dt, keys, moveSpeedMult = 1) {
      const speed = PLAYER_SPEED * moveSpeedMult * dt;
      let newX = this.x;
      let newY = this.y;

      if (keys["w"] || keys["arrowup"]) {
        newX += Math.cos(this.angle) * speed;
        newY += Math.sin(this.angle) * speed;
      }
      if (keys["s"] || keys["arrowdown"]) {
        newX -= Math.cos(this.angle) * speed;
        newY -= Math.sin(this.angle) * speed;
      }
      if (keys["a"] || keys["arrowleft"]) {
        newX += Math.cos(this.angle - Math.PI / 2) * speed;
        newY += Math.sin(this.angle - Math.PI / 2) * speed;
      }
      if (keys["d"] || keys["arrowright"]) {
        newX += Math.cos(this.angle + Math.PI / 2) * speed;
        newY += Math.sin(this.angle + Math.PI / 2) * speed;
      }

      // Wall sliding: verificar X e Y de forma independente para deslizar na parede
      if (!isWall(newX, this.y)) this.x = newX;
      if (!isWall(this.x, newY)) this.y = newY;
    }
  }

  // ---------------------------------------------------------------------------
  // ENEMY
  // ---------------------------------------------------------------------------
  class Enemy {
    constructor(x, y, typeKey) {
      const type = enemyTypes[typeKey];
      this.x = x;
      this.y = y;
      this.type = typeKey;
      this.typeData = type;
      this.alive = true;
      this.health = type.health;
      this.attackCooldown = 0;
    }

    update(dt, player, currentDifficultySettings) {
      if (!this.alive) return;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.typeData.attackRange) {
        const speed = this.typeData.speed * currentDifficultySettings.enemySpeedMultiplier * dt * 60;
        const nx = this.x + (dx / dist) * speed;
        const ny = this.y + (dy / dist) * speed;

        if (!isWall(nx, this.y)) this.x = nx;
        if (!isWall(this.x, ny)) this.y = ny;
      }

      if (this.attackCooldown > 0) this.attackCooldown -= dt * 60;
      if (dist < this.typeData.attackRange && this.attackCooldown <= 0) {
        this.attackCooldown = this.typeData.attackCooldown;
        return { damage: this.typeData.damage };
      }
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // RAYCASTER - Cast rays e retorna Z-buffer para ordenação de sprites
  // ---------------------------------------------------------------------------
  class Raycaster {
    constructor(player, mapRef) {
      this.player = player;
      this.mapRef = mapRef;
      this.depthBuffer = new Float32Array(RAYS);
    }

    castRays() {
      for (let i = 0; i < RAYS; i++) {
        const angle = this.player.angle - FOV / 2 + (i / RAYS) * FOV;
        let x = this.player.x;
        let y = this.player.y;
        const stepX = Math.cos(angle);
        const stepY = Math.sin(angle);
        let dist = 0;
        let hit = false;

        while (!hit && dist < MAX_DEPTH) {
          dist += 0.05;
          x += stepX * 0.05;
          y += stepY * 0.05;
          if (isWall(x, y)) hit = true;
        }

        this.depthBuffer[i] = dist;

        const wallHeight = HEIGHT / dist;
        const color = Math.max(0, Math.min(255, 255 - dist * 8));
        ctx.fillStyle = `rgb(${color},${color},${color})`;
        ctx.fillRect((i / RAYS) * WIDTH, HEIGHT / 2 - wallHeight / 2, WIDTH / RAYS, wallHeight);
      }
      return this.depthBuffer;
    }

    getDepthAtColumn(col) {
      const i = Math.floor((col / WIDTH) * RAYS);
      return this.depthBuffer[Math.max(0, Math.min(i, RAYS - 1))] ?? Infinity;
    }
  }

  // ---------------------------------------------------------------------------
  // GAME - Loop principal com delta time
  // ---------------------------------------------------------------------------
  class Game {
    constructor() {
      this.player = new Player();
      this.raycaster = new Raycaster(this.player, map);
      this.enemies = [];
      this.keys = {};

      this.ammo = 10;
      this.lives = 3;
      this.gameOver = false;
      this.enemiesKilled = 0;
      this.gunRecoil = 0;
      this.score = 0;
      this.gameStartTime = 0;
      this.gameDuration = 0;
      this.currentPhase = 1;
      this.phaseEnemiesKilled = 0;

      this.gameSettings = {
        mouseSensitivity: parseFloat(localStorage.getItem("mouseSensitivity")) || 0.002,
        moveSpeed: parseFloat(localStorage.getItem("moveSpeed")) || 1.0,
        volume: 0.5,
        difficulty: 1,
      };

      this.gameState = "playing";
      this.settingsOpen = false;
      this.username = localStorage.getItem("username") || "Player";
      this.selectedGameMode = localStorage.getItem("selectedGameMode") || "singleplayer";
      this.selectedDifficulty = localStorage.getItem("selectedDifficulty") || "normal";
      window.scoreSubmitted = false;

      this.currentDifficultySettings = difficultySettings[this.selectedDifficulty] || difficultySettings.normal;

      this.lastFrameTime = 0;
    }

    spawnEnemies() {
      this.enemies = [];
      const count = 2 + this.currentPhase * 2;
      for (let i = 0; i < count; i++) {
        let x, y, valid;
        do {
          valid = true;
          x = Math.random() * (map[0].length - 4) + 2;
          y = Math.random() * (map.length - 4) + 2;
          if (isWall(x, y) || (Math.abs(x - this.player.x) < 5 && Math.abs(y - this.player.y) < 5)) valid = false;
        } while (!valid);

        let typeKey = "zombie";
        const rand = Math.random();
        let cumulative = 0;
        for (const [key, type] of Object.entries(enemyTypes)) {
          cumulative += type.spawnChance;
          if (rand < cumulative) {
            typeKey = key;
            break;
          }
        }
        this.enemies.push(new Enemy(x, y, typeKey));
      }
    }

    getPhaseColor() {
      const red = Math.min(255, 100 + this.currentPhase * 30);
      const green = Math.max(0, 150 - this.currentPhase * 20);
      const blue = Math.max(0, 150 - this.currentPhase * 20);
      return `rgb(${red},${green},${blue})`;
    }

    drawBackground() {
      ctx.fillStyle = this.getPhaseColor();
      ctx.fillRect(0, 0, WIDTH, HEIGHT / 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);
    }

    drawEnemies(depthBuffer) {
      this.enemies.forEach((e) => {
        if (!e.alive) return;

        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;

        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;

        if (Math.abs(angle) >= FOV) return;

        const screenX = (angle / FOV + 0.5) * WIDTH;
        const spriteHeight = HEIGHT / dist;
        const spriteWidth = spriteHeight / 2;
        const left = screenX - spriteWidth / 2;
        const top = HEIGHT / 2 - spriteHeight / 2;

        const sprite = getEnemySprite(e.typeData);

        if (sprite.complete && sprite.naturalWidth > 0) {
          const imgW = sprite.naturalWidth;
          const imgH = sprite.naturalHeight;
          const colStart = Math.max(0, Math.floor(left));
          const colEnd = Math.min(WIDTH, Math.ceil(left + spriteWidth));

          const sliceSrcW = Math.max(1, imgW / spriteWidth);
          for (let col = colStart; col < colEnd; col++) {
            const rayIdx = Math.min(RAYS - 1, Math.max(0, Math.floor((col / WIDTH) * RAYS)));
            const wallDist = depthBuffer[rayIdx] ?? Infinity;
            if (dist >= wallDist) continue;

            const texX = ((col - left) / spriteWidth) * imgW;
            ctx.drawImage(sprite, texX, 0, sliceSrcW, imgH, col, top, 1, spriteHeight);
          }
        } else {
          ctx.fillStyle = e.typeData.color;
          ctx.fillRect(left, top, spriteWidth, spriteHeight);
        }
      });
    }

    drawHUD() {
      ctx.fillStyle = "white";
      ctx.font = "20px monospace";
      ctx.fillText("Ammo: " + this.ammo, 20, 30);
      ctx.fillText("Lives: " + this.lives, 20, 60);
      ctx.fillText("Difficulty: " + this.currentDifficultySettings.name, 20, 90);
      ctx.fillText("Phase: " + this.currentPhase, 20, 120);
      ctx.fillStyle = "white";
      ctx.fillText("+", WIDTH / 2 - 5, HEIGHT / 2 + 5);
      ctx.fillStyle = "yellow";
      ctx.textAlign = "right";
      ctx.fillText("Score: " + this.score, WIDTH - MINIMAP_SIZE - 30, 30);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(this.username, WIDTH / 2, 40);
      ctx.textAlign = "left";
      this.drawMinimap();
    }

    drawMinimap() {
      const pad = 10;
      const mx = WIDTH - MINIMAP_SIZE - pad;
      const my = pad;
      const mapW = map[0].length;
      const mapH = map.length;
      const scale = MINIMAP_SIZE / Math.max(mapW, mapH);

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(mx - 2, my - 2, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 2, my - 2, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4);

      for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
          if (map[y][x] === 1) {
            ctx.fillStyle = "rgba(80,80,80,0.9)";
            ctx.fillRect(mx + x * scale, my + y * scale, Math.ceil(scale) + 1, Math.ceil(scale) + 1);
          }
        }
      }

      this.enemies.forEach((e) => {
        if (!e.alive) return;
        ctx.fillStyle = e.typeData.color;
        ctx.beginPath();
        ctx.arc(mx + e.x * scale, my + e.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "lime";
      ctx.beginPath();
      const px = mx + this.player.x * scale;
      const py = my + this.player.y * scale;
      const dirLen = 4;
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(this.player.angle) * dirLen, py + Math.sin(this.player.angle) * dirLen);
      ctx.stroke();
    }

    drawSettingsOverlay() {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "white";
      ctx.font = "28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CONFIGURAÇÕES (TAB para fechar)", WIDTH / 2, 80);

      const left = WIDTH / 2 - 200;
      let y = 140;
      ctx.textAlign = "left";
      ctx.font = "18px monospace";

      ctx.fillText("Sensibilidade do mouse: " + this.gameSettings.mouseSensitivity.toFixed(3), left, y);
      y += 35;
      ctx.fillText("Velocidade de movimento: " + this.gameSettings.moveSpeed.toFixed(1) + "x", left, y);
      y += 50;

      ctx.font = "14px monospace";
      ctx.fillStyle = "rgba(200,200,200,0.9)";
      ctx.fillText("Mouse: [ ] ou ← → | Movimento: , . ou ↓ ↑", left, y);
      y += 25;
      ctx.fillText("Enter ou Espaço - Fechar", left, y);
    }

    drawGameOver() {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "red";
      ctx.font = "60px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2);
      ctx.font = "30px sans-serif";
      ctx.fillText("Score: " + this.score, WIDTH / 2, HEIGHT / 2 + 50);
      ctx.fillText("PRESS ESC TO RETURN", WIDTH / 2, HEIGHT / 2 + 100);
      ctx.textAlign = "left";
      if (!window.scoreSubmitted) {
        window.scoreSubmitted = true;
        this.saveScore();
      }
    }

    async saveScore() {
      try {
        await fetch("/api/trpc/scores.save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            0: {
              json: {
                score: Math.floor(this.score),
                gameMode: this.selectedGameMode,
                enemiesKilled: this.enemiesKilled,
                timePlayedSeconds: Math.floor(this.gameDuration / 1000),
              },
            },
          }),
          credentials: "include",
        });
      } catch (e) {
        console.error(e);
      }
    }

    shoot() {
      if (this.ammo <= 0 || this.gameState !== "playing" || this.gameOver) return;
      this.ammo--;
      this.gunRecoil = 5;

      let closest = null;
      let minDist = 12;
      this.enemies.forEach((e) => {
        if (!e.alive) return;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) < 0.2 && dist < minDist) {
          minDist = dist;
          closest = e;
        }
      });

      if (closest) {
        closest.health--;
        if (closest.health <= 0) {
          closest.alive = false;
          this.enemiesKilled++;
          this.phaseEnemiesKilled++;
        }
      }
    }

    gameLoop(timestamp = 0) {
      const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1) || BASE_DT;
      this.lastFrameTime = timestamp;

      this.drawBackground();
      const depthBuffer = this.raycaster.castRays();
      this.drawEnemies(depthBuffer);

      ctx.fillStyle = "brown";
      ctx.fillRect(WIDTH / 2 - 10, HEIGHT - 150 + this.gunRecoil, 20, 40);
      this.drawHUD();

      if (this.gameState === "playing") {
        if (this.gameStartTime === 0) {
          this.gameStartTime = Date.now();
          this.spawnEnemies();
        }
        if (!this.gameOver) {
          this.gameDuration = Date.now() - this.gameStartTime;
          this.score = Math.floor(
            (this.enemiesKilled * 100 + this.gameDuration / 1000 * 10) * this.currentDifficultySettings.scoreMultiplier
          );
        }

        if (this.keys[" "]) {
          this.shoot();
          this.keys[" "] = false;
        }
        if (this.gunRecoil > 0) this.gunRecoil = Math.max(0, this.gunRecoil - dt * 60);

        if (!this.settingsOpen && !this.gameOver) {
          this.player.move(dt, this.keys, this.gameSettings.moveSpeed);
        }

        if (!this.gameOver) {
          this.enemies.forEach((e) => {
            const result = e.update(dt, this.player, this.currentDifficultySettings);
            if (result) {
              this.lives -= result.damage;
              if (this.lives <= 0) this.gameOver = true;
            }
          });
        }

        if (!this.gameOver && this.phaseEnemiesKilled >= 2 + this.currentPhase * 2) {
          this.currentPhase++;
          this.phaseEnemiesKilled = 0;
          this.spawnEnemies();
        }

        if (this.gameOver) this.drawGameOver();
        if (this.settingsOpen) this.drawSettingsOverlay();
      } else if (this.gameState === "paused") {
        if (this.selectedGameMode === "multiplayer") {
          this.enemies.forEach((e) => e.update(dt, this.player, this.currentDifficultySettings));
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "white";
        ctx.font = "40px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
        ctx.font = "20px monospace";
        ctx.fillText("PRESS ESC TO RESUME", WIDTH / 2, HEIGHT / 2 + 40);
        ctx.textAlign = "left";
      }

      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------
  const game = new Game();

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (e.key === "Tab") {
      e.preventDefault();
      if (game.gameState === "playing" && !game.gameOver) {
        game.settingsOpen = !game.settingsOpen;
        if (game.settingsOpen) document.exitPointerLock();
        else canvas.requestPointerLock();
      }
      return;
    }
    if (game.settingsOpen) {
      let changed = false;
      if (e.key === "[" || e.key === "arrowleft") { game.gameSettings.mouseSensitivity = Math.max(0.0005, game.gameSettings.mouseSensitivity - 0.0005); changed = true; }
      if (e.key === "]" || e.key === "arrowright") { game.gameSettings.mouseSensitivity = Math.min(0.01, game.gameSettings.mouseSensitivity + 0.0005); changed = true; }
      if (e.key === "," || e.key === "arrowdown") { game.gameSettings.moveSpeed = Math.max(0.3, game.gameSettings.moveSpeed - 0.1); changed = true; }
      if (e.key === "." || e.key === "arrowup") { game.gameSettings.moveSpeed = Math.min(3, game.gameSettings.moveSpeed + 0.1); changed = true; }
      if (changed) {
        localStorage.setItem("mouseSensitivity", game.gameSettings.mouseSensitivity.toString());
        localStorage.setItem("moveSpeed", game.gameSettings.moveSpeed.toString());
      }
      if (e.key === "Enter" || e.key === " ") { game.settingsOpen = false; canvas.requestPointerLock(); }
      return;
    }
    if (e.key) game.keys[k] = true;
    if (e.key === "Escape") {
      if (game.gameState === "playing") {
        game.gameState = "paused";
        document.exitPointerLock();
      } else if (game.gameState === "paused") {
        game.gameState = "playing";
        canvas.requestPointerLock();
      } else if (game.gameOver) {
        window.location.href = "/menu";
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key) game.keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("click", () => canvas.requestPointerLock());

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas && game.gameState === "playing" && !game.settingsOpen) {
      game.player.angle += e.movementX * game.gameSettings.mouseSensitivity;
    }
  });

  game.gameLoop();
})();
