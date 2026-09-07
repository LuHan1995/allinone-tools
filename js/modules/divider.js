

function formatRes(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(2) + ' MΩ';
  if (val >= 1000) return (val / 1000).toFixed(2) + ' kΩ';
  return val.toFixed(1) + ' Ω';
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

    let worker = null;

    function getWorker() {
      if (!worker) {
        worker = new Worker(new URL('divider-worker.js', import.meta.url));
        worker.onmessage = (e) => {
          const { results } = e.data;
          results.sort((a, b) => Math.abs(a.err) - Math.abs(b.err));
          displayResults(results.slice(0, 15));
          statusEl.textContent = '计算完成！';
        };
      }
      return worker;
    }

    container.querySelector('#div-calc').addEventListener('click', () => {
      const vin = parseFloat(vinEl.value);
      const target = parseFloat(voutEl.value);
      if (!vin || !target || target >= vin) {
        alert('请输入有效的电压值（目标电压需小于输入电压）');
        return;
      }
      statusEl.textContent = '正在计算...';
      tableEl.style.display = 'none';

      getWorker().postMessage({ vin, target });
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

    return {
      destroy() {
        if (worker) {
          worker.terminate();
          worker = null;
        }
      }
    };
  }
};
