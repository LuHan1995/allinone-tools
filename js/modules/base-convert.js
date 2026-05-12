import { debounce, escapeHtml } from '../utils.js';

const INPUT_FORMATS = [
  { key: 'bin', label: '二进制' },
  { key: 'oct', label: '八进制' },
  { key: 'dec', label: '十进制' },
  { key: 'hex', label: '十六进制' },
  { key: 'ascii', label: 'ASCII' },
  { key: 'base64', label: 'Base64' },
  { key: 'url', label: 'URL Encode' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">进制/编码转换</h1>
          <p class="tool-desc">多进制和编码互转</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>输入</label>
            <textarea id="bc-input" rows="3" placeholder="输入内容"></textarea>
          </div>
          <div class="input-group">
            <label>输入格式</label>
            <select id="bc-format">
              ${INPUT_FORMATS.map(f => `<option value="${f.key}">${f.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn" id="bc-copy">复制结果</button>
          <button class="btn btn-secondary" id="bc-clear">清空</button>
        </div>
        <div id="bc-results" style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;"></div>
      </div>
    `;

    const inputEl = container.querySelector('#bc-input');
    const formatEl = container.querySelector('#bc-format');
    const resultsEl = container.querySelector('#bc-results');

    function toHexBytes(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes.push(code.toString(16).toUpperCase().padStart(2, '0'));
      }
      return bytes.join(' ');
    }

    function toBin(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i).toString(2).padStart(8, '0'));
      }
      return bytes.join(' ');
    }

    function calculate() {
      const raw = inputEl.value.trim();
      if (!raw) { resultsEl.innerHTML = ''; return; }
      const fmt = formatEl.value;

      let num = null;
      let str = '';
      let isNum = false;

      try {
        switch (fmt) {
          case 'bin': num = parseInt(raw.replace(/\s/g, ''), 2); isNum = true; break;
          case 'oct': num = parseInt(raw.replace(/\s/g, ''), 8); isNum = true; break;
          case 'dec': num = parseInt(raw.replace(/\s/g, ''), 10); isNum = true; break;
          case 'hex': num = parseInt(raw.replace(/\s/g, ''), 16); isNum = true; break;
          case 'ascii': str = raw; break;
          case 'base64': str = atob(raw); break;
          case 'url': str = decodeURIComponent(raw); break;
        }
      } catch (e) {
        resultsEl.innerHTML = '<div style="color:var(--danger);">输入格式错误</div>';
        return;
      }

      if (isNum && isNaN(num)) {
        resultsEl.innerHTML = '<div style="color:var(--danger);">输入格式错误</div>';
        return;
      }

      let html = '';
      const items = [];

      if (isNum) {
        items.push({ label: '二进制', val: num.toString(2) });
        items.push({ label: '八进制', val: num.toString(8) });
        items.push({ label: '十进制', val: String(num) });
        items.push({ label: '十六进制', val: '0x' + num.toString(16).toUpperCase() });
        if (num >= 0 && num <= 0x10FFFF) {
          const ch = String.fromCodePoint(num);
          items.push({ label: 'ASCII/Unicode', val: ch });
        }
      } else {
        items.push({ label: 'ASCII/原文', val: str });
        items.push({ label: '十六进制', val: toHexBytes(str) });
        items.push({ label: '二进制', val: toBin(str) });
        try { items.push({ label: 'Base64', val: btoa(str) }); } catch {}
        try { items.push({ label: 'URL Encode', val: encodeURIComponent(str) }); } catch {}
        if (/^[0-9]+$/.test(str)) {
          const n = parseInt(str, 10);
          items.push({ label: '十进制数值', val: String(n) });
          items.push({ label: '十六进制', val: '0x' + n.toString(16).toUpperCase() });
        }
      }

      for (const item of items) {
        html += `<div class="input-group">
          <label>${item.label}</label>
          <div class="result-box" style="font-size:16px;padding:12px;word-break:break-all;cursor:pointer;" title="点击复制" onclick="navigator.clipboard.writeText(this.textContent).catch(()=>{})">${escapeHtml(item.val)}</div>
        </div>`;
      }
      resultsEl.innerHTML = html;
    }

    const debouncedCalc = debounce(calculate, 100);
    inputEl.addEventListener('input', debouncedCalc);
    formatEl.addEventListener('change', calculate);

    container.querySelector('#bc-clear').addEventListener('click', () => {
      inputEl.value = '';
      resultsEl.innerHTML = '';
    });
    container.querySelector('#bc-copy').addEventListener('click', () => {
      const all = Array.from(resultsEl.querySelectorAll('.result-box')).map(el => el.textContent).join('\n');
      if (all) navigator.clipboard.writeText(all).catch(() => {});
    });

    calculate();
  }
};
