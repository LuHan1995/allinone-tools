import { debounce, formatNumber, generateSeries, E24_BASE, E96_BASE } from '../utils.js';

const COLOR_MAP = {
  black: { val: 0, label: '黑', hex: '#000000' },
  brown: { val: 1, label: '棕', hex: '#8B4513' },
  red: { val: 2, label: '红', hex: '#DC143C' },
  orange: { val: 3, label: '橙', hex: '#FF8C00' },
  yellow: { val: 4, label: '黄', hex: '#FFD700' },
  green: { val: 5, label: '绿', hex: '#228B22' },
  blue: { val: 6, label: '蓝', hex: '#1E90FF' },
  violet: { val: 7, label: '紫', hex: '#8A2BE2' },
  grey: { val: 8, label: '灰', hex: '#808080' },
  white: { val: 9, label: '白', hex: '#F5F5F5' },
  gold: { val: -1, label: '金', hex: '#DAA520' },
  silver: { val: -2, label: '银', hex: '#C0C0C0' },
};

const MULTIPLIER_MAP = {
  black: 1, brown: 10, red: 100, orange: 1e3, yellow: 1e4,
  green: 1e5, blue: 1e6, gold: 0.1, silver: 0.01,
};

const TOLERANCE_MAP = {
  brown: 1, red: 2, green: 0.5, blue: 0.25, violet: 0.1,
  grey: 0.05, gold: 5, silver: 10,
};

const TEMP_COEF_MAP = {
  brown: 100, red: 50, orange: 15, yellow: 25,
  blue: 10, violet: 5, white: 1,
};

const COLOR_ORDER = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white', 'gold', 'silver'];

const DIGIT_COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];
const MULTI_COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'gold', 'silver'];
const TOL_COLORS = ['brown', 'red', 'green', 'blue', 'violet', 'grey', 'gold', 'silver'];
const TEMP_COLORS = ['brown', 'red', 'orange', 'yellow', 'blue', 'violet', 'white'];

// 缓存 E24/E96 完整序列
const E24_SERIES = generateSeries(E24_BASE, 1e8);
const E96_SERIES = generateSeries(E96_BASE, 1e8);

function formatResistor(val, tol, temp) {
  let s = '';
  if (val >= 1e6) s = `${formatNumber(val / 1e6)} MΩ`;
  else if (val >= 1e3) s = `${formatNumber(val / 1e3)} kΩ`;
  else s = `${formatNumber(val)} Ω`;
  if (tol != null) s += ` ±${tol}%`;
  if (temp != null) s += ` (${temp} ppm/℃)`;
  return s;
}

function colorOptions(colors, allowEmpty = false) {
  let html = allowEmpty ? `<option value="">--</option>` : '';
  for (const c of colors) {
    const info = COLOR_MAP[c];
    html += `<option value="${c}">${info.label}</option>`;
  }
  return html;
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🎨</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">电阻色环识别</h1>
          <p class="tool-desc">4/5/6 环电阻读值与反查</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="read">读值模式</button>
          <button class="tab" data-mode="reverse">反查模式</button>
        </div>

        <div class="tab-content active" id="rc-read">
          <div class="input-group">
            <label>环数</label>
            <select id="rc-bands">
              <option value="4">4 环</option>
              <option value="5" selected>5 环</option>
              <option value="6">6 环</option>
            </select>
          </div>
          <div id="rc-rings" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;"></div>
          <div class="result-box" id="rc-read-res">—</div>
        </div>

        <div class="tab-content" id="rc-reverse">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>目标阻值</label>
              <div class="input-with-unit">
                <input type="number" id="rc-rev-val" placeholder="如 1000" step="any" />
                <select id="rc-rev-unit">
                  <option value="1">Ω</option>
                  <option value="1000" selected>kΩ</option>
                  <option value="1000000">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>容差</label>
              <select id="rc-rev-tol">
                <option value="">任意</option>
                <option value="1">±1%</option>
                <option value="2">±2%</option>
                <option value="0.5">±0.5%</option>
                <option value="0.25">±0.25%</option>
                <option value="0.1">±0.1%</option>
                <option value="0.05">±0.05%</option>
                <option value="5" selected>±5%</option>
                <option value="10">±10%</option>
              </select>
            </div>
          </div>
          <div style="margin-top:16px;">
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">推荐色环组合</label>
            <div id="rc-rev-results"></div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">说明</div>
          <div>4环：第1-2环为有效数字，第3环为倍率，第4环为容差</div>
          <div>5环：第1-3环为有效数字，第4环为倍率，第5环为容差</div>
          <div>6环：第1-3环为有效数字，第4环为倍率，第5环为容差，第6环为温度系数</div>
        </div>
      </div>
    `;

    const ringsContainer = container.querySelector('#rc-rings');
    const bandsSelect = container.querySelector('#rc-bands');
    const readResEl = container.querySelector('#rc-read-res');
    const revResultsEl = container.querySelector('#rc-rev-results');

    function buildRings() {
      const bands = parseInt(bandsSelect.value, 10);
      const digitCount = bands === 4 ? 2 : 3;
      let html = '';
      for (let i = 0; i < digitCount; i++) {
        html += `<div class="input-group" style="flex:1;min-width:120px;">
          <label>第 ${i + 1} 环 (数字)</label>
          <select id="rc-d${i}">${colorOptions(DIGIT_COLORS)}</select>
        </div>`;
      }
      html += `<div class="input-group" style="flex:1;min-width:120px;">
        <label>倍率环</label>
        <select id="rc-multi">${colorOptions(MULTI_COLORS)}</select>
      </div>`;
      html += `<div class="input-group" style="flex:1;min-width:120px;">
        <label>容差环</label>
        <select id="rc-tol">${colorOptions(TOL_COLORS)}</select>
      </div>`;
      if (bands === 6) {
        html += `<div class="input-group" style="flex:1;min-width:120px;">
          <label>温度系数</label>
          <select id="rc-temp">${colorOptions(TEMP_COLORS)}</select>
        </div>`;
      }
      ringsContainer.innerHTML = html;
      attachReadListeners();
      calcRead();
    }

    function attachReadListeners() {
      ringsContainer.querySelectorAll('select').forEach(s => {
        s.addEventListener('change', calcRead);
      });
    }

    function calcRead() {
      const bands = parseInt(bandsSelect.value, 10);
      const digitCount = bands === 4 ? 2 : 3;
      let digits = 0;
      for (let i = 0; i < digitCount; i++) {
        const el = container.querySelector(`#rc-d${i}`);
        if (!el) { readResEl.textContent = '—'; return; }
        digits = digits * 10 + COLOR_MAP[el.value].val;
      }
      const multi = MULTIPLIER_MAP[container.querySelector('#rc-multi').value] || 1;
      const tol = TOLERANCE_MAP[container.querySelector('#rc-tol').value];
      const val = digits * multi;
      let temp = null;
      if (bands === 6) {
        const tempEl = container.querySelector('#rc-temp');
        if (tempEl) temp = TEMP_COEF_MAP[tempEl.value];
      }
      readResEl.textContent = formatResistor(val, tol, temp);
    }

    function findReverse() {
      const raw = parseFloat(container.querySelector('#rc-rev-val').value);
      const unit = parseFloat(container.querySelector('#rc-rev-unit').value);
      const tolStr = container.querySelector('#rc-rev-tol').value;
      if (isNaN(raw) || raw <= 0) { revResultsEl.innerHTML = ''; return; }
      const target = raw * unit;
      const tol = tolStr === '' ? null : parseFloat(tolStr);

      const pool = [...new Set([...E24_SERIES, ...E96_SERIES])].sort((a, b) => a - b);

      let best = [];
      for (const val of pool) {
        if (val < target * 0.1 || val > target * 10) continue;
        const err = Math.abs(val - target) / target;
        best.push({ val, err });
      }
      best.sort((a, b) => a.err - b.err);
      best = best.slice(0, 5);

      if (best.length === 0) { revResultsEl.innerHTML = '<div style="color:var(--text-secondary);">未找到接近的标准阻值</div>'; return; }

      let html = '<table class="data-table"><thead><tr><th>阻值</th><th>误差</th><th>推荐色环 (5环)</th></tr></thead><tbody>';
      for (const b of best) {
        const rings = valueToRings(b.val, 5, tol);
        if (!rings) {
          html += `<tr><td>${formatResistor(b.val, tol)}</td><td>${(b.err * 100).toFixed(2)}%</td><td style="color:var(--danger);">该阻值无法用标准色环精确表示</td></tr>`;
          continue;
        }
        const ringHtml = rings.map(c => `<span style="display:inline-block;width:18px;height:18px;border-radius:3px;background:${COLOR_MAP[c].hex};border:1px solid var(--border);vertical-align:middle;margin-right:2px;"></span>`).join('');
        html += `<tr><td>${formatResistor(b.val, tol)}</td><td>${(b.err * 100).toFixed(2)}%</td><td>${ringHtml}</td></tr>`;
      }
      html += '</tbody></table>';
      revResultsEl.innerHTML = html;
    }

    function valueToRings(val, bands, tol) {
      const multipliers = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7];
      let bestMulti = 1;
      let bestDigits = val;
      for (const m of multipliers) {
        const d = val / m;
        if (d >= 100 && d < 1000 && bands >= 5) { bestMulti = m; bestDigits = d; break; }
        if (d >= 10 && d < 100 && bands === 4) { bestMulti = m; bestDigits = d; break; }
        if (bands >= 5 && d >= 10 && d < 100 && bestMulti === 1) { bestMulti = m; bestDigits = d; }
      }
      const intDigits = Math.round(bestDigits);
      const digits = String(intDigits).split('').map(Number);
      if (bands === 4 && digits.length > 2) digits.length = 2;
      const ringColors = [];
      for (const d of digits) {
        ringColors.push(COLOR_ORDER[d]);
      }
      let multiColor = null;
      for (const [c, v] of Object.entries(MULTIPLIER_MAP)) {
        if (v === bestMulti) multiColor = c;
      }
      if (!multiColor) return null; // 无法用标准色环表示
      ringColors.push(multiColor);
      let tolColor = 'gold';
      if (tol != null) {
        for (const [c, v] of Object.entries(TOLERANCE_MAP)) {
          if (v === tol) tolColor = c;
        }
      }
      ringColors.push(tolColor);
      if (bands === 6) ringColors.push('brown');
      return ringColors;
    }

    const debouncedReverse = debounce(findReverse, 100);

    bandsSelect.addEventListener('change', buildRings);
    container.querySelector('#rc-rev-val').addEventListener('input', debouncedReverse);
    container.querySelector('#rc-rev-unit').addEventListener('change', debouncedReverse);
    container.querySelector('#rc-rev-tol').addEventListener('change', debouncedReverse);

    container.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        container.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
        container.querySelectorAll('.tab-content').forEach(x => x.classList.toggle('active', x.id === `rc-${t.dataset.mode}`));
      });
    });

    buildRings();
    findReverse();
  }
};
