import { autoUnit, debounce, formatNumber } from '../utils.js';

const L_UNITS = { nH: 1e-9, 'μH': 1e-6, mH: 1e-3, H: 1 };
const C_UNITS = { pF: 1e-12, nF: 1e-9, 'μF': 1e-6, mF: 1e-3, F: 1 };
const R_UNITS = { Ω: 1, 'kΩ': 1e3, 'MΩ': 1e6 };

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">谐振 / 截止频率计算器</h1>
          <p class="tool-desc">LC 谐振频率、RC 与 RL 截止频率计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="lc">LC 谐振</button>
          <button class="tab" data-mode="rc">RC 截止</button>
          <button class="tab" data-mode="rl">RL 截止</button>
        </div>

        <div class="tab-content active" data-mode="lc">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>电感 L</label>
              <div class="input-with-unit">
                <input type="number" id="lc-l" value="100" step="any" />
                <select id="lc-l-unit">
                  <option value="nH">nH</option>
                  <option value="μH" selected>μH</option>
                  <option value="mH">mH</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>电容 C</label>
              <div class="input-with-unit">
                <input type="number" id="lc-c" value="100" step="any" />
                <select id="lc-c-unit">
                  <option value="pF" selected>pF</option>
                  <option value="nF">nF</option>
                  <option value="μF">μF</option>
                  <option value="mF">mF</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:16px;">
            <label>谐振频率 f₀</label>
            <div class="result-box" id="lc-res">—</div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            f₀ = 1 / (2π√(L·C))
          </div>
        </div>

        <div class="tab-content" data-mode="rc">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>电阻 R</label>
              <div class="input-with-unit">
                <input type="number" id="rc-r" value="1" step="any" />
                <select id="rc-r-unit">
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
                <select id="rc-c-unit">
                  <option value="pF">pF</option>
                  <option value="nF">nF</option>
                  <option value="μF" selected>μF</option>
                  <option value="mF">mF</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
          </div>
          <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div class="input-group">
              <label>截止频率 f<sub>c</sub></label>
              <div class="result-box" id="rc-fc">—</div>
            </div>
            <div class="input-group">
              <label>时间常数 τ</label>
              <div class="result-box" id="rc-tau">—</div>
            </div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            f<sub>c</sub> = 1 / (2πRC) &nbsp;&nbsp; τ = R × C
          </div>
        </div>

        <div class="tab-content" data-mode="rl">
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>电阻 R</label>
              <div class="input-with-unit">
                <input type="number" id="rl-r" value="100" step="any" />
                <select id="rl-r-unit">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>电感 L</label>
              <div class="input-with-unit">
                <input type="number" id="rl-l" value="10" step="any" />
                <select id="rl-l-unit">
                  <option value="nH">nH</option>
                  <option value="μH" selected>μH</option>
                  <option value="mH">mH</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:16px;">
            <label>截止频率 f<sub>c</sub></label>
            <div class="result-box" id="rl-fc">—</div>
          </div>
          <div class="formula-box" style="margin-top:16px;">
            f<sub>c</sub> = R / (2πL)
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

    function getL(id) {
      const v = parseFloat(container.querySelector(`#${id}-l`).value);
      const u = container.querySelector(`#${id}-l-unit`).value;
      return isNaN(v) ? null : v * L_UNITS[u];
    }
    function getC(id) {
      const v = parseFloat(container.querySelector(`#${id}-c`).value);
      const u = container.querySelector(`#${id}-c-unit`).value;
      return isNaN(v) ? null : v * C_UNITS[u];
    }
    function getR(id) {
      const v = parseFloat(container.querySelector(`#${id}-r`).value);
      const u = container.querySelector(`#${id}-r-unit`).value;
      return isNaN(v) ? null : v * R_UNITS[u];
    }

    function setRes(id, val) {
      const el = container.querySelector(`#${id}`);
      if (val === null || isNaN(val) || !isFinite(val)) {
        el.textContent = '—';
        return;
      }
      const au = autoUnit(val, 'frequency');
      el.textContent = `${formatNumber(au.value)} ${au.unit}`;
    }

    function setTime(id, val) {
      const el = container.querySelector(`#${id}`);
      if (val === null || isNaN(val) || !isFinite(val)) {
        el.textContent = '—';
        return;
      }
      const au = autoUnit(val, 'time');
      el.textContent = `${formatNumber(au.value)} ${au.unit}`;
    }

    function calculate() {
      const active = container.querySelector('.tab.active').dataset.mode;
      if (active === 'lc') {
        const L = getL('lc');
        const C = getC('lc');
        if (L === null || C === null || L <= 0 || C <= 0) {
          container.querySelector('#lc-res').textContent = '—';
          return;
        }
        const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
        setRes('lc-res', f0);
      } else if (active === 'rc') {
        const R = getR('rc');
        const C = getC('rc');
        if (R === null || C === null || R <= 0 || C <= 0) {
          container.querySelector('#rc-fc').textContent = '—';
          container.querySelector('#rc-tau').textContent = '—';
          return;
        }
        const fc = 1 / (2 * Math.PI * R * C);
        const tau = R * C;
        setRes('rc-fc', fc);
        setTime('rc-tau', tau);
      } else if (active === 'rl') {
        const R = getR('rl');
        const L = getL('rl');
        if (R === null || L === null || R <= 0 || L <= 0) {
          container.querySelector('#rl-fc').textContent = '—';
          return;
        }
        const fc = R / (2 * Math.PI * L);
        setRes('rl-fc', fc);
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    calculate();
  }
};
