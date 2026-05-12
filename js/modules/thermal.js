import { debounce, formatNumber } from '../utils.js';

const THETA_PRESETS = [20, 40, 60, 100, 200];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🌡️</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">热阻/散热计算</h1>
          <p class="tool-desc">根据功耗和热阻估算结温</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>功耗 P (W)</label>
            <div class="input-with-unit">
              <input type="number" id="th-p" value="1" step="any" />
              <select disabled><option>W</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>结到环境热阻 θ<sub>ja</sub> (℃/W)</label>
            <div class="input-with-unit">
              <input type="number" id="th-ja" value="40" step="any" />
              <select disabled><option>℃/W</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${THETA_PRESETS.map(v => `<button class="preset-btn" data-ja="${v}">${v}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>环境温度 T<sub>a</sub> (℃)</label>
            <div class="input-with-unit">
              <input type="number" id="th-ta" value="25" step="any" />
              <select disabled><option>℃</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>结到壳热阻 θ<sub>jc</sub> (℃/W，可选)</label>
            <div class="input-with-unit">
              <input type="number" id="th-jc" placeholder="留空使用θja" step="any" />
              <select disabled><option>℃/W</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>界面材料热阻 θ<sub>cs</sub> (℃/W，可选)</label>
            <div class="input-with-unit">
              <input type="number" id="th-cs" placeholder="留空使用θja" step="any" />
              <select disabled><option>℃/W</option></select>
            </div>
          </div>
          <div class="input-group">
            <label>散热器热阻 θ<sub>sa</sub> (℃/W，可选)</label>
            <div class="input-with-unit">
              <input type="number" id="th-sa" placeholder="留空使用θja" step="any" />
              <select disabled><option>℃/W</option></select>
            </div>
          </div>
        </div>

        <div class="result-box" id="th-result" style="margin-top:20px;">—</div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">计算公式</div>
          <div>T<sub>j</sub> = T<sub>a</sub> + P × θ<sub>ja</sub></div>
          <div>带散热器时：θ<sub>ja</sub> = θ<sub>jc</sub> + θ<sub>cs</sub> + θ<sub>sa</sub></div>
        </div>

        <div style="margin-top:20px;font-size:13px;color:var(--text-secondary);">
          <div style="font-weight:700;margin-bottom:8px;">常见封装热阻参考</div>
          <table class="data-table">
            <thead><tr><th>封装</th><th>θ<sub>ja</sub> (℃/W)</th><th>θ<sub>jc</sub> (℃/W)</th></tr></thead>
            <tbody>
              <tr><td>SOT-23</td><td>200~300</td><td>80~150</td></tr>
              <tr><td>SOIC-8</td><td>120~160</td><td>30~50</td></tr>
              <tr><td>TQFP-64</td><td>40~60</td><td>8~15</td></tr>
              <tr><td>QFN-32</td><td>30~50</td><td>5~10</td></tr>
              <tr><td>TO-220</td><td>50~70</td><td>1~3</td></tr>
              <tr><td>D2PAK</td><td>40~60</td><td>1~2</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const pEl = container.querySelector('#th-p');
    const jaEl = container.querySelector('#th-ja');
    const taEl = container.querySelector('#th-ta');
    const jcEl = container.querySelector('#th-jc');
    const csEl = container.querySelector('#th-cs');
    const saEl = container.querySelector('#th-sa');
    const resultEl = container.querySelector('#th-result');

    function calculate() {
      const p = parseFloat(pEl.value);
      const ta = parseFloat(taEl.value);
      const ja = parseFloat(jaEl.value);
      const jc = parseFloat(jcEl.value);
      const cs = parseFloat(csEl.value);
      const sa = parseFloat(saEl.value);

      if (isNaN(p) || isNaN(ta) || isNaN(ja)) { resultEl.textContent = '—'; resultEl.style.color = ''; return; }

      let theta = ja;
      let usedHeatsink = false;
      if (!isNaN(jc) || !isNaN(cs) || !isNaN(sa)) {
        usedHeatsink = true;
        const jcVal = isNaN(jc) ? 0 : jc;
        const csVal = isNaN(cs) ? 0 : cs;
        const saVal = isNaN(sa) ? 0 : sa;
        theta = jcVal + csVal + saVal;
      }

      const tj = ta + p * theta;
      let msg = `Tj = ${formatNumber(tj)} ℃`;
      if (usedHeatsink && (isNaN(jc) || isNaN(cs) || isNaN(sa))) {
        msg += ' (注意：部分散热器参数未填，已按 0 计算)';
      }
      resultEl.textContent = msg;
      if (tj > 125) {
        resultEl.style.color = 'var(--danger)';
        resultEl.textContent += ' ⚠️ 过热警告';
      } else if (tj > 85) {
        resultEl.style.color = 'var(--warning)';
      } else {
        resultEl.style.color = 'var(--success)';
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    [pEl, jaEl, taEl, jcEl, csEl, saEl].forEach(el => el.addEventListener('input', debouncedCalc));

    container.querySelectorAll('.preset-btn[data-ja]').forEach(btn => {
      btn.addEventListener('click', () => { jaEl.value = btn.dataset.ja; calculate(); });
    });

    calculate();
  }
};
