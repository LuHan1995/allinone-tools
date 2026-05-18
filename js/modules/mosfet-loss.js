import { debounce, autoUnit } from '../utils.js';

const RDS_PRESETS = [0.001, 0.005, 0.01, 0.05, 0.1];
const TIME_PRESETS = [5e-9, 10e-9, 20e-9, 50e-9, 100e-9];
const FSW_PRESETS = [100e3, 300e3, 500e3, 1e6];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔥</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">MOSFET 开关损耗计算器</h1>
          <p class="tool-desc">导通损耗、开关损耗、驱动损耗与结温估算</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>漏源电压 V<sub>ds</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-vds" value="12" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>漏极电流 I<sub>d</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-id" value="5" step="any" />
              <select disabled><option>A</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>导通电阻 R<sub>ds(on)</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-rds" value="10" step="any" />
              <select id="mf-rds-unit"><option value="0.001">mΩ</option><option value="1" selected>Ω</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${RDS_PRESETS.map(v => `<button class="preset-btn" data-rds="${v}">${v >= 0.001 ? (v*1000)+'mΩ' : v+'Ω'}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>上升时间 t<sub>r</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-tr" value="20" step="any" />
              <select id="mf-tr-unit"><option value="1e-12">ps</option><option value="1e-9" selected>ns</option><option value="1e-6">μs</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${TIME_PRESETS.map(v => `<button class="preset-btn" data-tr="${v}">${v >= 1e-6 ? (v*1e6)+'μs' : (v*1e9)+'ns'}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>下降时间 t<sub>f</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-tf" value="20" step="any" />
              <select id="mf-tf-unit"><option value="1e-12">ps</option><option value="1e-9" selected>ns</option><option value="1e-6">μs</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${TIME_PRESETS.map(v => `<button class="preset-btn" data-tf="${v}">${v >= 1e-6 ? (v*1e6)+'μs' : (v*1e9)+'ns'}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>开关频率 f<sub>sw</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-fsw" value="500" step="any" />
              <select id="mf-fsw-unit"><option value="1">Hz</option><option value="1000" selected>kHz</option><option value="1000000">MHz</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${FSW_PRESETS.map(v => `<button class="preset-btn" data-fsw="${v}">${v >= 1e6 ? (v/1e6)+'MHz' : (v/1e3)+'kHz'}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>栅极电荷 Q<sub>g</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-qg" value="15" step="any" />
              <select id="mf-qg-unit"><option value="1e-12">pC</option><option value="1e-9" selected>nC</option><option value="1e-6">μC</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>驱动电压 V<sub>gs</sub></label>
            <div class="input-with-unit">
              <input type="number" id="mf-vgs" value="10" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>占空比 D (%)</label>
            <div class="input-with-unit">
              <input type="number" id="mf-d" value="50" step="any" />
              <select disabled><option>%</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>结到环境热阻 θ<sub>ja</sub> (可选)</label>
            <div class="input-with-unit">
              <input type="number" id="mf-theta" value="50" step="any" />
              <select disabled><option>℃/W</option></select>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group"><label>导通损耗 P<sub>cond</sub></label><div class="result-box" id="mf-pcond">—</div></div>
          <div class="input-group"><label>开关损耗 P<sub>sw</sub></label><div class="result-box" id="mf-psw">—</div></div>
          <div class="input-group"><label>驱动损耗 P<sub>drv</sub></label><div class="result-box" id="mf-pdrv">—</div></div>
          <div class="input-group"><label>总损耗 P<sub>total</sub></label><div class="result-box" id="mf-ptotal">—</div></div>
          <div class="input-group"><label>估算结温升 ΔT<sub>j</sub></label><div class="result-box" id="mf-dtj">—</div></div>
        </div>

        <div class="formula-box" style="margin-top:16px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>P<sub>cond</sub> = I<sub>d</sub>² × R<sub>ds(on)</sub> × D</div>
          <div>P<sub>sw</sub> = 0.5 × V<sub>ds</sub> × I<sub>d</sub> × (t<sub>r</sub> + t<sub>f</sub>) × f<sub>sw</sub></div>
          <div>P<sub>drv</sub> = Q<sub>g</sub> × V<sub>gs</sub> × f<sub>sw</sub></div>
          <div>P<sub>total</sub> = P<sub>cond</sub> + P<sub>sw</sub> + P<sub>drv</sub> &nbsp;&nbsp; ΔT<sub>j</sub> = P<sub>total</sub> × θ<sub>ja</sub></div>
        </div>
      </div>
    `;

    function getVal(id, unitId) {
      const val = parseFloat(container.querySelector(id).value);
      const unit = unitId ? parseFloat(container.querySelector(unitId).value) : 1;
      return isNaN(val) ? NaN : val * unit;
    }

    function calculate() {
      const vds = getVal('#mf-vds');
      const id = getVal('#mf-id');
      const rds = getVal('#mf-rds', '#mf-rds-unit');
      const tr = getVal('#mf-tr', '#mf-tr-unit');
      const tf = getVal('#mf-tf', '#mf-tf-unit');
      const fsw = getVal('#mf-fsw', '#mf-fsw-unit');
      const qg = getVal('#mf-qg', '#mf-qg-unit');
      const vgs = getVal('#mf-vgs');
      const dPct = parseFloat(container.querySelector('#mf-d').value);
      const theta = parseFloat(container.querySelector('#mf-theta').value);

      if ([vds, id, rds, tr, tf, fsw, qg, vgs, dPct].some(isNaN) || fsw <= 0 || dPct < 0 || dPct > 100) {
        ['mf-pcond','mf-psw','mf-pdrv','mf-ptotal','mf-dtj'].forEach(id => container.querySelector(`#${id}`).textContent = '—');
        return;
      }

      const D = dPct / 100;
      const pcond = id * id * rds * D;
      const psw = 0.5 * vds * id * (tr + tf) * fsw;
      const pdrv = qg * vgs * fsw;
      const ptotal = pcond + psw + pdrv;

      container.querySelector('#mf-pcond').textContent = formatPower(pcond);
      container.querySelector('#mf-psw').textContent = formatPower(psw);
      container.querySelector('#mf-pdrv').textContent = formatPower(pdrv);
      container.querySelector('#mf-ptotal').textContent = formatPower(ptotal);

      const dtjEl = container.querySelector('#mf-dtj');
      if (!isNaN(theta) && theta > 0) {
        const dtj = ptotal * theta;
        dtjEl.textContent = dtj.toFixed(1) + ' ℃';
        if (dtj > 80) dtjEl.style.color = 'var(--danger)';
        else if (dtj > 40) dtjEl.style.color = 'var(--warning)';
        else dtjEl.style.color = 'var(--success)';
      } else {
        dtjEl.textContent = '—';
        dtjEl.style.color = '';
      }
    }

    function formatPower(p) {
      const au = autoUnit(p, 'power');
      return `${au.value.toFixed(3)} ${au.unit}`;
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => el.addEventListener('input', debouncedCalc));

    // Presets
    container.querySelectorAll('.preset-btn[data-rds]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rds = parseFloat(btn.dataset.rds);
        const input = container.querySelector('#mf-rds');
        const unit = container.querySelector('#mf-rds-unit');
        if (rds < 1) { input.value = rds * 1000; unit.value = 0.001; }
        else { input.value = rds; unit.value = 1; }
        calculate();
      });
    });
    container.querySelectorAll('.preset-btn[data-tr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tr = parseFloat(btn.dataset.tr);
        const input = container.querySelector('#mf-tr');
        const unit = container.querySelector('#mf-tr-unit');
        if (tr < 1e-6) { input.value = tr * 1e9; unit.value = 1e-9; }
        else { input.value = tr * 1e6; unit.value = 1e-6; }
        calculate();
      });
    });
    container.querySelectorAll('.preset-btn[data-tf]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tf = parseFloat(btn.dataset.tf);
        const input = container.querySelector('#mf-tf');
        const unit = container.querySelector('#mf-tf-unit');
        if (tf < 1e-6) { input.value = tf * 1e9; unit.value = 1e-9; }
        else { input.value = tf * 1e6; unit.value = 1e-6; }
        calculate();
      });
    });
    container.querySelectorAll('.preset-btn[data-fsw]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fsw = parseFloat(btn.dataset.fsw);
        const input = container.querySelector('#mf-fsw');
        const unit = container.querySelector('#mf-fsw-unit');
        if (fsw >= 1e6) { input.value = fsw / 1e6; unit.value = 1000000; }
        else { input.value = fsw / 1e3; unit.value = 1000; }
        calculate();
      });
    });

    calculate();
  }
};
