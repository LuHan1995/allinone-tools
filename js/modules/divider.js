import { generateSeries, formatNumber } from '../utils.js';

const e24Base = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const e96Base = [1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09, 3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76];

const e24Series = generateSeries(e24Base, 20000000);
const e96Series = generateSeries(e96Base, 20000000);

function formatRes(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(2) + ' MΩ';
  if (val >= 1000) return (val / 1000).toFixed(2) + ' kΩ';
  return val.toFixed(1) + ' Ω';
}

function runBruteForce(series, type, vin, target, results) {
  for (const r1 of series) {
    for (const r2 of series) {
      const vout = vin * (r2 / (r1 + r2));
      const err = ((vout - target) / target) * 100;
      results.push({ type, r1, r2, vout, err });
    }
  }
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⚡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">分压计算器</h1>
          <p class="tool-desc">E24/E96穷举最优分压电阻</p>
        </div>
      </div>
      <div class="card">
        <div class="grid-2" style="margin-bottom:16px;">
          <div class="input-group">
            <label>输入电压 (Vin)</label>
            <div class="input-with-unit">
              <input type="number" id="div-vin" value="12" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>目标电压 (Vout)</label>
            <div class="input-with-unit">
              <input type="number" id="div-vout" value="3.3" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
        </div>
        <button class="btn" id="div-calc">开始穷举计算</button>
        <div id="div-status" style="margin-top:10px;color:var(--text-secondary);font-style:italic;"></div>
        <table class="data-table" id="div-table" style="display:none;">
          <thead>
            <tr><th>标准</th><th>R1 (上拉)</th><th>R2 (下拉)</th><th>实际 Vout</th><th>误差 (%)</th></tr>
          </thead>
          <tbody id="div-tbody"></tbody>
        </table>
      </div>
    `;

    const vinEl = container.querySelector('#div-vin');
    const voutEl = container.querySelector('#div-vout');
    const statusEl = container.querySelector('#div-status');
    const tableEl = container.querySelector('#div-table');
    const tbodyEl = container.querySelector('#div-tbody');

    container.querySelector('#div-calc').addEventListener('click', () => {
      const vin = parseFloat(vinEl.value);
      const target = parseFloat(voutEl.value);
      if (!vin || !target || target >= vin) {
        alert('请输入有效的电压值（目标电压需小于输入电压）');
        return;
      }
      statusEl.textContent = '正在穷举所有组合，请稍候...';
      tableEl.style.display = 'none';

      setTimeout(() => {
        const results = [];
        runBruteForce(e24Series, 'E24', vin, target, results);
        runBruteForce(e96Series, 'E96', vin, target, results);
        results.sort((a, b) => Math.abs(a.err) - Math.abs(b.err));
        displayResults(results.slice(0, 15));
        statusEl.textContent = '计算完成！';
      }, 50);
    });

    function displayResults(data) {
      tbodyEl.innerHTML = '';
      tableEl.style.display = 'table';
      data.forEach((item, index) => {
        const tr = document.createElement('tr');
        if (index === 0) tr.className = 'best';
        tr.innerHTML = `
          <td>${item.type}</td>
          <td>${formatRes(item.r1)}</td>
          <td>${formatRes(item.r2)}</td>
          <td>${item.vout.toFixed(4)} V</td>
          <td>${item.err.toFixed(4)}%</td>
        `;
        tbodyEl.appendChild(tr);
      });
    }
  }
};
