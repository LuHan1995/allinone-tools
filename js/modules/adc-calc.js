import { debounce, formatNumber } from '../utils.js';

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔢</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">ADC / DAC 分辨率计算器</h1>
          <p class="tool-desc">根据位数和参考电压计算分辨率、LSB、SNR 等参数</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>位数 (n)</label>
            <div class="input-with-unit">
              <input type="number" id="adc-n" value="12" step="1" min="1" />
              <select id="adc-n-sel">
                <option value="">自定义</option>
                <option value="8">8 bit</option>
                <option value="10">10 bit</option>
                <option value="12" selected>12 bit</option>
                <option value="16">16 bit</option>
                <option value="24">24 bit</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>参考电压 V<sub>ref</sub></label>
            <div class="input-with-unit">
              <input type="number" id="adc-vref" value="3.3" step="any" />
              <select disabled><option>V</option></select>
            </div>
            <div class="preset-btns" style="margin-top:8px;">
              <button class="preset-btn" data-vref="1.024">1.024V</button>
              <button class="preset-btn" data-vref="2.048">2.048V</button>
              <button class="preset-btn" data-vref="2.5">2.5V</button>
              <button class="preset-btn" data-vref="3.3">3.3V</button>
              <button class="preset-btn" data-vref="5">5V</button>
            </div>
          </div>
          <div class="input-group">
            <label>输入电压（可选）</label>
            <div class="input-with-unit">
              <input type="number" id="adc-vin" placeholder="留空则不计算码值" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>总级数</label>
            <div class="result-box" id="adc-levels">—</div>
          </div>
          <div class="input-group">
            <label>LSB (最低有效位电压)</label>
            <div class="result-box" id="adc-lsb">—</div>
          </div>
          <div class="input-group">
            <label>理论 SNR</label>
            <div class="result-box" id="adc-snr">—</div>
          </div>
          <div class="input-group">
            <label>量化误差</label>
            <div class="result-box" id="adc-error">—</div>
          </div>
          <div class="input-group">
            <label>理论码值</label>
            <div class="result-box" id="adc-code">—</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>总级数 = 2ⁿ</div>
          <div>LSB = V<sub>ref</sub> / 2ⁿ</div>
          <div>SNR = 6.02 × n + 1.76 (dB)</div>
          <div>量化误差 = ±0.5 LSB</div>
          <div>码值 = voltage / LSB</div>
        </div>

        <div style="margin-top:16px;color:var(--text-secondary);font-size:13px;">
          ℹ️ 实际有效位数 (ENOB) 通常低于理论值，受噪声、电源纹波、INL/DNL 等因素影响。
        </div>
      </div>
    `;

    const nEl = container.querySelector('#adc-n');
    const nSel = container.querySelector('#adc-n-sel');
    const vrefEl = container.querySelector('#adc-vref');
    const vinEl = container.querySelector('#adc-vin');
    const levelsEl = container.querySelector('#adc-levels');
    const lsbEl = container.querySelector('#adc-lsb');
    const snrEl = container.querySelector('#adc-snr');
    const errEl = container.querySelector('#adc-error');
    const codeEl = container.querySelector('#adc-code');

    function calculate() {
      const n = parseInt(nEl.value, 10);
      const vref = parseFloat(vrefEl.value);
      const vin = parseFloat(vinEl.value);

      if (isNaN(n) || n <= 0 || isNaN(vref) || vref <= 0) {
        [levelsEl, lsbEl, snrEl, errEl, codeEl].forEach(el => el.textContent = '—');
        return;
      }

      if (n > 32) {
        [levelsEl, lsbEl, snrEl, errEl, codeEl].forEach(el => el.textContent = '位数过大（最大支持32位）');
        return;
      }

      const levels = Math.pow(2, n);
      const lsb = vref / levels;
      const snr = 6.02 * n + 1.76;
      const qError = 0.5 * lsb;

      levelsEl.textContent = formatNumber(levels);
      lsbEl.textContent = `${formatNumber(lsb * 1e6)} µV`;
      snrEl.textContent = `${formatNumber(snr)} dB`;
      errEl.textContent = `±${formatNumber(qError * 1e6)} µV`;

      if (!isNaN(vin)) {
        const code = Math.floor(vin / lsb);
        const clamped = Math.max(0, Math.min(code, levels - 1));
        codeEl.textContent = `${clamped} (0x${clamped.toString(16).toUpperCase()})`;
      } else {
        codeEl.textContent = '—';
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    [vrefEl, vinEl].forEach(el => el.addEventListener('input', debouncedCalc));
    nEl.addEventListener('input', debouncedCalc);
    nSel.addEventListener('change', () => {
      if (nSel.value) nEl.value = nSel.value;
      calculate();
    });

    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        vrefEl.value = btn.dataset.vref;
        calculate();
      });
    });

    calculate();
  }
};
