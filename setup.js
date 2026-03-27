// ── Hardcoded defaults (must mirror MOVEMENTS in app.js) ─────
const DEFAULTS = {
  burpee: {
    name: 'Burpees',
    labels: {
      ready:  'STANDING — DROP!',
      active: 'DOWN — GET LOW!',
      rep:    'REP! STAND UP!',
      noBody: 'STEP BACK — FULL BODY NEEDED',
    },
    sliderConfig: {
      s1: { label: 'Down Threshold', value: 68, min: 50, max: 90 },
      s2: { label: 'Up Threshold',   value: 48, min: 20, max: 65 },
    },
  },
  squat: {
    name: 'Squats',
    labels: {
      ready:  'STANDING — SQUAT!',
      active: 'BELOW PARALLEL — GOOD DEPTH!',
      rep:    'REP! STAND UP!',
      noBody: 'STEP BACK — FULL BODY NEEDED',
    },
    sliderConfig: {
      s1: { label: 'Parallel Depth', value: 52, min: 48, max: 65 },
      s2: { label: 'Stand Return',   value: 38, min: 25, max: 48 },
    },
  },
  pushup: {
    name: 'Push-ups',
    labels: {
      ready:  'UP — LOWER DOWN!',
      active: 'DOWN — CHEST NEAR FLOOR!',
      rep:    'REP! PUSH UP!',
      noBody: 'CAMERA NEEDS SIDE/FRONT VIEW',
    },
    sliderConfig: {
      s1: { label: 'Down Threshold', value: 50, min: 35, max: 75 },
      s2: { label: 'Up Threshold',   value: 36, min: 15, max: 50 },
    },
  },
  situp: {
    name: 'Sit-ups',
    labels: {
      ready:  'LIE DOWN — SIT UP!',
      active: 'UP — HOLD IT!',
      rep:    'REP! LIE BACK DOWN!',
      noBody: 'CAMERA NEEDS SIDE VIEW',
    },
    sliderConfig: {
      s1: { label: 'Sit-up Height',  value: 42, min: 20, max: 65 },
      s2: { label: 'Lie-down Level', value: 58, min: 40, max: 80 },
    },
  },
};

const MOVEMENT_KEYS = ['burpee', 'squat', 'pushup', 'situp'];

// ── LocalStorage helpers ──────────────────────────────────────
function loadSettings() {
  return JSON.parse(localStorage.getItem('gymMoveSettings') || '{}');
}

function saveToStorage(settings) {
  localStorage.setItem('gymMoveSettings', JSON.stringify(settings));
}

// ── Escape helper (prevent XSS in innerHTML) ──────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Build the form ────────────────────────────────────────────
function buildForm() {
  const saved = loadSettings();
  const container = document.getElementById('settingsContainer');
  container.innerHTML = '';

  MOVEMENT_KEYS.forEach(key => {
    const def = DEFAULTS[key];
    const ovr = saved[key] || {};
    const name = ovr.name !== undefined ? ovr.name : def.name;
    const labels = { ...def.labels, ...(ovr.labels || {}) };
    const s1 = { ...def.sliderConfig.s1, ...(ovr.sliderConfig?.s1 || {}) };
    const s2 = { ...def.sliderConfig.s2, ...(ovr.sliderConfig?.s2 || {}) };

    const card = document.createElement('div');
    card.className = 'card settings-card';
    card.innerHTML = `
      <div class="settings-card-header">
        <div>
          <span class="settings-move-name">${esc(name)}</span>
          <span class="settings-move-key">(${key})</span>
        </div>
        <button class="reset-move-btn" data-key="${key}">Reset to Defaults</button>
      </div>
      <div class="settings-body">

        <!-- Name -->
        <div>
          <div class="settings-section-title" style="margin-bottom:12px;">Movement Name</div>
          <div class="settings-name-row">
            <label for="name_${key}">Display Name</label>
            <input type="text" id="name_${key}"
              data-key="${key}" data-field="name"
              value="${esc(name)}" maxlength="40" />
          </div>
        </div>

        <!-- Coaching Messages -->
        <div>
          <div class="settings-section-title" style="margin-bottom:12px;">Coaching Messages</div>
          <div class="settings-grid">
            <div class="settings-field">
              <label for="label_ready_${key}">Ready — waiting to perform</label>
              <input type="text" id="label_ready_${key}"
                data-key="${key}" data-field="labels.ready"
                value="${esc(labels.ready)}" maxlength="60" />
            </div>
            <div class="settings-field">
              <label for="label_active_${key}">Active — in the movement</label>
              <input type="text" id="label_active_${key}"
                data-key="${key}" data-field="labels.active"
                value="${esc(labels.active)}" maxlength="60" />
            </div>
            <div class="settings-field">
              <label for="label_rep_${key}">Rep counted</label>
              <input type="text" id="label_rep_${key}"
                data-key="${key}" data-field="labels.rep"
                value="${esc(labels.rep)}" maxlength="60" />
            </div>
            <div class="settings-field">
              <label for="label_noBody_${key}">Body not detected</label>
              <input type="text" id="label_noBody_${key}"
                data-key="${key}" data-field="labels.noBody"
                value="${esc(labels.noBody)}" maxlength="60" />
            </div>
          </div>
        </div>

        <!-- Detection Thresholds -->
        <div>
          <div class="settings-section-title" style="margin-bottom:6px;">Detection Thresholds</div>
          <p class="thresh-note" style="margin-bottom:12px;">
            Values 1–99 represent the joint's vertical screen position (% from top).
            A rep is counted when the joint crosses Threshold 1 (active position)
            and then crosses back past Threshold 2 (return position).
          </p>
          <div class="thresh-grid settings-grid">
            <div class="settings-field">
              <label for="s1label_${key}">Threshold 1 — label</label>
              <input type="text" id="s1label_${key}"
                data-key="${key}" data-field="sliderConfig.s1.label"
                value="${esc(s1.label)}" maxlength="40" />
            </div>
            <div class="settings-field">
              <label for="s1val_${key}">Default &mdash; <span id="s1display_${key}" class="thresh-live">${s1.value}</span></label>
              <input type="range" id="s1slider_${key}"
                min="${s1.min}" max="${s1.max}" value="${s1.value}" step="1"
                class="thresh-slider" data-num="s1val_${key}" data-display="s1display_${key}" />
              <input type="number" id="s1val_${key}"
                data-key="${key}" data-field="sliderConfig.s1.value"
                value="${s1.value}" min="1" max="99"
                class="thresh-number" data-slider="s1slider_${key}" data-display="s1display_${key}" />
            </div>
            <div class="settings-field">
              <label for="s1min_${key}">Min</label>
              <input type="number" id="s1min_${key}"
                data-key="${key}" data-field="sliderConfig.s1.min"
                value="${s1.min}" min="1" max="99"
                data-slider="s1slider_${key}" data-range-end="min" />
            </div>
            <div class="settings-field">
              <label for="s1max_${key}">Max</label>
              <input type="number" id="s1max_${key}"
                data-key="${key}" data-field="sliderConfig.s1.max"
                value="${s1.max}" min="1" max="99"
                data-slider="s1slider_${key}" data-range-end="max" />
            </div>

            <div class="settings-field">
              <label for="s2label_${key}">Threshold 2 — label</label>
              <input type="text" id="s2label_${key}"
                data-key="${key}" data-field="sliderConfig.s2.label"
                value="${esc(s2.label)}" maxlength="40" />
            </div>
            <div class="settings-field">
              <label for="s2val_${key}">Default &mdash; <span id="s2display_${key}" class="thresh-live">${s2.value}</span></label>
              <input type="range" id="s2slider_${key}"
                min="${s2.min}" max="${s2.max}" value="${s2.value}" step="1"
                class="thresh-slider" data-num="s2val_${key}" data-display="s2display_${key}" />
              <input type="number" id="s2val_${key}"
                data-key="${key}" data-field="sliderConfig.s2.value"
                value="${s2.value}" min="1" max="99"
                class="thresh-number" data-slider="s2slider_${key}" data-display="s2display_${key}" />
            </div>
            <div class="settings-field">
              <label for="s2min_${key}">Min</label>
              <input type="number" id="s2min_${key}"
                data-key="${key}" data-field="sliderConfig.s2.min"
                value="${s2.min}" min="1" max="99"
                data-slider="s2slider_${key}" data-range-end="min" />
            </div>
            <div class="settings-field">
              <label for="s2max_${key}">Max</label>
              <input type="number" id="s2max_${key}"
                data-key="${key}" data-field="sliderConfig.s2.max"
                value="${s2.max}" min="1" max="99"
                data-slider="s2slider_${key}" data-range-end="max" />
            </div>
          </div>
        </div>

      </div>
    `;
    container.appendChild(card);
  });

  // Wire slider ↔ number input sync
  container.querySelectorAll('.thresh-slider').forEach(slider => {
    const numEl     = document.getElementById(slider.dataset.num);
    const displayEl = document.getElementById(slider.dataset.display);

    slider.addEventListener('input', () => {
      numEl.value = slider.value;
      displayEl.textContent = slider.value;
    });
  });

  container.querySelectorAll('.thresh-number').forEach(numEl => {
    const slider    = document.getElementById(numEl.dataset.slider);
    const displayEl = document.getElementById(numEl.dataset.display);

    numEl.addEventListener('input', () => {
      slider.value = numEl.value;
      displayEl.textContent = numEl.value;
    });
  });

  // Keep slider min/max in sync when range inputs change
  container.querySelectorAll('[data-range-end]').forEach(rangeInput => {
    const slider = document.getElementById(rangeInput.dataset.slider);
    const end    = rangeInput.dataset.rangeEnd; // 'min' or 'max'

    rangeInput.addEventListener('input', () => {
      slider[end] = rangeInput.value;
      // Clamp slider value if it's now out of range
      if (parseInt(slider.value) < parseInt(slider.min)) slider.value = slider.min;
      if (parseInt(slider.value) > parseInt(slider.max)) slider.value = slider.max;
      // Sync number input and display too
      const numEl     = document.getElementById(slider.dataset.num);
      const displayEl = document.getElementById(slider.dataset.display);
      if (numEl)     numEl.value = slider.value;
      if (displayEl) displayEl.textContent = slider.value;
    });
  });

  // Wire reset-per-movement buttons
  container.querySelectorAll('.reset-move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const saved = loadSettings();
      delete saved[btn.dataset.key];
      saveToStorage(saved);
      buildForm();
    });
  });

  // Live-update card header name as user types
  container.querySelectorAll('input[data-field="name"]').forEach(input => {
    input.addEventListener('input', () => {
      const header = input.closest('.settings-card').querySelector('.settings-move-name');
      header.textContent = input.value || DEFAULTS[input.dataset.key].name;
    });
  });
}

// ── Collect all form values into a settings object ────────────
function collectSettings() {
  const settings = {};

  document.querySelectorAll('[data-key][data-field]').forEach(input => {
    const key   = input.dataset.key;
    const field = input.dataset.field;          // e.g. "sliderConfig.s1.value"
    const isNum = input.type === 'number';
    let value   = isNum ? parseInt(input.value, 10) : input.value.trim();
    if (isNum && isNaN(value)) value = 0;

    if (!settings[key]) {
      settings[key] = { labels: {}, sliderConfig: { s1: {}, s2: {} } };
    }

    const parts = field.split('.');
    if (parts.length === 1) {
      settings[key][parts[0]] = value;
    } else if (parts.length === 2) {
      settings[key][parts[0]][parts[1]] = value;
    } else if (parts.length === 3) {
      settings[key][parts[0]][parts[1]][parts[2]] = value;
    }
  });

  // Auto-derive paceUnit from name
  Object.entries(settings).forEach(([, s]) => {
    if (s.name) s.paceUnit = s.name.toUpperCase() + ' / MIN';
  });

  return settings;
}

// ── Save handler ──────────────────────────────────────────────
function handleSave() {
  saveToStorage(collectSettings());
  [document.getElementById('saveBtn'), document.getElementById('saveBtnBottom')].forEach(btn => {
    btn.textContent = 'Saved!';
    btn.classList.add('saved');
    setTimeout(() => {
      btn.textContent = 'Save Settings';
      btn.classList.remove('saved');
    }, 1500);
  });
}

// ── Reset all ─────────────────────────────────────────────────
function handleResetAll() {
  if (!confirm('Reset all movements to factory defaults?')) return;
  localStorage.removeItem('gymMoveSettings');
  buildForm();
}

document.getElementById('saveBtn').addEventListener('click', handleSave);
document.getElementById('saveBtnBottom').addEventListener('click', handleSave);
document.getElementById('resetAllBtn').addEventListener('click', handleResetAll);
document.getElementById('resetAllBtnBottom').addEventListener('click', handleResetAll);

buildForm();
