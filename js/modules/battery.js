import { autoUnit, debounce, formatNumber } from '../utils.js';

const BATTERY_PRESETS = [
  { name: '18650 锂电', cap: 2500, unit: 'mAh' },
  { name: 'AA 碱性', cap: 2000, unit: 'mAh' },
  { name: 'AAA 碱性', cap: 800, unit: 'mAh' },
  { name: '手机电池', cap: 4000, unit: 'mAh' },
  { name: '汽车电瓶', cap: 60, unit: 'Ah' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔋</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">电池续航估算</h1>
          <p class="tool-desc">估算电池在不同工作模式下的续航时间</p>
        </div>
      </div>
      <div class="card">
        <div class="preset-btns" style="margin-bottom:16px;">
          ${BATTERY_PRESETS.map(p => `<button class="preset-btn" data-cap="${p.cap}" data-unit="${p.unit}">${p.name} (${p.cap}${p.unit})</button>`).join('')}
        </div>
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>电池容量</label>
            <div class="input-with-unit">
              <input type="number" id="bat-cap" value="2500" step="any" />
              <select id="bat-cap-unit">
                <option value="mAh" selected>mAh</option>
                <option value="Ah">Ah</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>工作电流</label>
            <div class="input-with-unit">
              <input type="number" id="bat-iwork" value="100" step="any" />
              <select id="bat-iwork-unit">
                <option value="mA" selected>mA</option>
                <option value="A">A</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>休眠电流 (可选)</label>
            <div class="input-with-unit">
              <input type="number" id="bat-isleep" value="0" step="any" />
              <select id="bat-isleep-unit">
                <option value="mA" selected>mA</option>
                <option value="A">A</option>
                <option value="μA">μA</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>占空比 / 工作比例 (%)</label>
            <div class="input-with-unit">
              <input type="number" id="bat-duty" value="100" min="0" max="100" step="any" />
              <select disabled><option>%</option></select>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>续航时间</label>
            <div class="result-box" id="bat-res">—</div>
          </div>
          <div class="input-group">
            <label>等效平均电流</label>
            <div class="result-box" id="bat-avg">—</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>续航(h) = 容量(mAh) / (工作电流×占空比 + 休眠电流×(1−占空比))</div>
        </div>
      </div>
    `;

    const capEl = container.querySelector('#bat-cap');
    const capUnitEl = container.querySelector('#bat-cap-unit');
    const iworkEl = container.querySelector('#bat-iwork');
    const iworkUnitEl = container.querySelector('#bat-iwork-unit');
    const isleepEl = container.querySelector('#bat-isleep');
    const isleepUnitEl = container.querySelector('#bat-isleep-unit');
    const dutyEl = container.querySelector('#bat-duty');
    const resEl = container.querySelector('#bat-res');
    const avgEl = container.querySelector('#bat-avg');

    function toUnit(val, unit) {
      if (unit === 'μA') return val * 1e-3;
      if (unit === 'mA') return val;
      if (unit === 'A') return val * 1000;
      if (unit === 'mAh') return val;
      if (unit === 'Ah') return val * 1000;
      return val;
    }

    function calculate() {
      const cap = toUnit(parseFloat(capEl.value), capUnitEl.value);
      const iwork = toUnit(parseFloat(iworkEl.value), iworkUnitEl.value);
      const isleep = toUnit(parseFloat(isleepEl.value), isleepUnitEl.value);
      const duty = parseFloat(dutyEl.value) / 100;

      if (isNaN(cap) || isNaN(iwork) || isNaN(isleep) || isNaN(duty)) {
        resEl.textContent = '—';
        avgEl.textContent = '—';
        return;
      }

      const avg = iwork * duty + isleep * (1 - duty);
      if (avg <= 0) { resEl.textContent = '∞'; avgEl.textContent = '0 mA'; return; }

      const hours = cap / avg;
      let timeText;
      if (hours >= 24) {
        timeText = `${formatNumber(hours / 24)} 天`;
      } else if (hours >= 1) {
        timeText = `${formatNumber(hours)} 小时`;
      } else {
        const au = autoUnit(hours * 3600, 'time');
        timeText = `${formatNumber(au.value)} ${au.unit}`;
      }
      resEl.textContent = timeText;
      avgEl.textContent = `${formatNumber(avg)} mA`;
    }

    const debouncedCalc = debounce(calculate, 100);
    [capEl, capUnitEl, iworkEl, iworkUnitEl, isleepEl, isleepUnitEl, dutyEl].forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    container.querySelectorAll('.preset-btn[data-cap]').forEach(btn => {
      btn.addEventListener('click', () => {
        capEl.value = btn.dataset.cap;
        capUnitEl.value = btn.dataset.unit;
        calculate();
      });
    });

    calculate();
  }
};
