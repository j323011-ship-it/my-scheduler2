// ===== データ管理 =====
let tasks = JSON.parse(localStorage.getItem('tasks')) || []
let currentYear = new Date().getFullYear()
let currentMonth = new Date().getMonth()
let currentFilter = 'all'
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

// ===== タスクの保存 =====
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks))
}

// ===== タスクの描画 =====
function renderTasks() {
    const list = document.getElementById('task-list')
    list.innerHTML = ''
    const filtered = tasks.filter(task => {
        if (currentFilter === 'all') return true
        return task.status === currentFilter
    })
    if (filtered.length === 0) {
        list.innerHTML = '<li style="color:#6c7086; font-size:13px; text-align:center; padding:20px;">タスクがありません</li>'
        return
    }
    filtered.forEach((task) => {
        const realIndex = tasks.indexOf(task)
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
            </div>
        `
        list.appendChild(li)
    })
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const i = parseInt(this.dataset.index)
            tasks.splice(i, 1)
            saveTasks()
            renderTasks()
            renderCalendar()
        })
    })
    document.querySelectorAll('.task-status-select').forEach(sel => {
        sel.addEventListener('change', function () {
            const i = parseInt(this.dataset.index)
            tasks[i].status = this.value
            if (this.value === 'Done') {
                tasks[i].completedDate = new Date().toISOString().split('T')[0]
            }
            saveTasks()
            renderTasks()
            renderCalendar()
        })
    })
}

// ===== タスク追加 =====
document.getElementById('add-task').addEventListener('click', function () {
    const text = document.getElementById('task-input').value.trim()
    const date = document.getElementById('task-date').value
    const status = document.getElementById('task-status').value
    const category = document.getElementById('task-category').value
    if (text === '') return
    tasks.push({ text, date, status, category })
    saveTasks()
    renderTasks()
    renderCalendar()
    document.getElementById('task-input').value = ''
    document.getElementById('task-date').value = ''
})

document.getElementById('task-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('add-task').click()
})

// ===== フィルター =====
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
                const isToday =
                    today.getFullYear() === currentYear &&
                    today.getMonth() === currentMonth &&
                    today.getDate() === dayCount
                const dateStr = currentYear + '-' +
                    String(currentMonth + 1).padStart(2, '0') + '-' +
                    String(dayCount).padStart(2, '0')
                const dayTasks = tasks.filter(t => t.date === dateStr)
                let dotsHTML = '<div class="day-tasks">'
                dayTasks.slice(0, 3).forEach(t => {
                    dotsHTML += `<div class="day-task-dot">${t.text}</div>`
                })
                dotsHTML += '</div>'
                const dayClass = d === 0 ? 'sunday' : d === 6 ? 'saturday' : ''
                const todayClass = isToday ? 'today' : ''
                html += `<td class="${dayClass} ${todayClass}" data-date="${dateStr}">
                    <div class="day-number">${dayCount}</div>
                    ${dotsHTML}
                </td>`
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
document.getElementById('prev-month').addEventListener('click', function () {
    currentMonth--
    if (currentMonth < 0) { currentMonth = 11; currentYear-- }
    renderCalendar()
})
document.getElementById('next-month').addEventListener('click', function () {
    currentMonth++
    if (currentMonth > 11) { currentMonth = 0; currentYear++ }
    renderCalendar()
})

// ===== 24時間表モーダル =====
function openDayModal(dateStr) {
    selectedDate = dateStr
    const [y, m, d] = dateStr.split('-')
    document.getElementById('modal-date-title').textContent =
        y + '年' + parseInt(m) + '月' + parseInt(d) + '日'
    renderHourlyTable(dateStr)
    renderDayNotes(dateStr)
    document.getElementById('day-modal').classList.remove('hidden')
}

function closeModal() {
    document.getElementById('day-modal').classList.add('hidden')
    selectedDate = ''
}

// 24時間表の描画
function renderHourlyTable(dateStr) {
    const saved = JSON.parse(localStorage.getItem('hourly-' + dateStr)) || {}
    const container = document.getElementById('hourly-table')
    container.innerHTML = ''
    for (let h = 0; h < 24; h++) {
        const label = String(h).padStart(2, '0') + ':00'
        const row = document.createElement('div')
        row.className = 'hour-row'
        const span = document.createElement('span')
        span.className = 'hour-label'
        span.textContent = label
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

// ===== この日のメモ（メインタスクとは独立） =====
function getDayNotes(dateStr) {
    return JSON.parse(localStorage.getItem('dayNotes-' + dateStr)) || []
}

function saveDayNotes(dateStr, notes) {
    localStorage.setItem('dayNotes-' + dateStr, JSON.stringify(notes))
}

function renderDayNotes(dateStr) {
    const list = document.getElementById('day-task-list')
    list.innerHTML = ''
    const notes = getDayNotes(dateStr)
    if (notes.length === 0) {
        list.innerHTML = '<li style="color:#6c7086; font-size:12px; text-align:center; padding:16px;">メモなし</li>'
        return
    }
    notes.forEach((note, index) => {
        const li = document.createElement('li')
        li.className = 'day-task-item'
        li.innerHTML = `
            <span style="flex:1">${note}</span>
            <button class="day-delete-btn" data-index="${index}">🗑</button>
        `
        list.appendChild(li)
    })
    document.querySelectorAll('.day-delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const i = parseInt(this.dataset.index)
            const notes = getDayNotes(dateStr)
            notes.splice(i, 1)
            saveDayNotes(dateStr, notes)
            renderDayNotes(dateStr)
        })
    })
}

// この日にメモを追加
document.getElementById('day-add-task').addEventListener('click', function () {
    const text = document.getElementById('day-task-input').value.trim()
    if (!text || !selectedDate) return
    const notes = getDayNotes(selectedDate)
    notes.push(text)
    saveDayNotes(selectedDate, notes)
    renderDayNotes(selectedDate)
    document.getElementById('day-task-input').value = ''
})

document.getElementById('day-task-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('day-add-task').click()
})

// モーダルを閉じる
document.getElementById('modal-close').addEventListener('click', closeModal)
document.getElementById('day-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal()
})

// ===== 初期表示 =====
renderTasks()
renderCalendar()
