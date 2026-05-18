import { debounce } from '../utils.js';

const F_PRESETS = [100e3, 300e3, 500e3, 1e6, 2e6];
const RIPPLE_PRESETS = [10, 20, 30, 40];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔋</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">Buck / Boost 电感电容计算器</h1>
          <p class="tool-desc">开关电源电感量、纹波电流、峰值电流与输出电容计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="buck">Buck (降压)</button>
          <button class="tab" data-mode="boost">Boost (升压)</button>
        </div>

        <div class="tab-content active" data-mode="buck">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>输入电压 V<sub>in</sub></label>
              <div class="input-with-unit">
                <input type="number" id="buck-vin" value="12" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电压 V<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="buck-vout" value="5" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电流 I<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="buck-iout" value="2" step="any" />
                <select disabled><option>A</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>开关频率 f<sub>sw</sub></label>
              <div class="input-with-unit">
                <input type="number" id="buck-fsw" value="500" step="any" />
                <select id="buck-fsw-unit"><option value="1">Hz</option><option value="1000" selected>kHz</option><option value="1000000">MHz</option></select>
              </div>
              <div class="preset-btns" style="margin-top:6px;">
                ${F_PRESETS.map(v => `<button class="preset-btn" data-f="${v}">${v >= 1e6 ? (v/1e6)+'MHz' : (v/1e3)+'kHz'}</button>`).join('')}
              </div>
            </div>
            <div class="input-group">
              <label>纹波电流比例 (%)</label>
              <div class="input-with-unit">
                <input type="number" id="buck-ripple" value="30" step="any" />
                <select disabled><option>%</option></select>
              </div>
              <div class="preset-btns" style="margin-top:6px;">
                ${RIPPLE_PRESETS.map(v => `<button class="preset-btn" data-ripple="${v}">${v}%</button>`).join('')}
              </div>
            </div>
            <div class="input-group">
              <label>目标输出纹波 ΔV<sub>out</sub> (可选)</label>
              <div class="input-with-unit">
                <input type="number" id="buck-dv" value="50" step="any" />
                <select disabled><option>mV</option></select>
              </div>
            </div>
          </div>
          <div id="buck-warn" style="margin-top:12px;color:var(--danger);font-weight:600;display:none;"></div>
          <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div class="input-group"><label>占空比 D</label><div class="result-box" id="buck-d">—</div></div>
            <div class="input-group"><label>电感量 L</label><div class="result-box" id="buck-l">—</div></div>
            <div class="input-group"><label>纹波电流 ΔI<sub>L</sub></label><div class="result-box" id="buck-dil">—</div></div>
            <div class="input-group"><label>峰值电流 I<sub>L(pk)</sub></label><div class="result-box" id="buck-ilp">—</div></div>
            <div class="input-group"><label>最小输出电容 C<sub>out</sub></label><div class="result-box" id="buck-cout">—</div></div>
            <div class="input-group"><label>ESR 要求</label><div class="result-box" id="buck-esr">—</div></div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            <div style="font-weight:700;margin-bottom:8px;">Buck 公式</div>
            <div>D = V<sub>out</sub> / V<sub>in</sub></div>
            <div>ΔI<sub>L</sub> = ripple% × I<sub>out</sub></div>
            <div>L = (V<sub>in</sub> − V<sub>out</sub>) × D / (ΔI<sub>L</sub> × f<sub>sw</sub>)</div>
            <div>I<sub>L(pk)</sub> = I<sub>out</sub> + ΔI<sub>L</sub> / 2</div>
            <div>C<sub>out(min)</sub> = ΔI<sub>L</sub> / (8 × f<sub>sw</sub> × ΔV<sub>out</sub>) &nbsp;&nbsp; ESR = ΔV<sub>out</sub> / ΔI<sub>L</sub></div>
          </div>
        </div>

        <div class="tab-content" data-mode="boost">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>输入电压 V<sub>in</sub></label>
              <div class="input-with-unit">
                <input type="number" id="boost-vin" value="3.3" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电压 V<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="boost-vout" value="5" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电流 I<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="boost-iout" value="1" step="any" />
                <select disabled><option>A</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>开关频率 f<sub>sw</sub></label>
              <div class="input-with-unit">
                <input type="number" id="boost-fsw" value="500" step="any" />
                <select id="boost-fsw-unit"><option value="1">Hz</option><option value="1000" selected>kHz</option><option value="1000000">MHz</option></select>
              </div>
              <div class="preset-btns" style="margin-top:6px;">
                ${F_PRESETS.map(v => `<button class="preset-btn" data-f="${v}">${v >= 1e6 ? (v/1e6)+'MHz' : (v/1e3)+'kHz'}</button>`).join('')}
              </div>
            </div>
            <div class="input-group">
              <label>纹波电流比例 (%)</label>
              <div class="input-with-unit">
                <input type="number" id="boost-ripple" value="30" step="any" />
                <select disabled><option>%</option></select>
              </div>
              <div class="preset-btns" style="margin-top:6px;">
                ${RIPPLE_PRESETS.map(v => `<button class="preset-btn" data-ripple="${v}">${v}%</button>`).join('')}
              </div>
            </div>
            <div class="input-group">
              <label>目标输出纹波 ΔV<sub>out</sub> (可选)</label>
              <div class="input-with-unit">
                <input type="number" id="boost-dv" value="50" step="any" />
                <select disabled><option>mV</option></select>
              </div>
            </div>
          </div>
          <div id="boost-warn" style="margin-top:12px;color:var(--danger);font-weight:600;display:none;"></div>
          <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div class="input-group"><label>占空比 D</label><div class="result-box" id="boost-d">—</div></div>
            <div class="input-group"><label>电感量 L</label><div class="result-box" id="boost-l">—</div></div>
            <div class="input-group"><label>纹波电流 ΔI<sub>L</sub></label><div class="result-box" id="boost-dil">—</div></div>
            <div class="input-group"><label>峰值电流 I<sub>L(pk)</sub></label><div class="result-box" id="boost-ilp">—</div></div>
            <div class="input-group"><label>最小输出电容 C<sub>out</sub></label><div class="result-box" id="boost-cout">—</div></div>
            <div class="input-group"><label>ESR 要求</label><div class="result-box" id="boost-esr">—</div></div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            <div style="font-weight:700;margin-bottom:8px;">Boost 公式</div>
            <div>D = 1 − V<sub>in</sub> / V<sub>out</sub></div>
            <div>ΔI<sub>L</sub> = ripple% × I<sub>in</sub> &nbsp; (I<sub>in</sub> = I<sub>out</sub> / (1−D))</div>
            <div>L = V<sub>in</sub> × D / (ΔI<sub>L</sub> × f<sub>sw</sub>)</div>
            <div>I<sub>L(pk)</sub> = I<sub>in</sub> + ΔI<sub>L</sub> / 2</div>
            <div>C<sub>out(min)</sub> = I<sub>out</sub> × D / (f<sub>sw</sub> × ΔV<sub>out</sub>) &nbsp;&nbsp; ESR = ΔV<sub>out</sub> / I<sub>out</sub></div>
          </div>
        </div>
      </div>
    `;

    const tabs = container.querySelectorAll('.tab');
    const contents = container.querySelectorAll('.tab-content');
    function setMode(mode) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      contents.forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
      calculate();
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    function getFsw(prefix) {
      const val = parseFloat(container.querySelector(`#${prefix}-fsw`).value);
      const unit = parseFloat(container.querySelector(`#${prefix}-fsw-unit`).value);
      return isNaN(val) ? NaN : val * unit;
    }

    function calculateBuck() {
      const vin = parseFloat(container.querySelector('#buck-vin').value);
      const vout = parseFloat(container.querySelector('#buck-vout').value);
      const iout = parseFloat(container.querySelector('#buck-iout').value);
      const fsw = getFsw('buck');
      const ripplePct = parseFloat(container.querySelector('#buck-ripple').value);
      const dv = parseFloat(container.querySelector('#buck-dv').value);
      const warnEl = container.querySelector('#buck-warn');

      if ([vin, vout, iout, fsw, ripplePct].some(isNaN) || fsw <= 0 || ripplePct <= 0) {
        ['buck-d','buck-l','buck-dil','buck-ilp','buck-cout','buck-esr'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
        warnEl.style.display = 'none';
        return;
      }
      if (vout >= vin) {
        warnEl.textContent = '⚠️ Buck模式下 Vout 必须小于 Vin';
        warnEl.style.display = 'block';
        ['buck-d','buck-l','buck-dil','buck-ilp','buck-cout','buck-esr'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
        return;
      }
      warnEl.style.display = 'none';

      const D = vout / vin;
      const dIL = (ripplePct / 100) * iout;
      const L = (vin - vout) * D / (dIL * fsw);
      const ILpk = iout + dIL / 2;

      container.querySelector('#buck-d').textContent = (D * 100).toFixed(2) + ' %';
      container.querySelector('#buck-l').textContent = formatInductance(L);
      container.querySelector('#buck-dil').textContent = (dIL * 1e3).toFixed(2) + ' mA';
      container.querySelector('#buck-ilp').textContent = ILpk.toFixed(3) + ' A';

      if (!isNaN(dv) && dv > 0) {
        const dV = dv * 1e-3;
        const Cout = dIL / (8 * fsw * dV);
        const ESR = dV / dIL;
        container.querySelector('#buck-cout').textContent = formatCapacitance(Cout);
        container.querySelector('#buck-esr').textContent = ESR < 1 ? (ESR * 1e3).toFixed(2) + ' mΩ' : ESR.toFixed(3) + ' Ω';
      } else {
        container.querySelector('#buck-cout').textContent = '—';
        container.querySelector('#buck-esr').textContent = '—';
      }
    }

    function calculateBoost() {
      const vin = parseFloat(container.querySelector('#boost-vin').value);
      const vout = parseFloat(container.querySelector('#boost-vout').value);
      const iout = parseFloat(container.querySelector('#boost-iout').value);
      const fsw = getFsw('boost');
      const ripplePct = parseFloat(container.querySelector('#boost-ripple').value);
      const dv = parseFloat(container.querySelector('#boost-dv').value);
      const warnEl = container.querySelector('#boost-warn');

      if ([vin, vout, iout, fsw, ripplePct].some(isNaN) || fsw <= 0 || ripplePct <= 0) {
        ['boost-d','boost-l','boost-dil','boost-ilp','boost-cout','boost-esr'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
        warnEl.style.display = 'none';
        return;
      }
      if (vout <= vin) {
        warnEl.textContent = '⚠️ Boost模式下 Vout 必须大于 Vin';
        warnEl.style.display = 'block';
        ['boost-d','boost-l','boost-dil','boost-ilp','boost-cout','boost-esr'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
        return;
      }
      warnEl.style.display = 'none';

      const D = 1 - vin / vout;
      const Iin = iout / (1 - D);
      const dIL = (ripplePct / 100) * Iin;
      const L = vin * D / (dIL * fsw);
      const ILpk = Iin + dIL / 2;

      container.querySelector('#boost-d').textContent = (D * 100).toFixed(2) + ' %';
      container.querySelector('#boost-l').textContent = formatInductance(L);
      container.querySelector('#boost-dil').textContent = (dIL * 1e3).toFixed(2) + ' mA';
      container.querySelector('#boost-ilp').textContent = ILpk.toFixed(3) + ' A';

      if (!isNaN(dv) && dv > 0) {
        const dV = dv * 1e-3;
        const Cout = iout * D / (fsw * dV);
        const ESR = dV / iout;
        container.querySelector('#boost-cout').textContent = formatCapacitance(Cout);
        container.querySelector('#boost-esr').textContent = ESR < 1 ? (ESR * 1e3).toFixed(2) + ' mΩ' : ESR.toFixed(3) + ' Ω';
      } else {
        container.querySelector('#boost-cout').textContent = '—';
        container.querySelector('#boost-esr').textContent = '—';
      }
    }

    function formatInductance(L) {
      if (L >= 1) return L.toFixed(3) + ' H';
      if (L >= 1e-3) return (L * 1e3).toFixed(2) + ' mH';
      if (L >= 1e-6) return (L * 1e6).toFixed(2) + ' μH';
      return (L * 1e9).toFixed(2) + ' nH';
    }

    function formatCapacitance(C) {
      if (C >= 1) return C.toFixed(3) + ' F';
      if (C >= 1e-3) return (C * 1e3).toFixed(2) + ' mF';
      if (C >= 1e-6) return (C * 1e6).toFixed(2) + ' μF';
      if (C >= 1e-9) return (C * 1e9).toFixed(2) + ' nF';
      return (C * 1e12).toFixed(2) + ' pF';
    }

    function calculate() {
      const mode = container.querySelector('.tab.active').dataset.mode;
      if (mode === 'buck') calculateBuck(); else calculateBoost();
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => el.addEventListener('input', debouncedCalc));

    // Presets
    container.querySelectorAll('.preset-btn[data-f]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = parseFloat(btn.dataset.f);
        const prefix = container.querySelector('.tab.active').dataset.mode;
        const input = container.querySelector(`#${prefix}-fsw`);
        const unitSel = container.querySelector(`#${prefix}-fsw-unit`);
        if (f >= 1e6) { input.value = f / 1e6; unitSel.value = 1000000; }
        else { input.value = f / 1e3; unitSel.value = 1000; }
        calculate();
      });
    });
    container.querySelectorAll('.preset-btn[data-ripple]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prefix = container.querySelector('.tab.active').dataset.mode;
        container.querySelector(`#${prefix}-ripple`).value = btn.dataset.ripple;
        calculate();
      });
    });

    calculate();
  }
};
