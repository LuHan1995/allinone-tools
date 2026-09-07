import { debounce } from '../utils.js';

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔋</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">电源功耗 / 效率计算器</h1>
          <p class="tool-desc">线性电源/LDO 与 DC-DC 开关电源效率与功耗分析</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="ldo">线性电源 / LDO</button>
          <button class="tab" data-mode="dcdc">DC-DC 开关电源</button>
        </div>

        <div class="tab-content active" data-mode="ldo">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>输入电压 V<sub>in</sub></label>
              <div class="input-with-unit">
                <input type="number" id="ldo-vin" value="5" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电压 V<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="ldo-vout" value="3.3" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电流 I<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="ldo-iout" value="100" step="any" />
                <select disabled><option>mA</option></select>
              </div>
            </div>
          </div>
          <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div class="input-group">
              <label>输出功率 P<sub>out</sub></label>
              <div class="result-box" id="ldo-pout">—</div>
            </div>
            <div class="input-group">
              <label>输入功率 P<sub>in</sub></label>
              <div class="result-box" id="ldo-pin">—</div>
            </div>
            <div class="input-group">
              <label>损耗功率 P<sub>loss</sub></label>
              <div class="result-box" id="ldo-ploss">—</div>
            </div>
            <div class="input-group">
              <label>效率 η</label>
              <div class="result-box" id="ldo-eff">—</div>
            </div>
            <div class="input-group">
              <label>芯片温升估算 (θ<sub>ja</sub>=50°C/W)</label>
              <div class="result-box" id="ldo-dt">—</div>
            </div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            P<sub>out</sub> = V<sub>out</sub> × I<sub>out</sub> &nbsp;&nbsp; P<sub>in</sub> = V<sub>in</sub> × I<sub>out</sub> &nbsp;&nbsp; P<sub>loss</sub> = (V<sub>in</sub>−V<sub>out</sub>) × I<sub>out</sub> &nbsp;&nbsp; η = V<sub>out</sub>/V<sub>in</sub> × 100%
          </div>
        </div>

        <div class="tab-content" data-mode="dcdc">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>输入电压 V<sub>in</sub></label>
              <div class="input-with-unit">
                <input type="number" id="dc-vin" value="12" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电压 V<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="dc-vout" value="5" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>输出电流 I<sub>out</sub></label>
              <div class="input-with-unit">
                <input type="number" id="dc-iout" value="2" step="any" />
                <select disabled><option>A</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>效率 η (%)</label>
              <div class="input-with-unit">
                <input type="number" id="dc-eff" value="90" step="any" />
                <select disabled><option>%</option></select>
              </div>
            </div>
          </div>
          <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div class="input-group">
              <label>输出功率 P<sub>out</sub></label>
              <div class="result-box" id="dc-pout">—</div>
            </div>
            <div class="input-group">
              <label>输入功率 P<sub>in</sub></label>
              <div class="result-box" id="dc-pin">—</div>
            </div>
            <div class="input-group">
              <label>损耗功率 P<sub>loss</sub></label>
              <div class="result-box" id="dc-ploss">—</div>
            </div>
            <div class="input-group">
              <label>输入电流 I<sub>in</sub></label>
              <div class="result-box" id="dc-iin">—</div>
            </div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            P<sub>out</sub> = V<sub>out</sub> × I<sub>out</sub> &nbsp;&nbsp; P<sub>in</sub> = P<sub>out</sub> / η &nbsp;&nbsp; P<sub>loss</sub> = P<sub>in</sub> − P<sub>out</sub> &nbsp;&nbsp; I<sub>in</sub> = P<sub>in</sub> / V<sub>in</sub>
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

    function calculate() {
      const mode = container.querySelector('.tab.active').dataset.mode;
      if (mode === 'ldo') {
        const vin = parseFloat(container.querySelector('#ldo-vin').value);
        const vout = parseFloat(container.querySelector('#ldo-vout').value);
        const iout = parseFloat(container.querySelector('#ldo-iout').value);
        if (isNaN(vin) || isNaN(vout) || isNaN(iout)) {
          ['ldo-pout', 'ldo-pin', 'ldo-ploss', 'ldo-eff', 'ldo-dt'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
          return;
        }
        if (vin < vout) {
          ['ldo-pout', 'ldo-pin', 'ldo-ploss', 'ldo-eff', 'ldo-dt'].forEach(id => {
            const el = container.querySelector(`#${id}`);
            el.textContent = id === 'ldo-eff' ? '输入电压必须大于等于输出电压' : '—';
            el.style.color = id === 'ldo-eff' ? 'var(--danger)' : '';
          });
          return;
        }
        const ioutA = iout * 1e-3;
        const pout = vout * ioutA;
        const pin = vin * ioutA;
        const ploss = (vin - vout) * ioutA;
        const eff = vin > 0 ? (vout / vin) * 100 : 0;
        const dt = ploss * 50;

        container.querySelector('#ldo-pout').textContent = `${(pout * 1e3).toFixed(2)} mW`;
        container.querySelector('#ldo-pin').textContent = `${(pin * 1e3).toFixed(2)} mW`;
        container.querySelector('#ldo-ploss').textContent = `${(ploss * 1e3).toFixed(2)} mW`;
        container.querySelector('#ldo-eff').textContent = `${eff.toFixed(2)} %`;
        container.querySelector('#ldo-eff').style.color = '';
        container.querySelector('#ldo-dt').textContent = `${dt.toFixed(1)} °C`;
      } else {
        const vin = parseFloat(container.querySelector('#dc-vin').value);
        const vout = parseFloat(container.querySelector('#dc-vout').value);
        const iout = parseFloat(container.querySelector('#dc-iout').value);
        const effPct = parseFloat(container.querySelector('#dc-eff').value);
        if (isNaN(vin) || isNaN(vout) || isNaN(iout) || isNaN(effPct) || effPct <= 0) {
          ['dc-pout', 'dc-pin', 'dc-ploss', 'dc-iin'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
          return;
        }
        const pout = vout * iout;
        const eta = effPct / 100;
        const pin = pout / eta;
        const ploss = pin - pout;
        const iin = vin > 0 ? pin / vin : 0;

        container.querySelector('#dc-pout').textContent = `${pout.toFixed(3)} W`;
        container.querySelector('#dc-pin').textContent = `${pin.toFixed(3)} W`;
        container.querySelector('#dc-ploss').textContent = `${ploss.toFixed(3)} W`;
        container.querySelector('#dc-iin').textContent = `${iin.toFixed(3)} A`;
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => el.addEventListener('input', debouncedCalc));

    calculate();
  }
};
