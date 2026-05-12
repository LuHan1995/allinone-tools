import { escapeHtml } from './utils.js';
const MODULES = {
  'calendar': { name: '万年历', category: 'general', icon: '📅', desc: '公历、农历与本地日程管理', file: 'modules/calendar.js' },
  'divider': { name: '分压计算器', category: 'circuit', icon: '⚡', desc: 'E24/E96穷举最优分压电阻', file: 'modules/divider.js' },
  'risetime': { name: '上升时间转换', category: 'circuit', icon: '📡', desc: 'Tr与带宽双向换算', file: 'modules/risetime.js' },
  'current': { name: '载流计算', category: 'pcb', icon: '📟', desc: 'IPC-2221走线与过孔载流', file: 'modules/current.js' },
  'impedance': { name: '阻抗计算', category: 'pcb', icon: '🔌', desc: '微带线/带状线特征阻抗', file: 'modules/impedance.js' },
  'pcb-spec': { name: 'PCB工艺规范', category: 'pcb', icon: '📋', desc: '生成PCB制作工艺单', file: 'modules/pcb-spec.js' },
  'webrtc-chat': { name: '局域网传文件', category: 'network', icon: '🌐', desc: 'WebRTC点对点传输', file: 'modules/webrtc-chat.js' },
  'serial': { name: '串口助手', category: 'network', icon: '🔌', desc: '串口调试工具', external: true },
  'ohms-law': { name: '欧姆定律', category: 'circuit', icon: '⚡', desc: 'V/I/R/P 四选二自动计算', file: 'modules/ohms-law.js' },
  'led-resistor': { name: 'LED 限流电阻', category: 'circuit', icon: '💡', desc: 'LED 限流电阻与功率计算', file: 'modules/led-resistor.js' },
  'resonance': { name: '谐振频率', category: 'circuit', icon: '📡', desc: 'LC/RC/RL 谐振与截止频率', file: 'modules/resonance.js' },
  'r-c-series': { name: '串并联 R/C', category: 'circuit', icon: '🔗', desc: '电阻电容串并联等效计算', file: 'modules/r-c-series.js' },
  'db-convert': { name: 'dB 换算器', category: 'signal', icon: '📶', desc: 'dBm/dBW/W/V 互转', file: 'modules/db-convert.js' },
  'adc-calc': { name: 'ADC/DAC 分辨率', category: 'embedded', icon: '🔢', desc: 'ADC 分辨率、LSB、SNR 计算', file: 'modules/adc-calc.js' },
  'opamp-gain': { name: '运放增益', category: 'circuit', icon: '🔺', desc: '反相/同相/差分放大器增益', file: 'modules/opamp-gain.js' },
  'power-eff': { name: '电源效率', category: 'circuit', icon: '🔋', desc: '线性/LDO 与 DC-DC 效率计算', file: 'modules/power-eff.js' },
  'filter': { name: '滤波器波特图', category: 'signal', icon: '📉', desc: 'RC/RL/LC 滤波器截止频率', file: 'modules/filter.js' },
  'pwm-timer': { name: 'PWM 定时器', category: 'embedded', icon: '⏱️', desc: 'MCU PWM 频率与分辨率计算', file: 'modules/pwm-timer.js' },
  // Phase 3
  'resistor-color': { name: '电阻色环识别', category: 'circuit', icon: '🎨', desc: '4/5/6环电阻读值与反查', file: 'modules/resistor-color.js' },
  'unit-convert': { name: '单位换算器', category: 'general', icon: '🔄', desc: '电学常用单位快速换算', file: 'modules/unit-convert.js' },
  'thermal': { name: '热阻/散热计算', category: 'circuit', icon: '🌡️', desc: '根据功耗和热阻估算结温', file: 'modules/thermal.js' },
  'battery': { name: '电池续航估算', category: 'circuit', icon: '🔋', desc: '估算电池续航时间', file: 'modules/battery.js' },
  'crc': { name: 'CRC 校验工具', category: 'embedded', icon: '✅', desc: '计算 CRC8/16/32', file: 'modules/crc.js' },
  'base-convert': { name: '进制/编码转换', category: 'general', icon: '🔡', desc: '多进制和编码互转', file: 'modules/base-convert.js' },
  'baud-error': { name: '波特率误差计算', category: 'embedded', icon: '📟', desc: '晶振频率与波特率误差', file: 'modules/baud-error.js' },
  'crystal-load': { name: '晶振负载电容', category: 'circuit', icon: '💎', desc: '晶振外部匹配电容计算', file: 'modules/crystal-load.js' },
  'diff-impedance': { name: '差分阻抗计算器', category: 'pcb', icon: '⚡', desc: '差分微带线/带状线阻抗', file: 'modules/diff-impedance.js' },
  'settings': { name: '设置', category: 'general', icon: '⚙️', desc: '主题、数据管理与关于', file: 'modules/settings.js' },
};

// Expose for settings module
window.MODULES = MODULES;

const CATEGORY_LABELS = {
  general: '📅 通用',
  circuit: '⚡ 电路',
  pcb: '📟 PCB',
  network: '🌐 网络',
  signal: '📶 信号',
  embedded: '🔢 嵌入式',
};

// Simple pinyin initial map for tool name matching
const PINYIN_MAP = {
  '万': 'w', '年': 'n', '历': 'l',
  '分': 'f', '压': 'y', '计': 'j', '算': 's', '器': 'q',
  '上': 's', '升': 's', '时': 's', '间': 'j', '转': 'z', '换': 'h',
  '载': 'z', '流': 'l',
  '阻': 'z', '抗': 'k',
  '工': 'g', '艺': 'y', '规': 'g', '范': 'f',
  '局': 'j', '域': 'y', '网': 'w', '传': 'c', '文': 'w', '件': 'j',
  '串': 'c', '口': 'k', '助': 'z', '手': 's',
  '欧': 'o', '姆': 'm', '定': 'd', '律': 'l',
  '限': 'x', '电': 'd', '阻': 'z',
  '谐': 'x', '振': 'z', '频': 'p', '率': 'l',
  '并': 'b', '联': 'l',
  '换': 'h',
  '分': 'f', '辨': 'b',
  '运': 'y', '放': 'f', '增': 'z', '益': 'y',
  '电': 'd', '源': 'y', '效': 'x',
  '滤': 'l', '波': 'b', '器': 'q', '图': 't',
  '定': 'd', '时': 's',
  '色': 's', '环': 'h', '识': 's',
  '单': 'd', '位': 'w',
  '热': 'r', '散': 's',
  '池': 'c', '续': 'x', '航': 'h', '估': 'g',
  '校': 'j', '验': 'y', '工': 'g', '具': 'j',
  '进': 'j', '编': 'b', '码': 'm',
  '波': 'b', '特': 't', '率': 'l', '误': 'w', '差': 'c',
  '晶': 'j', '振': 'z', '负': 'f', '载': 'z', '容': 'r',
  '差': 'c',
  '设': 's', '置': 'z',
};

function getPinyinInitials(str) {
  return str.split('').map(ch => PINYIN_MAP[ch] || ch.toLowerCase()).join('');
}

let currentModule = null;

function initTheme() {
  const saved = (() => { try { return localStorage.getItem('tools_theme'); } catch { return null; } })() || 'light';
  if (saved === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateThemeIcon(saved === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : saved);
}

function toggleTheme() {
  const saved = (() => { try { return localStorage.getItem('tools_theme'); } catch { return null; } })() || 'light';
  const order = ['light', 'dark', 'system'];
  const idx = order.indexOf(saved);
  const next = order[(idx + 1) % order.length];
  document.documentElement.setAttribute('data-theme', next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next);
  try { localStorage.setItem('tools_theme', next); } catch {}
  updateThemeIcon(next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next);
}

function updateThemeIcon(theme) {
  const icons = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('theme-toggle').textContent = icons;
  const mobile = document.getElementById('theme-toggle-mobile');
  if (mobile) mobile.textContent = icons;
}

function recordRecent(id) {
  const key = 'recent_tools';
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  list = list.filter(x => x !== id);
  list.unshift(id);
  if (list.length > 10) list = list.slice(0, 10);
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

function renderNav(filter = '') {
  const nav = document.getElementById('nav-list');
  nav.innerHTML = '';
  const f = filter.toLowerCase().trim();

  const matched = [];
  for (const [id, mod] of Object.entries(MODULES)) {
    if (f) {
      const nameMatch = mod.name.includes(filter);
      const descMatch = mod.desc && mod.desc.includes(filter);
      const pinyin = getPinyinInitials(mod.name);
      const pinyinMatch = pinyin.includes(f);
      if (!nameMatch && !descMatch && !pinyinMatch) continue;
    }
    matched.push({ id, ...mod });
  }

  if (f) {
    // Flat list with keyword highlight
    for (const item of matched) {
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.dataset.id = item.id;
      const nameHtml = highlightText(item.name, filter);
      const descHtml = item.desc ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${highlightText(item.desc, filter)}</div>` : '';
      el.innerHTML = `<span class="nav-icon">${item.icon}</span><div class="nav-text"><div>${nameHtml}</div>${descHtml}</div>`;
      el.addEventListener('click', () => {
        if (item.external) {
          navigateTo(item.id);
        } else {
          location.hash = item.id;
          if (window.innerWidth <= 768) closeSidebar();
        }
      });
      nav.appendChild(el);
    }
  } else {
    // Grouped by category
    const groups = {};
    for (const item of matched) {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    for (const [cat, items] of Object.entries(groups)) {
      const catLabel = document.createElement('div');
      catLabel.className = 'nav-category';
      catLabel.textContent = CATEGORY_LABELS[cat] || cat;
      nav.appendChild(catLabel);
      for (const item of items) {
        const el = document.createElement('div');
        el.className = 'nav-item';
        el.dataset.id = item.id;
        el.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-text">${item.name}</span>`;
        el.addEventListener('click', () => {
          if (item.external) {
            navigateTo(item.id);
          } else {
            location.hash = item.id;
            if (window.innerWidth <= 768) closeSidebar();
          }
        });
        nav.appendChild(el);
      }
    }
  }
}

function highlightText(text, filter) {
  if (!filter) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(filter.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + filter.length);
  const after = text.slice(idx + filter.length);
  return escapeHtml(before) + `<mark style="background:var(--warning);color:#1e293b;border-radius:2px;padding:0 2px;">${escapeHtml(match)}</mark>` + escapeHtml(after);
}


function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

function navigateTo(hash) {
  const id = hash.replace('#', '');
  const mod = MODULES[id];
  if (!mod) return;

  setActiveNav(id);
  document.title = `${mod.name} — All-in-One 工程师工具箱`;
  document.getElementById('page-title').textContent = mod.name;

  const container = document.getElementById('app-main');
  container.innerHTML = '';
  if (currentModule && typeof currentModule.destroy === 'function') {
    try { currentModule.destroy(); } catch (e) { console.error(e); }
  }
  currentModule = null;
  delete window._openHelpModal;

  if (mod.external) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:48px 24px;">
        <div style="font-size:48px;margin-bottom:16px;">🔌</div>
        <h2 style="margin-bottom:12px;">串口助手</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px;">串口助手为 Windows 可执行程序，请直接运行 ref/串口助手.exe。<br>未来计划支持 WebSerial API。</p>
        <button class="btn" onclick="alert('请直接运行 ref/串口助手.exe')">我知道了</button>
      </div>
    `;
    recordRecent(id);
    return;
  }

  import('./' + mod.file).then(m => {
    const moduleObj = m.default || m;
    if (moduleObj && typeof moduleObj.init === 'function') {
      if (currentModule && typeof currentModule.destroy === 'function') {
        try { currentModule.destroy(); } catch (e) { console.error(e); }
      }
      currentModule = moduleObj;
      const instance = moduleObj.init(container);
      if (instance && typeof instance.destroy === 'function') {
        currentModule = instance;
      }
      recordRecent(id);
    } else {
      container.innerHTML = `<div class="card">模块 ${mod.name} 加载失败：未找到 init 方法</div>`;
    }
  }).catch(err => {
    console.error(err);
    container.innerHTML = `<div class="card">加载模块失败：${escapeHtml(err.message)}</div>`;
  });
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

function onHashChange() {
  const hash = location.hash.slice(1) || 'calendar';
  navigateTo(hash);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const searchInput = document.getElementById('tool-search');
  const sidebar = document.getElementById('sidebar');

  if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
    e.preventDefault();
    searchInput.focus();
    return;
  }

  if (e.key === 'Escape') {
    if (document.activeElement === searchInput) {
      searchInput.blur();
    } else if (sidebar.classList.contains('open')) {
      closeSidebar();
    }
    return;
  }

  if (e.key === '?') {
    e.preventDefault();
    if (typeof window._openHelpModal === 'function') window._openHelpModal();
    return;
  }

  if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const tag = document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    const idx = parseInt(e.key, 10) - 1;
    let list = [];
    try { list = JSON.parse(localStorage.getItem('recent_tools') || '[]'); } catch {}
    if (list[idx]) {
      location.hash = list[idx];
    }
  }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderNav();

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  const mobileTheme = document.getElementById('theme-toggle-mobile');
  if (mobileTheme) mobileTheme.addEventListener('click', toggleTheme);

  document.getElementById('menu-toggle').addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  const searchInput = document.getElementById('tool-search');
  searchInput.addEventListener('input', (e) => renderNav(e.target.value.trim()));

  window.addEventListener('hashchange', onHashChange);
  onHashChange();

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const saved = (() => { try { return localStorage.getItem('tools_theme'); } catch { return 'light'; } })() || 'light';
    if (saved === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      updateThemeIcon(e.matches ? 'dark' : 'light');
    }
  });

  // Listen for theme change from settings module
  window.addEventListener('themechange', () => {
    const saved = (() => { try { return localStorage.getItem('tools_theme'); } catch { return 'light'; } })() || 'light';
    const actual = saved === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : saved;
    updateThemeIcon(actual);
  });
});
