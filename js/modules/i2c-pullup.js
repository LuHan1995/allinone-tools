import { debounce } from '../utils.js';

const MODE_PRESETS = [
  { name: '标准模式 (100kHz)', freq: 100e3, tr: 1e-6, cb: 400e-12 },
  { name: '快速模式 (400kHz)', freq: 400e3, tr: 300e-9, cb: 400e-12 },
  { name: '快速+模式 (1MHz)', freq: 1e6, tr: 120e-9, cb: 550e-12 },
  { name: '超快模式 (3.4MHz)', freq: 3.4e6, tr: 40e-9, cb: 400e-12 },
];

const VCC_PRESETS = [1.8, 3.3, 5.0];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔗</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">I2C 上拉电阻计算器</h1>
          <p class="tool-desc">根据 I2C 规范计算上拉电阻范围，支持标准/快速/快速+/超快模式预设</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>电源电压 V<sub>cc</sub></label>
            <div class="input-with-unit">
              <input type="number" id="i2c-vcc" value="3.3" step="any" />
              <select disabled><option>V</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${VCC_PRESETS.map(v => `<button class="preset-btn" data-vcc="${v}">${v}V</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>低电平最大输出电压 V<sub>ol(max)</sub></label>
            <div class="input-with-unit">
              <input type="number" id="i2c-vol" value="0.4" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>低电平输出电流 I<sub>ol</sub></label>
            <div class="input-with-unit">
              <input type="number" id="i2c-iol" value="3" step="any" />
              <select id="i2c-iol-unit"><option value="0.001">mA</option><option value="1" selected>A</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>最大上升时间 t<sub>r(max)</sub></label>
            <div class="input-with-unit">
              <input type="number" id="i2c-tr" value="300" step="any" />
              <select id="i2c-tr-unit"><option value="1e-12">ps</option><option value="1e-9" selected>ns</option><option value="1e-6">μs</option><option value="1e-3">ms</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>总线电容 C<sub>b</sub></label>
            <div class="input-with-unit">
              <input type="number" id="i2c-cb" value="400" step="any" />
              <select id="i2c-cb-unit"><option value="1e-15">fF</option><option value="1e-12" selected>pF</option><option value="1e-9">nF</option><option value="1e-6">μF</option></select>
            </div>
          </div>
        </div>

        <div style="margin-top:16px;font-size:13px;color:var(--text-secondary);">
          <strong>I2C 模式预设（一键填入标准参数）：</strong>
          <div class="preset-btns" style="margin-top:8px;">
            ${MODE_PRESETS.map((m, i) => `<button class="preset-btn" data-mode="${i}">${m.name}</button>`).join('')}
          </div>
        </div>

        <div id="i2c-warn" style="margin-top:16px;color:var(--danger);font-weight:600;display:none;"></div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group"><label>R<sub>p(min)</sub> (电流限制)</label><div class="result-box" id="i2c-rpmin">—</div></div>
          <div class="input-group"><label>R<sub>p(max)</sub> (上升时间限制)</label><div class="result-box" id="i2c-rpmax">—</div></div>
          <div class="input-group"><label>推荐上拉电阻</label><div class="result-box" id="i2c-rpref">—</div></div>
          <div class="input-group"><label>静态功耗 (每路)</label><div class="result-box" id="i2c-p">—</div></div>
        </div>

        <div class="formula-box" style="margin-top:16px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式（基于 I2C 规范）</div>
          <div>R<sub>p(min)</sub> = (V<sub>cc</sub> − V<sub>ol(max)</sub>) / I<sub>ol</sub></div>
          <div>R<sub>p(max)</sub> = t<sub>r(max)</sub> / (0.8473 × C<sub>b</sub>)</div>
          <div>推荐值 ≈ √(R<sub>p(min)</sub> × R<sub>p(max)</sub>)</div>
          <div>静态功耗 P = V<sub>cc</sub>² / R<sub>p</sub></div>
        </div>

        <div style="margin-top:20px;font-size:13px;color:var(--text-secondary);">
          <div style="font-weight:700;margin-bottom:8px;">I2C 规范参数参考</div>
          <table class="data-table">
            <thead><tr><th>模式</th><th>频率</th><th>t<sub>r(max)</sub></th><th>C<sub>b(max)</sub></th></tr></thead>
            <tbody>
              <tr><td>标准模式 (Sm)</td><td>≤100 kHz</td><td>1 μs</td><td>400 pF</td></tr>
              <tr><td>快速模式 (Fm)</td><td>≤400 kHz</td><td>300 ns</td><td>400 pF</td></tr>
              <tr><td>快速+模式 (Fm+)</td><td>≤1 MHz</td><td>120 ns</td><td>550 pF</td></tr>
              <tr><td>超快模式 (UFm)</td><td>≤3.4 MHz</td><td>40 ns</td><td>400 pF</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    function getVal(id, unitId) {
      const val = parseFloat(container.querySelector(id).value);
      const unit = unitId ? parseFloat(container.querySelector(unitId).value) : 1;
      return isNaN(val) ? NaN : val * unit;
    }

    function formatRes(val) {
      if (val >= 1e6) return (val / 1e6).toFixed(2) + ' MΩ';
      if (val >= 1e3) return (val / 1e3).toFixed(2) + ' kΩ';
      if (val >= 1) return val.toFixed(2) + ' Ω';
      return (val * 1e3).toFixed(2) + ' mΩ';
    }

    function formatPower(val) {
      if (val >= 1) return val.toFixed(3) + ' W';
      if (val >= 1e-3) return (val * 1e3).toFixed(3) + ' mW';
      return (val * 1e6).toFixed(3) + ' μW';
    }

    function calculate() {
      const vcc = getVal('#i2c-vcc');
      const vol = getVal('#i2c-vol');
      const iol = getVal('#i2c-iol', '#i2c-iol-unit');
      const tr = getVal('#i2c-tr', '#i2c-tr-unit');
      const cb = getVal('#i2c-cb', '#i2c-cb-unit');
      const warnEl = container.querySelector('#i2c-warn');

      if ([vcc, vol, iol, tr, cb].some(isNaN) || iol <= 0 || tr <= 0 || cb <= 0) {
        ['i2c-rpmin','i2c-rpmax','i2c-rpref','i2c-p'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
        warnEl.style.display = 'none';
        return;
      }

      const rpMin = (vcc - vol) / iol;
      const rpMax = tr / (0.8473 * cb);

      container.querySelector('#i2c-rpmin').textContent = formatRes(rpMin);
      container.querySelector('#i2c-rpmax').textContent = formatRes(rpMax);

      const rpRefEl = container.querySelector('#i2c-rpref');
      if (rpMax > rpMin) {
        const rpRef = Math.sqrt(rpMin * rpMax);
        rpRefEl.textContent = formatRes(rpRef);
        rpRefEl.style.color = 'var(--success)';
        warnEl.style.display = 'none';

        const p = vcc * vcc / rpRef;
        container.querySelector('#i2c-p').textContent = formatPower(p);
      } else {
        rpRefEl.textContent = '无解';
        rpRefEl.style.color = 'var(--danger)';
        warnEl.textContent = '⚠️ Rp(max) ≤ Rp(min)，当前参数下无有效上拉电阻范围。请降低总线电容 Cb、缩短上升时间要求，或增大输出电流能力。';
        warnEl.style.display = 'block';
        container.querySelector('#i2c-p').textContent = '—';
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => el.addEventListener('input', debouncedCalc));

    // Voltage presets
    container.querySelectorAll('.preset-btn[data-vcc]').forEach(btn => {
      btn.addEventListener('click', () => { container.querySelector('#i2c-vcc').value = btn.dataset.vcc; calculate(); });
    });

    // Mode presets
    container.querySelectorAll('.preset-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = MODE_PRESETS[parseInt(btn.dataset.mode)];
        if (!preset) return;
        // Set tr
        const trInput = container.querySelector('#i2c-tr');
        const trUnit = container.querySelector('#i2c-tr-unit');
        if (preset.tr >= 1e-6) { trInput.value = preset.tr * 1e6; trUnit.value = 1e-6; }
        else { trInput.value = preset.tr * 1e9; trUnit.value = 1e-9; }
        // Set Cb
        const cbInput = container.querySelector('#i2c-cb');
        const cbUnit = container.querySelector('#i2c-cb-unit');
        if (preset.cb >= 1e-9) { cbInput.value = preset.cb * 1e9; cbUnit.value = 1e-9; }
        else { cbInput.value = preset.cb * 1e12; cbUnit.value = 1e-12; }
        calculate();
      });
    });

    calculate();
  }
};
