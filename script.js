// ===== PWA Service Worker 登録 =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
}

// ===== データ管理 =====
let tasks = JSON.parse(localStorage.getItem('tasks')) || []
let currentYear = new Date().getFullYear()
let currentMonth = new Date().getMonth()
let currentFilter = 'all'
let drawerFilter = 'all'
let selectedDate = ''

// ===== 優先度の自動計算 =====
function calcPriority(dateStr, status) {
    if (status === 'Done') return '✅ 完了'
    if (!dateStr) return '🟢 余裕あり'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(dateStr)
    deadline.setHours(0, 0, 0, 0)
    const diff = Math.floor((deadline - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) return '🚨 期限切れ'
    if (diff === 0) return '🔴 超緊急(今日)'
    if (diff < 3) return '🟠 要注意(3日以内)'
    if (diff < 7) return '🟡 もうすぐ(今週中)'
    return '🟢 余裕あり'
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks))
}

// ===== タスクアイテムのHTML生成（共通） =====
function createTaskItem(task, realIndex) {
    const li = document.createElement('li')
    li.className = 'task-item' + (task.status === 'Done' ? ' done' : '')
    const priority = calcPriority(task.date, task.status)
    li.innerHTML = `
        <div class="task-top">
            <span class="task-name">${task.text}</span>
            <button class="delete-btn" data-index="${realIndex}">🗑</button>
        </div>
        <div class="task-meta">
            <span class="task-priority">${priority}</span>
            <span class="task-category">${task.category}</span>
            ${task.date ? `<span class="task-date-label">📅 ${task.date}</span>` : ''}
            <select class="task-status-select" data-index="${realIndex}">
                <option value="Next Up" ${task.status === 'Next Up' ? 'selected' : ''}>Next Up</option>
                <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
            </select>
        </div>`
    return li
}

// ===== タスクの描画（PCパネル） =====
function renderTasks() {
    const list = document.getElementById('task-list')
    if (!list) return
    list.innerHTML = ''
    const filtered = tasks.filter(t => currentFilter === 'all' || t.status === currentFilter)
    if (filtered.length === 0) {
        list.innerHTML = '<li style="color:#6c7086;font-size:13px;text-align:center;padding:20px;">タスクがありません</li>'
        return
    }
    filtered.forEach(task => {
        list.appendChild(createTaskItem(task, tasks.indexOf(task)))
    })
    bindTaskEvents(list)
}



// ===== タスク追加（PC） =====
document.getElementById('add-task').addEventListener('click', function () {
    const text = document.getElementById('task-input').value.trim()
    if (!text) return
    tasks.push({
        text,
        date: document.getElementById('task-date').value,
        status: document.getElementById('task-status').value,
        category: document.getElementById('task-category').value
    })
    saveTasks(); renderTasks(); renderDrawerTasks(); renderCalendar()
    document.getElementById('task-input').value = ''
    document.getElementById('task-date').value = ''
})

document.getElementById('task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('add-task').click()
})

// ===== フィルター（PC） =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        this.classList.add('active')
        currentFilter = this.dataset.filter
        renderTasks()
    })
})



// ===== カレンダーの描画 =====
function renderCalendar() {
    const weeks = ['日', '月', '火', '水', '木', '金', '土']
    const today = new Date()
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const firstDayCount = firstDay.getDay()
    const lastDayCount = lastDay.getDate()

    document.getElementById('calendar-title').textContent =
        currentYear + '年 ' + (currentMonth + 1) + '月'

    let html = '<table><thead><tr>'
    weeks.forEach(w => { html += `<th>${w}</th>` })
    html += '</tr></thead><tbody>'

    let dayCount = 1
    for (let w = 0; w < 6; w++) {
        html += '<tr>'
        for (let d = 0; d < 7; d++) {
            if ((w === 0 && d < firstDayCount) || dayCount > lastDayCount) {
                html += '<td></td>'
            } else {
                const isToday = today.getFullYear() === currentYear &&
                    today.getMonth() === currentMonth && today.getDate() === dayCount
                const dateStr = currentYear + '-' +
                    String(currentMonth + 1).padStart(2, '0') + '-' +
                    String(dayCount).padStart(2, '0')
                const dayTasks = tasks.filter(t => t.date === dateStr)
                let dots = '<div class="day-tasks">'
                dayTasks.slice(0, 2).forEach(t => {
                    dots += `<div class="day-task-dot">${t.text}</div>`
                })
                dots += '</div>'
                const dc = d === 0 ? 'sunday' : d === 6 ? 'saturday' : ''
                html += `<td class="${dc} ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <div class="day-number">${dayCount}</div>${dots}</td>`
                dayCount++
            }
        }
        html += '</tr>'
        if (dayCount > lastDayCount) break
    }
    html += '</tbody></table>'
    document.getElementById('calendar').innerHTML = html

    document.querySelectorAll('#calendar td[data-date]').forEach(td => {
        td.addEventListener('click', function () {
            openDayModal(this.dataset.date)
        })
    })
}

// ===== 月の切り替え =====
document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--
    if (currentMonth < 0) { currentMonth = 11; currentYear-- }
    renderCalendar()
})
document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++
    if (currentMonth > 11) { currentMonth = 0; currentYear++ }
    renderCalendar()
})

// ===== ドロワー開閉 =====
function openDrawer() {
    document.getElementById('task-drawer').classList.add('open')
    document.getElementById('drawer-overlay').classList.add('open')
    renderDrawerTasks()
}

function closeDrawer() {
    document.getElementById('task-drawer').classList.remove('open')
    document.getElementById('drawer-overlay').classList.remove('open')
}

document.getElementById('task-fab').addEventListener('click', openDrawer)
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer)

// ===== 24時間表モーダル =====
function openDayModal(dateStr) {
    selectedDate = dateStr
    const [y, m, d] = dateStr.split('-')
    document.getElementById('modal-date-title').textContent =
        y + '年' + parseInt(m) + '月' + parseInt(d) + '日'
    renderHourlyTable(dateStr)
    renderDayTasks(dateStr)
    document.getElementById('day-modal').classList.remove('hidden')
}

function closeModal() {
    document.getElementById('day-modal').classList.add('hidden')
    selectedDate = ''
}

function renderHourlyTable(dateStr) {
    const saved = JSON.parse(localStorage.getItem('hourly-' + dateStr)) || {}
    const container = document.getElementById('hourly-table')
    container.innerHTML = ''
    for (let h = 0; h < 24; h++) {
        const row = document.createElement('div')
        row.className = 'hour-row'
        const span = document.createElement('span')
        span.className = 'hour-label'
        span.textContent = String(h).padStart(2, '0') + ':00'
        const textarea = document.createElement('textarea')
        textarea.className = 'hour-input'
        textarea.rows = 1
        textarea.value = saved[h] || ''
        textarea.placeholder = '予定を入力...'
        textarea.dataset.hour = h
        textarea.addEventListener('input', function () {
            const data = JSON.parse(localStorage.getItem('hourly-' + dateStr)) || {}
            data[this.dataset.hour] = this.value
            localStorage.setItem('hourly-' + dateStr, JSON.stringify(data))
        })
        row.appendChild(span)
        row.appendChild(textarea)
        container.appendChild(row)
    }
}

// ===== この日専用タスク（メインタスクと独立） =====
function getDayTasks(dateStr) {
    return JSON.parse(localStorage.getItem('daytasks-' + dateStr)) || []
}

function saveDayTasks(dateStr, list) {
    localStorage.setItem('daytasks-' + dateStr, JSON.stringify(list))
}

function renderDayTasks(dateStr) {
    const list = document.getElementById('day-task-list')
    list.innerHTML = ''
    const dayTasks = getDayTasks(dateStr)
    if (dayTasks.length === 0) {
        list.innerHTML = '<li style="color:#6c7086;font-size:12px;text-align:center;padding:16px;">タスクなし</li>'
        return
    }
    dayTasks.forEach((task, i) => {
        const li = document.createElement('li')
        li.className = 'day-task-item' + (task.done ? ' done' : '')
        li.innerHTML = `
            <input type="checkbox" class="day-check" data-index="${i}" ${task.done ? 'checked' : ''}>
            <span style="flex:1;${task.done ? 'text-decoration:line-through;color:#6c7086' : ''}">${task.text}</span>
            <button class="day-delete-btn" data-index="${i}">🗑</button>`
        list.appendChild(li)
    })
    list.querySelectorAll('.day-check').forEach(cb => {
        cb.addEventListener('change', function () {
            const dt = getDayTasks(dateStr)
            dt[parseInt(this.dataset.index)].done = this.checked
            saveDayTasks(dateStr, dt)
            renderDayTasks(dateStr)
        })
    })
    list.querySelectorAll('.day-delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const dt = getDayTasks(dateStr)
            dt.splice(parseInt(this.dataset.index), 1)
            saveDayTasks(dateStr, dt)
            renderDayTasks(dateStr)
        })
    })
}

document.getElementById('day-add-task').addEventListener('click', function () {
    const text = document.getElementById('day-task-input').value.trim()
    if (!text || !selectedDate) return
    const dt = getDayTasks(selectedDate)
    dt.push({ text, done: false })
    saveDayTasks(selectedDate, dt)
    renderDayTasks(selectedDate)
    document.getElementById('day-task-input').value = ''
})

document.getElementById('day-task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('day-add-task').click()
})

document.getElementById('modal-close').addEventListener('click', closeModal)
document.getElementById('day-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal()
})

// ===== 初期表示 =====
renderTasks()
renderCalendar()
