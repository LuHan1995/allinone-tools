import { escapeHtml, storage } from '../utils.js';

const STORAGE_KEY = 'tools_calendar_v1';

const lunarInfo = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];

function lYearDays(y) {
  let i, sum = 348;
  for (i = 0; i < 12; i++) if ((lunarInfo[y - 1900] >> i) & 0x1) sum += 1;
  return sum + leapDays(y);
}
function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
function leapDays(y) { if (leapMonth(y)) return ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29); return 0; }
function monthDays(y, m) { return ((lunarInfo[y - 1900] >> (12 - m)) & 0x1) ? 30 : 29; }

function solarToLunar(y, m, d) {
  const baseDate = new Date(1900, 0, 31);
  const objDate = new Date(y, m - 1, d);
  let offset = Math.floor((objDate - baseDate) / 86400000);
  let i = 1900, temp = 0;
  for (i = 1900; i < 2051 && offset > 0; i++) {
    temp = lYearDays(i);
    if (offset - temp < 0) break;
    offset -= temp;
  }
  let year = i;
  let leap = leapMonth(year);
  let isLeap = false;
  let month = 1;
  for (i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i == (leap + 1) && !isLeap) {
      --i; isLeap = true; temp = leapDays(year);
    } else {
      temp = monthDays(year, i);
    }
    if (isLeap && i == (leap + 1)) isLeap = false;
    if (offset - temp < 0) break;
    offset -= temp;
  }
  month = i; let day = offset + 1;
  return { lYear: year, lMonth: month, lDay: day, leap: isLeap };
}

const lunarMonthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '腊'];
function lunarDayName(d) {
  const chineseTens = ['初', '十', '廿', '卅'];
  const nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (d === 10) return '初十';
  let ten = Math.floor((d - 1) / 10);
  let one = d % 10;
  return chineseTens[ten] + (one === 0 ? '十' : nums[one - 1]);
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function loadEvents() {
  const raw = storage.get('calendar_v1');
  return raw && typeof raw === 'object' ? raw : {};
}
function saveEvents(obj) {
  storage.set('calendar_v1', obj);
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📅</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">万年历</h1>
          <p class="tool-desc">公历、农历与本地日程管理，支持导出/导入 JSON</p>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btn btn-secondary" id="cal-prev-y" style="padding:6px 10px;">« 年</button>
            <button class="btn btn-secondary" id="cal-prev-m" style="padding:6px 10px;">‹ 月</button>
            <div style="font-weight:700;min-width:120px;text-align:center;"><span id="cal-ym"></span></div>
            <button class="btn btn-secondary" id="cal-next-m" style="padding:6px 10px;">月 ›</button>
            <button class="btn btn-secondary" id="cal-next-y" style="padding:6px 10px;">年 »</button>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="number" id="cal-jy" placeholder="年" style="width:80px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg);" />
            <input type="number" id="cal-jm" placeholder="月" min="1" max="12" style="width:60px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg);" />
            <button class="btn" id="cal-jump" style="padding:6px 12px;">跳转</button>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">
          今天：<span id="cal-today-label"></span>，点击某一天以增删/查看本地日程
        </div>
        <div class="calendar-grid" id="cal-weekdays"></div>
        <div class="calendar-grid" id="cal-grid" style="margin-top:6px;"></div>
      </div>

      <div id="cal-modal" style="display:none;" class="modal-overlay">
        <div class="modal-panel">
          <h3 style="margin-bottom:12px;">日程 — <span id="cal-modal-date"></span></h3>
          <div style="display:flex;gap:12px;margin-bottom:10px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);">时间</label>
              <input type="time" id="cal-evt-time" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);" />
            </div>
            <div style="flex:2;">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);">标题</label>
              <input type="text" id="cal-evt-title" placeholder="例：会议 / 生日" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);" />
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);">说明</label>
            <textarea id="cal-evt-note" rows="3" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);resize:vertical;"></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px;">
            <button class="btn btn-success" id="cal-export" style="padding:6px 12px;">导出</button>
            <button class="btn btn-warning" id="cal-import" style="padding:6px 12px;">导入</button>
            <button class="btn" id="cal-add-evt" style="padding:6px 12px;">新增</button>
            <button class="btn btn-danger" id="cal-close" style="padding:6px 12px;">关闭</button>
          </div>
          <div id="cal-events-list"></div>
        </div>
      </div>
    `;

    const today = new Date();
    let curYear = today.getFullYear();
    let curMonth = today.getMonth();
    let curIso = null;

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const wkRow = container.querySelector('#cal-weekdays');
    weekdays.forEach(w => {
      const d = document.createElement('div');
      d.className = 'calendar-weekday';
      d.textContent = w;
      wkRow.appendChild(d);
    });

    const ymTitle = container.querySelector('#cal-ym');
    const todayLabel = container.querySelector('#cal-today-label');
    const dateGrid = container.querySelector('#cal-grid');
    const modal = container.querySelector('#cal-modal');
    const modalDate = container.querySelector('#cal-modal-date');
    const eventsContainer = container.querySelector('#cal-events-list');
    const evtTime = container.querySelector('#cal-evt-time');
    const evtTitle = container.querySelector('#cal-evt-title');
    const evtNote = container.querySelector('#cal-evt-note');
    const jumpYear = container.querySelector('#cal-jy');
    const jumpMonth = container.querySelector('#cal-jm');

    function docCell() {
      const div = document.createElement('div');
      div.className = 'calendar-cell';
      div.innerHTML = `<div class="date-num"></div><div class="lunar"></div><div class="events-list"></div><div class="dots"><div class="dot"></div></div>`;
      return div;
    }

    function render() {
      dateGrid.innerHTML = '';
      ymTitle.textContent = `${curYear} 年 ${curMonth + 1} 月`;
      todayLabel.textContent = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      const firstDay = new Date(curYear, curMonth, 1);
      const startWeek = firstDay.getDay();
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
      const prevDays = new Date(curYear, curMonth, 0).getDate();
      const events = loadEvents();

      for (let i = 0; i < startWeek; i++) {
        const cell = docCell();
        cell.classList.add('out');
        const dateNum = prevDays - startWeek + 1 + i;
        cell.querySelector('.date-num').textContent = dateNum;
        let gY = curMonth === 0 ? curYear - 1 : curYear;
        let gM = curMonth === 0 ? 12 : curMonth;
        if (gY < 1900) { gY = 1900; gM = 1; }
        const lunar = solarToLunar(gY, gM, dateNum);
        cell.querySelector('.lunar').textContent = `${lunar.leap ? '闰' : ''}${lunarMonthNames[lunar.lMonth - 1]}月 ${lunarDayName(lunar.lDay)}`;
        dateGrid.appendChild(cell);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cell = docCell();
        cell.querySelector('.date-num').textContent = d;
        const lunar = solarToLunar(curYear, curMonth + 1, d);
        cell.querySelector('.lunar').textContent = `${lunar.leap ? '闰' : ''}${lunarMonthNames[lunar.lMonth - 1]}月 ${lunarDayName(lunar.lDay)}`;
        const iso = `${curYear}-${pad(curMonth + 1)}-${pad(d)}`;
        const dayEvents = events[iso] || [];
        const dotEl = cell.querySelector('.dot');
        if (dayEvents.length) dotEl.classList.add('has'); else dotEl.classList.remove('has');
        const listEl = cell.querySelector('.events-list');
        listEl.innerHTML = dayEvents.slice(0, 2).map(e => `<div>${e.time ? escapeHtml(e.time) + ' ' : ''}${escapeHtml(e.title || '')}</div>`).join('');
        if (curYear === today.getFullYear() && curMonth === today.getMonth() && d === today.getDate()) cell.classList.add('today');
        cell.addEventListener('click', () => openModal(iso));
        dateGrid.appendChild(cell);
      }

      const totalCells = startWeek + daysInMonth;
      const nextFill = (7 - (totalCells % 7)) % 7;
      for (let i = 1; i <= nextFill; i++) {
        const cell = docCell();
        cell.classList.add('out');
        cell.querySelector('.date-num').textContent = i;
        let gY = curMonth === 11 ? curYear + 1 : curYear;
        let gM = curMonth === 11 ? 1 : curMonth + 2;
        if (gY > 2049) { gY = 2049; gM = 12; }
        const lunar = solarToLunar(gY, gM, i);
        cell.querySelector('.lunar').textContent = `${lunar.leap ? '闰' : ''}${lunarMonthNames[lunar.lMonth - 1]}月 ${lunarDayName(lunar.lDay)}`;
        dateGrid.appendChild(cell);
      }
    }

    function openModal(iso) {
      curIso = iso;
      modal.style.display = 'flex';
      modalDate.textContent = iso;
      evtTime.value = ''; evtTitle.value = ''; evtNote.value = '';
      renderEventsList();
    }
    function closeModal() { modal.style.display = 'none'; curIso = null; }

    function renderEventsList() {
      const events = loadEvents();
      const list = events[curIso] || [];
      eventsContainer.innerHTML = list.length
        ? list.map((e, idx) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border);">
          <div>
            <div style="font-weight:700;">${escapeHtml(e.title || '无标题')}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(e.time || '')} ${escapeHtml(e.note || '')}</div>
          </div>
          <div><button class="btn btn-danger" data-i="${idx}" style="padding:4px 10px;font-size:12px;">删除</button></div>
        </div>`).join('')
        : '<div style="font-size:13px;color:var(--text-secondary);">还没有事件</div>';
      eventsContainer.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', e => {
        const idx = +e.currentTarget.dataset.i; removeEvent(idx);
      }));
    }

    function addEvent() {
      if (!curIso) return;
      const title = evtTitle.value.trim();
      if (!title) { alert('请填写标题'); return; }
      const time = evtTime.value;
      const note = evtNote.value.trim();
      const events = loadEvents();
      events[curIso] = events[curIso] || [];
      events[curIso].push({ time, title, note, created: Date.now() });
      events[curIso].sort((a, b) => (a.time || '99:99') > (b.time || '99:99') ? 1 : -1);
      saveEvents(events);
      renderEventsList();
      render();
      evtTitle.value = ''; evtNote.value = ''; evtTime.value = '';
    }
    function removeEvent(idx) {
      const events = loadEvents();
      if (!events[curIso]) return;
      events[curIso].splice(idx, 1);
      if (events[curIso].length === 0) delete events[curIso];
      saveEvents(events);
      renderEventsList();
      render();
    }

    container.querySelector('#cal-export').addEventListener('click', () => {
      const data = JSON.stringify(loadEvents());
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendar_events_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    container.querySelector('#cal-import').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const obj = JSON.parse(r.result);
            saveEvents(obj);
            alert('导入成功');
            render();
            closeModal();
          } catch (err) {
            alert('导入失败：文件格式不对');
          }
        };
        r.readAsText(f);
      };
      input.click();
    });

    container.querySelector('#cal-add-evt').addEventListener('click', addEvent);
    container.querySelector('#cal-close').addEventListener('click', closeModal);

    container.querySelector('#cal-prev-m').addEventListener('click', () => { curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } render(); });
    container.querySelector('#cal-next-m').addEventListener('click', () => { curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } render(); });
    container.querySelector('#cal-prev-y').addEventListener('click', () => { curYear--; render(); });
    container.querySelector('#cal-next-y').addEventListener('click', () => { curYear++; render(); });
    container.querySelector('#cal-jump').addEventListener('click', () => {
      const y = parseInt(jumpYear.value, 10);
      const m = parseInt(jumpMonth.value, 10);
      if (!isNaN(y)) {
        if (y < 1900 || y > 2049) { alert('年份超出支持范围(1900-2049)'); return; }
        curYear = y;
      }
      if (!isNaN(m) && m >= 1 && m <= 12) curMonth = m - 1;
      render();
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    render();
  }
};
