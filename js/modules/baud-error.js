import { debounce, formatNumber } from '../utils.js';

const XTAL_PRESETS = [8, 12, 16, 20, 24, 25, 48, 72, 168, 240];
const BAUD_PRESETS = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📟</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">波特率误差计算</h1>
          <p class="tool-desc">根据晶振频率和目标波特率计算实际误差</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>晶振频率 (MHz)</label>
            <div class="input-with-unit">
              <input type="number" id="be-xtal" value="8" step="any" />
              <select disabled><option>MHz</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${XTAL_PRESETS.map(v => `<button class="preset-btn" data-xtal="${v}">${v}M</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>目标波特率</label>
            <div class="input-with-unit">
              <input type="number" id="be-baud" value="115200" step="any" />
              <select disabled><option>bps</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${BAUD_PRESETS.map(v => `<button class="preset-btn" data-baud="${v}">${v}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>过采样模式</label>
            <select id="be-over">
              <option value="16" selected>16x (标准)</option>
              <option value="8">8x (高速)</option>
            </select>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>分频值 BRR</label>
            <div class="result-box" id="be-brr">—</div>
          </div>
          <div class="input-group">
            <label>实际波特率</label>
            <div class="result-box" id="be-real">—</div>
          </div>
          <div class="input-group">
            <label>误差</label>
            <div class="result-box" id="be-err">—</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>BRR = Fclk / (波特率 × 采样倍数)</div>
          <div>实际波特率 = Fclk / (round(BRR) × 采样倍数)</div>
          <div>误差 = |实际波特率 − 目标波特率| / 目标波特率 × 100%</div>
        </div>
      </div>
    `;

    const xtalEl = container.querySelector('#be-xtal');
    const baudEl = container.querySelector('#be-baud');
    const overEl = container.querySelector('#be-over');
    const brrEl = container.querySelector('#be-brr');
    const realEl = container.querySelector('#be-real');
    const errEl = container.querySelector('#be-err');

    function calculate() {
      const xtal = parseFloat(xtalEl.value) * 1e6;
      const baud = parseFloat(baudEl.value);
      const over = parseInt(overEl.value, 10);

      if (isNaN(xtal) || isNaN(baud) || baud <= 0) {
        brrEl.textContent = '—'; realEl.textContent = '—'; errEl.textContent = '—';
        errEl.style.color = '';
        return;
      }

      const brrRaw = xtal / (baud * over);
      const brrInt = Math.round(brrRaw);

      if (brrInt <= 0) {
        brrEl.textContent = '—';
        realEl.textContent = '—';
        errEl.textContent = '波特率过高或晶振频率过低';
        errEl.style.color = 'var(--danger)';
        return;
      }

      const realBaud = xtal / (brrInt * over);
      const err = Math.abs(realBaud - baud) / baud * 100;

      brrEl.textContent = String(brrInt);
      realEl.textContent = `${formatNumber(realBaud)} bps`;
      errEl.textContent = `${err.toFixed(3)}%`;

      if (err < 1) errEl.style.color = 'var(--success)';
      else if (err < 3) errEl.style.color = 'var(--warning)';
      else {
        errEl.style.color = 'var(--danger)';
        errEl.textContent += ' — 不建议使用';
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    [xtalEl, baudEl, overEl].forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    container.querySelectorAll('.preset-btn[data-xtal]').forEach(btn => {
      btn.addEventListener('click', () => { xtalEl.value = btn.dataset.xtal; calculate(); });
    });
    container.querySelectorAll('.preset-btn[data-baud]').forEach(btn => {
      btn.addEventListener('click', () => { baudEl.value = btn.dataset.baud; calculate(); });
    });

    calculate();
  }
};
