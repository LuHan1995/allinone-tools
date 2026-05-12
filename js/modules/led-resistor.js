import { autoUnit, debounce, generateSeries } from '../utils.js';

const e24Base = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const e24Series = generateSeries(e24Base, 10000000);

const ledPresets = [
  { name: '红', vf: 1.8 },
  { name: '绿', vf: 2.2 },
  { name: '蓝/白', vf: 3.3 },
  { name: '黄', vf: 2.0 },
  { name: '紫', vf: 3.0 },
];

const currentPresets = [5, 10, 20, 50, 100];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">💡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">LED 限流电阻计算器</h1>
          <p class="tool-desc">根据输入电压、LED 正向压降和期望电流计算限流电阻</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>输入电压 (V<sub>in</sub>)</label>
            <div class="input-with-unit">
              <input type="number" id="led-vin" value="5" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>LED 正向压降 (V<sub>f</sub>)</label>
            <div class="input-with-unit">
              <input type="number" id="led-vf" value="2.0" step="any" />
              <select disabled><option>V</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${ledPresets.map(p => `<button class="preset-btn" data-vf="${p.vf}">${p.name} ${p.vf}V</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>期望电流 (I<sub>f</sub>)</label>
            <div class="input-with-unit">
              <input type="number" id="led-if" value="20" step="any" />
              <select disabled><option>mA</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${currentPresets.map(v => `<button class="preset-btn" data-if="${v}">${v} mA</button>`).join('')}
            </div>
          </div>
        </div>

        <div id="led-warning" style="margin-top:16px;color:var(--danger);font-weight:600;display:none;">
          ⚠️ 输入电压必须大于 LED 压降
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>限流电阻 R</label>
            <div class="result-box" id="led-res-r">—</div>
          </div>
          <div class="input-group">
            <label>电阻实际功耗</label>
            <div class="result-box" id="led-res-p">—</div>
          </div>
          <div class="input-group">
            <label>推荐电阻功率（2×降额）</label>
            <div class="result-box" id="led-res-p-rec">—</div>
          </div>
          <div class="input-group">
            <label>最接近 E24 标称值</label>
            <div class="result-box" id="led-res-e24">—</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>R = (V<sub>in</sub> − V<sub>f</sub>) / I<sub>f</sub></div>
          <div>P = I<sub>f</sub>² × R</div>
          <div>推荐功率 = P × 2（50% 降额设计）</div>
        </div>
      </div>
    `;

    const vinEl = container.querySelector('#led-vin');
    const vfEl = container.querySelector('#led-vf');
    const ifEl = container.querySelector('#led-if');
    const warnEl = container.querySelector('#led-warning');
    const resREl = container.querySelector('#led-res-r');
    const resPEl = container.querySelector('#led-res-p');
    const resPRecEl = container.querySelector('#led-res-p-rec');
    const resE24El = container.querySelector('#led-res-e24');

    function findClosestE24(val) {
      let best = e24Series[0];
      let bestErr = Math.abs(e24Series[0] - val);
      for (const v of e24Series) {
        const err = Math.abs(v - val);
        if (err < bestErr) {
          bestErr = err;
          best = v;
        }
      }
      return best;
    }

    function calculate() {
      const vin = parseFloat(vinEl.value);
      const vf = parseFloat(vfEl.value);
      const i_f = parseFloat(ifEl.value);

      if (isNaN(vin) || isNaN(vf) || isNaN(i_f)) {
        [resREl, resPEl, resPRecEl, resE24El].forEach(el => el.textContent = '—');
        warnEl.style.display = 'none';
        return;
      }

      if (i_f <= 0) {
        warnEl.textContent = '⚠️ 电流必须大于 0';
        warnEl.style.display = 'block';
        [resREl, resPEl, resPRecEl, resE24El].forEach(el => el.textContent = '—');
        return;
      }

      if (vin <= vf) {
        warnEl.textContent = '⚠️ 输入电压必须大于 LED 压降';
        warnEl.style.display = 'block';
        [resREl, resPEl, resPRecEl, resE24El].forEach(el => el.textContent = '—');
        return;
      }
      warnEl.style.display = 'none';

      const i_f_a = i_f * 1e-3;
      const r = (vin - vf) / i_f_a;
      const p = i_f_a * i_f_a * r;
      const pRec = p * 2;
      const e24 = findClosestE24(r);

      const auR = autoUnit(r, 'resistance');
      const auP = autoUnit(p, 'power');
      const auPRec = autoUnit(pRec, 'power');
      const auE24 = autoUnit(e24, 'resistance');

      resREl.textContent = `${auR.value.toFixed(2)} ${auR.unit}`;
      resPEl.textContent = `${auP.value.toFixed(3)} ${auP.unit}`;
      resPRecEl.textContent = `${auPRec.value.toFixed(3)} ${auPRec.unit}`;
      resE24El.textContent = `${auE24.value.toFixed(2)} ${auE24.unit}`;
    }

    const debouncedCalc = debounce(calculate, 100);
    [vinEl, vfEl, ifEl].forEach(el => el.addEventListener('input', debouncedCalc));

    container.querySelectorAll('.preset-btn[data-vf]').forEach(btn => {
      btn.addEventListener('click', () => {
        vfEl.value = btn.dataset.vf;
        calculate();
      });
    });
    container.querySelectorAll('.preset-btn[data-if]').forEach(btn => {
      btn.addEventListener('click', () => {
        ifEl.value = btn.dataset.if;
        calculate();
      });
    });

    calculate();
  }
};
