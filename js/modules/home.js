import { escapeHtml } from '../utils.js';

const CATEGORY_ORDER = ['general', 'power', 'analog', 'clock', 'signal', 'embedded', 'pcb', 'network'];

export default {
  init(container) {
    const modules = Object.entries(window.MODULES || {})
      .filter(([id]) => id !== 'home' && id !== 'settings')
      .map(([id, m]) => ({ id, ...m }));

    const total = modules.length;
    const catCounts = {};
    modules.forEach(m => { catCounts[m.category] = (catCounts[m.category] || 0) + 1; });

    container.innerHTML = `
      <div style="text-align:center;padding:32px 20px 24px;">
        <div style="font-size:56px;margin-bottom:12px;">🛠️</div>
        <h1 style="font-size:26px;margin:0 0 8px;">鲁工不要慌工具箱</h1>
        <p style="color:var(--text-secondary);margin:0;font-size:15px;">
          硬件工程师的随身工具集合 · ${total} 个工具 · 离线可用
        </p>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;text-align:center;">
          <div style="padding:12px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-size:24px;font-weight:800;color:var(--primary);">${total}</div>
            <div style="font-size:12px;color:var(--text-secondary);">工具总数</div>
          </div>
          <div style="padding:12px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-size:24px;font-weight:800;color:var(--primary);">6</div>
            <div style="font-size:12px;color:var(--text-secondary);">分类</div>
          </div>
          <div style="padding:12px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-size:24px;font-weight:800;color:var(--primary);">⚡</div>
            <div style="font-size:12px;color:var(--text-secondary);">即时计算</div>
          </div>
          <div style="padding:12px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-size:24px;font-weight:800;color:var(--primary);">🌙</div>
            <div style="font-size:12px;color:var(--text-secondary);">暗色主题</div>
          </div>
        </div>
      </div>

      ${CATEGORY_ORDER.map(cat => {
        const items = modules.filter(m => m.category === cat);
        if (!items.length) return '';
        const label = (window.CATEGORY_LABELS && window.CATEGORY_LABELS[cat]) || cat;
        return `
          <div style="margin-bottom:24px;">
            <div style="font-size:15px;font-weight:700;color:var(--text-secondary);margin-bottom:12px;padding-left:4px;">${escapeHtml(label)}</div>
            <div class="home-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
              ${items.map(m => `
                <a href="#${escapeHtml(m.id)}" class="home-card" style="display:block;text-decoration:none;color:inherit;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                  <div style="font-size:28px;margin-bottom:8px;">${m.icon}</div>
                  <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${escapeHtml(m.name)}</div>
                  <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">${escapeHtml(m.desc)}</div>
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }
};
