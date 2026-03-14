(function() {
  // window.gameLoaded check removed to allow re-initialization on route change

  let canvas = document.getElementById("gameCanvas")
  if (!canvas) return
  
  let ctx = canvas.getContext("2d")
  
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const WIDTH = canvas.width
  const HEIGHT = canvas.height

  const FOV = Math.PI / 3
  const RAYS = 320
  const MAX_DEPTH = 30

  const PLAYER_SPEED = 0.03
  const ENEMY_SPEED = 0.02

  let ammo = 10
  let lives = 3
  let gameOver = false
  let enemiesKilled = 0
  let gunRecoil = 0
  let score = 0
  let gameStartTime = 0
  let gameDuration = 0
  let currentPhase = 1
  let phaseEnemiesKilled = 0

  let gameSettings = {
    mouseSensitivity: parseFloat(localStorage.getItem("mouseSensitivity")) || 0.002,
    volume: 0.5,
    difficulty: 1
  }

  let gameState = "playing" 
  let username = localStorage.getItem("username") || "Player"
  let selectedGameMode = localStorage.getItem("selectedGameMode") || "singleplayer"
  let selectedDifficulty = localStorage.getItem("selectedDifficulty") || "normal"
  window.scoreSubmitted = false

  const difficultySettings = {
    easy: { enemySpeedMultiplier: 0.5, scoreMultiplier: 0.5, name: "EASY" },
    normal: { enemySpeedMultiplier: 1.0, scoreMultiplier: 1.0, name: "NORMAL" },
    hard: { enemySpeedMultiplier: 1.5, scoreMultiplier: 1.5, name: "HARD" },
    nightmare: { enemySpeedMultiplier: 2.0, scoreMultiplier: 2.0, name: "NIGHTMARE" }
  }

  let currentDifficultySettings = difficultySettings.normal

  const enemySprite = new Image()
  enemySprite.src = "mike.jpg"

  function generateMap() {
    const width = 84
    const height = 54
    const map = []
    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) row.push(1)
        else row.push(0)
      }
      map.push(row)
    }
    for (let y = 5; y < height - 5; y += 8) {
      for (let x = 5; x < width - 5; x += 10) {
        const roomSize = Math.random() > 0.5 ? 3 : 4
        const roomType = Math.floor(Math.random() * 3)
        if (roomType === 0) {
          for (let ry = 0; ry < roomSize; ry++)
            for (let rx = 0; rx < roomSize; rx++)
              if (y + ry < height - 1 && x + rx < width - 1) map[y + ry][x + rx] = 1
        } else if (roomType === 1) {
          for (let i = 0; i < roomSize + 2; i++) {
            if (y + i < height - 1) map[y + i][x] = 1
            if (x + i < width - 1) map[y][x + i] = 1
          }
        } else {
          for (let i = 0; i < roomSize; i++) {
            if (y + i < height - 1) map[y + i][x] = 1
            if (x + i < width - 1) map[y][x + i] = 1
          }
        }
      }
    }
    return map
  }

  let map = generateMap()
  const player = { x: 3, y: 3, angle: 0 }
  let enemies = []
  let keys = {}

  const enemyTypes = {
    zombie: { name: "Zombie", speed: 0.02, health: 1, attackCooldown: 60, damage: 1, attackRange: 0.5, color: "red", spawnChance: 0.6 },
    runner: { name: "Runner", speed: 0.04, health: 1, attackCooldown: 80, damage: 1, attackRange: 0.4, color: "#FF6B00", spawnChance: 0.25 },
    tank: { name: "Tank", speed: 0.01, health: 3, attackCooldown: 40, damage: 2, attackRange: 0.6, color: "darkred", spawnChance: 0.1 },
    ranged: { name: "Ranged", speed: 0.015, health: 1, attackCooldown: 100, damage: 1, attackRange: 3.0, color: "#FF00FF", spawnChance: 0.05 }
  }

  function spawnEnemies() {
    enemies = []
    const enemiesForPhase = 2 + (currentPhase * 2)
    for (let i = 0; i < enemiesForPhase; i++) {
      let x, y, valid
      do {
        valid = true
        x = Math.random() * (map[0].length - 4) + 2
        y = Math.random() * (map.length - 4) + 2
        if (isWall(x, y) || (Math.abs(x - player.x) < 5 && Math.abs(y - player.y) < 5)) valid = false
      } while (!valid)
      let typeKey = "zombie"
      const rand = Math.random()
      let cumulative = 0
      for (const [key, type] of Object.entries(enemyTypes)) {
        cumulative += type.spawnChance
        if (rand < cumulative) { typeKey = key; break; }
      }
      const type = enemyTypes[typeKey]
      enemies.push({ x, y, type: typeKey, typeData: type, alive: true, health: type.health, attackCooldown: 0 })
    }
  }

  function getPhaseColor() {
    const red = Math.min(255, 100 + (currentPhase * 30))
    const green = Math.max(0, 150 - (currentPhase * 20))
    const blue = Math.max(0, 150 - (currentPhase * 20))
    return `rgb(${red},${green},${blue})`
  }

  function isWall(x, y) {
    let row = Math.floor(y), col = Math.floor(x)
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return true
    return map[row][col] === 1
  }

  function movePlayer() {
    let newX = player.x, newY = player.y
    if (keys["w"] || keys["arrowup"]) { newX += Math.cos(player.angle) * PLAYER_SPEED; newY += Math.sin(player.angle) * PLAYER_SPEED; }
    if (keys["s"] || keys["arrowdown"]) { newX -= Math.cos(player.angle) * PLAYER_SPEED; newY -= Math.sin(player.angle) * PLAYER_SPEED; }
    if (keys["a"] || keys["arrowleft"]) { newX += Math.cos(player.angle - Math.PI/2) * PLAYER_SPEED; newY += Math.sin(player.angle - Math.PI/2) * PLAYER_SPEED; }
    if (keys["d"] || keys["arrowright"]) { newX += Math.cos(player.angle + Math.PI/2) * PLAYER_SPEED; newY += Math.sin(player.angle + Math.PI/2) * PLAYER_SPEED; }
    if (!isWall(newX, player.y)) player.x = newX
    if (!isWall(player.x, newY)) player.y = newY
  }

  function updateEnemies() {
    enemies.forEach(e => {
      if (!e.alive) return
      let dx = player.x - e.x, dy = player.y - e.y, dist = Math.sqrt(dx*dx + dy*dy)
      if (dist > e.typeData.attackRange) {
        let speed = e.typeData.speed * currentDifficultySettings.enemySpeedMultiplier
        let nx = e.x + (dx/dist)*speed, ny = e.y + (dy/dist)*speed
        if (!isWall(nx, e.y)) e.x = nx
        if (!isWall(e.x, ny)) e.y = ny
      }
      if (e.attackCooldown > 0) e.attackCooldown--
      if (dist < e.typeData.attackRange && e.attackCooldown <= 0) {
        lives -= e.typeData.damage
        e.attackCooldown = e.typeData.attackCooldown
        if (lives <= 0) gameOver = true
      }
    })
  }

  function drawHUD() {
    ctx.fillStyle = "white"; ctx.font = "20px monospace"
    ctx.fillText("Ammo: " + ammo, 20, 30)
    ctx.fillText("Lives: " + lives, 20, 60)
    ctx.fillText("Difficulty: " + currentDifficultySettings.name, 20, 90)
    ctx.fillText("Phase: " + currentPhase, 20, 120)
    ctx.fillText("+", WIDTH/2 - 5, HEIGHT/2 + 5)
    ctx.fillStyle = "yellow"; ctx.textAlign = "right"
    ctx.fillText("Score: " + score, WIDTH - 20, 30)
    ctx.fillStyle = "white"; ctx.textAlign = "center"
    ctx.fillText(username, WIDTH/2, 40)
    ctx.textAlign = "left"
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = "red"; ctx.font = "60px sans-serif"; ctx.textAlign = "center"
    ctx.fillText("GAME OVER", WIDTH/2, HEIGHT/2)
    ctx.font = "30px sans-serif"; ctx.fillText("Score: " + score, WIDTH/2, HEIGHT/2 + 50)
    ctx.fillText("PRESS ESC TO RETURN", WIDTH/2, HEIGHT/2 + 100)
    ctx.textAlign = "left"
    if (!window.scoreSubmitted) { window.scoreSubmitted = true; saveScore(); }
  }

  async function saveScore() {
    try {
      await fetch('/api/trpc/scores.save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 0: { json: { score: Math.floor(score), gameMode: selectedGameMode, enemiesKilled, timePlayedSeconds: Math.floor(gameDuration/1000) } } }),
        credentials: 'include'
      })
    } catch (e) { console.error(e) }
  }

  function drawBackground() {
    ctx.fillStyle = getPhaseColor(); ctx.fillRect(0, 0, WIDTH, HEIGHT/2)
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, HEIGHT/2, WIDTH, HEIGHT/2)
  }

  function castRays() {
    for (let i = 0; i < RAYS; i++) {
      let angle = player.angle - FOV/2 + (i/RAYS)*FOV, x = player.x, y = player.y
      let stepX = Math.cos(angle), stepY = Math.sin(angle), dist = 0, hit = false
      while (!hit && dist < MAX_DEPTH) { dist += 0.05; x += stepX*0.05; y += stepY*0.05; if (isWall(x, y)) hit = true; }
      let height = HEIGHT/dist, color = Math.max(0, Math.min(255, 255 - dist*8))
      ctx.fillStyle = `rgb(${color},${color},${color})`; ctx.fillRect((i/RAYS)*WIDTH, HEIGHT/2 - height/2, WIDTH/RAYS, height)
    }
  }

  function drawEnemies() {
    enemies.forEach(e => {
      if (!e.alive) return
      let dx = e.x - player.x, dy = e.y - player.y, dist = Math.sqrt(dx*dx + dy*dy), angle = Math.atan2(dy, dx) - player.angle
      while (angle < -Math.PI) angle += Math.PI*2; while (angle > Math.PI) angle -= Math.PI*2
      if (Math.abs(angle) < FOV) {
        let screenX = (angle/FOV + 0.5)*WIDTH, height = HEIGHT/dist
        ctx.fillStyle = e.typeData.color; ctx.fillRect(screenX - height/4, HEIGHT/2 - height/2, height/2, height)
      }
    })
  }

  function shoot() {
    if (ammo <= 0 || gameState !== "playing") return
    ammo--; gunRecoil = 5
    let closest = null, minDist = 2
    enemies.forEach(e => {
      if (!e.alive) return
      let dx = e.x - player.x, dy = e.y - player.y, dist = Math.sqrt(dx*dx + dy*dy), angle = Math.atan2(dy, dx) - player.angle
      if (Math.abs(angle) < 0.1 && dist < minDist) { minDist = dist; closest = e; }
    })
    if (closest) { closest.health--; if (closest.health <= 0) { closest.alive = false; enemiesKilled++; phaseEnemiesKilled++; } }
  }

  function gameLoop() {
    drawBackground(); castRays(); drawEnemies(); 
    ctx.fillStyle = "brown"; ctx.fillRect(WIDTH/2 - 10, HEIGHT - 150 + gunRecoil, 20, 40) // Gun
    drawHUD()
    if (gameState === "playing") {
      if (gameStartTime === 0) { gameStartTime = Date.now(); spawnEnemies(); }
      gameDuration = Date.now() - gameStartTime
      score = Math.floor((enemiesKilled*100 + (gameDuration/1000)*10) * currentDifficultySettings.scoreMultiplier)
      if (keys[" "]) { shoot(); keys[" "] = false; }
      if (gunRecoil > 0) gunRecoil--
      movePlayer(); updateEnemies()
      if (phaseEnemiesKilled >= 2 + (currentPhase*2)) { currentPhase++; phaseEnemiesKilled = 0; spawnEnemies(); }
      if (gameOver) drawGameOver()
    } else if (gameState === "paused") {
      if (selectedGameMode === "multiplayer") { updateEnemies() }
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = "white"; ctx.font = "40px monospace"; ctx.textAlign = "center"
      ctx.fillText("PAUSED", WIDTH/2, HEIGHT/2)
      ctx.font = "20px monospace"; ctx.fillText("PRESS ESC TO RESUME", WIDTH/2, HEIGHT/2 + 40)
      ctx.textAlign = "left"
    }
    requestAnimationFrame(gameLoop)
  }

  document.addEventListener("keydown", (e) => {
    if (e.key) keys[e.key.toLowerCase()] = true
    if (e.key === "Escape") {
      if (gameState === "playing") { gameState = "paused"; document.exitPointerLock(); }
      else if (gameState === "paused") { gameState = "playing"; canvas.requestPointerLock(); }
      else if (gameOver) { window.location.href = "/menu"; }
    }
  })
  document.addEventListener("keyup", (e) => { if (e.key) keys[e.key.toLowerCase()] = false; })
  canvas.addEventListener("click", () => canvas.requestPointerLock())
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas && gameState === "playing") player.angle += e.movementX * gameSettings.mouseSensitivity
  })

  currentDifficultySettings = difficultySettings[selectedDifficulty] || difficultySettings.normal
  gameLoop()
})()
