import { escapeHtml } from './utils.js';
import { MODULES, CATEGORY_LABELS } from './tools-data.js';
import { isAuthed, login } from './auth.js';

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
  '天': 't', '气': 'q', '预': 'y', '报': 'b',
  '变': 'b', '压': 'y', '器': 'q', '反': 'f', '激': 'j', '正': 'z', '推': 't', '挽': 'w',
  '信': 'x', '号': 'h', '链': 'l', '精': 'j', '度': 'd', '噪': 'z', '声': 's',
  '采': 'c', '集': 'j', '输': 's', '出': 'c',
  '端': 'd', '接': 'j', '匹': 'p', '配': 'p', '反': 'f', '射': 's', '终': 'z',
  '等': 'd', '长': 'c', '布': 'b', '局': 'j', '绕': 'r', '线': 'x', '补': 'b', '偿': 'c',
  '知': 'z', '识': 's', '库': 'k', '硬': 'y',
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

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('tools_favorites') || '[]'); } catch { return []; }
}

function toggleFavorite(id) {
  let list = getFavorites();
  if (list.includes(id)) {
    list = list.filter(x => x !== id);
  } else {
    list.push(id);
  }
  try { localStorage.setItem('tools_favorites', JSON.stringify(list)); } catch {}
  renderNav();
}

function createNavItem(item, favorites) {
  const el = document.createElement('div');
  el.className = 'nav-item';
  el.dataset.id = item.id;
  const isFav = favorites.includes(item.id);
  el.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-text">${item.name}</span><span class="nav-fav" title="${isFav ? '取消收藏' : '收藏'}">${isFav ? '★' : '☆'}</span>`;
  el.addEventListener('click', (e) => {
    if (e.target.closest('.nav-fav')) {
      e.stopPropagation();
      toggleFavorite(item.id);
      return;
    }
    if (item.external) {
      navigateTo(item.id);
    } else {
      location.hash = item.id;
      if (window.innerWidth <= 768) closeSidebar();
    }
  });
  return el;
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
    if (matched.length === 0) {
      const emptyWrap = document.createElement('div');
      emptyWrap.style.cssText = 'text-align:center;padding:24px 16px;';

      const emptyText = document.createElement('div');
      emptyText.style.color = 'var(--text-secondary)';
      emptyText.textContent = '未找到相关工具';
      emptyWrap.appendChild(emptyText);

      const searchInput = document.getElementById('tool-search');
      if (searchInput && searchInput.value.trim()) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn';
        clearBtn.style.marginTop = '12px';
        clearBtn.textContent = '清除搜索';
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          renderNav('');
        });
        emptyWrap.appendChild(clearBtn);
      }

      nav.appendChild(emptyWrap);
    } else {
      const favorites = getFavorites();
      for (const item of matched) {
        const el = createNavItem(item, favorites);
        const nameHtml = highlightText(item.name, filter);
        const descHtml = item.desc ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${highlightText(item.desc, filter)}</div>` : '';
        el.querySelector('.nav-text').innerHTML = `<div>${nameHtml}</div>${descHtml}`;
        nav.appendChild(el);
      }
    }
  } else {
    const favorites = getFavorites();
    const favItems = matched.filter(item => favorites.includes(item.id));
    if (favItems.length) {
      const favLabel = document.createElement('div');
      favLabel.className = 'nav-category';
      favLabel.textContent = '⭐ 收藏';
      nav.appendChild(favLabel);
      for (const item of favItems) {
        nav.appendChild(createNavItem(item, favorites));
      }
    }
    // Grouped by category
    const groups = {};
    for (const item of matched) {
      if (favorites.includes(item.id)) continue;
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
        nav.appendChild(createNavItem(item, favorites));
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
  document.title = `${mod.name} — 鲁工不要慌工具箱`;
  document.getElementById('page-title').textContent = mod.name;

  const container = document.getElementById('app-main');
  container.innerHTML = `
    <div class="skeleton-wrapper">
      <div class="skeleton-header"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
    </div>
  `;
  if (currentModule && typeof currentModule.destroy === 'function') {
    try { currentModule.destroy(); } catch (e) { console.error(e); }
  }
  currentModule = null;
  delete window._openHelpModal;

  if (mod.external) {
    const isElectron = typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron;
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:48px 24px;">
        <div style="font-size:48px;margin-bottom:16px;">🔌</div>
        <h2 style="margin-bottom:12px;">串口助手</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px;">串口助手为 Windows 可执行程序。${isElectron ? '<br>点击下方按钮直接启动。' : '<br>请直接运行 ref/串口助手.exe。<br>未来计划支持 WebSerial API。'}</p>
        <button class="btn" id="serial-launch-btn">${isElectron ? '启动串口助手' : '我知道了'}</button>
      </div>
    `;
    const btn = document.getElementById('serial-launch-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (isElectron) {
          const result = await window.electronAPI.openSerial();
          if (!result.success) {
            alert(result.error || '启动失败');
          }
        } else {
          alert('请直接运行 ref/串口助手.exe');
        }
      });
    }
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
  const hash = location.hash.slice(1) || 'home';
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
function bootApp() {
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

  // Listen for SW update ready
  if ('serviceWorker' in navigator && !(window.electronAPI && window.electronAPI.isElectron)) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'UPDATE_READY') {
        const toast = document.getElementById('update-toast');
        if (toast) toast.classList.add('show');
      }
    });
  }
}

// Auth gate: 未登录先显示口令门，验证通过后再启动应用
document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('auth-gate');
  const input = document.getElementById('auth-input');
  const errorEl = document.getElementById('auth-error');

  if (isAuthed()) {
    if (gate) gate.style.display = 'none';
    document.body.classList.remove('auth-locked');
    bootApp();
    return;
  }

  // 未登录：显示登录门（inline 脚本可能已显示，这里兜底并锁定主界面）
  if (gate) gate.style.display = 'flex';
  document.body.classList.add('auth-locked');
  if (input) input.focus();

  function tryLogin() {
    if (login(input.value)) {
      gate.style.display = 'none';
      document.body.classList.remove('auth-locked');
      bootApp();
    } else {
      errorEl.textContent = '口令错误，请重试';
      input.value = '';
      input.focus();
    }
  }

  document.getElementById('auth-submit').addEventListener('click', tryLogin);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryLogin();
  });
});
