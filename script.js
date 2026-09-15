/**
 * D.SIGHT.EXE - Game State & Interaction Controller
 * Pure Vanilla JavaScript implementation adhering to PRD requirements.
 */

// ============================================================
// 01. STATE MANAGEMENT
// ============================================================
const state = {
  xp: 0,
  level: 1,
  streak: 1,
  completed: {
    think: false,
    solve: false,
    spot: false
  },
  earnedXp: {
    think: 0,
    solve: 0,
    spot: 0
  },
  spot: {
    foundCount: 0,
    foundTargets: new Set(),
    score: 0,
    timeLeft: 60,
    timerId: null,
    isFinished: false
  },
  currentMission: null
};

// ============================================================
// 02. DOM ELEMENT REFERENCES
// ============================================================
const elements = {
  // Screens
  screens: {
    boot: document.getElementById('view-boot'),
    home: document.getElementById('view-home'),
    think: document.getElementById('view-think'),
    solve: document.getElementById('view-solve'),
    spot: document.getElementById('view-spot'),
    result: document.getElementById('view-result')
  },

  // Global Header
  brandLink: document.getElementById('brand-link'),
  headerLevel: document.getElementById('header-level'),

  // Boot View
  btnBootStart: document.getElementById('btn-boot-start'),

  // Player Status HUD (Home)
  playerLevel: document.getElementById('player-level'),
  playerXp: document.getElementById('player-xp'),
  playerStreak: document.getElementById('player-streak'),
  playerMissions: document.getElementById('player-missions'),
  playerProgressPct: document.getElementById('player-progress-pct'),
  playerProgressFill: document.getElementById('player-progress-fill'),
  playerProgressbar: document.getElementById('player-progressbar'),
  levelUpBanner: document.getElementById('level-up-banner'),

  // Training Cards
  cardThink: document.getElementById('card-think'),
  cardSolve: document.getElementById('card-solve'),
  cardSpot: document.getElementById('card-spot'),
  badgeThink: document.getElementById('badge-think'),
  badgeSolve: document.getElementById('badge-solve'),
  badgeSpot: document.getElementById('badge-spot'),
  btnStartThink: document.getElementById('btn-start-think'),
  btnStartSolve: document.getElementById('btn-start-solve'),
  btnStartSpot: document.getElementById('btn-start-spot'),

  // THINK Mission
  btnAbortThink: document.getElementById('btn-abort-think'),
  formThink: document.getElementById('form-think'),
  inputThink: document.getElementById('input-think'),
  thinkCharCount: document.getElementById('think-char-count'),
  thinkValidationMsg: document.getElementById('think-validation-msg'),
  thinkFormActions: document.getElementById('think-form-actions'),
  thinkFeedbackPanel: document.getElementById('think-feedback-panel'),
  btnFinishThink: document.getElementById('btn-finish-think'),

  // SOLVE Mission
  btnAbortSolve: document.getElementById('btn-abort-solve'),
  solveOptionsGroup: document.getElementById('solve-options-group'),
  solveFeedbackWrong: document.getElementById('solve-feedback-wrong'),
  solveFeedbackCorrect: document.getElementById('solve-feedback-correct'),
  btnSolveRetry: document.getElementById('btn-solve-retry'),
  btnFinishSolve: document.getElementById('btn-finish-solve'),

  // SPOT Mission
  btnAbortSpot: document.getElementById('btn-abort-spot'),
  spotFoundCount: document.getElementById('spot-found-count'),
  spotTimer: document.getElementById('spot-timer'),
  spotStage: document.getElementById('spot-stage'),
  spotToast: document.getElementById('spot-toast'),
  spotChecklist: document.getElementById('spot-checklist'),
  spotFinishPanel: document.getElementById('spot-finish-panel'),
  spotStatusMsg: document.getElementById('spot-status-msg'),
  btnFinishSpot: document.getElementById('btn-finish-spot'),

  // Result Screen
  resultMissionTitle: document.getElementById('result-mission-title'),
  resultSpotExtra: document.getElementById('result-spot-extra'),
  resultSpotFound: document.getElementById('result-spot-found'),
  resultRewardXp: document.getElementById('result-reward-xp'),
  resultTotalXp: document.getElementById('result-total-xp'),
  resultMissionsCount: document.getElementById('result-missions-count'),
  btnResultBackHome: document.getElementById('btn-result-back-home')
};

// ============================================================
// 03. SCREEN ROUTING
// ============================================================
function showScreen(screenKey) {
  Object.keys(elements.screens).forEach((key) => {
    const screenEl = elements.screens[key];
    if (key === screenKey) {
      screenEl.classList.add('screen--active');
      screenEl.removeAttribute('aria-hidden');
    } else {
      screenEl.classList.remove('screen--active');
      screenEl.setAttribute('aria-hidden', 'true');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// 04. PLAYER STATUS & HUD SYNCHRONIZATION
// ============================================================
function updatePlayerHUD() {
  const completedCount = ['think', 'solve', 'spot'].filter(
    (k) => state.completed[k]
  ).length;

  const isLevelUp = completedCount === 3;
  state.level = isLevelUp ? 2 : 1;

  // Header Level
  const lvlString = `LV.0${state.level}`;
  elements.headerLevel.textContent = lvlString;

  // Player Status Numbers
  elements.playerLevel.textContent = `0${state.level}`;
  elements.playerXp.textContent = String(state.xp).padStart(3, '0');
  elements.playerStreak.textContent = `${state.streak} DAY`;
  elements.playerMissions.textContent = `${completedCount} / 3`;

  // Progress Bar (Total 120 XP target)
  const maxXP = 120;
  const progressPercent = Math.min(100, Math.round((state.xp / maxXP) * 100));
  elements.playerProgressPct.textContent = `${progressPercent}%`;
  elements.playerProgressFill.style.width = `${progressPercent}%`;
  elements.playerProgressbar.setAttribute('aria-valuenow', state.xp);

  // Training Cards status update
  ['think', 'solve', 'spot'].forEach((key) => {
    const cardEl = elements[`card${capitalize(key)}`];
    const badgeEl = elements[`badge${capitalize(key)}`];
    const btnEl = elements[`btnStart${capitalize(key)}`];

    if (state.completed[key]) {
      cardEl.classList.add('training-card--completed');
      badgeEl.textContent = 'COMPLETE ✓';
      btnEl.textContent = '> REVIEW';
    } else {
      cardEl.classList.remove('training-card--completed');
      badgeEl.textContent = 'READY';
      btnEl.textContent = '> START';
    }
  });

  // Level Up Special State
  if (isLevelUp) {
    elements.levelUpBanner.removeAttribute('hidden');
  } else {
    elements.levelUpBanner.setAttribute('hidden', '');
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================
// 05. THINK MISSION CONTROLLER
// ============================================================
function initThinkMission() {
  state.currentMission = 'think';

  // If already completed, show previous response if any or reset form
  if (!state.completed.think) {
    elements.inputThink.removeAttribute('readonly');
    elements.thinkFormActions.style.display = 'block';
    elements.thinkFeedbackPanel.setAttribute('hidden', '');
    elements.thinkValidationMsg.setAttribute('hidden', '');
    elements.inputThink.value = '';
    elements.thinkCharCount.textContent = '0 / 20자 이상';
    elements.thinkCharCount.classList.remove('char-count--valid');
  } else {
    // Show already completed state
    elements.inputThink.setAttribute('readonly', 'true');
    elements.thinkFormActions.style.display = 'none';
    elements.thinkFeedbackPanel.removeAttribute('hidden');
    elements.thinkValidationMsg.setAttribute('hidden', '');
  }

  showScreen('think');
}

elements.inputThink.addEventListener('input', () => {
  const cleanText = elements.inputThink.value.replace(/\s+/g, '');
  const len = cleanText.length;
  elements.thinkCharCount.textContent = `${len} / 20자 이상`;

  if (len >= 20) {
    elements.thinkCharCount.classList.add('char-count--valid');
    elements.thinkValidationMsg.setAttribute('hidden', '');
  } else {
    elements.thinkCharCount.classList.remove('char-count--valid');
  }
});

elements.formThink.addEventListener('submit', (e) => {
  e.preventDefault();
  const cleanText = elements.inputThink.value.replace(/\s+/g, '');

  if (cleanText.length < 20) {
    elements.thinkValidationMsg.removeAttribute('hidden');
    elements.inputThink.focus();
    return;
  }

  // 20자 이상: 유효성 통과
  elements.thinkValidationMsg.setAttribute('hidden', '');
  elements.inputThink.setAttribute('readonly', 'true');
  elements.thinkFormActions.style.display = 'none';
  elements.thinkFeedbackPanel.removeAttribute('hidden');

  // XP 부여 (중복 지급 방지)
  if (!state.completed.think) {
    state.completed.think = true;
    state.earnedXp.think = 30;
    state.xp += 30;
    updatePlayerHUD();
  }
});

elements.btnFinishThink.addEventListener('click', () => {
  showResultScreen('THINK', state.earnedXp.think, null);
});

elements.btnAbortThink.addEventListener('click', () => {
  showScreen('home');
});

// ============================================================
// 06. SOLVE MISSION CONTROLLER
// ============================================================
function initSolveMission() {
  state.currentMission = 'solve';

  // Reset solve option states
  const optionButtons = elements.solveOptionsGroup.querySelectorAll('.solve-option');
  optionButtons.forEach((btn) => {
    btn.classList.remove('solve-option--selected', 'solve-option--wrong', 'solve-option--correct');
    btn.setAttribute('aria-checked', 'false');
    btn.removeAttribute('disabled');
  });

  elements.solveFeedbackWrong.setAttribute('hidden', '');
  elements.solveFeedbackCorrect.setAttribute('hidden', '');

  // If already completed before, highlight the correct choice
  if (state.completed.solve) {
    const correctBtn = elements.solveOptionsGroup.querySelector('[data-choice="C"]');
    if (correctBtn) {
      correctBtn.classList.add('solve-option--correct');
      correctBtn.setAttribute('aria-checked', 'true');
    }
    elements.solveFeedbackCorrect.removeAttribute('hidden');
  }

  showScreen('solve');
}

elements.solveOptionsGroup.addEventListener('click', (e) => {
  const optionBtn = e.target.closest('.solve-option');
  if (!optionBtn || optionBtn.hasAttribute('disabled')) return;

  const choice = optionBtn.getAttribute('data-choice');
  const allOptions = elements.solveOptionsGroup.querySelectorAll('.solve-option');

  // Reset previous feedback styles
  allOptions.forEach((btn) => {
    btn.classList.remove('solve-option--selected', 'solve-option--wrong');
    btn.setAttribute('aria-checked', 'false');
  });

  optionBtn.classList.add('solve-option--selected');
  optionBtn.setAttribute('aria-checked', 'true');

  if (choice === 'C') {
    // CORRECT!
    optionBtn.classList.remove('solve-option--selected');
    optionBtn.classList.add('solve-option--correct');
    elements.solveFeedbackWrong.setAttribute('hidden', '');
    elements.solveFeedbackCorrect.removeAttribute('hidden');

    // Disable all options
    allOptions.forEach((btn) => btn.setAttribute('disabled', 'true'));

    // XP Award (prevent duplicate)
    if (!state.completed.solve) {
      state.completed.solve = true;
      state.earnedXp.solve = 40;
      state.xp += 40;
      updatePlayerHUD();
    }
  } else {
    // WRONG
    optionBtn.classList.remove('solve-option--selected');
    optionBtn.classList.add('solve-option--wrong');
    elements.solveFeedbackWrong.removeAttribute('hidden');
    elements.solveFeedbackCorrect.setAttribute('hidden', '');
  }
});

elements.btnSolveRetry.addEventListener('click', () => {
  const allOptions = elements.solveOptionsGroup.querySelectorAll('.solve-option');
  allOptions.forEach((btn) => {
    btn.classList.remove('solve-option--selected', 'solve-option--wrong');
    btn.setAttribute('aria-checked', 'false');
    btn.removeAttribute('disabled');
  });
  elements.solveFeedbackWrong.setAttribute('hidden', '');
});

elements.btnFinishSolve.addEventListener('click', () => {
  showResultScreen('SOLVE', state.earnedXp.solve, null);
});

elements.btnAbortSolve.addEventListener('click', () => {
  showScreen('home');
});

// ============================================================
// 07. SPOT MISSION CONTROLLER
// ============================================================
let toastTimeoutId = null;

function initSpotMission() {
  state.currentMission = 'spot';

  // Clear any existing timer
  if (state.spot.timerId) {
    clearInterval(state.spot.timerId);
    state.spot.timerId = null;
  }

  // Reset game parameters unless already complete
  state.spot.foundCount = 0;
  state.spot.foundTargets = new Set();
  state.spot.score = 0;
  state.spot.timeLeft = 60;
  state.spot.isFinished = false;

  // Reset UI elements
  elements.spotFoundCount.textContent = '0';
  elements.spotTimer.textContent = '00:60';
  elements.spotStage.classList.remove('spot-stage--disabled');
  elements.spotFinishPanel.setAttribute('hidden', '');

  // Reset target indicators
  const targets = elements.spotStage.querySelectorAll('.spot-target');
  targets.forEach((t) => t.classList.remove('spot-target--found'));

  // Reset checklist items
  for (let i = 1; i <= 5; i++) {
    const chkItem = document.getElementById(`chk-item-${i}`);
    if (chkItem) {
      chkItem.classList.remove('spot-checklist__item--found');
      const statusText = chkItem.querySelector('.spot-checklist__status');
      if (statusText) statusText.textContent = 'FINDING...';
    }
  }

  showScreen('spot');
  startSpotTimer();
}

function startSpotTimer() {
  updateTimerDisplay();

  state.spot.timerId = setInterval(() => {
    state.spot.timeLeft -= 1;
    updateTimerDisplay();

    if (state.spot.timeLeft <= 0) {
      finishSpotGame('TIME_OVER');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const seconds = state.spot.timeLeft;
  const formatted = String(seconds).padStart(2, '0');
  elements.spotTimer.textContent = `00:${formatted}`;
}

function showSpotToast(message, isCorrect) {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }

  elements.spotToast.textContent = message;
  elements.spotToast.className = `spot-toast ${
    isCorrect ? 'spot-toast--correct' : 'spot-toast--wrong'
  }`;
  elements.spotToast.removeAttribute('hidden');

  toastTimeoutId = setTimeout(() => {
    elements.spotToast.setAttribute('hidden', '');
  }, 1800);
}

// Stage Click Delegator
elements.spotStage.addEventListener('click', (e) => {
  if (state.spot.isFinished) return;

  const targetEl = e.target.closest('.spot-target');

  if (targetEl) {
    e.stopPropagation();
    const problemId = parseInt(targetEl.getAttribute('data-problem-id'), 10);
    const problemName = targetEl.getAttribute('data-problem-name');

    // 이미 발견한 문제인지 확인 (중복 점수 방지)
    if (state.spot.foundTargets.has(problemId)) {
      showSpotToast(`ALREADY FOUND: ${problemName}`, false);
      return;
    }

    // New problem found!
    state.spot.foundTargets.add(problemId);
    state.spot.foundCount += 1;
    state.spot.score += 10;

    // UI Updates
    targetEl.classList.add('spot-target--found');
    elements.spotFoundCount.textContent = state.spot.foundCount;

    // Update Checklist item
    const chkItem = document.getElementById(`chk-item-${problemId}`);
    if (chkItem) {
      chkItem.classList.add('spot-checklist__item--found');
      const statusText = chkItem.querySelector('.spot-checklist__status');
      if (statusText) statusText.textContent = 'SOLVED ✓';
    }

    // Toast Feedback
    showSpotToast(`CORRECT_ ${problemName} +10`, true);

    // 5개 모두 발견 시 게임 조기 종료
    if (state.spot.foundCount === 5) {
      finishSpotGame('PERFECT');
    }
  } else {
    // 틀린 영역 클릭 시
    showSpotToast('TRY AGAIN_', false);
  }
});

// Keyboard support for targets
elements.spotStage.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const targetEl = e.target.closest('.spot-target');
    if (targetEl) {
      e.preventDefault();
      targetEl.click();
    }
  }
});

function finishSpotGame(reason) {
  if (state.spot.isFinished) return;
  state.spot.isFinished = true;

  if (state.spot.timerId) {
    clearInterval(state.spot.timerId);
    state.spot.timerId = null;
  }

  elements.spotStage.classList.add('spot-stage--disabled');

  const earnedSpotScore = state.spot.score; // Up to 50 XP

  // Award XP (중복 방지: 이전 획득분보다 클 때만 차액 또는 최초 완주 시 지급)
  if (!state.completed.spot) {
    state.completed.spot = true;
    state.earnedXp.spot = earnedSpotScore;
    state.xp += earnedSpotScore;
    updatePlayerHUD();
  } else if (earnedSpotScore > state.earnedXp.spot) {
    // 만약 이전보다 더 높은 점수를 획득했다면 차액만 추가
    const diff = earnedSpotScore - state.earnedXp.spot;
    state.earnedXp.spot = earnedSpotScore;
    state.xp += diff;
    updatePlayerHUD();
  }

  // Populate Finish Panel Status Message
  if (reason === 'PERFECT') {
    elements.spotStatusMsg.className = 'feedback feedback--correct';
    elements.spotStatusMsg.innerHTML = `
      <strong class="feedback__title">PERFECT_</strong>
      <p class="feedback__text">FOUND 5 / 5 | SCORE: 050 | +${earnedSpotScore} XP</p>
    `;
  } else {
    elements.spotStatusMsg.className = 'feedback feedback--warning';
    elements.spotStatusMsg.innerHTML = `
      <strong class="feedback__title">TIME OVER_ MISSION COMPLETE</strong>
      <p class="feedback__text">FOUND ${state.spot.foundCount} / 5 | SCORE: ${String(
      earnedSpotScore
    ).padStart(3, '0')} | +${earnedSpotScore} XP</p>
    `;
  }

  elements.spotFinishPanel.removeAttribute('hidden');
}

elements.btnFinishSpot.addEventListener('click', () => {
  showResultScreen('SPOT', state.earnedXp.spot, `${state.spot.foundCount} / 5`);
});

elements.btnAbortSpot.addEventListener('click', () => {
  if (state.spot.timerId) {
    clearInterval(state.spot.timerId);
    state.spot.timerId = null;
  }
  showScreen('home');
});

// ============================================================
// 08. COMMON RESULT CONTROLLER
// ============================================================
function showResultScreen(missionName, rewardXp, spotDetail) {
  elements.resultMissionTitle.textContent = missionName;
  elements.resultRewardXp.textContent = `+${rewardXp} XP`;
  elements.resultTotalXp.textContent = String(state.xp).padStart(3, '0');

  const completedCount = ['think', 'solve', 'spot'].filter(
    (k) => state.completed[k]
  ).length;
  elements.resultMissionsCount.textContent = `${completedCount} / 3`;

  if (spotDetail) {
    elements.resultSpotExtra.removeAttribute('hidden');
    elements.resultSpotFound.textContent = spotDetail;
  } else {
    elements.resultSpotExtra.setAttribute('hidden', '');
  }

  showScreen('result');
}

elements.btnResultBackHome.addEventListener('click', () => {
  updatePlayerHUD();
  showScreen('home');
});

// ============================================================
// 09. GLOBAL NAVIGATION & INITIALIZATION
// ============================================================
elements.btnBootStart.addEventListener('click', () => {
  updatePlayerHUD();
  showScreen('home');
});

elements.brandLink.addEventListener('click', () => {
  // If timer is running in spot, stop it
  if (state.spot.timerId) {
    clearInterval(state.spot.timerId);
    state.spot.timerId = null;
  }
  updatePlayerHUD();
  showScreen('home');
});

elements.brandLink.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    elements.brandLink.click();
  }
});

// Mission Start Buttons
elements.btnStartThink.addEventListener('click', initThinkMission);
elements.btnStartSolve.addEventListener('click', initSolveMission);
elements.btnStartSpot.addEventListener('click', initSpotMission);

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  updatePlayerHUD();
  showScreen('boot');
});
