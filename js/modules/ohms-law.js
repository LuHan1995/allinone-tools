import { autoUnit, debounce, formatNumber } from '../utils.js';

const unitFactors = {
  voltage: { mV: 1e-3, V: 1, kV: 1e3 },
  current: { 'μA': 1e-6, mA: 1e-3, A: 1 },
  resistance: { Ω: 1, 'kΩ': 1e3, 'MΩ': 1e6 },
  power: { mW: 1e-3, W: 1, kW: 1e3 },
};

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⚡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">欧姆定律计算器</h1>
          <p class="tool-desc">输入任意两个量，自动计算电压、电流、电阻、功率</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>电压 (V)</label>
            <div class="input-with-unit">
              <input type="number" id="ol-v" placeholder="留空自动计算" step="any" />
              <select id="ol-v-unit">
                <option value="mV">mV</option>
                <option value="V" selected>V</option>
                <option value="kV">kV</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>电流 (I)</label>
            <div class="input-with-unit">
              <input type="number" id="ol-i" placeholder="留空自动计算" step="any" />
              <select id="ol-i-unit">
                <option value="μA">μA</option>
                <option value="mA" selected>mA</option>
                <option value="A">A</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>电阻 (R)</label>
            <div class="input-with-unit">
              <input type="number" id="ol-r" placeholder="留空自动计算" step="any" />
              <select id="ol-r-unit">
                <option value="Ω">Ω</option>
                <option value="kΩ" selected>kΩ</option>
                <option value="MΩ">MΩ</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>功率 (P)</label>
            <div class="input-with-unit">
              <input type="number" id="ol-p" placeholder="留空自动计算" step="any" />
              <select id="ol-p-unit">
                <option value="mW">mW</option>
                <option value="W" selected>W</option>
                <option value="kW">kW</option>
              </select>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>计算结果 — 电压</label>
            <div class="result-box" id="ol-res-v">—</div>
          </div>
          <div class="input-group">
            <label>计算结果 — 电流</label>
            <div class="result-box" id="ol-res-i">—</div>
          </div>
          <div class="input-group">
            <label>计算结果 — 电阻</label>
            <div class="result-box" id="ol-res-r">—</div>
          </div>
          <div class="input-group">
            <label>计算结果 — 功率</label>
            <div class="result-box" id="ol-res-p">—</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">常用公式</div>
          <div>P = V × I</div>
          <div>V = I × R</div>
          <div>P = I² × R</div>
          <div>P = V² / R</div>
        </div>
      </div>
    `;

    const ids = ['v', 'i', 'r', 'p'];
    const inputs = {};
    const units = {};
    const results = {};
    ids.forEach(id => {
      inputs[id] = container.querySelector(`#ol-${id}`);
      units[id] = container.querySelector(`#ol-${id}-unit`);
      results[id] = container.querySelector(`#ol-res-${id}`);
    });

    function getVal(id) {
      const v = parseFloat(inputs[id].value);
      if (isNaN(v)) return null;
      return v * unitFactors[id === 'v' ? 'voltage' : id === 'i' ? 'current' : id === 'r' ? 'resistance' : 'power'][units[id].value];
    }

    function setRes(id, val) {
      if (val === null || isNaN(val)) {
        results[id].textContent = '—';
        results[id].style.color = '';
        return;
      }
      const au = autoUnit(val, id === 'v' ? 'voltage' : id === 'i' ? 'current' : id === 'r' ? 'resistance' : 'power');
      results[id].textContent = `${formatNumber(au.value)} ${au.unit}`;
      results[id].style.color = 'var(--primary)';
    }

    function showError(msg) {
      ids.forEach(id => {
        results[id].textContent = msg;
        results[id].style.color = 'var(--danger)';
      });
    }

    function calculate() {
      const v = getVal('v');
      const i = getVal('i');
      const r = getVal('r');
      const p = getVal('p');

      const filled = [v, i, r, p].filter(x => x !== null).length;
      if (filled < 2) {
        ids.forEach(id => {
          const has = getVal(id) !== null;
          results[id].textContent = has ? `${formatNumber(parseFloat(inputs[id].value))} ${units[id].value}` : '—';
          results[id].style.color = has ? 'var(--primary)' : '';
        });
        return;
      }

      let cv = v, ci = i, cr = r, cp = p;

      // 一致性校验：若已填值多于2个，检查是否自相矛盾
      if (filled > 2) {
        const checks = [];
        if (v !== null && i !== null && r !== null && Math.abs(v - i * r) > 0.01 * Math.abs(v || 1)) checks.push('V ≠ I×R');
        if (v !== null && i !== null && p !== null && Math.abs(p - v * i) > 0.01 * Math.abs(p || 1)) checks.push('P ≠ V×I');
        if (v !== null && r !== null && p !== null && Math.abs(p - v * v / r) > 0.01 * Math.abs(p || 1)) checks.push('P ≠ V²/R');
        if (i !== null && r !== null && p !== null && Math.abs(p - i * i * r) > 0.01 * Math.abs(p || 1)) checks.push('P ≠ I²×R');
        if (checks.length) {
          showError('数据矛盾：' + checks.join('，'));
          return;
        }
      }

      try {
        if (cv !== null && ci !== null) {
          cr = cv / ci;
          cp = cv * ci;
        } else if (cv !== null && cr !== null) {
          if (cr === 0) { showError('电阻不能为 0'); return; }
          ci = cv / cr;
          cp = cv * cv / cr;
        } else if (cv !== null && cp !== null) {
          if (cv === 0) { showError('电压为 0 时无法计算电流'); return; }
          ci = cp / cv;
          cr = cv * cv / cp;
        } else if (ci !== null && cr !== null) {
          cv = ci * cr;
          cp = ci * ci * cr;
        } else if (ci !== null && cp !== null) {
          if (ci === 0) { showError('电流为 0 时无法计算电压'); return; }
          cv = cp / ci;
          cr = cp / (ci * ci);
        } else if (cr !== null && cp !== null) {
          if (cr === 0) { showError('电阻不能为 0'); return; }
          cv = Math.sqrt(cp * cr);
          ci = Math.sqrt(cp / cr);
        }

        if (cv < 0 || ci < 0 || cr < 0 || cp < 0) {
          showError('物理量不能为负值');
          return;
        }

        setRes('v', cv);
        setRes('i', ci);
        setRes('r', cr);
        setRes('p', cp);
      } catch (e) {
        showError('计算错误');
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    ids.forEach(id => {
      inputs[id].addEventListener('input', debouncedCalc);
      units[id].addEventListener('change', debouncedCalc);
    });

    calculate();
  }
};
