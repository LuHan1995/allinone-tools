export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔌</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">阻抗计算</h1>
          <p class="tool-desc">微带线/带状线特征阻抗计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="micro">表面微带线</button>
          <button class="tab" data-mode="strip">内层带状线</button>
        </div>

        <div class="input-group">
          <label>走线宽度 (W) - mil</label>
          <input type="number" id="imp-w" value="10" step="any" />
        </div>
        <div class="input-group">
          <label id="imp-h-label">介质厚度 (H) - mil</label>
          <input type="number" id="imp-h" value="6" step="any" />
        </div>
        <div class="input-group">
          <label>铜厚 (T) - mil (1oz=1.37)</label>
          <input type="number" id="imp-t" value="1.37" step="any" />
        </div>
        <div class="input-group">
          <label>介电常数 (Er) - FR-4通常为4.2</label>
          <input type="number" id="imp-er" value="4.2" step="0.1" />
        </div>

        <div class="result-box" id="imp-result" style="margin-top:16px;">0.0 Ω</div>
      </div>
    `;

    let mode = 'micro';
    const wEl = container.querySelector('#imp-w');
    const hEl = container.querySelector('#imp-h');
    const tEl = container.querySelector('#imp-t');
    const erEl = container.querySelector('#imp-er');
    const resultEl = container.querySelector('#imp-result');
    const hLabel = container.querySelector('#imp-h-label');

    function setMode(m) {
      mode = m;
      container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      hLabel.textContent = m === 'micro' ? '介质厚度 (H) - mil' : '平面间总距 (B) - mil';
      calcImp();
    }

    container.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => setMode(t.dataset.mode));
    });

    function calcImp() {
      const w = parseFloat(wEl.value);
      const h = parseFloat(hEl.value);
      const t = parseFloat(tEl.value);
      const er = parseFloat(erEl.value);
      if (w <= 0 || h <= 0 || t <= 0 || er <= 0) {
        resultEl.textContent = '请输入正数';
        resultEl.style.color = 'var(--danger)';
        return;
      }
      resultEl.style.color = '';
      let z0 = 0;
      if (mode === 'micro') {
        const term1 = 87 / Math.sqrt(er + 1.41);
        const term2 = Math.log((5.98 * h) / (0.8 * w + t));
        z0 = term1 * term2;
      } else {
        const term1 = 60 / Math.sqrt(er);
        const term2 = Math.log((1.9 * h) / (0.8 * w + t));
        z0 = term1 * term2;
      }
      resultEl.textContent = z0.toFixed(1) + ' Ω';
    }

    [wEl, hEl, tEl, erEl].forEach(el => el.addEventListener('input', calcImp));

    calcImp();
  }
};
