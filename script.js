/* =============================================
   スケジューラー app.js
   ============================================= */

// ===== 状態 =====
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentFilter = 'all';
let selectedDate  = null;

// ===== localStorage キー =====
const KEYS = {
  tasks:    'scheduler_tasks',
  timetable:'scheduler_timetable',
  dailyTodo:'scheduler_daily_todo',
};

// ===== データ読み書き =====
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadTasks() {
  try { return JSON.parse(localStorage.getItem(KEYS.tasks)) || []; } catch { return []; }
}
function saveTasks(tasks) {
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
}

// ===== 優先度計算 =====
function calcPriority(dateStr) {
  if (!dateStr) return 'green';
  const diff = (new Date(dateStr) - new Date().setHours(0,0,0,0)) / 86400000;
  if (diff < 0)  return 'red';
  if (diff <= 2) return 'red';
  if (diff <= 5) return 'orange';
  if (diff <= 14)return 'yellow';
  return 'green';
}
function priorityIcon(p) {
  return { red:'🔴', orange:'🟠', yellow:'🟡', green:'🟢' }[p] || '🟢';
}

// ===== ヘッダー日付 =====
function updateHeaderDate() {
  const d = new Date();
  const days = ['日','月','火','水','木','金','土'];
  document.getElementById('headerDate').textContent =
    `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} (${days[d.getDay()]})`;
}

// ===== カレンダー描画 =====
function renderCalendar() {
  const title = document.getElementById('calendarTitle');
  title.textContent = `${currentYear}年 ${currentMonth + 1}月`;

  const container = document.getElementById('calendarDays');
  container.innerHTML = '';

  const tasks = loadTasks();
  const today = new Date(); today.setHours(0,0,0,0);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrev  = new Date(currentYear, currentMonth, 0).getDate();

  // 前月の末尾
  for (let i = firstDay - 1; i >= 0; i--) {
    appendDay(container, daysInPrev - i, currentMonth - 1, currentYear, tasks, today, true);
  }
  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    appendDay(container, d, currentMonth, currentYear, tasks, today, false);
  }
  // 次月の頭（6行になるように埋める）
  const total = firstDay + daysInMonth;
  const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remain; d++) {
    appendDay(container, d, currentMonth + 1, currentYear, tasks, today, true);
  }
}

function appendDay(container, day, month, year, tasks, today, otherMonth) {
  const el = document.createElement('div');
  el.className = 'cal-day';

  // 実際の年月を計算（月はみ出し対応）
  const realDate = new Date(year, month, day);
  const realYear  = realDate.getFullYear();
  const realMonth = realDate.getMonth();
  const realDay   = realDate.getDate();

  if (otherMonth) el.classList.add('other-month');
  if (realDate.getTime() === today.getTime()) el.classList.add('today');
  if (realDate.getDay() === 0) el.classList.add('sunday');
  if (realDate.getDay() === 6) el.classList.add('saturday');

  const dateStr = `${realYear}-${String(realMonth+1).padStart(2,'0')}-${String(realDay).padStart(2,'0')}`;

  // 日番号
  const num = document.createElement('span');
  num.className = 'day-num';
  num.textContent = realDay;
  el.appendChild(num);

  // その日のタスクドット
  const dayTasks = tasks.filter(t => t.date === dateStr && t.status !== 'done');
  if (dayTasks.length > 0) {
    const dots = document.createElement('div');
    dots.className = 'day-tasks';
    dayTasks.slice(0, 4).forEach(t => {
      const dot = document.createElement('span');
      dot.className = 'day-task-dot';
      dot.style.background = `var(--p-${calcPriority(t.date)})`;
      dots.appendChild(dot);
    });
    el.appendChild(dots);
  }

  el.addEventListener('click', () => openModal(dateStr));
  container.appendChild(el);
}

// ===== タスク一覧描画 =====
function renderTasks() {
  const list = document.getElementById('taskList');
  let tasks = loadTasks();

  // フィルター適用
  const filtered = tasks.filter(t => {
    if (currentFilter === 'all')        return true;
    if (currentFilter === 'next')       return t.status === 'next';
    if (currentFilter === 'inprogress') return t.status === 'inprogress';
    if (currentFilter === 'done')       return t.status === 'done';
    return true;
  });

  list.innerHTML = '';
  if (filtered.length === 0) {
    list.innerHTML = '<li style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px 0;">タスクはありません</li>';
    return;
  }

  filtered.forEach((task, _) => {
    const idx = tasks.findIndex(t => t.id === task.id);
    const p = calcPriority(task.date);
    const li = document.createElement('li');
    li.className = `task-item priority-${p}${task.status === 'done' ? ' done' : ''}`;

    const catColors = { work:'var(--cat-work)', personal:'var(--cat-personal)', health:'var(--cat-health)', other:'var(--cat-other)' };
    const statusLabels = { next:'Next Up', inprogress:'進行中', done:'完了' };
    const nextStatus = { next:'inprogress', inprogress:'done', done:'next' };

    li.innerHTML = `
      <span class="task-priority-icon">${priorityIcon(p)}</span>
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-meta">
          ${task.date ? `<span class="task-date">${task.date}</span>` : ''}
          <span class="task-category" style="color:${catColors[task.category]||'var(--text-muted)'}">
            ${task.category}
          </span>
          <button class="task-status-btn" data-idx="${idx}">${statusLabels[task.status]}</button>
        </div>
      </div>
      <button class="task-delete" data-idx="${idx}">✕</button>
    `;

    // ステータス切り替え
    li.querySelector('.task-status-btn').addEventListener('click', () => {
      const all = loadTasks();
      all[idx].status = nextStatus[all[idx].status];
      saveTasks(all);
      renderTasks();
      renderCalendar();
    });

    // 削除
    li.querySelector('.task-delete').addEventListener('click', () => {
      const all = loadTasks();
      all.splice(idx, 1);
      saveTasks(all);
      renderTasks();
      renderCalendar();
    });

    list.appendChild(li);
  });
}

// ===== タスク追加 =====
function addTask() {
  const nameEl = document.getElementById('taskInput');
  const dateEl = document.getElementById('taskDate');
  const catEl  = document.getElementById('taskCategory');

  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  const tasks = loadTasks();
  tasks.push({
    id: Date.now(),
    name,
    date:     dateEl.value,
    category: catEl.value,
    status:   'next',
  });
  saveTasks(tasks);

  nameEl.value = '';
  dateEl.value = '';
  renderTasks();
  renderCalendar();
}

// ===== モーダル =====
function openModal(dateStr) {
  selectedDate = dateStr;
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalDateTitle').textContent = formatDateJP(dateStr);
  overlay.classList.add('active');
  renderTimetable(dateStr);
  renderDailyTodo(dateStr);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  selectedDate = null;
}

function formatDateJP(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const days = ['日','月','火','水','木','金','土'];
  const day  = new Date(dateStr).getDay();
  return `${y}年${parseInt(m)}月${parseInt(d)}日 (${days[day]})`;
}

// ===== 時間割 =====
function renderTimetable(dateStr) {
  const container = document.getElementById('timetable');
  container.innerHTML = '';
  const data = load(KEYS.timetable);
  const dayData = data[dateStr] || {};

  for (let h = 0; h < 24; h++) {
    const row = document.createElement('div');
    row.className = 'timetable-row';

    const timeLabel = document.createElement('span');
    timeLabel.className = 'timetable-time';
    timeLabel.textContent = `${String(h).padStart(2,'0')}:00`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'timetable-input';
    input.placeholder = '予定を入力...';
    input.value = dayData[h] || '';
    input.addEventListener('input', () => {
      const all = load(KEYS.timetable);
      if (!all[dateStr]) all[dateStr] = {};
      all[dateStr][h] = input.value;
      save(KEYS.timetable, all);
    });

    row.appendChild(timeLabel);
    row.appendChild(input);
    container.appendChild(row);
  }
}

// ===== 日別TODOリスト =====
function renderDailyTodo(dateStr) {
  const list = document.getElementById('dailyTodoList');
  list.innerHTML = '';
  const data = load(KEYS.dailyTodo);
  const items = data[dateStr] || [];

  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = `daily-todo-item${item.checked ? ' checked' : ''}`;

    const id = `dtodo-${idx}`;
    li.innerHTML = `
      <input type="checkbox" id="${id}" ${item.checked ? 'checked' : ''}>
      <label for="${id}">${escapeHtml(item.text)}</label>
      <button class="daily-todo-delete" data-idx="${idx}">✕</button>
    `;

    li.querySelector('input').addEventListener('change', e => {
      const all = load(KEYS.dailyTodo);
      all[dateStr][idx].checked = e.target.checked;
      save(KEYS.dailyTodo, all);
      renderDailyTodo(dateStr);
    });
    li.querySelector('.daily-todo-delete').addEventListener('click', () => {
      const all = load(KEYS.dailyTodo);
      all[dateStr].splice(idx, 1);
      save(KEYS.dailyTodo, all);
      renderDailyTodo(dateStr);
    });

    list.appendChild(li);
  });
}

function addDailyTodo() {
  const input = document.getElementById('dailyTodoInput');
  const text = input.value.trim();
  if (!text || !selectedDate) return;

  const all = load(KEYS.dailyTodo);
  if (!all[selectedDate]) all[selectedDate] = [];
  all[selectedDate].push({ text, checked: false });
  save(KEYS.dailyTodo, all);
  input.value = '';
  renderDailyTodo(selectedDate);
}

// ===== ドロワー =====
function openDrawer() {
  document.getElementById('taskDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('active');
}
function closeDrawer() {
  document.getElementById('taskDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('active');
}

// ===== XSS対策 =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ===== イベント登録 =====
document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

document.getElementById('addTask').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

document.getElementById('drawerToggle').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.getElementById('addDailyTodo').addEventListener('click', addDailyTodo);
document.getElementById('dailyTodoInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addDailyTodo();
});

// ===== 初期化 =====
updateHeaderDate();
renderCalendar();
renderTasks();

// PWA: Service Worker登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
