import { autoUnit, debounce, formatNumber } from '../utils.js';

const PRESETS = [
  { name: 'STM32F1', freq: 72e6 },
  { name: 'STM32F4', freq: 168e6 },
  { name: 'STM32G0', freq: 64e6 },
  { name: 'ESP32', freq: 80e6 },
  { name: 'ESP32-S3', freq: 240e6 },
  { name: 'GD32F103', freq: 108e6 },
  { name: '自定义', freq: null },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⏱️</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">PWM 定时器计算器</h1>
          <p class="tool-desc">根据 MCU 主频、预分频和重装载值计算 PWM 频率与分辨率</p>
        </div>
      </div>
      <div class="card">
        <div class="input-group">
          <label>MCU 平台预设</label>
          <select id="pwm-preset">
            ${PRESETS.map(p => `<option value="${p.freq || ''}">${p.name}${p.freq ? ' (' + (p.freq / 1e6) + ' MHz)' : ''}</option>`).join('')}
          </select>
        </div>

        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-top:10px;">
          <div class="input-group">
            <label>主频 F<sub>clk</sub></label>
            <div class="input-with-unit">
              <input type="number" id="pwm-fclk" value="72" step="any" />
              <select disabled><option>MHz</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>预分频 PSC</label>
            <input type="number" id="pwm-psc" value="0" step="1" min="0" />
          </div>
          <div class="input-group">
            <label>自动重装载 ARR</label>
            <input type="number" id="pwm-arr" value="999" step="1" min="0" />
          </div>
          <div class="input-group">
            <label>PWM 模式</label>
            <select id="pwm-mode">
              <option value="edge" selected>边沿对齐 (向上计数)</option>
              <option value="center">中心对齐</option>
            </select>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>PWM 频率</label>
            <div class="result-box" id="pwm-freq">—</div>
          </div>
          <div class="input-group">
            <label>分辨率</label>
            <div class="result-box" id="pwm-res">—</div>
          </div>
          <div class="input-group">
            <label>最小可调步进</label>
            <div class="result-box" id="pwm-step">—</div>
          </div>
        </div>

        <div style="margin-top:24px;padding:16px;background:var(--bg);border-radius:var(--radius);">
          <div style="font-weight:700;margin-bottom:12px;">反向计算：输入目标频率，自动推荐 PSC 和 ARR</div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>目标频率</label>
              <div class="input-with-unit">
                <input type="number" id="pwm-tgt-freq" placeholder="Hz" step="any" />
                <select id="pwm-tgt-unit">
                  <option value="1">Hz</option>
                  <option value="1000" selected>kHz</option>
                  <option value="1000000">MHz</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>PWM 模式</label>
              <select id="pwm-tgt-mode">
                <option value="edge" selected>边沿对齐</option>
                <option value="center">中心对齐</option>
              </select>
            </div>
          </div>
          <div style="margin-top:16px;">
            <table class="data-table" id="pwm-rec-table" style="display:none;">
              <thead><tr><th>PSC</th><th>ARR</th><th>实际频率</th><th>误差</th></tr></thead>
              <tbody></tbody>
            </table>
            <div id="pwm-rec-none" style="color:var(--text-secondary);margin-top:8px;">请输入目标频率以获取推荐组合</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>边沿对齐：f<sub>PWM</sub> = F<sub>clk</sub> / ((PSC+1) × (ARR+1))</div>
          <div>中心对齐：f<sub>PWM</sub> = F<sub>clk</sub> / (2 × (PSC+1) × (ARR+1))</div>
          <div>分辨率 = log₂(ARR+1) bit</div>
          <div>最小步进 = F<sub>clk</sub> / ((PSC+1) × (ARR+1)²)</div>
        </div>
      </div>
    `;

    const presetEl = container.querySelector('#pwm-preset');
    const fclkEl = container.querySelector('#pwm-fclk');
    const pscEl = container.querySelector('#pwm-psc');
    const arrEl = container.querySelector('#pwm-arr');
    const modeEl = container.querySelector('#pwm-mode');
    const freqEl = container.querySelector('#pwm-freq');
    const resEl = container.querySelector('#pwm-res');
    const stepEl = container.querySelector('#pwm-step');
    const tgtFreqEl = container.querySelector('#pwm-tgt-freq');
    const tgtUnitEl = container.querySelector('#pwm-tgt-unit');
    const tgtModeEl = container.querySelector('#pwm-tgt-mode');
    const recTable = container.querySelector('#pwm-rec-table');
    const recNone = container.querySelector('#pwm-rec-none');

    presetEl.addEventListener('change', () => {
      if (presetEl.value) fclkEl.value = parseInt(presetEl.value, 10) / 1e6;
      calculate();
    });

    function calculate() {
      const fclk = parseFloat(fclkEl.value) * 1e6;
      const psc = parseInt(pscEl.value, 10) || 0;
      const arr = parseInt(arrEl.value, 10) || 0;
      const mode = modeEl.value;

      if (isNaN(fclk) || fclk <= 0) {
        freqEl.textContent = '—';
        resEl.textContent = '—';
        stepEl.textContent = '—';
        return;
      }

      const div = (psc + 1) * (arr + 1);
      const freq = mode === 'edge' ? fclk / div : fclk / (2 * div);
      const res = Math.log2(arr + 1);
      const step = fclk / ((psc + 1) * (arr + 1) * (arr + 1));

      const auFreq = autoUnit(freq, 'frequency');
      freqEl.textContent = `${formatNumber(auFreq.value)} ${auFreq.unit}`;
      resEl.textContent = `${res.toFixed(2)} bit (${arr + 1} 级)`;
      const auStep = autoUnit(step, 'frequency');
      stepEl.textContent = `${formatNumber(auStep.value)} ${auStep.unit}`;

      reverseCalc();
    }

    function reverseCalc() {
      const tgt = parseFloat(tgtFreqEl.value);
      const tgtUnit = parseFloat(tgtUnitEl.value);
      const tgtMode = tgtModeEl.value;
      const fclk = parseFloat(fclkEl.value) * 1e6;

      if (isNaN(tgt) || tgt <= 0 || isNaN(fclk) || fclk <= 0) {
        recTable.style.display = 'none';
        recNone.style.display = 'block';
        return;
      }

      const target = tgt * tgtUnit;
      const mul = tgtMode === 'edge' ? 1 : 2;
      const idealDiv = fclk / (target * mul);

      const results = [];
      for (let psc = 0; psc <= 65535; psc++) {
        const arrPlus1 = idealDiv / (psc + 1);
        if (arrPlus1 > 65535 || arrPlus1 < 2) continue;
        const arr = Math.round(arrPlus1) - 1;
        if (arr < 1 || arr > 65535) continue;
        const actualDiv = (psc + 1) * (arr + 1);
        const actualFreq = fclk / (mul * actualDiv);
        const err = Math.abs((actualFreq - target) / target) * 100;
        results.push({ psc, arr, actualFreq, err });
        if (results.length >= 2000) break;
      }

      results.sort((a, b) => a.err - b.err);
      const top = results.slice(0, 10);

      if (top.length === 0) {
        recTable.style.display = 'none';
        recNone.style.display = 'block';
        recNone.textContent = '未找到满足条件的 PSC/ARR 组合';
        return;
      }

      recTable.style.display = 'table';
      recNone.style.display = 'none';
      const tbody = recTable.querySelector('tbody');
      tbody.innerHTML = top.map(r => {
        const au = autoUnit(r.actualFreq, 'frequency');
        return `<tr><td>${r.psc}</td><td>${r.arr}</td><td>${formatNumber(au.value)} ${au.unit}</td><td>${r.err.toFixed(4)}%</td></tr>`;
      }).join('');
    }

    const debouncedCalc = debounce(calculate, 100);
    [fclkEl, pscEl, arrEl, modeEl].forEach(el => el.addEventListener('input', debouncedCalc));

    const debouncedRev = debounce(reverseCalc, 150);
    [tgtFreqEl, tgtUnitEl, tgtModeEl].forEach(el => el.addEventListener('input', debouncedRev));

    calculate();
  }
};
