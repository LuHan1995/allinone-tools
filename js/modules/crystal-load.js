import { debounce, formatNumber, generateSeries } from '../utils.js';

const E12_BASE = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
const E12_CAPS = generateSeries(E12_BASE, 1000);
function findClosestE12(val) {
  if (val <= 0) return null;
  let best = E12_CAPS[0];
  let bestErr = Math.abs(val - best);
  for (const v of E12_CAPS) {
    const err = Math.abs(val - v);
    if (err < bestErr) { bestErr = err; best = v; }
  }
  return best;
}

const CL_PRESETS = [6, 8, 10, 12, 15, 18, 20];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">💎</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">晶振负载电容</h1>
          <p class="tool-desc">计算晶振外部匹配电容</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>晶体负载电容 C<sub>L</sub> (pF)</label>
            <div class="input-with-unit">
              <input type="number" id="cl-cl" value="12" step="any" />
              <select disabled><option>pF</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${CL_PRESETS.map(v => `<button class="preset-btn" data-cl="${v}">${v} pF</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>寄生电容 C<sub>s</sub> (Stray Capacitance，pF)</label>
            <div class="input-with-unit">
              <input type="number" id="cl-cs" value="3" step="any" />
              <select disabled><option>pF</option></select>
            </div>
          </div>
        </div>

        <div class="result-box" id="cl-result" style="margin-top:20px;">—</div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>C<sub>1</sub> = C<sub>2</sub> = 2 × (C<sub>L</sub> − C<sub>s</sub>)</div>
        </div>

        <div style="margin-top:20px;font-size:13px;color:var(--text-secondary);">
          <div style="font-weight:700;margin-bottom:8px;">说明</div>
          <div>实际应选择最接近的标准电容值（如 E12 系列）。常见值：10pF, 12pF, 15pF, 18pF, 22pF, 27pF, 33pF。</div>
          <div>PCB 寄生电容通常为 3~5pF，包括引脚电容和走线电容。</div>
        </div>
      </div>
    `;

    const clEl = container.querySelector('#cl-cl');
    const csEl = container.querySelector('#cl-cs');
    const resultEl = container.querySelector('#cl-result');

    function calculate() {
      const cl = parseFloat(clEl.value);
      const cs = parseFloat(csEl.value);
      if (isNaN(cl) || isNaN(cs)) { resultEl.textContent = '—'; resultEl.style.color = ''; return; }
      const c = 2 * (cl - cs);
      if (c <= 0) {
        resultEl.textContent = '计算结果无效 (CL 必须大于 Cs)';
        resultEl.style.color = 'var(--danger)';
        return;
      }
      const e12 = findClosestE12(c);
      resultEl.innerHTML = `C1 = C2 = <strong>${formatNumber(c)} pF</strong>${e12 ? ` &nbsp;|&nbsp; 推荐 E12: <strong>${e12} pF</strong>` : ''}`;
      resultEl.style.color = 'var(--primary)';
    }

    const debouncedCalc = debounce(calculate, 100);
    [clEl, csEl].forEach(el => el.addEventListener('input', debouncedCalc));

    container.querySelectorAll('.preset-btn[data-cl]').forEach(btn => {
      btn.addEventListener('click', () => { clEl.value = btn.dataset.cl; calculate(); });
    });

    calculate();
  }
};
