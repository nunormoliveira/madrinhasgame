const screens = {
  start: document.getElementById('screen-start'),
  game: document.getElementById('screen-game'),
  message: document.getElementById('screen-message'),
};
const playerNameEl = document.getElementById('player-name');
const levelNumberEl = document.getElementById('level-number');
const livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score');
const photoCaption = document.getElementById('photo-caption');
const gameArea = document.getElementById('game-area');
const playerEl = document.getElementById('player');
const worldEl = document.createElement('div');
worldEl.id = 'world';
worldEl.className = 'world';
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageActions = document.getElementById('message-actions');

let state = {
  name: '',
  character: '',
  level: 1,
  score: 0,
  lives: 3,
  playerX: 20,
  playerY: 0,
  playerVy: 0,
  onGround: true,
  isHurt: false,
  spikes: [],
  movingSpikes: [],
  walls: [],
  springs: [],
  goal: null,
  levelWidth: 800,
  cameraOffset: 0,
  moveLeft: false,
  moveSpeed: 5.0,
  gravity: 1.2,
  jumpStrength: 22,
  maxFallSpeed: 22,
  moveRight: false,
  wantJump: false,
  animationId: null,
  audio: {
    context: null,
    gainNode: null,
    oscillator: null,
    intervalId: null,
    currentLevel: null,
    isUnlocked: false,
  },
};

const characterButtons = document.querySelectorAll('#character-select .avatar-button');
characterButtons.forEach(button => {
  button.addEventListener('click', () => {
    startGame(button.dataset.character);
  });
});

const controls = document.querySelectorAll('.controls button');
controls.forEach(button => {
  button.addEventListener('click', () => movePlayer(button.dataset.action));
  button.addEventListener('pointerdown', () => setControl(button.dataset.action, true));
  button.addEventListener('pointerup', () => setControl(button.dataset.action, false));
  button.addEventListener('pointerleave', () => setControl(button.dataset.action, false));
});

document.addEventListener('keydown', event => {
  const keyMap = {
    ArrowUp: 'up',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };
  const action = keyMap[event.key];
  if (action) {
    event.preventDefault();
    setControl(action, true);
  }
});

document.addEventListener('keyup', event => {
  const keyMap = {
    ArrowUp: 'up',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };
  const action = keyMap[event.key];
  if (action) {
    event.preventDefault();
    setControl(action, false);
  }
});

function setControl(action, active) {
  if (action === 'left') state.moveLeft = active;
  if (action === 'right') state.moveRight = active;
  if (action === 'up') state.wantJump = active;
}

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[name].classList.add('active');
}

function startGame(name) {
  state.name = name;
  state.character = name.toLowerCase();
  state.level = 1;
  state.score = 0;
  state.lives = 3;
  state.isHurt = false;
  updateHud();
  showScreen('game');
  loadLevel();
}

function updateHud() {
  playerNameEl.textContent = state.name;
  levelNumberEl.textContent = state.level;
  livesEl.textContent = state.lives;
  scoreEl.textContent = state.score;
}

function initAudio() {
  if (state.audio.isUnlocked) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  state.audio.context = new AudioContext();
  state.audio.gainNode = state.audio.context.createGain();
  state.audio.gainNode.gain.value = 0.12;
  state.audio.gainNode.connect(state.audio.context.destination);
  state.audio.isUnlocked = true;
}

function playLevelMusic(level) {
  initAudio();
  if (!state.audio.context) return;
  if (state.audio.currentLevel === level) return;
  stopMusic();
  state.audio.currentLevel = level;
  const sequence = getMusicSequence(level);
  if (!sequence || !sequence.length) return;
  let index = 0;
  function playNote(note) {
    const osc = state.audio.context.createOscillator();
    osc.type = note.wave;
    osc.frequency.value = note.freq;
    osc.connect(state.audio.gainNode);
    osc.start();
    osc.stop(state.audio.context.currentTime + note.duration);
    if (note.filter) {
      const filter = state.audio.context.createBiquadFilter();
      filter.type = note.filter.type;
      filter.frequency.value = note.filter.freq;
      osc.disconnect();
      osc.connect(filter);
      filter.connect(state.audio.gainNode);
    }
  }
  function tick() {
    const note = sequence[index];
    if (note) playNote(note);
    index = (index + 1) % sequence.length;
    state.audio.intervalId = window.setTimeout(tick, note.duration * 850);
  }
  tick();
}

function getMusicSequence(level) {
  switch (level) {
    case 1:
      return [
        { freq: 330, duration: 0.35, wave: 'triangle' },
        { freq: 392, duration: 0.35, wave: 'triangle' },
        { freq: 440, duration: 0.35, wave: 'triangle' },
        { freq: 494, duration: 0.35, wave: 'triangle' },
      ];
    case 2:
      return [
        { freq: 523, duration: 0.3, wave: 'square' },
        { freq: 494, duration: 0.3, wave: 'square' },
        { freq: 440, duration: 0.3, wave: 'square' },
        { freq: 494, duration: 0.3, wave: 'square' },
      ];
    case 3:
      return [
        { freq: 349, duration: 0.3, wave: 'sine' },
        { freq: 392, duration: 0.3, wave: 'sine' },
        { freq: 440, duration: 0.3, wave: 'sine' },
        { freq: 392, duration: 0.3, wave: 'sine' },
      ];
    default:
      return [];
  }
}

function stopMusic() {
  if (state.audio.intervalId) {
    clearTimeout(state.audio.intervalId);
    state.audio.intervalId = null;
  }
  state.audio.currentLevel = null;
}

const playerPilot = {
  Nicole: '🐱',
  Andreia: '🐶',
  Carolina: '🐰',
};

function loadLevel() {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }

  state.spikes = [];
  state.movingSpikes = [];
  state.walls = [];
  state.springs = [];
  state.goal = null;
  state.playerX = 20;
  state.playerY = 0;
  state.playerVy = 0;
  state.onGround = false;
  state.isHurt = false;

  gameArea.innerHTML = '';
  worldEl.innerHTML = '';
  gameArea.appendChild(worldEl);
  gameArea.appendChild(playerEl);

  const levelInfo = getLevelConfig(state.level);
  state.levelWidth = Math.max(800, levelInfo.goalX + 140);
  worldEl.style.width = `${state.levelWidth}px`;
  worldEl.style.transform = 'translateX(0)';

  photoCaption.textContent = levelInfo.label;
  updateHud();
  playLevelMusic(state.level);

  createPlatform();
  if (levelInfo.posterText) createPoster(levelInfo.posterX, levelInfo.posterText);
  if (levelInfo.walls) createWalls(levelInfo.walls);
  if (levelInfo.springs) createSprings(levelInfo.springs);
  if (levelInfo.movingSpikes) createMovingSpikes(levelInfo.movingSpikes);
  if (levelInfo.hallOfFame) createHallOfFameDecor(levelInfo.goalX, levelInfo.photoFrames);
  createGoal(levelInfo.goalX);
  createSpikes(levelInfo.spikes);
  resetPlayer();

  state.animationId = requestAnimationFrame(gameLoop);
}

function createPoster(x, text) {
  const poster = document.createElement('div');
  poster.className = 'poster';
  poster.style.left = `${x}px`;
  poster.style.bottom = '120px';
  const posterText = document.createElement('div');
  posterText.className = 'poster-text';
  posterText.textContent = text;
  poster.appendChild(posterText);
  worldEl.appendChild(poster);
}

function createHallOfFameDecor(goalX, frames) {
  const carpet = document.createElement('div');
  carpet.className = 'red-carpet';
  carpet.style.left = `${Math.max(0, goalX - 140)}px`;
  carpet.style.width = '280px';
  worldEl.appendChild(carpet);

  frames.forEach(x => {
    const frame = document.createElement('div');
    frame.className = 'photo-frame';
    frame.style.left = `${x}px`;
    frame.style.bottom = '140px';
    worldEl.appendChild(frame);
  });

  const bride = document.createElement('div');
  bride.className = 'bride';
  bride.textContent = '👰';
  bride.style.left = `${goalX + 60}px`;
  bride.style.bottom = '28px';
  worldEl.appendChild(bride);
}

function getLevelConfig(level) {
  const labels = {
    1: `Nível 1: Humm, o que estará aqui à frente?`,
    2: `Nível 2: mais saltos, mais ouriços`,
    3: `Nível 3: Hall of Fame da noiva`,
  };
  const spikes = {
    1: [140, 360, 580],
    2: [120, 340, 560, 780],
    3: [140, 360, 580, 800, 1020],
  };
  const goals = {
    1: 720,
    2: 940,
    3: 1200,
  };
  const walls = {
    1: [],
    2: [
      { x: 220, width: 24, height: 84 },
      { x: 470, width: 24, height: 120 },
      { x: 760, width: 24, height: 84 },
    ],
    3: [
      { x: 240, width: 24, height: 84 },
      { x: 520, width: 24, height: 84 },
      { x: 860, width: 24, height: 120 },
    ],
  };
  const springs = {
    1: [560],
    2: [280, 700],
    3: [340, 980],
  };
  const movingSpikes = {
    1: [],
    2: [
      { x: 620, minX: 580, maxX: 700, speed: 0.45 },
    ],
    3: [
      { x: 520, minX: 500, maxX: 620, speed: 0.55 },
      { x: 900, minX: 860, maxX: 960, speed: 0.45 },
    ],
  };
  return {
    label: labels[level] || 'Nível extra',
    spikes: spikes[level] || [180, 360, 540],
    movingSpikes: movingSpikes[level] || [],
    walls: walls[level] || [],
    springs: springs[level] || [],
    goalX: goals[level] || 700,
    posterText: level === 1 ? 'Humm... o que estará aqui à frente?' : null,
    posterX: 260,
    hallOfFame: level === 3,
    photoFrames: level === 3 ? [180, 420, 660] : [],
  };
}

function createPlatform() {
  const platform = document.createElement('div');
  platform.className = 'platform';
  platform.style.left = '0';
  platform.style.width = `${state.levelWidth}px`;
  platform.style.height = '28px';
  platform.style.bottom = '0';
  worldEl.appendChild(platform);
}

function createGoal(x) {
  const goal = document.createElement('div');
  goal.className = 'goal';
  goal.textContent = '✨';
  goal.style.left = `${x}px`;
  goal.style.bottom = '36px';
  worldEl.appendChild(goal);
  state.goal = goal;
}

function createSpikes(positions) {
  positions.forEach(pos => {
    const spike = document.createElement('div');
    spike.className = 'spike';
    spike.textContent = '🦔';
    spike.style.left = `${pos}px`;
    spike.style.bottom = '28px';
    worldEl.appendChild(spike);
    state.spikes.push(spike);
  });
}

function createMovingSpikes(entries) {
  entries.forEach(entry => {
    const spike = document.createElement('div');
    spike.className = 'spike';
    spike.textContent = '🦔';
    spike.style.left = `${entry.x}px`;
    spike.style.bottom = '28px';
    worldEl.appendChild(spike);
    state.movingSpikes.push({
      el: spike,
      x: entry.x,
      minX: entry.minX,
      maxX: entry.maxX,
      speed: entry.speed,
      direction: 1,
    });
  });
}

function createWalls(entries) {
  entries.forEach(entry => {
    const wall = document.createElement('div');
    wall.className = 'wall';
    wall.style.left = `${entry.x}px`;
    wall.style.width = `${entry.width}px`;
    wall.style.height = `${entry.height}px`;
    wall.style.bottom = '28px';
    worldEl.appendChild(wall);
    state.walls.push({ el: wall, x: entry.x, width: entry.width, height: entry.height });
  });
}

function createSprings(entries) {
  entries.forEach(x => {
    const spring = document.createElement('div');
    spring.className = 'spring';
    spring.textContent = '⇧';
    spring.style.left = `${x}px`;
    spring.style.bottom = '28px';
    worldEl.appendChild(spring);
    state.springs.push(spring);
  });
}

function movePlayer(direction) {
  if (direction === 'left') setControl('left', true);
  if (direction === 'right') setControl('right', true);
  if (direction === 'up') setControl('up', true);
}

function gameLoop() {
  const bounds = gameArea.getBoundingClientRect();
  const speed = 4.5;
  const prevX = state.playerX;

  if (state.moveLeft) {
    state.playerX = Math.max(0, state.playerX - speed);
  }
  if (state.moveRight) {
    state.playerX = Math.min(state.levelWidth - playerEl.offsetWidth, state.playerX + speed);
  }
  if (state.wantJump && state.onGround) {
    state.playerVy = -state.jumpStrength;
    state.onGround = false;
    state.wantJump = false;
  }

  state.playerVy = Math.min(state.playerVy + state.gravity, state.maxFallSpeed);
  state.playerY += state.playerVy;

  if (state.playerY + playerEl.offsetHeight >= bounds.height - 28) {
    state.playerY = bounds.height - playerEl.offsetHeight - 28;
    state.playerVy = 0;
    state.onGround = true;
  }
  if (state.playerY < 0) {
    state.playerY = 0;
    state.playerVy = 0;
  }
  if (state.playerX < 0) state.playerX = 0;
  if (state.playerX > state.levelWidth - playerEl.offsetWidth) state.playerX = state.levelWidth - playerEl.offsetWidth;

  updatePlayerPosition();
  resolveWallCollision(prevX);
  updateMovingSpikes();

  checkGoalCollision();
  checkSpringCollision();
  checkSpikeCollision();

  state.animationId = requestAnimationFrame(gameLoop);
}

function updateMovingSpikes() {
  state.movingSpikes.forEach(spike => {
    spike.x += spike.speed * spike.direction;
    if (spike.x <= spike.minX || spike.x >= spike.maxX) {
      spike.direction *= -1;
      spike.x = Math.min(Math.max(spike.x, spike.minX), spike.maxX);
    }
    spike.el.style.left = `${spike.x}px`;
  });
}

function resolveWallCollision(prevX) {
  const dx = state.playerX - prevX;
  if (dx === 0) return;

  const playerTop = state.playerY;
  const playerBottom = playerTop + playerEl.offsetHeight;
  const futureLeft = state.playerX;
  const futureRight = futureLeft + playerEl.offsetWidth;

  for (const wall of state.walls) {
    const wallLeft = wall.x;
    const wallRight = wall.x + wall.width;
    const wallBottom = 28;
    const wallTop = wallBottom + wall.height;

    const xOverlap = futureRight > wallLeft && futureLeft < wallRight;
    const yOverlap = playerBottom > wallBottom && playerTop < wallTop;

    if (xOverlap && yOverlap) {
      if (dx > 0) {
        state.playerX = wallLeft - playerEl.offsetWidth;
      } else {
        state.playerX = wallRight;
      }
      playerEl.style.left = `${state.playerX - state.cameraOffset}px`;
      break;
    }
  }
}

function checkSpringCollision() {
  const playerRect = playerEl.getBoundingClientRect();
  state.springs.forEach(spring => {
    const springRect = spring.getBoundingClientRect();
    const horizontalOverlap = playerRect.right > springRect.left + 8 && playerRect.left < springRect.right - 8;
    const onTop = playerRect.bottom >= springRect.top && playerRect.top < springRect.top;
    const landing = state.playerVy >= 0;
    if (horizontalOverlap && onTop && landing) {
      state.playerY = state.playerY - (playerRect.bottom - springRect.top);
      state.playerVy = -state.jumpStrength * 1.1;
      state.onGround = false;
    }
  });
}

function updatePlayerPosition() {
  updateWorldPosition();
  playerEl.style.top = `${state.playerY}px`;
}

function updateWorldPosition() {
  const bounds = gameArea.getBoundingClientRect();
  const anchorX = Math.min(bounds.width * 0.4, bounds.width - playerEl.offsetWidth - 20);
  const maxOffset = Math.max(0, state.levelWidth - bounds.width);
  state.cameraOffset = Math.min(Math.max(state.playerX - anchorX, 0), maxOffset);
  worldEl.style.transform = `translateX(${-state.cameraOffset}px)`;
  const screenX = state.playerX - state.cameraOffset;
  playerEl.style.left = `${screenX}px`;
}

function resetPlayer() {
  const bounds = gameArea.getBoundingClientRect();
  state.playerX = 20;
  state.playerY = bounds.height - playerEl.offsetHeight - 28;
  state.playerVy = 0;
  state.onGround = true;
  state.isHurt = false;
  updatePlayerPosition();
  const animal = playerPilot[state.name] || '🐾';
  playerEl.textContent = `🚀${animal}`;
  playerEl.classList.remove('player-nicole', 'player-andreia', 'player-carolina');
  if (state.character) {
    playerEl.classList.add(`player-${state.character}`);
  }
}

function checkGoalCollision() {
  if (!state.goal) return;
  const playerRect = playerEl.getBoundingClientRect();
  const goalRect = state.goal.getBoundingClientRect();
  if (playerRect.right > goalRect.left + 10 && playerRect.left < goalRect.right - 10 && playerRect.bottom > goalRect.top + 10 && playerRect.top < goalRect.bottom - 10) {
    state.score += 20;
    updateHud();
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
    if (state.level >= 3) {
      showMessage('Carta Final', 'Chegaste ao fim! Queres ser minha madrinha?', ['Sim'], () => startGame(state.name));
    } else {
      showMessage('Nível concluído', 'Boa! Segue para o próximo nível.', ['Continuar'], nextLevel);
    }
  }
}

function checkSpikeCollision() {
  if (state.isHurt) return;
  const playerRect = playerEl.getBoundingClientRect();
  const spikeElements = [...state.spikes, ...state.movingSpikes.map(item => item.el)];
  for (const spike of spikeElements) {
    const rect = spike.getBoundingClientRect();
    if (rect.right > playerRect.left + 10 && rect.left < playerRect.right - 10 && rect.bottom > playerRect.top + 10 && rect.top < playerRect.bottom - 10) {
      handleHit();
      break;
    }
  }
}

function handleHit() {
  state.isHurt = true;
  state.lives -= 1;
  state.score = Math.max(0, state.score - 5);
  updateHud();
  cancelAnimationFrame(state.animationId);
  state.animationId = null;
  if (state.lives <= 0) {
    showMessage('Perdeste todas as vidas', 'Ficaste sem vidas. Recomeça o jogo!', ['Recomeçar'], () => startGame(state.name));
  } else {
    showMessage('Ai!', `Perdeste uma vida. Vidas restantes: ${state.lives}`, ['Tentar novamente'], () => {
      state.isHurt = false;
      showScreen('game');
      resetPlayer();
      state.animationId = requestAnimationFrame(gameLoop);
    });
  }
}

function nextLevel() {
  state.level += 1;
  updateHud();
  showScreen('game');
  loadLevel();
}

function restartLevel() {
  showScreen('game');
  state.lives = 3;
  state.score = 0;
  state.isHurt = false;
  updateHud();
  loadLevel();
}

function showMessage(title, text, buttons, actions) {
  messageTitle.textContent = title;
  messageText.textContent = text;
  messageActions.innerHTML = '';
  if (!Array.isArray(actions)) actions = [actions];
  buttons.forEach((label, index) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (index === 1) btn.classList.add('secondary');
    btn.addEventListener('click', () => actions[index]());
    messageActions.appendChild(btn);
  });
  showScreen('message');
}

showScreen('start');
