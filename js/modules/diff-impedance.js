import { calcMicrostripZ0, calcStriplineZ0, debounce, formatNumber } from '../utils.js';

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⚡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">差分阻抗计算器</h1>
          <p class="tool-desc">差分微带线/带状线阻抗计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="micro">差分微带线</button>
          <button class="tab" data-mode="strip">差分带状线</button>
        </div>

        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>线宽 W (mil)</label>
            <input type="number" id="di-w" value="8" step="any" />
          </div>
          <div class="input-group">
            <label>线间距 S (mil)</label>
            <input type="number" id="di-s" value="8" step="any" />
          </div>
          <div class="input-group">
            <label id="di-h-label">介质厚度 H (mil)</label>
            <input type="number" id="di-h" value="6" step="any" />
          </div>
          <div class="input-group">
            <label>铜厚 T (mil, 1oz=1.37)</label>
            <input type="number" id="di-t" value="1.37" step="any" />
          </div>
          <div class="input-group">
            <label>介电常数 Er</label>
            <input type="number" id="di-er" value="4.2" step="0.1" />
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group">
            <label>单端阻抗 Z0</label>
            <div class="result-box" id="di-z0">—</div>
          </div>
          <div class="input-group">
            <label>差分阻抗 Zdiff</label>
            <div class="result-box" id="di-zdiff">—</div>
          </div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式（简化模型）</div>
          <div id="di-formula-micro">
            微带线：Zdiff ≈ 2 × Z0 × (1 − 0.48 × exp(−0.96 × S/H))
          </div>
          <div id="di-formula-strip" style="display:none;">
            带状线：Zdiff ≈ 2 × Z0 × (1 − 0.374 × exp(−2.9 × S/B))
          </div>
        </div>
      </div>
    `;

    let mode = 'micro';
    const wEl = container.querySelector('#di-w');
    const sEl = container.querySelector('#di-s');
    const hEl = container.querySelector('#di-h');
    const tEl = container.querySelector('#di-t');
    const erEl = container.querySelector('#di-er');
    const hLabel = container.querySelector('#di-h-label');
    const z0El = container.querySelector('#di-z0');
    const zdiffEl = container.querySelector('#di-zdiff');
    const formulaMicro = container.querySelector('#di-formula-micro');
    const formulaStrip = container.querySelector('#di-formula-strip');

    function setMode(m) {
      mode = m;
      container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      hLabel.textContent = m === 'micro' ? '介质厚度 H (mil)' : '平面间总距 B (mil)';
      formulaMicro.style.display = m === 'micro' ? 'block' : 'none';
      formulaStrip.style.display = m === 'strip' ? 'block' : 'none';
      calculate();
    }

    function calculate() {
      const w = parseFloat(wEl.value);
      const s = parseFloat(sEl.value);
      const h = parseFloat(hEl.value);
      const t = parseFloat(tEl.value);
      const er = parseFloat(erEl.value);
      if (w <= 0 || s <= 0 || h <= 0 || t <= 0 || er <= 0) {
        z0El.textContent = '请输入正数';
        z0El.style.color = 'var(--danger)';
        zdiffEl.textContent = '—';
        zdiffEl.style.color = '';
        return;
      }
      z0El.style.color = '';

      let z0 = 0;
      let zdiff = 0;
      if (mode === 'micro') {
        z0 = calcMicrostripZ0(w, h, t, er);
        zdiff = 2 * z0 * (1 - 0.48 * Math.exp(-0.96 * s / h));
      } else {
        z0 = calcStriplineZ0(w, h, t, er);
        zdiff = 2 * z0 * (1 - 0.374 * Math.exp(-2.9 * s / h));
      }

      z0El.textContent = `${z0.toFixed(1)} Ω`;
      zdiffEl.textContent = `${zdiff.toFixed(1)} Ω`;
    }

    container.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => setMode(t.dataset.mode));
    });

    const debouncedCalc = debounce(calculate, 100);
    [wEl, sEl, hEl, tEl, erEl].forEach(el => el.addEventListener('input', debouncedCalc));

    calculate();
  }
};
