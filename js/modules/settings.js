import { escapeHtml } from '../utils.js';

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⚙️</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">设置</h1>
          <p class="tool-desc">主题、数据管理与关于</p>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <h2 style="font-size:16px;margin-bottom:16px;">🎨 主题设置</h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="theme" value="system" id="set-theme-system" />
            <span>跟随系统</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="theme" value="light" id="set-theme-light" />
            <span>浅色</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="theme" value="dark" id="set-theme-dark" />
            <span>深色</span>
          </label>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <h2 style="font-size:16px;margin-bottom:16px;">💾 数据管理</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
          <button class="btn" id="set-export">导出全部数据</button>
          <button class="btn btn-secondary" id="set-import-btn">导入数据</button>
          <input type="file" id="set-import-file" accept=".json" style="display:none;" />
          <button class="btn btn-danger" id="set-clear">清除全部数据</button>
        </div>
        <div id="set-import-msg" style="margin-top:12px;font-weight:600;min-height:20px;"></div>
        <div id="set-import-options" style="display:none;margin-top:12px;padding:12px;background:var(--bg);border-radius:var(--radius);">
          <label style="display:block;margin-bottom:8px;font-weight:600;">导入模式</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px;">
            <input type="radio" name="import-mode" value="overwrite" checked />
            <span>覆盖现有数据</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="import-mode" value="merge" />
            <span>合并（保留现有，导入补充）</span>
          </label>
          <button class="btn btn-success" id="set-import-confirm" style="margin-top:12px;">确认导入</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <h2 style="font-size:16px;margin-bottom:16px;">🕘 最近使用</h2>
        <div id="set-recent"></div>
        <button class="btn btn-secondary" id="set-clear-recent" style="margin-top:12px;">清空记录</button>
      </div>

      <div class="card">
        <h2 style="font-size:16px;margin-bottom:16px;">ℹ️ 关于</h2>
        <div style="line-height:2;color:var(--text-secondary);">
          <div>版本：v1.0</div>
          <div>工具总数：<span id="set-tool-count">—</span></div>
          <div>All-in-One 工程师工具箱 — 开源、离线可用</div>
        </div>
      </div>

      <div id="set-modal" class="modal-overlay" style="display:none;">
        <div class="modal-panel">
          <h3 style="margin-bottom:12px;">快捷键帮助</h3>
          <div style="line-height:2;">
            <div><kbd>/</kbd> 或 <kbd>Ctrl+K</kbd>：聚焦搜索框</div>
            <div><kbd>Esc</kbd>：关闭搜索/侧边栏</div>
            <div><kbd>1~9</kbd>：切换到最近使用的第 N 个工具</div>
            <div><kbd>?</kbd>：显示快捷键帮助</div>
          </div>
          <button class="btn" id="set-modal-close" style="margin-top:16px;">关闭</button>
        </div>
      </div>
    `;

    const themeSystem = container.querySelector('#set-theme-system');
    const themeLight = container.querySelector('#set-theme-light');
    const themeDark = container.querySelector('#set-theme-dark');

    function loadTheme() {
      let saved = 'light';
      try { saved = localStorage.getItem('tools_theme') || 'light'; } catch {}
      if (saved === 'system') themeSystem.checked = true;
      else if (saved === 'dark') themeDark.checked = true;
      else themeLight.checked = true;
    }

    function saveTheme() {
      let v = 'light';
      if (themeSystem.checked) v = 'system';
      else if (themeDark.checked) v = 'dark';
      try { localStorage.setItem('tools_theme', v); } catch {}
      if (v === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', v);
      }
      window.dispatchEvent(new CustomEvent('themechange'));
    }

    [themeSystem, themeLight, themeDark].forEach(el => el.addEventListener('change', saveTheme));
    loadTheme();

    // Export
    container.querySelector('#set-export').addEventListener('click', () => {
      const data = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tools_')) {
            data[key] = localStorage.getItem(key);
          }
        }
      } catch {}
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tools_backup.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import
    const importFile = container.querySelector('#set-import-file');
    const importBtn = container.querySelector('#set-import-btn');
    const importOpts = container.querySelector('#set-import-options');
    const importConfirm = container.querySelector('#set-import-confirm');
    const importMsg = container.querySelector('#set-import-msg');
    let importData = null;

    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importData = JSON.parse(reader.result);
          importOpts.style.display = 'block';
        } catch {
          importMsg.textContent = '文件格式错误';
          importMsg.style.color = 'var(--danger)';
          importData = null;
        }
      };
      reader.readAsText(file);
    });

    importConfirm.addEventListener('click', () => {
      if (!importData) return;
      const mode = container.querySelector('input[name="import-mode"]:checked').value;
      try {
        if (mode === 'overwrite') {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tools_')) localStorage.removeItem(key);
          }
        }
        for (const [key, val] of Object.entries(importData)) {
          if (key.startsWith('tools_')) localStorage.setItem(key, val);
        }
      } catch {
        importMsg.textContent = '导入失败（存储受限）';
        importMsg.style.color = 'var(--danger)';
        return;
      }
      importOpts.style.display = 'none';
      importFile.value = '';
      importData = null;
      renderRecent();
      importMsg.textContent = '导入成功';
      importMsg.style.color = 'var(--success)';
    });

    // Clear
    container.querySelector('#set-clear').addEventListener('click', () => {
      if (confirm('确定要清除所有工具配置吗？此操作不可恢复。')) {
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tools_')) localStorage.removeItem(key);
          }
        } catch {}
        renderRecent();
      }
    });

    // Recent
    function renderRecent() {
      const el = container.querySelector('#set-recent');
      let list = [];
      try { list = JSON.parse(localStorage.getItem('recent_tools') || '[]'); } catch {}
      if (list.length === 0) { el.innerHTML = '<div style="color:var(--text-secondary);">暂无记录</div>'; return; }
      el.innerHTML = '<ul style="padding-left:20px;line-height:1.8;">' + list.map(id => `<li><a href="#${escapeHtml(id)}">${escapeHtml(id)}</a></li>`).join('') + '</ul>';
    }
    container.querySelector('#set-clear-recent').addEventListener('click', () => {
      try { localStorage.removeItem('recent_tools'); } catch {}
      renderRecent();
    });
    renderRecent();

    // Tool count
    const count = Object.keys(window.MODULES || {}).length;
    container.querySelector('#set-tool-count').textContent = String(count);

    // Modal
    const modal = container.querySelector('#set-modal');
    container.querySelector('#set-modal-close').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    // Expose modal open for app.js shortcut
    const openHelp = () => { modal.style.display = 'flex'; };
    window._openHelpModal = openHelp;
  }
};
