import { debounce, formatNumber } from '../utils.js';

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📶</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">dB 换算器</h1>
          <p class="tool-desc">dBm、dBW、W、mW、Vrms、Vpp、dBV 在指定阻抗下互转</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>阻抗 Z</label>
            <div class="input-with-unit">
              <input type="number" id="db-z" value="50" step="any" />
              <select disabled><option>Ω</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              <button class="preset-btn" data-z="50">50Ω</button>
              <button class="preset-btn" data-z="600">600Ω</button>
              <button class="preset-btn" data-z="75">75Ω</button>
            </div>
          </div>
          <div class="input-group">
            <label>输入值</label>
            <div class="input-with-unit">
              <input type="number" id="db-in" value="0" step="any" />
              <select id="db-unit">
                <option value="dBm" selected>dBm</option>
                <option value="dBW">dBW</option>
                <option value="W">W</option>
                <option value="mW">mW</option>
                <option value="Vrms">Vrms</option>
                <option value="Vpp">Vpp</option>
                <option value="dBV">dBV</option>
              </select>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;">
          <table class="data-table">
            <thead>
              <tr><th>单位</th><th>数值</th></tr>
            </thead>
            <tbody id="db-tbody">
            </tbody>
          </table>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">换算公式</div>
          <div>P(mW) = 10^(dBm/10)</div>
          <div>P(W) = 10^(dBW/10)</div>
          <div>Vrms = √(P × Z)</div>
          <div>Vpp = Vrms × 2√2</div>
          <div>dBV = 20 × log₁₀(Vrms)</div>
        </div>
      </div>
    `;

    const zEl = container.querySelector('#db-z');
    const inEl = container.querySelector('#db-in');
    const unitEl = container.querySelector('#db-unit');
    const tbody = container.querySelector('#db-tbody');

    function calculate() {
      const Z = parseFloat(zEl.value);
      const val = parseFloat(inEl.value);
      const unit = unitEl.value;

      if (isNaN(Z) || Z <= 0 || isNaN(val)) {
        tbody.innerHTML = '<tr><td colspan="2">请输入有效数值</td></tr>';
        return;
      }

      let P_W, P_mW, dBm, dBW, Vrms, Vpp, dBV;

      if (unit === 'dBm') {
        dBm = val;
        P_mW = Math.pow(10, dBm / 10);
        P_W = P_mW / 1000;
      } else if (unit === 'dBW') {
        dBW = val;
        P_W = Math.pow(10, dBW / 10);
        P_mW = P_W * 1000;
      } else if (unit === 'W') {
        P_W = val;
        P_mW = P_W * 1000;
      } else if (unit === 'mW') {
        P_mW = val;
        P_W = P_mW / 1000;
      } else if (unit === 'Vrms') {
        Vrms = val;
        P_W = Vrms * Vrms / Z;
        P_mW = P_W * 1000;
      } else if (unit === 'Vpp') {
        Vpp = val;
        Vrms = Vpp / (2 * Math.sqrt(2));
        P_W = Vrms * Vrms / Z;
        P_mW = P_W * 1000;
      } else if (unit === 'dBV') {
        dBV = val;
        Vrms = Math.pow(10, dBV / 20);
        P_W = Vrms * Vrms / Z;
        P_mW = P_W * 1000;
      }

      if (P_W === undefined && P_mW !== undefined) P_W = P_mW / 1000;
      if (P_mW === undefined && P_W !== undefined) P_mW = P_W * 1000;
      if (dBm === undefined) dBm = 10 * Math.log10(P_mW);
      if (dBW === undefined) dBW = 10 * Math.log10(P_W);
      if (Vrms === undefined) Vrms = Math.sqrt(P_W * Z);
      if (Vpp === undefined) Vpp = Vrms * 2 * Math.sqrt(2);
      if (dBV === undefined) dBV = 20 * Math.log10(Vrms);

      function safeFmt(num) {
        if (!isFinite(num)) return num > 0 ? '> 1e308' : '< -1e308';
        return formatNumber(num);
      }

      const rows = [
        ['dBm', safeFmt(dBm) + ' dBm'],
        ['dBW', safeFmt(dBW) + ' dBW'],
        ['W', safeFmt(P_W) + ' W'],
        ['mW', safeFmt(P_mW) + ' mW'],
        ['Vrms', safeFmt(Vrms) + ' V'],
        ['Vpp', safeFmt(Vpp) + ' V'],
        ['dBV', safeFmt(dBV) + ' dBV'],
      ];

      tbody.innerHTML = rows.map(([u, v]) => `<tr><td>${u}</td><td>${v}</td></tr>`).join('');
    }

    const debouncedCalc = debounce(calculate, 100);
    [zEl, inEl, unitEl].forEach(el => el.addEventListener('input', debouncedCalc));

    container.querySelectorAll('.preset-btn[data-z]').forEach(btn => {
      btn.addEventListener('click', () => {
        zEl.value = btn.dataset.z;
        calculate();
      });
    });

    calculate();
  }
};
