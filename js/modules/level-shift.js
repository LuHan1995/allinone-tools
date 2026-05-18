import { debounce } from '../utils.js';

const VOLTAGE_PRESETS = [
  { label: '5V', vhigh: 5.0, vlow: 0.0 },
  { label: '3.3V', vhigh: 3.3, vlow: 0.0 },
  { label: '2.5V', vhigh: 2.5, vlow: 0.0 },
  { label: '1.8V', vhigh: 1.8, vlow: 0.0 },
  { label: '1.2V', vhigh: 1.2, vlow: 0.0 },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔀</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">电平转换计算器</h1>
          <p class="tool-desc">判断两个电压域之间的逻辑电平是否兼容</p>
        </div>
      </div>
      <div class="card">
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div>
            <div style="font-weight:700;font-size:15px;margin-bottom:12px;color:var(--primary);">发送端 (Source)</div>
            <div class="input-group">
              <label>高电平输出 V<sub>OH</sub> (V)</label>
              <div class="input-with-unit">
                <input type="number" id="ls-soh" value="5.0" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>低电平输出 V<sub>OL</sub> (V)</label>
              <div class="input-with-unit">
                <input type="number" id="ls-sol" value="0.0" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="preset-btns" style="margin-top:4px;">
              ${VOLTAGE_PRESETS.map(p => `<button class="preset-btn" data-side="source" data-vh="${p.vhigh}" data-vl="${p.vlow}">${p.label}</button>`).join('')}
            </div>
          </div>
          <div>
            <div style="font-weight:700;font-size:15px;margin-bottom:12px;color:var(--primary);">接收端 (Target)</div>
            <div class="input-group">
              <label>高电平识别 V<sub>IH</sub> (V)</label>
              <div class="input-with-unit">
                <input type="number" id="ls-tih" value="2.0" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="input-group">
              <label>低电平识别 V<sub>IL</sub> (V)</label>
              <div class="input-with-unit">
                <input type="number" id="ls-til" value="0.8" step="any" />
                <select disabled><option>V</option></select>
              </div>
            </div>
            <div class="preset-btns" style="margin-top:4px;">
              ${VOLTAGE_PRESETS.map(p => `<button class="preset-btn" data-side="target" data-vh="${p.vhigh * 0.7}" data-vl="${p.vhigh * 0.3}">${p.label}</button>`).join('')}
            </div>
          </div>
        </div>

        <div id="ls-result" class="result-box" style="margin-top:20px;">—</div>

        <div id="ls-suggest" style="margin-top:16px;font-size:13px;color:var(--text-secondary);line-height:1.8;"></div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">兼容性判断规则</div>
          <div>✅ 高电平兼容：V<sub>OH</sub> ≥ V<sub>IH</sub></div>
          <div>✅ 低电平兼容：V<sub>OL</sub> ≤ V<sub>IL</sub></div>
          <div>⚠️ 若仅高电平不兼容，可用电阻分压或单向电平转换芯片（如 74LVC1T45）</div>
          <div>⚠️ 若双向通信，建议使用专用电平转换芯片（如 TXS0108E、PCA9306）</div>
        </div>
      </div>
    `;

    const sohEl = container.querySelector('#ls-soh');
    const solEl = container.querySelector('#ls-sol');
    const tihEl = container.querySelector('#ls-tih');
    const tilEl = container.querySelector('#ls-til');
    const resultEl = container.querySelector('#ls-result');
    const suggestEl = container.querySelector('#ls-suggest');

    function calculate() {
      const voh = parseFloat(sohEl.value);
      const vol = parseFloat(solEl.value);
      const vih = parseFloat(tihEl.value);
      const vil = parseFloat(tilEl.value);

      if ([voh, vol, vih, vil].some(v => isNaN(v))) {
        resultEl.textContent = '—';
        suggestEl.innerHTML = '';
        return;
      }

      const highOk = voh >= vih;
      const lowOk = vol <= vil;

      if (highOk && lowOk) {
        resultEl.innerHTML = '✅ <strong>电平兼容</strong>';
        resultEl.style.color = 'var(--success)';
        suggestEl.innerHTML = `
          <div>发送端高电平 ${voh}V ≥ 接收端识别阈值 ${vih}V</div>
          <div>发送端低电平 ${vol}V ≤ 接收端识别阈值 ${vil}V</div>
          <div>可直接连接，无需电平转换。</div>
        `;
      } else {
        resultEl.innerHTML = '❌ <strong>电平不兼容</strong>';
        resultEl.style.color = 'var(--danger)';
        let html = '';
        if (!highOk) {
          html += `<div>⚠️ 高电平不兼容：V<sub>OH</sub> ${voh}V &lt; V<sub>IH</sub> ${vih}V</div>`;
          if (voh > vil) {
            const r2 = vih;
            const r1 = voh - vih;
            const ratio = r1 / r2;
            html += `<div>建议电阻分压：R1:R2 ≈ ${ratio.toFixed(2)}:1（如 ${Math.round(ratio * 10)}kΩ + 10kΩ）</div>`;
          }
        }
        if (!lowOk) {
          html += `<div>⚠️ 低电平不兼容：V<sub>OL</sub> ${vol}V &gt; V<sub>IL</sub> ${vil}V</div>`;
        }
        if (!highOk || !lowOk) {
          html += `<div>推荐使用专用电平转换芯片：TXS0108E（双向）、74LVC1T45（单向）</div>`;
        }
        suggestEl.innerHTML = html;
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    [sohEl, solEl, tihEl, tilEl].forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    container.querySelectorAll('.preset-btn[data-side]').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.dataset.side;
        const vh = parseFloat(btn.dataset.vh);
        const vl = parseFloat(btn.dataset.vl);
        if (side === 'source') {
          sohEl.value = vh;
          solEl.value = vl;
        } else {
          tihEl.value = vh;
          tilEl.value = vl;
        }
        calculate();
      });
    });

    calculate();
  }
};
