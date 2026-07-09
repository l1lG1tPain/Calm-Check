// ============================================
// CALM CHECK v1.2 — PWA для спокойных проверок
// Vanilla JS, localStorage, Service Worker
// ============================================

const state = {
  currentScreen: 'home',
  currentScenario: null,
  editingScenarioId: null,
  checkedSteps: new Set(),
  settings: { dark: false, lowSensory: false, photo: false, pin: false },
  customScenarios: [],
  history: [],
  lastCheck: null,
  pinnedIds: [],
  scenarioStartTime: null,
  timerInterval: null,
  activeScenario: null  // сохраняемое состояние текущего сценария
};

const defaultTemplates = [
  { id: 'tpl-leave-home', title: 'Ухожу из дома', icon: '🚪', category: 'home', steps: ['Дверь закрыта на замок', 'Окна закрыты', 'Вода выключена', 'Плита выключена', 'Свет выключен', 'Утюг отключён', 'Зарядки вынуты'], schedule: null },
  { id: 'tpl-sleep', title: 'Ложусь спать', icon: '🌙', category: 'home', steps: ['Дверь закрыта', 'Окна закрыты', 'Газ/плита выключены', 'Будильник установлен', 'Лекарства приняты', 'Вода рядом с кроватью'], schedule: null },
  { id: 'tpl-morning', title: 'Утренний выход', icon: '🌅', category: 'routine', steps: ['Лекарства приняты', 'Ключи взяты', 'Кошелёк с собой', 'Телефон заряжен', 'Документы в сумке'], schedule: { days: [1,2,3,4,5], time: '08:00' } },
  { id: 'tpl-cooking', title: 'После готовки', icon: '🔥', category: 'home', steps: ['Плита выключена', 'Духовка выключена', 'Краны закрыты', 'Вытяжка выключена', 'Ножи убраны', 'Дети/питомцы в безопасности'], schedule: null },
  { id: 'tpl-shower', title: 'После душа', icon: '💧', category: 'home', steps: ['Вода в ванной выключена', 'Фен отключён', 'Розетки сухие', 'Полотенце повешено', 'Зеркало без пара'], schedule: null },
  { id: 'tpl-laundry', title: 'После стирки', icon: '👕', category: 'home', steps: ['Машинка выключена', 'Кран закрыт', 'Бельё развешено/в сушилке', 'Карманы проверены', 'Порошок убран'], schedule: null },
  { id: 'tpl-tech', title: 'Техника выключена', icon: '🔌', category: 'tech', steps: ['Плита выключена', 'Духовка выключена', 'Утюг отключён', 'Вода закрыта', 'Зарядки вынуты', 'Кондиционер выключен', 'Компьютер/ТВ выключены'], schedule: null },
  { id: 'tpl-items', title: 'Вещи и документы', icon: '🎒', category: 'items', steps: ['Ключи', 'Кошелёк', 'Телефон', 'Паспорт/пропуск', 'Билеты', 'Зарядка', 'Наушники'], schedule: null },
  { id: 'tpl-pets', title: 'Питомцы', icon: '🐕', category: 'pets', steps: ['Корм налит', 'Вода свежая', 'Лоток чист', 'Поводок на месте', 'Окно закрыто', 'Балкон закрыт'], schedule: null },
  { id: 'tpl-trip', title: 'Перед поездкой', icon: '✈️', category: 'home', steps: ['Окна закрыты', 'Техника отключена', 'Холодильник проверен', 'Растения политы', 'Почта/доставки отменены', 'Питомцы переданы'], schedule: null },
  { id: 'tpl-meds', title: 'Лекарства', icon: '💊', category: 'items', steps: ['Утренние приняты', 'Вечерние приняты', 'Рецепт обновлён', 'Запас проверен'], schedule: null },
  { id: 'tpl-work', title: 'Перед работой', icon: '💼', category: 'routine', steps: ['Плита выключена', 'Квартира закрыта', 'Утюг отключён', 'Пропуск взял', 'Ноутбук в сумке'], schedule: { days: [1,2,3,4,5], time: '09:00' } },
  { id: 'tpl-evening', title: 'Вечерний чек', icon: '🌆', category: 'routine', steps: ['Дверь закрыта', 'Окна закрыты', 'Будильник на завтра', 'Лекарства', 'Вода рядом', 'Свет выключен'], schedule: { days: [0,1,2,3,4,5,6], time: '22:00' } },
  { id: 'tpl-return', title: 'Возвращаюсь домой', icon: '🏠', category: 'home', steps: ['Дверь открылась нормально', 'Ничего не течёт', 'Ничего не горит', 'Всё на месте'], schedule: null },
  { id: 'tpl-guests', title: 'Перед гостями', icon: '🎉', category: 'home', steps: ['Ванная чиста', 'Полотенца свежие', 'Еда/напитки готовы', 'Мусор вынесен', 'Техника безопасна'], schedule: null }
];

const CATEGORIES = {
  home: { name: '🏠 Дом и безопасность', icon: '🏠' },
  tech: { name: '🔌 Техника', icon: '🔌' },
  items: { name: '🎒 Вещи и документы', icon: '🎒' },
  pets: { name: '🐕 Питомцы', icon: '🐕' },
  routine: { name: '🌅 Рутина', icon: '🌅' },
  other: { name: '✨ Другое', icon: '✨' }
};

const ICONS = [
  { val: '🏠', name: 'Дом' }, { val: '🔌', name: 'Техника' }, { val: '🎒', name: 'Вещи' },
  { val: '🐕', name: 'Питомец' }, { val: '🌅', name: 'Утро' }, { val: '🌙', name: 'Ночь' },
  { val: '🚪', name: 'Дверь' }, { val: '💧', name: 'Вода' }, { val: '🔥', name: 'Плита' },
  { val: '✈️', name: 'Поездка' }, { val: '💊', name: 'Лекарства' }, { val: '🔑', name: 'Ключи' },
  { val: '👕', name: 'Стирка' }, { val: '💼', name: 'Работа' }, { val: '🌆', name: 'Вечер' },
  { val: '🎉', name: 'Гости' }, { val: '🛡️', name: 'Щит' }, { val: '🔋', name: 'Заряд' },
  { val: '📱', name: 'Телефон' }, { val: '💳', name: 'Карта' }
];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ========== HAPTIC ==========
function haptic(type = 'light') {
  if ('vibrate' in navigator) {
    const patterns = { light: 15, medium: 30, heavy: 50, success: [30, 50, 30], error: [50, 30, 50] };
    navigator.vibrate(patterns[type] || 15);
  }
}

// ========== CONFETTI ==========
function triggerConfetti() {
  if (state.settings.lowSensory) return;
  const container = $('#confetti-container');
  container.classList.remove('hidden');
  container.innerHTML = '';
  const colors = ['#4F8A9E', '#5A9E7A', '#D4A85A', '#6BA3B8', '#C0786E', '#94A3B8'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + '%';
    el.style.top = '-10px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = (4 + Math.random() * 6) + 'px';
    el.style.height = (4 + Math.random() * 6) + 'px';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDelay = (Math.random() * 0.5) + 's';
    el.style.animationDuration = (1 + Math.random() * 1) + 's';
    container.appendChild(el);
  }
  setTimeout(() => { container.classList.add('hidden'); container.innerHTML = ''; }, 2000);
}

// ========== TIMER ==========
function startTimer() {
  const display = $('#timer-display');
  display.classList.add('visible');
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.scenarioStartTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    display.textContent = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  $('#timer-display').classList.remove('visible');
  if (!state.scenarioStartTime) return 0;
  return Math.floor((Date.now() - state.scenarioStartTime) / 1000);
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} сек`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ========== NAVIGATION ==========
function showScreen(name) {
  $$('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.opacity = '0';
    s.style.transform = 'translateX(20px)';
  });
  const target = $(`#screen-${name}`);
  target.classList.add('active');
  requestAnimationFrame(() => {
    target.style.opacity = '1';
    target.style.transform = 'translateX(0)';
  });
  state.currentScreen = name;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === name));
  updateHeader(name);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateHeader(screen) {
  const titles = {
    home: 'Calm Check', run: 'Проверка', done: 'Готово',
    history: 'История', create: 'Сценарий', settings: 'Настройки', panic: 'Всё под контролем'
  };
  const titleEl = $('#page-title');
  const img = titleEl.querySelector('img');
  const text = titles[screen] || 'Calm Check';
  if (img) {
    titleEl.innerHTML = '';
    titleEl.appendChild(img);
    titleEl.appendChild(document.createTextNode(text));
  } else {
    titleEl.textContent = text;
  }
}

// ========== INIT ==========
function init() {
  loadData();
  applyTheme();
  renderTemplates('all');
  renderHistory();
  updateLastCheck();
  updateStats();
  setupEventListeners();
  setupServiceWorker();
  setupPWAInstall();

  // Обновление страницы = сброс активного сценария
  // Таймер не восстанавливается, чтобы не путать пользователя
  if (state.activeScenario) {
    state.activeScenario = null;
    state.currentScenario = null;
    state.checkedSteps.clear();
    state.scenarioStartTime = null;
    saveData();
  }
  $('#timer-display').classList.remove('visible');
}


// ========== PWA INSTALL ==========
let deferredPrompt = null;
let pwaInstallBtn = null;

function setupPWAInstall() {
  pwaInstallBtn = $('#btn-install-pwa');
  if (!pwaInstallBtn) return;

  // Check if already installed (standalone or display-mode standalone)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isStandalone) {
    pwaInstallBtn.classList.add('hidden');
    return;
  }

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    pwaInstallBtn.classList.remove('hidden');
  });

  // Listen for appinstalled
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    pwaInstallBtn.classList.add('hidden');
    toast('Приложение установлено');
  });

  // Handle install button click
  pwaInstallBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      toast('Установка недоступна в этом браузере');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast('Установка начата');
    }
    deferredPrompt = null;
    pwaInstallBtn.classList.add('hidden');
  });
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ========== STORAGE ==========
function saveData() {
  try {
    localStorage.setItem('calmcheck_settings', JSON.stringify(state.settings));
    localStorage.setItem('calmcheck_custom', JSON.stringify(state.customScenarios));
    localStorage.setItem('calmcheck_history', JSON.stringify(state.history));
    localStorage.setItem('calmcheck_last', JSON.stringify(state.lastCheck));
    localStorage.setItem('calmcheck_pinned', JSON.stringify(state.pinnedIds));
    localStorage.setItem('calmcheck_active', JSON.stringify(state.activeScenario));
  } catch (e) {}
}

function loadData() {
  try {
    const s = localStorage.getItem('calmcheck_settings');
    if (s) state.settings = { ...state.settings, ...JSON.parse(s) };
    const c = localStorage.getItem('calmcheck_custom');
    if (c) state.customScenarios = JSON.parse(c);
    const h = localStorage.getItem('calmcheck_history');
    if (h) state.history = JSON.parse(h);
    const l = localStorage.getItem('calmcheck_last');
    if (l) state.lastCheck = JSON.parse(l);
    const p = localStorage.getItem('calmcheck_pinned');
    if (p) state.pinnedIds = JSON.parse(p);
    const a = localStorage.getItem('calmcheck_active');
    if (a) state.activeScenario = JSON.parse(a);
  } catch (e) {}
}

// ========== STATS ==========
function updateStats() {
  const total = state.history.length;
  $('#stat-total').textContent = total;

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weekCount = state.history.filter(h => new Date(h.completedAt) > weekAgo).length;
  $('#stat-week').textContent = weekCount;

  const times = state.history.filter(h => h.duration && h.duration > 0).map(h => h.duration);
  if (times.length > 0) {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    $('#stat-avg-time').textContent = formatDuration(avg);
  } else {
    $('#stat-avg-time').textContent = '—';
  }

  const dates = [...new Set(state.history.map(h => {
    const d = new Date(h.completedAt);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }))].sort();
  let streak = 0;
  if (dates.length > 0) {
    const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const yesterday = `${now.getFullYear()}-${now.getMonth()}-${now.getDate() - 1}`;
    let checkDate = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : null);
    if (checkDate) {
      streak = 1;
      let d = new Date(now);
      if (checkDate === yesterday) d.setDate(d.getDate() - 1);
      while (true) {
        d.setDate(d.getDate() - 1);
        const ds = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (dates.includes(ds)) streak++;
        else break;
      }
    }
  }
  $('#stat-streak').textContent = streak;
}

// ========== RENDER TEMPLATES ==========
function getAllTemplates() {
  return [...defaultTemplates, ...state.customScenarios];
}

function renderTemplates(filterCat) {
  const list = $('#templates-list');
  const all = getAllTemplates();
  const filtered = filterCat === 'all' ? all : all.filter(t => t.category === filterCat);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><p>Нет сценариев в этой категории</p></div>';
    return;
  }

  const usageCount = {};
  state.history.forEach(h => { usageCount[h.scenarioId] = (usageCount[h.scenarioId] || 0) + 1; });
  filtered.sort((a, b) => {
    const aPinned = state.pinnedIds.includes(a.id) ? 1 : 0;
    const bPinned = state.pinnedIds.includes(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return (usageCount[b.id] || 0) - (usageCount[a.id] || 0);
  });

  list.innerHTML = filtered.map((t, i) => {
    const isCustom = t.isCustom || state.customScenarios.some(c => c.id === t.id);
    const isPinned = state.pinnedIds.includes(t.id);
    const delay = Math.min(i * 0.04, 0.4);
    return `
    <div class="card ${isPinned ? 'pinned' : ''}" data-id="${t.id}" tabindex="0" style="animation-delay:${delay}s">
      <div class="card-icon">${t.icon}</div>
      <div class="card-content">
        <div class="card-title">${t.title}</div>
        <div class="card-desc">${t.steps.length} шагов · ${CATEGORIES[t.category]?.name || t.category}</div>
        ${t.schedule ? `<div class="card-meta">⏰ ${formatSchedule(t.schedule)}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-xs btn-pin-scenario" data-id="${t.id}" title="${isPinned ? 'Открепить' : 'Закрепить'}">${isPinned ? '📌' : '📍'}</button>
        ${isCustom ? `<button class="btn btn-ghost btn-xs btn-edit-scenario" data-id="${t.id}" title="Редактировать">✏️</button>` : ''}
      </div>
    </div>
  `;}).join('');

  list.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-edit-scenario') || e.target.closest('.btn-pin-scenario')) return;
      startScenario(card.dataset.id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.target.closest('.btn-edit-scenario') && !e.target.closest('.btn-pin-scenario')) {
        startScenario(card.dataset.id);
      }
    });
  });

  list.querySelectorAll('.btn-edit-scenario').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openEditScenario(btn.dataset.id); });
  });

  list.querySelectorAll('.btn-pin-scenario').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); togglePin(btn.dataset.id); });
  });
}

function togglePin(id) {
  const idx = state.pinnedIds.indexOf(id);
  if (idx > -1) state.pinnedIds.splice(idx, 1);
  else state.pinnedIds.push(id);
  saveData();
  renderTemplates(document.querySelector('.tag.active')?.dataset.cat || 'all');
  haptic('light');
}

function formatSchedule(sch) {
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const dayStr = sch.days.map(d => days[d]).join(', ');
  return `${dayStr} в ${sch.time}`;
}

// ========== SCENARIO RUN ==========
function startScenario(id, restore = false) {
  const tpl = getAllTemplates().find(t => t.id === id);
  if (!tpl) return;

  state.currentScenario = tpl;

  // Восстановление состояния из activeScenario
  let restoredSteps = new Set();
  let restoredNotes = {};
  let restoredStartTime = null;

  if (restore && state.activeScenario && state.activeScenario.scenarioId === id) {
    restoredSteps = new Set(state.activeScenario.checkedSteps || []);
    restoredNotes = state.activeScenario.notes || {};
    restoredStartTime = state.activeScenario.startTime;
    state.checkedSteps = restoredSteps;
  } else {
    state.checkedSteps.clear();
    state.activeScenario = null;
  }

  $('#run-title').textContent = tpl.title;
  $('#run-subtitle').textContent = 'Пройдите шаги один за другим';
  updateProgress();

  const container = $('#run-steps');
  container.innerHTML = tpl.steps.map((step, i) => {
    const isChecked = restoredSteps.has(i);
    const note = restoredNotes[i] || '';
    return `
    <div class="step-item ${isChecked ? 'checked' : ''}" data-step="${i}" tabindex="0" style="animation-delay:${Math.min(i * 0.05, 0.5)}s">
      <div class="step-checkbox">${isChecked ? '✓' : ''}</div>
      <div style="flex:1">
        <div class="step-text">${step}</div>
        <div class="step-add-note ${isChecked && note ? '' : 'hidden'}">
          <input type="text" placeholder="Заметка (опционально)" data-note="${i}" value="${note}">
        </div>
      </div>
    </div>
  `;}).join('');

  container.querySelectorAll('.step-item').forEach(item => {
    item.addEventListener('click', () => toggleStep(item));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStep(item); } });
  });

  $('#btn-finish-scenario').disabled = state.checkedSteps.size < tpl.steps.length;

  // Таймер: восстанавливаем или запускаем новый
  if (restore && restoredStartTime) {
    state.scenarioStartTime = restoredStartTime;
    state.activeScenario = {
      scenarioId: id,
      checkedSteps: Array.from(state.checkedSteps),
      notes: restoredNotes,
      startTime: restoredStartTime
    };
    startTimer();
  } else {
    state.scenarioStartTime = Date.now();
    state.activeScenario = {
      scenarioId: id,
      checkedSteps: [],
      notes: {},
      startTime: state.scenarioStartTime
    };
    startTimer();
  }

  saveData();
  showScreen('run');
}

function toggleStep(item) {
  const idx = parseInt(item.dataset.step);
  if (state.checkedSteps.has(idx)) {
    state.checkedSteps.delete(idx);
    item.classList.remove('checked');
    item.querySelector('.step-checkbox').innerHTML = '';
    item.querySelector('.step-add-note')?.classList.add('hidden');
  } else {
    state.checkedSteps.add(idx);
    item.classList.add('checked');
    item.querySelector('.step-checkbox').innerHTML = '✓';
    haptic('light');
    if (state.settings.photo) {
      item.querySelector('.step-add-note')?.classList.remove('hidden');
      setTimeout(() => item.querySelector('.step-add-note input')?.focus(), 50);
    }
  }
  updateProgress();
  saveActiveScenario();
}

function updateProgress() {
  const total = state.currentScenario?.steps.length || 1;
  const done = state.checkedSteps.size;
  const pct = Math.round((done / total) * 100);
  $('#run-progress').style.width = pct + '%';
  $('#run-subtitle').textContent = `${done} из ${total} шагов`;
  $('#btn-finish-scenario').disabled = done < total;
}

function saveActiveScenario() {
  if (!state.currentScenario) return;
  const notes = {};
  document.querySelectorAll('[data-note]').forEach(input => {
    if (input.value.trim()) notes[input.dataset.note] = input.value.trim();
  });
  state.activeScenario = {
    scenarioId: state.currentScenario.id,
    checkedSteps: Array.from(state.checkedSteps),
    notes: notes,
    startTime: state.scenarioStartTime
  };
  saveData();
}

function finishScenario() {
  if (!state.currentScenario) return;
  const duration = stopTimer();
  const notes = {};
  document.querySelectorAll('[data-note]').forEach(input => {
    if (input.value.trim()) notes[input.dataset.note] = input.value.trim();
  });

  const record = {
    id: Date.now(),
    scenarioId: state.currentScenario.id,
    title: state.currentScenario.title,
    icon: state.currentScenario.icon,
    completedAt: new Date().toISOString(),
    stepsCount: state.currentScenario.steps.length,
    notes: notes,
    duration: duration
  };

  state.history.unshift(record);
  state.lastCheck = record;
  if (state.history.length > 100) state.history.pop();

  // Очищаем активный сценарий
  state.activeScenario = null;
  state.checkedSteps.clear();
  saveData();

  renderHistory();
  updateLastCheck();
  updateStats();

  $('#done-timer').textContent = formatDuration(duration);
  const nextTime = state.currentScenario.schedule
    ? `Следующий: ${formatSchedule(state.currentScenario.schedule)}`
    : 'Запускайте сценарий когда нужно';
  $('#done-next-time').textContent = nextTime;

  triggerConfetti();
  haptic('success');
  showScreen('done');
}

function updateLastCheck() {
  const el = $('#last-check');
  if (!state.lastCheck) { el.textContent = '—'; return; }
  const d = new Date(state.lastCheck.completedAt);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  let text;
  if (diff < 1) text = 'только что';
  else if (diff < 60) text = `${diff} мин назад`;
  else if (diff < 1440) text = `${Math.floor(diff/60)} ч назад`;
  else text = d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
  el.textContent = `${state.lastCheck.icon} ${state.lastCheck.title} · ${text}`;
}

// ========== HISTORY (virtual scroll) ==========
let historyVisibleCount = 20;
function renderHistory() {
  const list = $('#history-list');
  const empty = $('#history-empty');

  if (state.history.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const toShow = state.history.slice(0, historyVisibleCount);
  list.innerHTML = toShow.map((h, i) => {
    const d = new Date(h.completedAt);
    const dateStr = d.toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    const noteCount = Object.keys(h.notes || {}).length;
    const timerStr = h.duration ? ` · ⏱ ${formatDuration(h.duration)}` : '';
    return `
      <div class="history-item" style="animation-delay:${Math.min(i * 0.03, 0.5)}s">
        <div class="history-header">
          <span class="history-title">${h.icon} ${h.title}</span>
          <span class="history-time">${dateStr}</span>
        </div>
        <div class="history-steps">${h.stepsCount} шагов завершено${noteCount ? ` · ${noteCount} заметок` : ''}${timerStr}</div>
      </div>
    `;
  }).join('');

  if (state.history.length > historyVisibleCount) {
    const loadMore = document.createElement('button');
    loadMore.className = 'btn btn-ghost w-full';
    loadMore.textContent = `Показать ещё (${state.history.length - historyVisibleCount})`;
    loadMore.addEventListener('click', () => {
      historyVisibleCount += 20;
      renderHistory();
    });
    list.appendChild(loadMore);
  }
}

function clearHistory() {
  state.history = [];
  state.lastCheck = null;
  historyVisibleCount = 20;
  saveData();
  renderHistory();
  updateLastCheck();
  updateStats();
  toast('История очищена');
}

// ========== CREATE / EDIT ==========
function openCreateScenario() {
  state.editingScenarioId = null;
  $('#create-title').textContent = 'Новый сценарий';
  $('#create-name').value = '';
  $('#create-steps').value = '';
  $('#create-category').value = 'home';
  $('#create-category-text').textContent = CATEGORIES.home.name;
  $('#create-icon').value = '🏠';
  $('#create-icon-text').textContent = '🏠 Дом';
  $('#btn-save-scenario').textContent = 'Сохранить сценарий';
  $('#btn-delete-scenario').classList.add('hidden');
  showScreen('create');
}

function openEditScenario(id) {
  const scenario = state.customScenarios.find(s => s.id === id);
  if (!scenario) return;

  state.editingScenarioId = id;
  $('#create-title').textContent = 'Редактировать сценарий';
  $('#create-name').value = scenario.title;
  $('#create-steps').value = scenario.steps.join('\n');
  $('#create-category').value = scenario.category;
  $('#create-category-text').textContent = CATEGORIES[scenario.category]?.name || scenario.category;
  $('#create-icon').value = scenario.icon;
  const iconObj = ICONS.find(i => i.val === scenario.icon);
  $('#create-icon-text').textContent = iconObj ? `${iconObj.val} ${iconObj.name}` : `${scenario.icon} Иконка`;
  $('#btn-save-scenario').textContent = 'Сохранить изменения';
  $('#btn-delete-scenario').classList.remove('hidden');
  showScreen('create');
}

function saveCustomScenario() {
  const name = $('#create-name').value.trim();
  const category = $('#create-category').value;
  const icon = $('#create-icon').value;
  const stepsRaw = $('#create-steps').value.trim();

  if (!name) { toast('Введите название'); return; }
  if (!stepsRaw) { toast('Добавьте хотя бы один шаг'); return; }

  const steps = stepsRaw.split('\n').map(s => s.trim()).filter(Boolean);

  if (state.editingScenarioId) {
    const idx = state.customScenarios.findIndex(s => s.id === state.editingScenarioId);
    if (idx !== -1) {
      state.customScenarios[idx] = { ...state.customScenarios[idx], title: name, category, icon, steps };
      saveData();
      toast('Сценарий обновлён');
    }
  } else {
    state.customScenarios.push({
      id: 'custom-' + Date.now(), title: name, icon, category, steps, schedule: null, isCustom: true
    });
    saveData();
    toast('Сценарий сохранён');
  }

  $('#create-name').value = '';
  $('#create-steps').value = '';
  state.editingScenarioId = null;
  showScreen('home');
  renderTemplates('all');
  $$('.tag').forEach(t => t.classList.toggle('active', t.dataset.cat === 'all'));
}

function deleteCustomScenario() {
  if (!state.editingScenarioId) return;
  const idx = state.customScenarios.findIndex(s => s.id === state.editingScenarioId);
  if (idx !== -1) {
    state.customScenarios.splice(idx, 1);
    state.pinnedIds = state.pinnedIds.filter(id => id !== state.editingScenarioId);
    saveData();
    toast('Сценарий удалён');
  }
  state.editingScenarioId = null;
  showScreen('home');
  renderTemplates('all');
}

// ========== PICKERS ==========
function showCategoryPicker() {
  $('#picker-title').textContent = 'Выберите категорию';
  const content = $('#picker-content');
  content.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
    <div class="card" data-cat="${key}" style="margin-bottom:8px;">
      <div class="card-icon">${cat.icon}</div>
      <div class="card-content"><div class="card-title">${cat.name}</div></div>
    </div>
  `).join('');
  content.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.cat;
      $('#create-category').value = cat;
      $('#create-category-text').textContent = CATEGORIES[cat].name;
      hidePicker();
    });
  });
  $('#picker-modal').classList.add('show');
}

function showIconPicker() {
  $('#picker-title').textContent = 'Выберите иконку';
  const content = $('#picker-content');
  content.innerHTML = `<div class="picker-grid">${ICONS.map(i => `
    <div class="picker-item" data-val="${i.val}" title="${i.name}">${i.val}</div>
  `).join('')}</div>`;
  content.querySelectorAll('.picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const val = item.dataset.val;
      const name = ICONS.find(i => i.val === val)?.name || '';
      $('#create-icon').value = val;
      $('#create-icon-text').textContent = `${val} ${name}`;
      hidePicker();
    });
  });
  $('#picker-modal').classList.add('show');
}

function hidePicker() {
  $('#picker-modal').classList.remove('show');
}

// ========== SETTINGS ==========
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.dark ? 'dark' : 'light');
  document.body.classList.toggle('low-sensory', state.settings.lowSensory);
  $('#toggle-dark').classList.toggle('on', state.settings.dark);
  $('#toggle-low-sensory').classList.toggle('on', state.settings.lowSensory);
  $('#toggle-photo').classList.toggle('on', state.settings.photo);
  $('#toggle-pin').classList.toggle('on', state.settings.pin);
  $('#btn-theme').textContent = state.settings.dark ? '☀️' : '🌙';
}

function toggleSetting(key) {
  state.settings[key] = !state.settings[key];
  saveData();
  applyTheme();
  haptic('light');
}

// ========== EXPORT / IMPORT ==========
function exportData() {
  const data = {
    settings: state.settings, customScenarios: state.customScenarios,
    history: state.history, lastCheck: state.lastCheck, pinnedIds: state.pinnedIds,
    exportedAt: new Date().toISOString(), version: '1.2'
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calm-check-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Данные экспортированы');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.settings) state.settings = { ...state.settings, ...data.settings };
      if (data.customScenarios) state.customScenarios = data.customScenarios;
      if (data.history) state.history = data.history;
      if (data.lastCheck) state.lastCheck = data.lastCheck;
      if (data.pinnedIds) state.pinnedIds = data.pinnedIds;
      saveData();
      applyTheme();
      renderTemplates('all');
      renderHistory();
      updateLastCheck();
      updateStats();
      toast('Данные импортированы');
    } catch {
      toast('Ошибка импорта');
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  state.settings = { dark: false, lowSensory: false, photo: false, pin: false };
  state.customScenarios = []; state.history = []; state.lastCheck = null; state.pinnedIds = [];
  historyVisibleCount = 20;
  saveData();
  applyTheme();
  renderTemplates('all');
  renderHistory();
  updateLastCheck();
  updateStats();
  toast('Все данные сброшены');
}

// ========== PANIC BREATHING ==========
let panicInterval = null;
function startPanicBreathing() {
  const text = $('#panic-instruction');
  let phase = 0;
  clearInterval(panicInterval);
  const cycle = () => {
    if (phase === 0) { text.textContent = 'Вдох...'; phase = 1; }
    else if (phase === 1) { text.textContent = 'Задержка...'; phase = 2; }
    else { text.textContent = 'Выдох...'; phase = 0; }
  };
  cycle();
  panicInterval = setInterval(cycle, 4000);
}
function stopPanicBreathing() {
  clearInterval(panicInterval);
}

// ========== MODAL ==========
function showModal(title, text, onConfirm, onCancel) {
  $('#modal-title').textContent = title;
  $('#modal-text').textContent = text;
  $('#modal').classList.add('show');
  const confirmBtn = $('#modal-confirm');
  const cancelBtn = $('#modal-cancel');
  const cleanup = () => {
    $('#modal').classList.remove('show');
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };
  confirmBtn.onclick = () => { cleanup(); onConfirm?.(); };
  cancelBtn.onclick = () => { cleanup(); onCancel?.(); };
}

// ========== TOAST ==========
let toastTimeout;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 2500);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  $('#btn-quick-check').addEventListener('click', () => startScenario('tpl-leave-home'));
  $('#btn-create-top').addEventListener('click', openCreateScenario);
  $('#btn-create-bottom').addEventListener('click', openCreateScenario);

  // Клик по таймеру — возврат к активному сценарию
  $('#timer-display').addEventListener('click', () => {
    if (state.activeScenario && state.currentScenario) {
      showScreen('run');
    }
  });

  $('#btn-back-home').addEventListener('click', () => showScreen('home'));
  $('#btn-finish-scenario').addEventListener('click', finishScenario);
  $('#btn-done-home').addEventListener('click', () => showScreen('home'));

  $('#btn-back-create').addEventListener('click', () => showScreen('home'));
  $('#btn-save-scenario').addEventListener('click', saveCustomScenario);
  $('#btn-delete-scenario').addEventListener('click', () => {
    showModal('Удалить сценарий?', 'Это действие нельзя отменить.', deleteCustomScenario);
  });

  $('#create-category-display').addEventListener('click', showCategoryPicker);
  $('#create-icon-display').addEventListener('click', showIconPicker);
  $('#picker-cancel').addEventListener('click', hidePicker);
  $('#picker-modal').addEventListener('click', (e) => { if (e.target === $('#picker-modal')) hidePicker(); });

  $('#btn-clear-history').addEventListener('click', () => {
    showModal('Очистить историю?', 'Все записи будут удалены безвозвратно.', clearHistory);
  });

  $('#btn-theme').addEventListener('click', () => toggleSetting('dark'));

  $('#btn-panic').addEventListener('click', () => { startPanicBreathing(); showScreen('panic'); });
  $('#btn-panic-home').addEventListener('click', () => { stopPanicBreathing(); showScreen('home'); });
  $('#btn-panic-history').addEventListener('click', () => { stopPanicBreathing(); showScreen('history'); });

  $('#btn-doubt').addEventListener('click', () => { showScreen('history'); toast('Последние проверки — вы всё сделали правильно'); });

  $('#toggle-dark').addEventListener('click', () => toggleSetting('dark'));
  $('#toggle-low-sensory').addEventListener('click', () => toggleSetting('lowSensory'));
  $('#toggle-photo').addEventListener('click', () => toggleSetting('photo'));
  $('#toggle-pin').addEventListener('click', () => toggleSetting('pin'));

  $('#btn-export').addEventListener('click', exportData);
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
  $('#btn-reset').addEventListener('click', () => {
    showModal('Сбросить всё?', 'Все сценарии, история и настройки будут удалены.', resetAll);
  });

  $$('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
      $$('.tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      renderTemplates(tag.dataset.cat);
    });
  });

  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) $('#modal').classList.remove('show'); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#modal').classList.contains('show')) $('#modal').classList.remove('show');
      else if ($('#picker-modal').classList.contains('show')) hidePicker();
      else if (state.currentScreen === 'run') showScreen('home');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPanicBreathing();
  });
}

// ========== START ==========
document.addEventListener('DOMContentLoaded', init);
