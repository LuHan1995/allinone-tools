import { escapeHtml, storage } from '../utils.js';

const STORAGE_KEY = 'tools_calendar_v1';
const LUNAR_API = 'https://api.mu-jie.cc/lunar';

const lunarCache = {};

async function fetchLunar(iso) {
  if (lunarCache[iso]) return lunarCache[iso];
  try {
    const res = await fetch(`${LUNAR_API}?date=${iso}`);
    const json = await res.json();
    if (json.code === 200 && json.data) {
      const d = json.data;
      let text = '';
      if (d.festival) text = d.festival;
      else if (d.lunarFestival) text = d.lunarFestival;
      else if (d.Term) text = d.Term;
      else {
        if (d.isLeap) text += '闰';
        text += d.IMonthCn + d.IDayCn;
      }
      lunarCache[iso] = text;
      return text;
    }
  } catch (e) {
    console.error('农历获取失败', iso, e);
  }
  return '';
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
      <div class="card" id="weather-card" style="display:none;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div id="weather-current" style="display:flex;align-items:center;gap:10px;flex:1;min-width:200px;">
            <span id="weather-icon" style="font-size:32px;">🌡️</span>
            <div>
              <div style="font-size:20px;font-weight:700;"><span id="weather-temp">--</span>°C <span id="weather-desc" style="font-size:14px;font-weight:400;color:var(--text-secondary);">--</span></div>
              <div style="font-size:12px;color:var(--text-secondary);"><span id="weather-city">--</span> · 风速 <span id="weather-wind">--</span> km/h</div>
            </div>
          </div>
          <div id="weather-forecast" style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;"></div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-secondary" id="weather-toggle-city" style="padding:6px 10px;font-size:12px;white-space:nowrap;" title="手动选择城市">📍 切换城市</button>
            <div id="weather-manual" style="display:none;gap:8px;align-items:center;">
              <input type="text" id="weather-city-input" placeholder="输入城市名" style="width:120px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg);" />
              <button class="btn" id="weather-search" style="padding:6px 12px;font-size:12px;">查询</button>
            </div>
            <button class="btn btn-secondary" id="weather-refresh" style="padding:6px 10px;font-size:12px;" title="刷新天气/重新定位">🔄</button>
          </div>
        </div>
        <div id="weather-error" style="display:none;margin-top:8px;font-size:12px;color:var(--danger);"></div>
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
    let renderId = 0;

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

    async function render() {
      const myRenderId = ++renderId;
      dateGrid.innerHTML = '';
      ymTitle.textContent = `${curYear} 年 ${curMonth + 1} 月`;
      todayLabel.textContent = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      fetchLunar(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`).then(text => {
        if (text) todayLabel.textContent += ` 农历${text}`;
      });

      const firstDay = new Date(curYear, curMonth, 1);
      const startWeek = firstDay.getDay();
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
      const prevDays = new Date(curYear, curMonth, 0).getDate();
      const events = loadEvents();

      // 上月填充
      for (let i = 0; i < startWeek; i++) {
        const cell = docCell();
        cell.classList.add('out');
        const dateNum = prevDays - startWeek + 1 + i;
        cell.querySelector('.date-num').textContent = dateNum;
        let gY = curMonth === 0 ? curYear - 1 : curYear;
        let gM = curMonth === 0 ? 12 : curMonth;
        if (gY >= 1900 && gY <= 2049) {
          const iso = `${gY}-${pad(gM)}-${pad(dateNum)}`;
          fetchLunar(iso).then(text => {
            if (renderId !== myRenderId) return;
            cell.querySelector('.lunar').textContent = text;
          });
        }
        dateGrid.appendChild(cell);
      }

      // 当月
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = docCell();
        cell.querySelector('.date-num').textContent = d;
        const iso = `${curYear}-${pad(curMonth + 1)}-${pad(d)}`;
        fetchLunar(iso).then(text => {
          if (renderId !== myRenderId) return;
          cell.querySelector('.lunar').textContent = text;
        });
        const dayEvents = events[iso] || [];
        const dotEl = cell.querySelector('.dot');
        if (dayEvents.length) dotEl.classList.add('has'); else dotEl.classList.remove('has');
        const listEl = cell.querySelector('.events-list');
        listEl.innerHTML = dayEvents.slice(0, 2).map(e => `<div>${e.time ? escapeHtml(e.time) + ' ' : ''}${escapeHtml(e.title || '')}</div>`).join('');
        if (curYear === today.getFullYear() && curMonth === today.getMonth() && d === today.getDate()) cell.classList.add('today');
        cell.addEventListener('click', () => openModal(iso));
        dateGrid.appendChild(cell);
      }

      // 下月填充
      const totalCells = startWeek + daysInMonth;
      const nextFill = (7 - (totalCells % 7)) % 7;
      for (let i = 1; i <= nextFill; i++) {
        const cell = docCell();
        cell.classList.add('out');
        cell.querySelector('.date-num').textContent = i;
        let gY = curMonth === 11 ? curYear + 1 : curYear;
        let gM = curMonth === 11 ? 1 : curMonth + 2;
        if (gY >= 1900 && gY <= 2049) {
          const iso = `${gY}-${pad(gM)}-${pad(i)}`;
          fetchLunar(iso).then(text => {
            if (renderId !== myRenderId) return;
            cell.querySelector('.lunar').textContent = text;
          });
        }
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

    // ==================== 天气功能 ====================
    const WMO_MAP = {
      0: { icon: '☀️', desc: '晴' },
      1: { icon: '🌤️', desc: '多云' }, 2: { icon: '⛅', desc: '阴' }, 3: { icon: '☁️', desc: '阴天' },
      45: { icon: '🌫️', desc: '雾' }, 48: { icon: '🌫️', desc: '雾凇' },
      51: { icon: '🌧️', desc: '毛毛雨' }, 53: { icon: '🌧️', desc: '小雨' }, 55: { icon: '🌧️', desc: '中雨' },
      56: { icon: '🌧️', desc: '冻雨' }, 57: { icon: '🌧️', desc: '冻雨' },
      61: { icon: '🌧️', desc: '小雨' }, 63: { icon: '🌧️', desc: '中雨' }, 65: { icon: '🌧️', desc: '大雨' },
      66: { icon: '🌧️', desc: '冻雨' }, 67: { icon: '🌧️', desc: '冻雨' },
      71: { icon: '❄️', desc: '小雪' }, 73: { icon: '❄️', desc: '中雪' }, 75: { icon: '❄️', desc: '大雪' },
      77: { icon: '❄️', desc: '雪粒' },
      80: { icon: '🌦️', desc: '阵雨' }, 81: { icon: '🌦️', desc: '阵雨' }, 82: { icon: '🌦️', desc: '强阵雨' },
      85: { icon: '❄️', desc: '阵雪' }, 86: { icon: '❄️', desc: '阵雪' },
      95: { icon: '⛈️', desc: '雷阵雨' }, 96: { icon: '⛈️', desc: '雷暴伴冰雹' }, 99: { icon: '⛈️', desc: '强雷暴' },
    };

    const weatherCard = container.querySelector('#weather-card');
    const weatherError = container.querySelector('#weather-error');
    const weatherManual = container.querySelector('#weather-manual');

    function getWeatherCache() {
      try {
        const raw = localStorage.getItem('tools_weather_v1');
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.updatedAt > 30 * 60 * 1000) return null; // 30min
        return data;
      } catch { return null; }
    }
    function setWeatherCache(data) {
      try { localStorage.setItem('tools_weather_v1', JSON.stringify({ ...data, updatedAt: Date.now() })); } catch {}
    }

    function fetchWithTimeout(url, ms) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    }

    async function fetchWeather(lat, lon, cityName) {
      weatherError.style.display = 'none';
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetchWithTimeout(url, 8000);
        if (!res.ok) throw new Error('天气服务异常');
        const json = await res.json();
        const payload = { lat, lon, city: cityName || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, current: json.current_weather, daily: json.daily };
        setWeatherCache(payload);
        renderWeather(payload);
      } catch (err) {
        weatherError.textContent = '天气获取失败：' + (err.message || '网络超时');
        weatherError.style.display = 'block';
        weatherManual.style.display = 'flex';
      }
    }

    function renderWeather(data) {
      if (!data || !data.current) return;
      weatherCard.style.display = 'block';
      weatherManual.style.display = 'none';
      const code = data.current.weathercode ?? 0;
      const info = WMO_MAP[code] || { icon: '🌡️', desc: '未知' };
      container.querySelector('#weather-icon').textContent = info.icon;
      container.querySelector('#weather-temp').textContent = data.current.temperature;
      container.querySelector('#weather-desc').textContent = info.desc;
      container.querySelector('#weather-city').textContent = data.city || '本地';
      container.querySelector('#weather-wind').textContent = data.current.windspeed ?? '--';

      const forecastEl = container.querySelector('#weather-forecast');
      const daily = data.daily;
      if (daily && daily.time && daily.time.length > 1) {
        let html = '';
        for (let i = 1; i <= Math.min(3, daily.time.length - 1); i++) {
          const c = daily.weathercode[i] ?? 0;
          const inf = WMO_MAP[c] || { icon: '🌡️', desc: '' };
          html += `<div style="text-align:center;min-width:56px;"><div style="font-size:16px;">${inf.icon}</div><div style="font-size:11px;color:var(--text-secondary);">${Math.round(daily.temperature_2m_min[i])}°/${Math.round(daily.temperature_2m_max[i])}°</div></div>`;
        }
        forecastEl.innerHTML = html;
      }
    }

    async function getLocation() {
      const cache = getWeatherCache();
      if (cache) { renderWeather(cache); return; }

      if (!navigator.geolocation) {
        weatherError.textContent = '浏览器不支持定位，请手动输入城市';
        weatherError.style.display = 'block';
        weatherManual.style.display = 'flex';
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => { fetchWeather(pos.coords.latitude, pos.coords.longitude); },
        (err) => {
          weatherError.textContent = '定位失败：' + (err.message || '权限拒绝') + '，请手动输入城市';
          weatherError.style.display = 'block';
          weatherManual.style.display = 'flex';
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    }

    async function searchCity(city) {
      if (!city.trim()) return;
      weatherError.style.display = 'none';
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`;
        const res = await fetchWithTimeout(url, 8000);
        const json = await res.json();
        if (!json.results || !json.results.length) {
          weatherError.textContent = '未找到城市：' + city;
          weatherError.style.display = 'block';
          return;
        }
        const r = json.results[0];
        fetchWeather(r.latitude, r.longitude, r.name);
      } catch (err) {
        weatherError.textContent = '城市搜索失败：' + (err.message || '网络超时');
        weatherError.style.display = 'block';
      }
    }

    container.querySelector('#weather-toggle-city').addEventListener('click', () => {
      const manual = container.querySelector('#weather-manual');
      manual.style.display = manual.style.display === 'none' ? 'flex' : 'none';
      if (manual.style.display === 'flex') container.querySelector('#weather-city-input').focus();
    });
    container.querySelector('#weather-refresh').addEventListener('click', () => {
      localStorage.removeItem('tools_weather_v1');
      getLocation();
    });
    container.querySelector('#weather-search').addEventListener('click', () => {
      const city = container.querySelector('#weather-city-input').value;
      searchCity(city);
    });
    container.querySelector('#weather-city-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchCity(e.currentTarget.value);
    });

    getLocation();

    render();
  }
};
