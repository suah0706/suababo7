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
  resultStatusTag: document.getElementById('result-status-tag'),
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

  // Reset ALL options (including previous correct or wrong styling)
  allOptions.forEach((btn) => {
    btn.classList.remove('solve-option--selected', 'solve-option--wrong', 'solve-option--correct');
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

    // XP Award (prevent duplicate)
    if (!state.completed.solve) {
      state.completed.solve = true;
      state.earnedXp.solve = 40;
      state.xp += 40;
      updatePlayerHUD();
    }
  } else {
    // WRONG - ensure correct feedback is hidden and option is marked wrong
    optionBtn.classList.remove('solve-option--selected');
    optionBtn.classList.add('solve-option--wrong');
    elements.solveFeedbackCorrect.setAttribute('hidden', '');
    elements.solveFeedbackWrong.removeAttribute('hidden');
  }
});

elements.btnSolveRetry.addEventListener('click', () => {
  const allOptions = elements.solveOptionsGroup.querySelectorAll('.solve-option');
  allOptions.forEach((btn) => {
    btn.classList.remove('solve-option--selected', 'solve-option--wrong', 'solve-option--correct');
    btn.setAttribute('aria-checked', 'false');
    btn.removeAttribute('disabled');
  });
  elements.solveFeedbackWrong.setAttribute('hidden', '');
  elements.solveFeedbackCorrect.setAttribute('hidden', '');
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
const SPOT_PROBLEMS_META = {
  1: { name: 'CTA CONTRAST', desc: '로그인 버튼의 색상 대비 부족' },
  2: { name: 'TINY TEXT', desc: '중요 안내문 폰트 크기 미달' },
  3: { name: 'TOUCH TARGET', desc: '클릭/터치 영역 최소 크기 미확보' },
  4: { name: 'SPACING', desc: '입력 필드 간 간격 및 그룹핑 오류' },
  5: { name: 'VISUAL HIERARCHY', desc: '주/보조 액션 간 버튼 위계 혼동' }
};

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

  // Reset checklist items to masked state
  for (let i = 1; i <= 5; i++) {
    const chkItem = document.getElementById(`chk-item-${i}`);
    if (chkItem) {
      chkItem.classList.remove('spot-checklist__item--found');
      const statusText = chkItem.querySelector('.spot-checklist__status');
      if (statusText) statusText.textContent = 'FINDING...';
      const nameText = chkItem.querySelector('.spot-checklist__name');
      if (nameText) nameText.textContent = `0${i} ???`;
      const descText = chkItem.querySelector('.spot-checklist__desc');
      if (descText) descText.textContent = '문제 UI를 찾아 클릭하세요';
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
      if (state.spot.foundCount >= 5) {
        endSpotMission('success');
      } else {
        endSpotMission('timeout');
      }
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
    const meta = SPOT_PROBLEMS_META[problemId] || { name: targetEl.getAttribute('data-problem-name'), desc: '' };
    const problemName = meta.name;

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

    // Update Checklist item: reveal name, description, and status
    const chkItem = document.getElementById(`chk-item-${problemId}`);
    if (chkItem) {
      chkItem.classList.add('spot-checklist__item--found');
      const statusText = chkItem.querySelector('.spot-checklist__status');
      if (statusText) statusText.textContent = 'SOLVED ✓';
      const nameText = chkItem.querySelector('.spot-checklist__name');
      if (nameText) nameText.textContent = `0${problemId} ${problemName} ✓`;
      const descText = chkItem.querySelector('.spot-checklist__desc');
      if (descText) descText.textContent = meta.desc;
    }

    // Toast Feedback
    showSpotToast(`CORRECT_\n${problemName}\n+10`, true);

    // CASE 1. SUCCESS: 5개 모두 발견 즉시 지체 없이 종료 처리 및 성공 결과 화면으로 즉시 전환
    if (state.spot.foundCount >= 5) {
      endSpotMission('success');
      return;
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

/**
 * SPOT 미션 통합 종료 함수
 * @param {'success'|'timeout'} resultType
 */
function endSpotMission(resultType) {
  // 중복 실행 및 재진입 방지 Guard
  if (state.spot.isFinished) return;
  state.spot.isFinished = true;

  // 1. 타이머 즉시 중지
  if (state.spot.timerId) {
    clearInterval(state.spot.timerId);
    state.spot.timerId = null;
  }

  // 2. 추가 클릭 및 상호작용 완전 비활성화
  elements.spotStage.classList.add('spot-stage--disabled');

  // 3. 점수 및 XP 산출 (최대 50 XP)
  const earnedSpotScore = state.spot.foundCount * 10;
  state.spot.score = earnedSpotScore;

  // 4. XP 지급 (중복 지급 방지 Guard)
  if (!state.completed.spot) {
    state.completed.spot = true;
    state.earnedXp.spot = earnedSpotScore;
    state.xp += earnedSpotScore;
    updatePlayerHUD();
  } else if (earnedSpotScore > state.earnedXp.spot) {
    const diff = earnedSpotScore - state.earnedXp.spot;
    state.earnedXp.spot = earnedSpotScore;
    state.xp += diff;
    updatePlayerHUD();
  }

  // 5. RESULT 화면으로 즉시 전환 (지연 대기 없음)
  const isSuccess = resultType === 'success' || state.spot.foundCount >= 5;
  const statusHeader = isSuccess ? '> MISSION COMPLETE (PERFECT)_' : '> TIME OVER (MISSION COMPLETE)_';
  showResultScreen('SPOT', earnedSpotScore, `${state.spot.foundCount} / 5`, statusHeader);
}

elements.btnAbortSpot.addEventListener('click', () => {
  if (state.spot.timerId) {
    clearInterval(state.spot.timerId);
    state.spot.timerId = null;
  }
  state.spot.isFinished = true;
  showScreen('home');
});

// ============================================================
// 08. COMMON RESULT CONTROLLER
// ============================================================
function showResultScreen(missionName, rewardXp, spotDetail, statusHeader) {
  elements.resultStatusTag.textContent = statusHeader || '> MISSION COMPLETE_';
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
