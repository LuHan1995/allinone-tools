import { debounce, formatNumber } from '../utils.js';

const R_UNITS = { Ω: 1, mΩ: 1e-3, kΩ: 1e3, MΩ: 1e6 };
const C_UNITS = { pF: 1e-12, nF: 1e-9, 'μF': 1e-6, mF: 1e-3, F: 1 };

const THRESHOLD_PRESETS = [
  { label: '10%', value: 0.10 },
  { label: '50%', value: 0.50 },
  { label: '63.2% (1τ)', value: 0.632 },
  { label: '90%', value: 0.90 },
  { label: '95%', value: 0.95 },
  { label: '99%', value: 0.99 },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⏱️</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">RC 延时计算器</h1>
          <p class="tool-desc">计算 RC 电路充放电到目标阈值的时间</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="charge">充电（低→高）</button>
          <button class="tab" data-mode="discharge">放电（高→低）</button>
        </div>

        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>输入电压 V<sub>in</sub></label>
            <div class="input-with-unit">
              <input type="number" id="rc-vin" value="3.3" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>电阻 R</label>
            <div class="input-with-unit">
              <input type="number" id="rc-r" value="10" step="any" />
              <select id="rc-r-u">
                <option value="Ω">Ω</option>
                <option value="kΩ" selected>kΩ</option>
                <option value="MΩ">MΩ</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>电容 C</label>
            <div class="input-with-unit">
              <input type="number" id="rc-c" value="100" step="any" />
              <select id="rc-c-u">
                <option value="pF">pF</option>
                <option value="nF">nF</option>
                <option value="μF" selected>μF</option>
                <option value="mF">mF</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>阈值电压 V<sub>th</sub> (V)</label>
            <div class="input-with-unit">
              <input type="number" id="rc-vth" value="2.08" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
        </div>

        <div class="preset-btns" style="margin-top:12px;">
          <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速阈值:</span>
          ${THRESHOLD_PRESETS.map(p => `<button class="preset-btn" data-th="${p.value}">${p.label}</button>`).join('')}
        </div>

        <div class="result-box" id="rc-result" style="margin-top:20px;">—</div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>τ = R × C</div>
          <div id="rc-formula-charge">充电: t = −τ × ln(1 − V<sub>th</sub> / V<sub>in</sub>)</div>
          <div id="rc-formula-discharge" style="display:none;">放电: t = −τ × ln(V<sub>th</sub> / V<sub>in</sub>)</div>
        </div>

        <div style="margin-top:20px;font-size:13px;color:var(--text-secondary);">
          <div style="font-weight:700;margin-bottom:8px;">说明</div>
          <div>常用逻辑门阈值：CMOS 约 50% V<sub>in</sub>，TTL 约 1.4V。</div>
          <div>3.3V CMOS 下 90% 阈值约为 2.97V，常用于上电时序分析。</div>
        </div>
      </div>
    `;

    const vinEl = container.querySelector('#rc-vin');
    const rEl = container.querySelector('#rc-r');
    const rUEl = container.querySelector('#rc-r-u');
    const cEl = container.querySelector('#rc-c');
    const cUEl = container.querySelector('#rc-c-u');
    const vthEl = container.querySelector('#rc-vth');
    const resultEl = container.querySelector('#rc-result');
    const formulaCharge = container.querySelector('#rc-formula-charge');
    const formulaDischarge = container.querySelector('#rc-formula-discharge');

    let mode = 'charge';

    const tabs = container.querySelectorAll('.tab');
    function setMode(m) {
      mode = m;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      formulaCharge.style.display = m === 'charge' ? 'block' : 'none';
      formulaDischarge.style.display = m === 'discharge' ? 'block' : 'none';
      calculate();
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    function calculate() {
      const vin = parseFloat(vinEl.value);
      const r = parseFloat(rEl.value) * R_UNITS[rUEl.value];
      const c = parseFloat(cEl.value) * C_UNITS[cUEl.value];
      const vth = parseFloat(vthEl.value);

      if (isNaN(vin) || isNaN(r) || isNaN(c) || isNaN(vth) || vin <= 0 || r <= 0 || c <= 0) {
        resultEl.textContent = '—';
        return;
      }

      const tau = r * c;
      let t;
      let invalid = false;

      if (mode === 'charge') {
        if (vth <= 0) invalid = true;
        else if (vth >= vin) invalid = true;
        else t = -tau * Math.log(1 - vth / vin);
      } else {
        if (vth <= 0) invalid = true;
        else if (vth >= vin) invalid = true;
        else t = -tau * Math.log(vth / vin);
      }

      if (invalid) {
        resultEl.textContent = '阈值电压必须在 0 和 Vin 之间';
        resultEl.style.color = 'var(--danger)';
        return;
      }

      resultEl.style.color = 'var(--primary)';
      if (t >= 1) {
        resultEl.innerHTML = `<strong>${formatNumber(t)} s</strong> &nbsp;|&nbsp; τ = ${formatNumber(tau)} s`;
      } else if (t >= 1e-3) {
        resultEl.innerHTML = `<strong>${formatNumber(t * 1e3)} ms</strong> &nbsp;|&nbsp; τ = ${formatNumber(tau)} s`;
      } else if (t >= 1e-6) {
        resultEl.innerHTML = `<strong>${formatNumber(t * 1e6)} μs</strong> &nbsp;|&nbsp; τ = ${formatNumber(tau)} s`;
      } else {
        resultEl.innerHTML = `<strong>${formatNumber(t * 1e9)} ns</strong> &nbsp;|&nbsp; τ = ${formatNumber(tau)} s`;
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    [vinEl, rEl, rUEl, cEl, cUEl, vthEl].forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    container.querySelectorAll('.preset-btn[data-th]').forEach(btn => {
      btn.addEventListener('click', () => {
        const th = parseFloat(btn.dataset.th);
        const vin = parseFloat(vinEl.value);
        if (!isNaN(vin) && vin > 0) {
          vthEl.value = (vin * th).toFixed(3);
          calculate();
        }
      });
    });

    calculate();
  }
};
