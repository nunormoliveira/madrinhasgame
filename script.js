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
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageActions = document.getElementById('message-actions');

let state = {
  name: '',
  character: '',
  level: 1,
  score: 0,
  lives: 3,
  collected: 0,
  target: 5,
  items: [],
  moving: [],
  interval: null,
  animationId: null,
  touchTimer: null,
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
});

document.addEventListener('keydown', event => {
  const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };
  const action = keyMap[event.key];
  if (action) {
    event.preventDefault();
    movePlayer(action);
  }
});

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
  state.collected = 0;
  state.target = 5;
  updateHud();
  showScreen('game');
  gameArea.innerHTML = '';
  gameArea.appendChild(playerEl);
  resetPlayer();
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
        { freq: 523, duration: 0.25, wave: 'square' },
        { freq: 494, duration: 0.25, wave: 'square' },
        { freq: 440, duration: 0.25, wave: 'square' },
        { freq: 494, duration: 0.25, wave: 'square' },
      ];
    case 3:
      return [
        { freq: 349, duration: 0.3, wave: 'sine' },
        { freq: 392, duration: 0.3, wave: 'sine' },
        { freq: 440, duration: 0.3, wave: 'sine' },
        { freq: 392, duration: 0.3, wave: 'sine' },
      ];
    case 4:
      return [
        { freq: 262, duration: 0.4, wave: 'sawtooth' },
        { freq: 294, duration: 0.4, wave: 'sawtooth' },
        { freq: 330, duration: 0.4, wave: 'sawtooth' },
        { freq: 392, duration: 0.4, wave: 'sawtooth' },
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

function resetPlayer() {
  playerEl.style.left = '20px';
  playerEl.style.top = '20px';
  const animal = playerPilot[state.name] || '🐾';
  playerEl.textContent = `🚀${animal}`;
  playerEl.classList.remove('player-nicole', 'player-andreia', 'player-carolina');
  if (state.character) {
    playerEl.classList.add(`player-${state.character}`);
  }
}

function loadLevel() {
  clearInterval(state.interval);
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }
  state.items = [];
  state.moving = [];
  state.collected = 0;
  gameArea.innerHTML = '';
  gameArea.appendChild(playerEl);

  const level = state.level;
  let target = 5;
  let photoLabel = 'Foto da noiva com a amiga';

  if (level === 1) {
    photoLabel = `Foto da noiva com ${state.name}`;
    target = 5;
  } else if (level === 2) {
    photoLabel = `Fotos estáticas da noiva com a personagem`;
    target = 6;
  } else if (level === 3) {
    photoLabel = `Hall of Fame: recorde dos momentos com ${state.name}`;
    target = 0;
  } else if (level === 4) {
    photoLabel = `Foto final com a bridezilla da noiva`;
    target = 0;
  }

  state.target = target;
  photoCaption.textContent = photoLabel;
  updateHud();
  playLevelMusic(level);

  requestAnimationFrame(() => {
    if (level === 1) {
      createPhotoBlocks(3, true);
      createCollectibles(5);
      createMines(3);
    } else if (level === 2) {
      createPhotoBlocks(4, false);
      createCollectibles(6);
      createMines(5);
    } else if (level === 3) {
      createHallOfFame();
    } else if (level === 4) {
      createBoss();
    }

    if (state.level < 3) {
      state.interval = setInterval(moveObstacles, 180);
      state.animationId = requestAnimationFrame(moveMines);
    }
  });
}

function createCollectibles(count) {
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'collectible';
    item.textContent = '❤️';
    placeEntity(item);
    gameArea.appendChild(item);
    state.items.push(item);
  }
}

function createPhotoBlocks(count, withCharacter) {
  for (let i = 0; i < count; i++) {
    const photo = document.createElement('div');
    photo.className = 'photo-block';
    photo.textContent = withCharacter ? `${state.name} + Noiva` : `Noiva + ${state.name}`;
    placeEntity(photo, 110, 110);
    gameArea.appendChild(photo);
  }
}

function createMines(count) {
  for (let i = 0; i < count; i++) {
    const mine = document.createElement('div');
    mine.className = 'mine';
    mine.textContent = '💣';
    placeEntity(mine);
    gameArea.appendChild(mine);
    state.moving.push({
      el: mine,
      dx: 0.6 + i * 0.2,
      dy: 0.5 + (i % 3) * 0.2,
    });
  }
}

function createHallOfFame() {
  const captions = Array.from({ length: 4 }, (_, index) => `${state.name} + Noiva ${index + 1}`);
  captions.forEach((caption, index) => {
    const card = document.createElement('button');
    card.className = 'avatar-button';
    card.innerHTML = `<div class="avatar" style="background: linear-gradient(135deg, #ffd3b6, #ffaaa5);">📸</div><span>${caption}</span>`;
    card.addEventListener('click', () => nextLevel());
    card.style.width = '100%';
    card.style.maxWidth = '220px';
    card.style.margin = '10px';
    gameArea.appendChild(card);
  });
  const text = document.createElement('p');
  text.style.width = '100%';
  text.style.textAlign = 'center';
  text.style.marginTop = '16px';
  text.textContent = `Toca numa foto da sua personagem com a noiva para continuar.`;
  gameArea.appendChild(text);
}

function createBoss() {
  const boss = document.createElement('div');
  boss.className = 'boss';
  boss.textContent = 'Bridezilla';
  placeEntity(boss, 100, 100);
  gameArea.appendChild(boss);
  state.items.push(boss);
}

function placeEntity(el) {
  const bounds = gameArea.getBoundingClientRect();
  const size = 60;
  const x = Math.floor(Math.random() * Math.max(1, bounds.width - size));
  const y = Math.floor(Math.random() * Math.max(1, bounds.height - size));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function movePlayer(direction) {
  const step = 18;
  const bounds = gameArea.getBoundingClientRect();
  const rect = playerEl.getBoundingClientRect();
  const currentX = rect.left - bounds.left;
  const currentY = rect.top - bounds.top;
  let x = currentX;
  let y = currentY;
  if (direction === 'up') y -= step;
  if (direction === 'down') y += step;
  if (direction === 'left') x -= step;
  if (direction === 'right') x += step;
  x = Math.max(0, Math.min(bounds.width - rect.width, x));
  y = Math.max(0, Math.min(bounds.height - rect.height, y));
  playerEl.style.left = `${x}px`;
  playerEl.style.top = `${y}px`;
  checkCollisions();
}

function moveObstacles() {
  const bounds = gameArea.getBoundingClientRect();
  state.moving.forEach(({ el, dx, dy }) => {
    const rect = el.getBoundingClientRect();
    let x = rect.left - bounds.left + dx;
    let y = rect.top - bounds.top + dy;
    if (x < 0 || x > bounds.width - rect.width) dx *= -1;
    if (y < 0 || y > bounds.height - rect.height) dy *= -1;
    state.moving = state.moving.map(item => item.el === el ? { ...item, dx, dy } : item);
    el.style.left = `${Math.max(0, Math.min(bounds.width - rect.width, x))}px`;
    el.style.top = `${Math.max(0, Math.min(bounds.height - rect.height, y))}px`;
  });
  checkCollisions();
}

function moveMines() {
  const bounds = gameArea.getBoundingClientRect();
  state.moving.forEach(({ el, dx, dy }, index) => {
    const rect = el.getBoundingClientRect();
    let x = rect.left - bounds.left + dx;
    let y = rect.top - bounds.top + dy;
    if (x < 0 || x > bounds.width - rect.width) dx *= -1;
    if (y < 0 || y > bounds.height - rect.height) dy *= -1;
    state.moving = state.moving.map((item, itemIndex) => itemIndex === index ? { ...item, dx, dy } : item);
    el.style.left = `${Math.max(0, Math.min(bounds.width - rect.width, x))}px`;
    el.style.top = `${Math.max(0, Math.min(bounds.height - rect.height, y))}px`;
  });
  checkCollisions();
  state.animationId = requestAnimationFrame(moveMines);
}

function pauseLevel() {
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
}

function resumeLevel() {
  if (state.level >= 3) return;
  if (!state.interval) {
    state.interval = setInterval(moveObstacles, 180);
  }
  if (!state.animationId) {
    state.animationId = requestAnimationFrame(moveMines);
  }
}

function checkCollisions() {
  const playerRect = playerEl.getBoundingClientRect();
  const items = Array.from(gameArea.querySelectorAll('.collectible, .mine, .boss'));
  items.forEach(item => {
    const rect = item.getBoundingClientRect();
    if (rect.right > playerRect.left + 8 && rect.left < playerRect.right - 8 && rect.bottom > playerRect.top + 8 && rect.top < playerRect.bottom - 8) {
      if (item.classList.contains('collectible')) {
        collectItem(item);
      } else if (item.classList.contains('mine')) {
        hitObstacle(item);
      } else if (item.classList.contains('boss')) {
        showBridezillaMessage();
      }
    }
  });
}

function collectItem(item) {
  item.remove();
  state.collected += 1;
  state.score += 10;
  updateHud();
  if (state.collected >= state.target) {
    showMessage('Bom trabalho!', `Parabéns ${state.name}, ganhaste o nível ${state.level}!`, ['Continuar'], nextLevel);
  }
}

function hitObstacle(item) {
  pauseLevel();
  state.lives -= 1;
  state.score = Math.max(0, state.score - 5);
  updateHud();
  if (state.lives <= 0) {
    if (item && item.classList.contains('mine')) {
      item.style.opacity = '0.4';
    }
    showMessage('Perdeste todas as vidas', 'Ficaste sem vidas e o nível vai reiniciar. Tenta outra vez!', ['Reiniciar'], () => restartLevel());
  } else {
    if (item && item.classList.contains('mine')) {
      placeEntity(item);
    }
    showMessage('Cuidado!', `Perdeste uma vida. Vidas restantes: ${state.lives}`, ['Continuar'], () => {
      showScreen('game');
      resumeLevel();
    });
  }
}

function nextLevel() {
  clearInterval(state.interval);
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }
  state.level += 1;
  if (state.level > 4) {
    showMessage('Convite enviado', 'A noiva está super feliz! O convite foi aceito e agora é festa!', ['Recomeçar'], () => startGame(state.name));
  } else {
    updateHud();
    showScreen('game');
    gameArea.innerHTML = '';
    gameArea.appendChild(playerEl);
    resetPlayer();
    loadLevel();
  }
}

function restartLevel() {
  clearInterval(state.interval);
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }
  state.lives = 3;
  state.collected = 0;
  state.items = [];
  state.moving = [];
  updateHud();
  showScreen('game');
  gameArea.innerHTML = '';
  gameArea.appendChild(playerEl);
  resetPlayer();
  loadLevel();
}

function resumeLevel() {
  if (state.level >= 3) return;
  if (!state.interval) {
    state.interval = setInterval(moveObstacles, 180);
  }
  if (!state.animationId) {
    state.animationId = requestAnimationFrame(moveMines);
  }
}

function showBridezillaMessage() {
  clearInterval(state.interval);
  showMessage('A bridezilla apareceu!', 'A noiva pergunta: Aceitas ser madrinha de casamento?', ['Sim', 'Mais tarde'], [acceptInvitation, () => nextLevel()]);
}

function acceptInvitation() {
  showMessage('Sim!', 'A noiva ficou contente! Bora lá para a festa e para o amor.', ['Recomeçar'], () => startGame(state.name));
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
