import { autoUnit, debounce, formatNumber } from '../utils.js';

const L_UNITS = { nH: 1e-9, 'μH': 1e-6, mH: 1e-3, H: 1 };
const C_UNITS = { pF: 1e-12, nF: 1e-9, 'μF': 1e-6, mF: 1e-3, F: 1 };
const R_UNITS = { Ω: 1, 'kΩ': 1e3, 'MΩ': 1e6 };

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📉</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">滤波器 / 波特图计算器</h1>
          <p class="tool-desc">RC/RL/LC 滤波器截止频率与频率响应计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="rclp">RC 低通</button>
          <button class="tab" data-mode="rchp">RC 高通</button>
          <button class="tab" data-mode="rllp">RL 低通</button>
          <button class="tab" data-mode="rlhp">RL 高通</button>
          <button class="tab" data-mode="lclp">LC 低通</button>
        </div>

        ${['rclp', 'rchp'].map(m => `
        <div class="tab-content ${m === 'rclp' ? 'active' : ''}" data-mode="${m}">
          <div class="preset-btns" style="margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速参数:</span>
            <button class="preset-btn" data-mode="${m}" data-r="1" data-ru="kΩ" data-c="100" data-cu="nF">1kΩ+100nF</button>
            <button class="preset-btn" data-mode="${m}" data-r="10" data-ru="kΩ" data-c="100" data-cu="nF">10kΩ+100nF</button>
            <button class="preset-btn" data-mode="${m}" data-r="1" data-ru="kΩ" data-c="1" data-cu="μF">1kΩ+1μF</button>
          </div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>电阻 R</label>
              <div class="input-with-unit">
                <input type="number" id="${m}-r" value="1" step="any" />
                <select id="${m}-r-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>电容 C</label>
              <div class="input-with-unit">
                <input type="number" id="${m}-c" value="100" step="any" />
                <select id="${m}-c-u">
                  <option value="pF">pF</option>
                  <option value="nF">nF</option>
                  <option value="μF" selected>μF</option>
                  <option value="mF">mF</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:16px;">
            <label>截止频率 f<sub>c</sub></label>
            <div class="result-box" id="${m}-fc">—</div>
          </div>
          <div style="margin-top:10px;color:var(--text-secondary);font-size:13px;">
            ${m === 'rclp' ? '一阶低通衰减斜率：−20 dB/dec' : '一阶高通衰减斜率：−20 dB/dec（低频端）'}
          </div>
          <div style="margin-top:20px;">
            <table class="data-table" id="${m}-table">
              <thead><tr><th>频率点</th><th>衰减量 (dB)</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="formula-box" style="margin-top:16px;">f<sub>c</sub> = 1 / (2πRC)</div>
        </div>
        `).join('')}

        ${['rllp', 'rlhp'].map(m => `
        <div class="tab-content" data-mode="${m}">
          <div class="preset-btns" style="margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速参数:</span>
            <button class="preset-btn" data-mode="${m}" data-r="100" data-ru="Ω" data-l="10" data-lu="mH">100Ω+10mH</button>
            <button class="preset-btn" data-mode="${m}" data-r="1" data-ru="kΩ" data-l="100" data-lu="mH">1kΩ+100mH</button>
          </div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>电阻 R</label>
              <div class="input-with-unit">
                <input type="number" id="${m}-r" value="100" step="any" />
                <select id="${m}-r-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>电感 L</label>
              <div class="input-with-unit">
                <input type="number" id="${m}-l" value="10" step="any" />
                <select id="${m}-l-u">
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
            <div class="result-box" id="${m}-fc">—</div>
          </div>
          <div style="margin-top:10px;color:var(--text-secondary);font-size:13px;">
            ${m === 'rllp' ? '一阶低通衰减斜率：−20 dB/dec' : '一阶高通衰减斜率：−20 dB/dec（低频端）'}
          </div>
          <div style="margin-top:20px;">
            <table class="data-table" id="${m}-table">
              <thead><tr><th>频率点</th><th>衰减量 (dB)</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="formula-box" style="margin-top:16px;">f<sub>c</sub> = R / (2πL)</div>
        </div>
        `).join('')}

        <div class="tab-content" data-mode="lclp">
          <div class="preset-btns" style="margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速参数:</span>
            <button class="preset-btn" data-mode="lclp" data-l="100" data-lu="μH" data-c="100" data-cu="μF">100μH+100μF</button>
            <button class="preset-btn" data-mode="lclp" data-l="1" data-lu="mH" data-c="10" data-cu="μF">1mH+10μF</button>
            <button class="preset-btn" data-mode="lclp" data-l="10" data-lu="μH" data-c="10" data-cu="μF">10μH+10μF</button>
          </div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>电感 L</label>
              <div class="input-with-unit">
                <input type="number" id="lclp-l" value="100" step="any" />
                <select id="lclp-l-u">
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
                <input type="number" id="lclp-c" value="100" step="any" />
                <select id="lclp-c-u">
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
            <label>截止频率 f<sub>c</sub></label>
            <div class="result-box" id="lclp-fc">—</div>
          </div>
          <div style="margin-top:10px;color:var(--text-secondary);font-size:13px;">二阶 LC 低通衰减斜率：−40 dB/dec</div>
          <div style="margin-top:20px;">
            <table class="data-table" id="lclp-table">
              <thead><tr><th>频率点</th><th>衰减量 (dB)</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="formula-box" style="margin-top:16px;">f<sub>c</sub> = 1 / (2π√(LC))</div>
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

    function getVal(mode, name) {
      const v = parseFloat(container.querySelector(`#${mode}-${name}`).value);
      const sel = container.querySelector(`#${mode}-${name}-u`);
      const u = sel ? sel.value : '';
      if (isNaN(v)) return null;
      if (name === 'r') return v * R_UNITS[u];
      if (name === 'c') return v * C_UNITS[u];
      if (name === 'l') return v * L_UNITS[u];
      return v;
    }

    function setFc(id, val) {
      const el = container.querySelector(`#${id}`);
      if (val === null || isNaN(val) || !isFinite(val)) { el.textContent = '—'; return; }
      const au = autoUnit(val, 'frequency');
      el.textContent = `${formatNumber(au.value)} ${au.unit}`;
    }

    function fillTable(mode, fc, type) {
      const tbody = container.querySelector(`#${mode}-table tbody`);
      if (!fc || fc <= 0) { tbody.innerHTML = ''; return; }
      const ratios = [0.1, 0.5, 1, 2, 10];
      const rows = ratios.map(r => {
        const f = fc * r;
        let att;
        if (type === 'lp1') {
          att = -20 * Math.log10(Math.sqrt(1 + r * r));
        } else if (type === 'hp1') {
          att = -20 * Math.log10(Math.sqrt(1 + 1 / (r * r)));
        } else if (type === 'lp2') {
          // Butterworth 二阶低通近似：r<=1 时过渡带使用 sqrt(1+r^4)，r>1 时远阻带按 −40 dB/dec
          att = r > 1 ? -40 * Math.log10(r) : -20 * Math.log10(Math.sqrt(1 + r * r * r * r));
        }
        const au = autoUnit(f, 'frequency');
        return `<tr><td>${r === 1 ? 'f<sub>c</sub>' : formatNumber(au.value) + ' ' + au.unit} (${r}x)</td><td>${att.toFixed(2)} dB</td></tr>`;
      });
      tbody.innerHTML = rows.join('');
    }

    function calculate() {
      const mode = container.querySelector('.tab.active').dataset.mode;
      if (mode === 'rclp' || mode === 'rchp') {
        const R = getVal(mode, 'r');
        const C = getVal(mode, 'c');
        if (R === null || C === null || R <= 0 || C <= 0) {
          container.querySelector(`#${mode}-fc`).textContent = '—';
          container.querySelector(`#${mode}-table tbody`).innerHTML = '';
          return;
        }
        const fc = 1 / (2 * Math.PI * R * C);
        setFc(`${mode}-fc`, fc);
        fillTable(mode, fc, mode === 'rclp' ? 'lp1' : 'hp1');
      } else if (mode === 'rllp' || mode === 'rlhp') {
        const R = getVal(mode, 'r');
        const L = getVal(mode, 'l');
        if (R === null || L === null || R <= 0 || L <= 0) {
          container.querySelector(`#${mode}-fc`).textContent = '—';
          container.querySelector(`#${mode}-table tbody`).innerHTML = '';
          return;
        }
        const fc = R / (2 * Math.PI * L);
        setFc(`${mode}-fc`, fc);
        fillTable(mode, fc, mode === 'rllp' ? 'lp1' : 'hp1');
      } else if (mode === 'lclp') {
        const L = getVal(mode, 'l');
        const C = getVal(mode, 'c');
        if (L === null || C === null || L <= 0 || C <= 0) {
          container.querySelector('#lclp-fc').textContent = '—';
          container.querySelector('#lclp-table tbody').innerHTML = '';
          return;
        }
        const fc = 1 / (2 * Math.PI * Math.sqrt(L * C));
        setFc('lclp-fc', fc);
        fillTable('lclp', fc, 'lp2');
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mode;
        if (btn.dataset.r !== undefined) {
          container.querySelector(`#${m}-r`).value = btn.dataset.r;
          container.querySelector(`#${m}-r-u`).value = btn.dataset.ru || 'kΩ';
        }
        if (btn.dataset.c !== undefined) {
          container.querySelector(`#${m}-c`).value = btn.dataset.c;
          container.querySelector(`#${m}-c-u`).value = btn.dataset.cu || 'μF';
        }
        if (btn.dataset.l !== undefined) {
          container.querySelector(`#${m}-l`).value = btn.dataset.l;
          container.querySelector(`#${m}-l-u`).value = btn.dataset.lu || 'μH';
        }
        calculate();
      });
    });

    calculate();
  }
};
