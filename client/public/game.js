(function() {
  if (window.gameLoaded) return
  window.gameLoaded = true

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
let maxEnemiesPerRoom = 10
let gunRecoil = 0
let score = 0
let gameStartTime = 0
let gameDuration = 0
let currentPhase = 1
let phaseEnemiesKilled = 0

// Configurações do jogo
let gameSettings = {
  mouseSensitivity: parseFloat(localStorage.getItem("mouseSensitivity")) || 0.002,
  volume: 0.5,
  difficulty: 1
}

// Estado do jogo
let gameState = "menu"
let username = ""
let selectedGameMode = "singleplayer"
let selectedDifficulty = "normal"
let gameModeMenuIndex = 0
let difficultyMenuIndex = 0
let mainMenuIndex = 0
window.scoreSubmitted = false
let pausedMenuIndex = 0
let settingsMenuIndex = 0

// Configurações de dificuldade
const difficultySettings = {
  easy: { enemySpeedMultiplier: 0.5, scoreMultiplier: 0.5, name: "EASY" },
  normal: { enemySpeedMultiplier: 1.0, scoreMultiplier: 1.0, name: "NORMAL" },
  hard: { enemySpeedMultiplier: 1.5, scoreMultiplier: 1.5, name: "HARD" },
  nightmare: { enemySpeedMultiplier: 2.0, scoreMultiplier: 2.0, name: "NIGHTMARE" }
}

let currentDifficultySettings = difficultySettings.normal

const enemySprite = new Image()
enemySprite.src = "mike.jpg"

// Gerar mapa 3x maior (84x54)
function generateMap() {
  const width = 84
  const height = 54
  const map = []
  
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        row.push(1)
      } else {
        row.push(0)
      }
    }
    map.push(row)
  }
  
  for (let y = 5; y < height - 5; y += 8) {
    for (let x = 5; x < width - 5; x += 10) {
      const roomSize = Math.random() > 0.5 ? 3 : 4
      const roomType = Math.floor(Math.random() * 3)
      
      if (roomType === 0) {
        for (let ry = 0; ry < roomSize; ry++) {
          for (let rx = 0; rx < roomSize; rx++) {
            if (y + ry < height - 1 && x + rx < width - 1) {
              map[y + ry][x + rx] = 1
            }
          }
        }
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

const player = {
  x: 3,
  y: 3,
  angle: 0
}

if (!window.gameInitialized) {
  window.gameInitialized = true
}

let enemies = window.enemies || []
let keys = window.keys || {}

// Tipos de inimigos
const enemyTypes = {
  zombie: {
    name: "Zombie",
    speed: 0.02,
    health: 1,
    attackCooldown: 60,
    damage: 1,
    attackRange: 0.5,
    color: "red",
    spawnChance: 0.6
  },
  runner: {
    name: "Runner",
    speed: 0.04,
    health: 1,
    attackCooldown: 80,
    damage: 1,
    attackRange: 0.4,
    color: "#FF6B00",
    spawnChance: 0.25
  },
  tank: {
    name: "Tank",
    speed: 0.01,
    health: 3,
    attackCooldown: 40,
    damage: 2,
    attackRange: 0.6,
    color: "darkred",
    spawnChance: 0.1
  },
  ranged: {
    name: "Ranged",
    speed: 0.015,
    health: 1,
    attackCooldown: 100,
    damage: 1,
    attackRange: 3.0,
    color: "#FF00FF",
    spawnChance: 0.05
  }
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
      if (isWall(x, y) || (Math.abs(x - player.x) < 5 && Math.abs(y - player.y) < 5)) {
        valid = false
      }
    } while (!valid)
    
    let typeKey = "zombie"
    const rand = Math.random()
    let cumulative = 0
    for (const [key, type] of Object.entries(enemyTypes)) {
      cumulative += type.spawnChance
      if (rand < cumulative) {
        typeKey = key
        break
      }
    }
    
    const type = enemyTypes[typeKey]
    enemies.push({
      x: x,
      y: y,
      type: typeKey,
      typeData: type,
      alive: true,
      health: type.health,
      attackCooldown: 0,
      hasAttacked: false
    })
  }
}

function getPhaseColor() {
  const redIntensity = Math.min(255, 100 + (currentPhase * 30))
  const greenIntensity = Math.max(0, 150 - (currentPhase * 20))
  const blueIntensity = Math.max(0, 150 - (currentPhase * 20))
  
  return `rgb(${redIntensity},${greenIntensity},${blueIntensity})`
}

function checkPhaseCompletion() {
  if (phaseEnemiesKilled >= 2 + (currentPhase * 2)) {
    currentPhase++
    phaseEnemiesKilled = 0
    spawnEnemies()
  }
}

document.addEventListener("keyup", e => {
    if (e.key) {
      keys[e.key.toLowerCase()] = false;
    }
  })

canvas.addEventListener("click", () => canvas.requestPointerLock())

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas && gameState === "playing") {
    player.angle += e.movementX * gameSettings.mouseSensitivity
  }
})

function isWall(x, y) {
  let row = Math.floor(y)
  let col = Math.floor(x)
  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return true
  return map[row][col] === 1
}

function movePlayer() {
  let newX = player.x
  let newY = player.y
  
  if (keys["w"] || keys["arrowup"]) {
    newX += Math.cos(player.angle) * PLAYER_SPEED
    newY += Math.sin(player.angle) * PLAYER_SPEED
  }
  if (keys["s"] || keys["arrowdown"]) {
    newX -= Math.cos(player.angle) * PLAYER_SPEED
    newY -= Math.sin(player.angle) * PLAYER_SPEED
  }
  if (keys["a"] || keys["arrowleft"]) {
    newX += Math.cos(player.angle - Math.PI / 2) * PLAYER_SPEED
    newY += Math.sin(player.angle - Math.PI / 2) * PLAYER_SPEED
  }
  if (keys["d"] || keys["arrowright"]) {
    newX += Math.cos(player.angle + Math.PI / 2) * PLAYER_SPEED
    newY += Math.sin(player.angle + Math.PI / 2) * PLAYER_SPEED
  }
  
  if (!isWall(newX, player.y)) player.x = newX
  if (!isWall(player.x, newY)) player.y = newY
}

function updateEnemies() {
  enemies.forEach(e => {
    if (!e.alive) return

    let dx = player.x - e.x
    let dy = player.y - e.y
    let dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > e.typeData.attackRange) {
      let adjustedEnemySpeed = e.typeData.speed * currentDifficultySettings.enemySpeedMultiplier
      let stepX = dx / dist * adjustedEnemySpeed
      let stepY = dy / dist * adjustedEnemySpeed
      let nx = e.x + stepX
      let ny = e.y + stepY

      if (!isWall(nx, e.y)) e.x = nx
      if (!isWall(e.x, ny)) e.y = ny
    }

    if (e.attackCooldown > 0) e.attackCooldown--

    if (dist < e.typeData.attackRange && e.attackCooldown <= 0) {
      lives -= e.typeData.damage
      e.hasAttacked = true
      e.attackCooldown = e.typeData.attackCooldown
      if (lives <= 0) gameOver = true
    }
  })
}

function drawGun() {
  ctx.fillStyle = "brown"
  ctx.fillRect(WIDTH / 2 - 10, HEIGHT - 150 + gunRecoil, 20, 40)
}

function drawHUD() {
  ctx.fillStyle = "white"
  ctx.font = "20px monospace"
  ctx.fillText("Ammo: " + ammo, 20, 30)
  ctx.fillText("Lives: " + lives, 20, 60)
  ctx.fillText("Difficulty: " + currentDifficultySettings.name, 20, 90)
  ctx.fillText("Phase: " + currentPhase, 20, 120)
  ctx.fillText("+", WIDTH / 2 - 5, HEIGHT / 2 + 5)
  
  ctx.font = "24px monospace"
  ctx.fillStyle = "yellow"
  ctx.textAlign = "right"
  ctx.fillText("Score: " + score, WIDTH - 20, 30)
  ctx.textAlign = "left"
  
  ctx.font = "24px Arial"
  ctx.fillStyle = "white"
  ctx.textAlign = "center"
  ctx.fillText(username, WIDTH / 2, 40)
  ctx.textAlign = "left"
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.8)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "red"
  ctx.font = "60px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2)
  ctx.font = "30px sans-serif"
  ctx.fillText("Score: " + score, WIDTH / 2, HEIGHT / 2 + 50)
  ctx.fillText("Phase: " + currentPhase, WIDTH / 2, HEIGHT / 2 + 100)
  ctx.fillText("Pressione ESC para voltar", WIDTH / 2, HEIGHT / 2 + 150)
  ctx.textAlign = "left"
  
  if (!window.scoreSubmitted) {
    window.scoreSubmitted = true
    saveScore()
  }
}

async function saveScore() {
  try {
    // Verificar se o usuário está logado antes de tentar salvar
    const userResponse = await fetch('/api/trpc/auth.me', { credentials: 'include' });
    if (userResponse.status === 401) {
      console.warn('User not logged in, score will not be saved');
      return;
    }

    const response = await fetch('/api/trpc/scores.save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        0: {
          json: {
            score: Math.floor(score),
            gameMode: selectedGameMode,
            enemiesKilled: Math.floor(enemiesKilled),
            timePlayedSeconds: Math.floor(gameDuration / 1000)
          }
        }
      }),
      credentials: 'include'
    })
    const data = await response.json()
    console.log('Score saved:', response.status, data)
  } catch (error) {
    console.error('Failed to save score:', error)
  }
}

function drawBackground() {
  const phaseColor = getPhaseColor()
  ctx.fillStyle = phaseColor
  ctx.fillRect(0, 0, WIDTH, HEIGHT / 2)
  ctx.fillStyle = "rgba(0,0,0,0.3)"
  ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2)
}

function drawMiniMap() {
  let scale = 3
  let mapWidth = map[0].length * scale
  let mapHeight = map.length * scale
  let mapX = WIDTH - mapWidth - 10
  let mapY = 10

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (map[y][x] === 1) ctx.fillStyle = "white"
      else ctx.fillStyle = "black"
      ctx.fillRect(mapX + x * scale, mapY + y * scale, scale, scale)
    }
  }

  ctx.fillStyle = "yellow"
  ctx.fillRect(mapX + player.x * scale - 2, mapY + player.y * scale - 2, 4, 4)

  enemies.forEach(e => {
    if (e.alive) {
      ctx.fillStyle = "red"
      ctx.fillRect(mapX + e.x * scale - 2, mapY + e.y * scale - 2, 4, 4)
    }
  })
}

function drawEnemies() {
  enemies.forEach(e => {
    if (!e.alive) return
    let dx = e.x - player.x
    let dy = e.y - player.y
    let dist = Math.sqrt(dx * dx + dy * dy)
    let angle = Math.atan2(dy, dx) - player.angle

    if (dist < MAX_DEPTH && Math.abs(angle) < FOV / 2) {
      let screenX = (angle + FOV / 2) / FOV * WIDTH
      let height = HEIGHT / dist
      let y = HEIGHT / 2 - height / 2
      let width = 40
      let eyeSize = 10

      ctx.fillStyle = e.typeData.color
      ctx.fillRect(screenX - width / 2, y, width, height)
      
      if (e.type === "tank") {
        ctx.fillStyle = "#8B0000"
        ctx.fillRect(screenX - width / 2, y, width, height * 0.3)
      } else if (e.type === "ranged") {
        ctx.fillStyle = "#FF1493"
        ctx.fillRect(screenX - width / 2 + 5, y + height * 0.2, 5, height * 0.6)
        ctx.fillRect(screenX + width / 2 - 10, y + height * 0.2, 5, height * 0.6)
      }
      
      ctx.fillStyle = "darkred"
      ctx.fillRect(screenX - eyeSize / 2 - 5, y + 10, eyeSize, eyeSize)
      ctx.fillRect(screenX + eyeSize / 2 + 5, y + 10, eyeSize, eyeSize)
    }
  })
}

function drawAmmo() {
  ctx.fillStyle = "yellow"
  ctx.font = "20px monospace"
  ctx.fillText("Ammo: " + ammo, WIDTH - 150, 30)
}

function drawPauseMenu() {
  ctx.fillStyle = "rgba(0,0,0,0.9)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "white"
  ctx.font = "bold 50px Arial"
  ctx.textAlign = "center"
  ctx.fillText("PAUSED", WIDTH / 2, 100)
  
  const pauseOptions = ["RESUME", "SETTINGS", "QUIT"]
  ctx.font = "30px Arial"
  pauseOptions.forEach((option, index) => {
    ctx.fillStyle = pausedMenuIndex === index ? "red" : "white"
    ctx.fillText((pausedMenuIndex === index ? "> " : "  ") + option, WIDTH / 2, 250 + index * 80)
  })

  ctx.fillStyle = "white"
  ctx.font = "16px monospace"
  ctx.fillText("USE ARROW KEYS OR WASD TO NAVIGATE", WIDTH / 2, HEIGHT - 100)
  ctx.fillText("PRESS ENTER TO SELECT", WIDTH / 2, HEIGHT - 60)
  ctx.textAlign = "left"
}

function drawMainMenu() {
  ctx.fillStyle = "rgba(20,20,40,0.95)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "red"
  ctx.font = "bold 60px Arial"
  ctx.textAlign = "center"
  ctx.fillText("DOOM", WIDTH / 2, 100)
  ctx.font = "32px Arial"
  ctx.fillStyle = "white"
  ctx.fillText("Bem-vindo, " + username, WIDTH / 2, 180)
  
  const mainMenuOptions = ["NEW GAME", "SETTINGS", "LOGOUT"]
  ctx.font = "30px Arial"
  mainMenuOptions.forEach((option, index) => {
    ctx.fillStyle = mainMenuIndex === index ? "red" : "white"
    ctx.fillText((mainMenuIndex === index ? "> " : "  ") + option, WIDTH / 2 - 100, 300 + index * 70)
  })
  
  ctx.fillStyle = "gray"
  ctx.font = "16px Arial"
  ctx.textAlign = "center"
  ctx.fillText("Press UP/DOWN or W/S to navigate, ENTER to select", WIDTH / 2, HEIGHT - 50)
  ctx.textAlign = "left"
}

function drawGameModeMenu() {
  ctx.fillStyle = "rgba(0,0,0,0.9)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "red"
  ctx.font = "bold 50px Arial"
  ctx.textAlign = "center"
  ctx.fillText("SELECT GAME MODE", WIDTH / 2, 100)
  
  const modes = ["SINGLE PLAYER", "MULTIPLAYER", "CUSTOM GAME"]
  ctx.font = "30px Arial"
  ctx.fillStyle = "white"
  
  modes.forEach((mode, index) => {
    ctx.fillStyle = gameModeMenuIndex === index ? "red" : "white"
    ctx.fillText((gameModeMenuIndex === index ? "> " : "  ") + mode, WIDTH / 2 - 150, 250 + index * 60)
  })
  
  ctx.fillStyle = "gray"
  ctx.font = "16px Arial"
  ctx.textAlign = "center"
  ctx.fillText("Press UP/DOWN or W/S to navigate, ENTER to select", WIDTH / 2, HEIGHT - 50)
  ctx.textAlign = "left"
}

function drawDifficultyMenu() {
  ctx.fillStyle = "rgba(0,0,0,0.9)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "red"
  ctx.font = "bold 50px Arial"
  ctx.textAlign = "center"
  ctx.fillText("SELECT DIFFICULTY", WIDTH / 2, 100)
  
  const difficulties = Object.keys(difficultySettings).map(key => difficultySettings[key].name)
  ctx.font = "30px Arial"
  ctx.fillStyle = "white"
  
  difficulties.forEach((diff, index) => {
    ctx.fillStyle = difficultyMenuIndex === index ? "red" : "white"
    ctx.fillText((difficultyMenuIndex === index ? "> " : "  ") + diff, WIDTH / 2 - 150, 250 + index * 60)
  })
  
  ctx.fillStyle = "gray"
  ctx.font = "16px Arial"
  ctx.textAlign = "center"
  ctx.fillText("Press UP/DOWN or W/S to navigate, ENTER to select", WIDTH / 2, HEIGHT - 50)
  ctx.textAlign = "left"
}

function drawSettingsMenu() {
  ctx.fillStyle = "rgba(0,0,0,0.9)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "red"
  ctx.font = "bold 50px Arial"
  ctx.textAlign = "center"
  ctx.fillText("SETTINGS", WIDTH / 2, 100)
  
  ctx.fillStyle = "white"
  ctx.font = "24px Arial"
  ctx.textAlign = "left"
  ctx.fillText("Mouse Sensitivity: " + gameSettings.mouseSensitivity.toFixed(3), 100, 200)
  ctx.fillText("Use [ and ] to adjust", 100, 240)
  
  ctx.fillStyle = "gray"
  ctx.font = "16px Arial"
  ctx.textAlign = "center"
  ctx.fillText("Press ESC to go back", WIDTH / 2, HEIGHT - 50)
  ctx.textAlign = "left"
}

function castRays() {
  for (let i = 0; i < RAYS; i++) {
    let angle = player.angle - FOV / 2 + (i / RAYS) * FOV
    let x = player.x
    let y = player.y
    let stepX = Math.cos(angle)
    let stepY = Math.sin(angle)

    let dist = 0
    let hit = false

    while (!hit && dist < MAX_DEPTH) {
      dist += 0.05
      x += stepX * 0.05
      y += stepY * 0.05
      if (isWall(x, y)) hit = true
    }

    let height = HEIGHT / dist
    let color = 255 - dist * 8
    color = Math.max(0, Math.min(255, color))

    ctx.fillStyle = `rgb(${color},${color},${color})`
    ctx.fillRect((i / RAYS) * WIDTH, HEIGHT / 2 - height / 2, WIDTH / RAYS, height)
  }
}

function shoot() {
  if (ammo <= 0 || gameState !== "playing") return
  
  ammo--
  gunRecoil = 5
  
  let closestEnemy = null
  let closestDist = 2
  
  enemies.forEach(e => {
    if (!e.alive) return
    let dx = e.x - player.x
    let dy = e.y - player.y
    let dist = Math.sqrt(dx * dx + dy * dy)
    let angle = Math.atan2(dy, dx) - player.angle
    
    if (Math.abs(angle) < 0.1 && dist < closestDist) {
      closestDist = dist
      closestEnemy = e
    }
  })
  
  if (closestEnemy) {
    closestEnemy.health--
    if (closestEnemy.health <= 0) {
      closestEnemy.alive = false
      enemiesKilled++
      phaseEnemiesKilled++
    }
  }
}

function gameLoop() {
  if (gameState === "playing") {
    if (gameStartTime === 0) {
      gameStartTime = Date.now()
      score = 0
      window.scoreSubmitted = false
      spawnEnemies()
    }
    gameDuration = Date.now() - gameStartTime
    let baseScore = enemiesKilled * 100 + Math.floor(gameDuration / 1000) * 10
    score = Math.floor(baseScore * currentDifficultySettings.scoreMultiplier)
    
    if (keys[" "]) {
      shoot()
      keys[" "] = false
    }
    
    if (gunRecoil > 0) gunRecoil--
    
    movePlayer()
    drawBackground()
    castRays()
    drawEnemies()
    drawAmmo()
    updateEnemies()
    drawGun()
    drawHUD()
    drawMiniMap()
    checkPhaseCompletion()

    if (gameOver) {
      drawGameOver()
    }
  } else if (gameState === "paused") {
    movePlayer()
    drawBackground()
    castRays()
    drawEnemies()
    drawAmmo()
    updateEnemies()
    drawGun()
    drawHUD()
    drawMiniMap()
    drawPauseMenu()
  } else if (gameState === "menu") {
    drawMainMenu()
  } else if (gameState === "gameMode") {
    drawGameModeMenu()
  } else if (gameState === "difficulty") {
    drawDifficultyMenu()
  } else if (gameState === "settings") {
    drawSettingsMenu()
  }

  requestAnimationFrame(gameLoop)
}

document.addEventListener("keydown", (e) => {
  if (e.key) {
    keys[e.key.toLowerCase()] = true
  }
  
  if (gameState === "menu") {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      mainMenuIndex = (mainMenuIndex - 1 + 3) % 3
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      mainMenuIndex = (mainMenuIndex + 1) % 3
    } else if (e.key === "Enter") {
      if (mainMenuIndex === 0) {
        gameState = "gameMode"
        gameModeMenuIndex = 0
      } else if (mainMenuIndex === 1) {
        gameState = "settings"
      } else if (mainMenuIndex === 2) {
        window.location.href = "/"
      }
    }
  } else if (gameState === "settings" && gameStartTime === 0) {
    if (e.key === "[") {
      gameSettings.mouseSensitivity = Math.max(0.0001, gameSettings.mouseSensitivity - 0.0005)
      localStorage.setItem("mouseSensitivity", gameSettings.mouseSensitivity.toString())
    } else if (e.key === "]") {
      gameSettings.mouseSensitivity += 0.0005
      localStorage.setItem("mouseSensitivity", gameSettings.mouseSensitivity.toString())
    } else if (e.key === "Escape") {
      gameState = "menu"
      mainMenuIndex = 0
    }
  } else if (gameState === "paused") {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      pausedMenuIndex = (pausedMenuIndex - 1 + 3) % 3
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      pausedMenuIndex = (pausedMenuIndex + 1) % 3
    } else if (e.key === "Enter") {
      if (pausedMenuIndex === 0) {
        gameState = "playing"
      } else if (pausedMenuIndex === 1) {
        gameState = "settings"
      } else if (pausedMenuIndex === 2) {
        window.location.href = "/menu"
      }
    }
  } else if (gameState === "gameMode") {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      gameModeMenuIndex = (gameModeMenuIndex - 1 + 3) % 3
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      gameModeMenuIndex = (gameModeMenuIndex + 1) % 3
    } else if (e.key === "Enter") {
      const modes = ["singleplayer", "multiplayer", "custom"]
      selectedGameMode = modes[gameModeMenuIndex]
      gameState = "difficulty"
      difficultyMenuIndex = 0
    }
  } else if (gameState === "difficulty") {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      difficultyMenuIndex = (difficultyMenuIndex - 1 + 4) % 4
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      difficultyMenuIndex = (difficultyMenuIndex + 1) % 4
    } else if (e.key === "Enter") {
      const difficulties = ["easy", "normal", "hard", "nightmare"]
      selectedDifficulty = difficulties[difficultyMenuIndex]
      currentDifficultySettings = difficultySettings[selectedDifficulty]
      gameState = "playing"
      gameStartTime = 0
      score = 0
      enemiesKilled = 0
      phaseEnemiesKilled = 0
      currentPhase = 1
      lives = 3
      ammo = 10
      gameOver = false
      window.scoreSubmitted = false
    }
  } else if (gameState === "playing" && e.key === "Escape") {
    gameState = "paused"
    pausedMenuIndex = 0
  }
})

function initGame() {
  const params = new URLSearchParams(window.location.search)
  username = params.get("username") || localStorage.getItem("username") || "Player"
  
  // O fluxo agora é: Login -> Menu Principal (Home) -> New Game -> Modos -> Dificuldade
  // Quando o jogador entra na página /game, ele começa no menu principal do jogo
  gameState = "menu"
  
  gameLoop()
}
initGame()
})()
