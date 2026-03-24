// ── Movement Configs ────────────────────────────────────────
// Each movement defines:
//   getMetric(lm)       → number to threshold against
//   activeThreshold     → metric crosses this to enter ACTIVE state
//   neutralThreshold    → metric crosses this to return to NEUTRAL → REP counted
//   metricDir           → 'high' = metric goes HIGH when active (burpees/squats/pushups/situps)
//                          'low'  = metric goes LOW when active (jumping jacks)
//   checkVisibility(lm) → returns true if key joints are visible
//   labels              → badge text for each state
//   sliderConfig        → default slider ranges and values

const MOVEMENTS = {
  burpee: {
    name: 'Burpees',
    paceUnit: 'BURPEES / MIN',
    getMetric: (lm) => (lm[23].y + lm[24].y) / 2,
    activeThreshold: 0.68,
    neutralThreshold: 0.48,
    metricDir: 'high',
    checkVisibility: (lm) => lm[23].visibility > 0.5 && lm[24].visibility > 0.5,
    highlightJoints: [23, 24],
    labels: {
      ready:   'STANDING — DROP!',
      active:  'DOWN — GET LOW!',
      rep:     'REP! STAND UP!',
      noBody:  'STEP BACK — FULL BODY NEEDED',
    },
    sliderConfig: {
      s1: { min: 50, max: 90, value: 68, label: 'Down Threshold' },
      s2: { min: 20, max: 65, value: 48, label: 'Up Threshold' },
    },
  },

  squat: {
    name: 'Squats',
    paceUnit: 'SQUATS / MIN',
    getMetric: (lm) => (lm[23].y + lm[24].y) / 2,
    activeThreshold: 0.62,
    neutralThreshold: 0.47,
    metricDir: 'high',
    checkVisibility: (lm) => lm[23].visibility > 0.5 && lm[24].visibility > 0.5,
    highlightJoints: [23, 24, 25, 26],
    labels: {
      ready:   'STANDING — SQUAT!',
      active:  'SQUAT — GO DEEP!',
      rep:     'REP! STAND UP!',
      noBody:  'STEP BACK — FULL BODY NEEDED',
    },
    sliderConfig: {
      s1: { min: 45, max: 85, value: 62, label: 'Squat Depth' },
      s2: { min: 25, max: 60, value: 47, label: 'Stand Height' },
    },
  },

  pushup: {
    name: 'Push-ups',
    paceUnit: 'PUSH-UPS / MIN',
    getMetric: (lm) => (lm[11].y + lm[12].y) / 2,
    activeThreshold: 0.50,
    neutralThreshold: 0.36,
    metricDir: 'high',
    checkVisibility: (lm) => lm[11].visibility > 0.5 && lm[12].visibility > 0.5,
    highlightJoints: [11, 12, 13, 14],
    labels: {
      ready:   'UP — LOWER DOWN!',
      active:  'DOWN — CHEST NEAR FLOOR!',
      rep:     'REP! PUSH UP!',
      noBody:  'CAMERA NEEDS SIDE/FRONT VIEW',
    },
    sliderConfig: {
      s1: { min: 35, max: 75, value: 50, label: 'Down Threshold' },
      s2: { min: 15, max: 50, value: 36, label: 'Up Threshold' },
    },
  },

  jumpingjack: {
    name: 'Jumping Jacks',
    paceUnit: 'JACKS / MIN',
    // Metric: wristY - shoulderY
    // Arms DOWN (at sides): wrists lower than shoulders → positive value
    // Arms UP (overhead):   wrists above shoulders    → negative value
    // Rep counted when arms return DOWN after going UP
    getMetric: (lm) => {
      const wristY   = (lm[15].y + lm[16].y) / 2;
      const shoulderY = (lm[11].y + lm[12].y) / 2;
      return wristY - shoulderY;
    },
    // metricDir 'low': metric goes LOW (negative) when active (arms up)
    activeThreshold: -0.05,
    neutralThreshold: 0.10,
    metricDir: 'low',
    checkVisibility: (lm) => lm[15].visibility > 0.4 && lm[16].visibility > 0.4,
    highlightJoints: [11, 12, 15, 16],
    labels: {
      ready:   'ARMS DOWN — JACK!',
      active:  'ARMS UP!',
      rep:     'REP! ARMS DOWN!',
      noBody:  'STEP BACK — FULL BODY NEEDED',
    },
    sliderConfig: {
      s1: { min: 1, max: 30, value: 5,  label: 'Arms Up Sensitivity' },
      s2: { min: 1, max: 40, value: 10, label: 'Arms Down Sensitivity' },
    },
  },

  situp: {
    name: 'Sit-ups',
    paceUnit: 'SIT-UPS / MIN',
    getMetric: (lm) => (lm[11].y + lm[12].y) / 2,
    activeThreshold: 0.42,
    neutralThreshold: 0.58,
    // metricDir 'low': metric goes LOW when active (sitting UP raises shoulders = lower Y)
    metricDir: 'low',
    checkVisibility: (lm) => lm[11].visibility > 0.5 && lm[12].visibility > 0.5,
    highlightJoints: [11, 12, 23, 24],
    labels: {
      ready:   'LIE DOWN — SIT UP!',
      active:  'UP — HOLD IT!',
      rep:     'REP! LIE BACK DOWN!',
      noBody:  'CAMERA NEEDS SIDE VIEW',
    },
    sliderConfig: {
      s1: { min: 20, max: 65, value: 42, label: 'Sit-up Height' },
      s2: { min: 40, max: 80, value: 58, label: 'Lie-down Level' },
    },
  },
};

// ── Constants ──────────────────────────────────────────────
const MILESTONES = [10, 25, 50, 100, 200];

// ── State ───────────────────────────────────────────────────
let currentMovementKey = 'burpee';
let currentMovement    = MOVEMENTS.burpee;
let repCount           = 0;
let sessionActive      = false;
let sessionStart       = null;
let timerInterval      = null;
let poseState          = 'NEUTRAL'; // 'NEUTRAL' | 'ACTIVE'
let lastRepTime        = 0;
const cooldownMs       = 700;
let sessionGoal        = 50;
let hitMilestones      = new Set();
let sessionHistory     = JSON.parse(localStorage.getItem('gymSessionHistory') || '[]');

// Dynamic thresholds (updated when movement changes)
let activeThreshold;
let neutralThreshold;

// ── DOM refs ────────────────────────────────────────────────
const videoEl       = document.getElementById('videoEl');
const poseCanvas    = document.getElementById('poseCanvas');
const ctx           = poseCanvas.getContext('2d');
const phaseBadge    = document.getElementById('phaseBadge');
const repCountEl    = document.getElementById('repCount');
const repLabel      = document.getElementById('repLabel');
const timerEl       = document.getElementById('timerDisplay');
const paceEl        = document.getElementById('paceDisplay');
const paceUnitEl    = document.getElementById('paceUnit');
const goalProgress  = document.getElementById('goalProgress');
const goalTarget    = document.getElementById('goalTarget');
const progressFill  = document.getElementById('progressFill');
const historyList   = document.getElementById('historyList');
const repCard       = document.getElementById('repCard');
const headerSubtitle = document.getElementById('headerSubtitle');

// ── Movement Selection ───────────────────────────────────────
document.querySelectorAll('.move-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (sessionActive) return; // lock during session
    document.querySelectorAll('.move-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectMovement(btn.dataset.move);
  });
});

function selectMovement(key) {
  currentMovementKey = key;
  currentMovement    = MOVEMENTS[key];
  poseState          = 'NEUTRAL';

  // Apply default thresholds
  activeThreshold  = currentMovement.activeThreshold;
  neutralThreshold = currentMovement.neutralThreshold;

  // Update sliders
  const cfg = currentMovement.sliderConfig;
  const s1  = document.getElementById('downThresh');
  const s2  = document.getElementById('upThresh');

  s1.min   = cfg.s1.min;
  s1.max   = cfg.s1.max;
  s1.value = cfg.s1.value;
  s2.min   = cfg.s2.min;
  s2.max   = cfg.s2.max;
  s2.value = cfg.s2.value;

  document.getElementById('thresh1Label').textContent = cfg.s1.label;
  document.getElementById('thresh2Label').textContent = cfg.s2.label;
  updateSliderDisplays();

  // Update UI labels
  repLabel.textContent    = `${currentMovement.name} This Session`;
  paceUnitEl.textContent  = currentMovement.paceUnit;
  headerSubtitle.textContent = currentMovement.name.toUpperCase();

  if (!sessionActive) {
    phaseBadge.textContent = 'READY — PRESS START';
  }
}

function updateSliderDisplays() {
  const s1val = document.getElementById('downThresh').value / 100;
  const s2val = document.getElementById('upThresh').value / 100;

  // For jumping jacks the metric is offset differently, show raw fraction
  document.getElementById('downThreshVal').textContent = s1val.toFixed(2);
  document.getElementById('upThreshVal').textContent   = s2val.toFixed(2);

  // Apply to active thresholds
  if (currentMovement.metricDir === 'high') {
    activeThreshold  = s1val;
    neutralThreshold = s2val;
  } else {
    // 'low': active threshold is negative (arms up for jacks) or lower value
    activeThreshold  = -s1val;
    neutralThreshold = s2val;
  }
}

// Sliders
document.getElementById('downThresh').addEventListener('input', updateSliderDisplays);
document.getElementById('upThresh').addEventListener('input', updateSliderDisplays);

document.getElementById('resetThreshBtn').addEventListener('click', () => {
  const cfg = currentMovement.sliderConfig;
  document.getElementById('downThresh').value = cfg.s1.value;
  document.getElementById('upThresh').value   = cfg.s2.value;
  updateSliderDisplays();
});

// Init with burpee
selectMovement('burpee');

// ── Buttons ─────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', startSession);
document.getElementById('stopBtn').addEventListener('click', stopSession);
document.getElementById('resetBtn').addEventListener('click', resetSession);
document.getElementById('manualAddBtn').addEventListener('click', () => { if (sessionActive) addRep(); });
document.getElementById('manualSubBtn').addEventListener('click', () => {
  if (sessionActive && repCount > 0) { repCount--; updateRepUI(); }
});
document.getElementById('setGoalBtn').addEventListener('click', () => {
  const v = parseInt(document.getElementById('goalInput').value);
  if (v > 0) { sessionGoal = v; goalTarget.textContent = v; updateGoalBar(); }
});

// ── Session Control ─────────────────────────────────────────
function startSession() {
  sessionActive = true;
  sessionStart  = Date.now();
  repCount      = 0;
  poseState     = 'NEUTRAL';
  hitMilestones = new Set();
  updateRepUI();
  updateGoalBar();

  timerInterval = setInterval(updateTimer, 1000);

  document.getElementById('startBtn').disabled  = true;
  document.getElementById('stopBtn').disabled   = false;
  document.getElementById('resetBtn').disabled  = true;
  document.querySelectorAll('.move-btn').forEach(b => b.disabled = true);

  phaseBadge.textContent = currentMovement.labels.ready;
}

function stopSession() {
  if (!sessionActive) return;
  sessionActive = false;
  clearInterval(timerInterval);

  const duration = Math.floor((Date.now() - sessionStart) / 1000);
  saveSessionToHistory(repCount, duration);

  document.getElementById('startBtn').disabled  = false;
  document.getElementById('stopBtn').disabled   = true;
  document.getElementById('resetBtn').disabled  = false;
  document.querySelectorAll('.move-btn').forEach(b => b.disabled = false);

  phaseBadge.textContent = 'SESSION ENDED';
}

function resetSession() {
  repCount = 0;
  updateRepUI();
  updateGoalBar();
  timerEl.textContent    = '00:00';
  paceEl.textContent     = '--';
  phaseBadge.textContent = 'READY — PRESS START';
  document.getElementById('resetBtn').disabled = true;
}

// ── Rep Logic ───────────────────────────────────────────────
function addRep() {
  repCount++;
  lastRepTime = Date.now();
  updateRepUI();
  flashCard();
  checkMilestone();
}

function updateRepUI() {
  repCountEl.textContent    = repCount;
  goalProgress.textContent  = repCount;
  updateGoalBar();
  updatePace();
}

function updateGoalBar() {
  const pct = Math.min((repCount / sessionGoal) * 100, 100);
  progressFill.style.width = pct + '%';
}

function updatePace() {
  if (!sessionStart || !sessionActive) return;
  const mins = (Date.now() - sessionStart) / 60000;
  if (mins < 0.1) { paceEl.textContent = '--'; return; }
  paceEl.textContent = (repCount / mins).toFixed(1);
}

function flashCard() {
  repCard.classList.remove('rep-flash');
  void repCard.offsetWidth;
  repCard.classList.add('rep-flash');
}

// ── Timer ───────────────────────────────────────────────────
function updateTimer() {
  if (!sessionStart) return;
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
  updatePace();
}

// ── Milestones ───────────────────────────────────────────────
function checkMilestone() {
  const move = currentMovement.name;
  const msgs = {
    10:  ['FIRST 10!',    'The grind has started!'],
    25:  ['25 REPS!',     'Quarter way. Keep moving!'],
    50:  ['50 REPS!',     "Halfway to 100. Don't stop!"],
    100: ['100 REPS!',    'BEAST MODE ACTIVATED!'],
    200: ['200 REPS!',    'You are absolutely unstoppable!'],
  };
  for (const m of MILESTONES) {
    if (repCount >= m && !hitMilestones.has(m)) {
      hitMilestones.add(m);
      const [title, sub] = msgs[m];
      showCelebration(title, `${move}: ${sub}`);
      return;
    }
  }
  if (repCount === sessionGoal && !hitMilestones.has('goal')) {
    hitMilestones.add('goal');
    showCelebration('GOAL REACHED!', `${sessionGoal} ${move} crushed!`);
  }
}

// ── Celebration ──────────────────────────────────────────────
function showCelebration(title, sub) {
  document.getElementById('celebTitle').textContent = title;
  document.getElementById('celebSub').textContent   = sub;
  document.getElementById('celebration').classList.add('show');
}
function closeCelebration() {
  document.getElementById('celebration').classList.remove('show');
}
window.closeCelebration = closeCelebration;

// ── Session History ──────────────────────────────────────────
function saveSessionToHistory(reps, durationSec) {
  const m = Math.floor(durationSec / 60).toString().padStart(2, '0');
  const s = (durationSec % 60).toString().padStart(2, '0');
  sessionHistory.unshift({
    reps,
    movement: currentMovement.name,
    duration: `${m}:${s}`,
    date: new Date().toLocaleDateString(),
  });
  if (sessionHistory.length > 20) sessionHistory.pop();
  localStorage.setItem('gymSessionHistory', JSON.stringify(sessionHistory));
  renderHistory();
}

function renderHistory() {
  if (sessionHistory.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No sessions yet</div>';
    return;
  }
  historyList.innerHTML = sessionHistory.map(s => `
    <div class="history-item">
      <div>
        <span class="hi-reps">${s.reps} reps</span>
        <span class="hi-move">${s.movement || ''}</span>
      </div>
      <span class="hi-meta">${s.duration} &nbsp;·&nbsp; ${s.date}</span>
    </div>
  `).join('');
}

renderHistory();

// ── Recording ────────────────────────────────────────────────
let mediaRecorder   = null;
let recordedChunks  = [];
let isRecording     = false;
let compositeCanvas = null;
let compositeCtx    = null;
let compositeRAF    = null;

const recordBtn = document.getElementById('recordBtn');

function startRecording() {
  try {
    const w = videoEl.videoWidth  || 640;
    const h = videoEl.videoHeight || 480;

    compositeCanvas        = document.createElement('canvas');
    compositeCanvas.width  = w;
    compositeCanvas.height = h;
    compositeCtx           = compositeCanvas.getContext('2d');

    function drawComposite() {
      compositeCtx.drawImage(videoEl,    0, 0, w, h);
      compositeCtx.drawImage(poseCanvas, 0, 0, w, h);
      compositeRAF = requestAnimationFrame(drawComposite);
    }
    drawComposite();

    const mimeType =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
      MediaRecorder.isTypeSupported('video/webm')            ? 'video/webm' :
      MediaRecorder.isTypeSupported('video/mp4')             ? 'video/mp4' :
      null;

    if (!mimeType) {
      alert('Recording is not supported in this browser.');
      cancelAnimationFrame(compositeRAF);
      return;
    }

    const stream = compositeCanvas.captureStream(30);
    if (!stream || stream.getTracks().length === 0) {
      alert('Could not capture canvas stream. Try a different browser.');
      cancelAnimationFrame(compositeRAF);
      return;
    }

    recordedChunks = [];
    mediaRecorder  = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onerror = (e) => {
      alert('Recording error: ' + (e.error ? e.error.message : 'unknown'));
      stopRecording();
    };
    mediaRecorder.onstop = () => {
      cancelAnimationFrame(compositeRAF);
      if (recordedChunks.length === 0) {
        alert('No data was recorded.');
        return;
      }
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const ext  = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      a.download = `gymmove-${currentMovementKey}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start(1000); // collect data every 1s
    isRecording              = true;
    recordBtn.textContent    = '⏹ Stop Rec';
    recordBtn.classList.add('recording');

  } catch (err) {
    cancelAnimationFrame(compositeRAF);
    alert('Recording failed: ' + err.message);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  isRecording           = false;
  recordBtn.textContent = 'Record';
  recordBtn.classList.remove('recording');
}

recordBtn.addEventListener('click', () => {
  if (!isRecording) startRecording();
  else stopRecording();
});

// ── MediaPipe Pose ───────────────────────────────────────────
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onPoseResults);

// ── Camera with facing mode support ─────────────────────────
let facingMode = 'user'; // 'user' = front, 'environment' = back
let activeCamera = null;

function startCamera() {
  if (activeCamera) {
    activeCamera.stop();
    activeCamera = null;
  }

  activeCamera = new Camera(videoEl, {
    onFrame: async () => { await pose.send({ image: videoEl }); },
    width: 640,
    height: 480,
    facingMode,
  });

  activeCamera.start()
    .then(() => { phaseBadge.textContent = 'READY — PRESS START'; })
    .catch(() => { phaseBadge.textContent = 'CAMERA ERROR — CHECK PERMISSIONS'; });
}

startCamera();

document.getElementById('camToggleBtn').addEventListener('click', () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  document.getElementById('camToggleBtn').textContent =
    facingMode === 'user' ? 'Flip Camera' : 'Front Camera';
  startCamera();
});

// ── Pose Results ─────────────────────────────────────────────
function onPoseResults(results) {
  poseCanvas.width  = videoEl.videoWidth  || 640;
  poseCanvas.height = videoEl.videoHeight || 480;
  ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);

  if (!results.poseLandmarks) return;
  const lm = results.poseLandmarks;

  // Draw skeleton
  drawConnectors(ctx, lm, POSE_CONNECTIONS, { color: '#ff4500', lineWidth: 2 });
  drawLandmarks(ctx, lm, { color: '#ff6a00', lineWidth: 1, radius: 3 });

  if (!sessionActive) return;

  // Visibility check
  if (!currentMovement.checkVisibility(lm)) {
    phaseBadge.textContent = currentMovement.labels.noBody;
    return;
  }

  // Highlight key joints for current movement
  const cx = poseCanvas.width;
  const cy = poseCanvas.height;
  currentMovement.highlightJoints.forEach(idx => {
    const j = lm[idx];
    ctx.beginPath();
    ctx.arc(j.x * cx, j.y * cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = poseState === 'ACTIVE' ? '#00ff88' : '#ff4500';
    ctx.fill();
  });

  // ── Movement Detection State Machine ──────────────────────
  const metric = currentMovement.getMetric(lm);
  const now    = Date.now();
  const dir    = currentMovement.metricDir;

  if (poseState === 'NEUTRAL') {
    // Check if entering ACTIVE state
    const enterActive = dir === 'high'
      ? metric > activeThreshold
      : metric < activeThreshold;

    if (enterActive) {
      poseState = 'ACTIVE';
      phaseBadge.textContent = currentMovement.labels.active;
    } else {
      phaseBadge.textContent = currentMovement.labels.ready;
    }

  } else if (poseState === 'ACTIVE') {
    // Check if returning to NEUTRAL → count rep
    const returnNeutral = dir === 'high'
      ? metric < neutralThreshold
      : metric > neutralThreshold;

    if (returnNeutral && now - lastRepTime > cooldownMs) {
      poseState = 'NEUTRAL';
      phaseBadge.textContent = currentMovement.labels.rep;
      addRep();
    }
  }
}
