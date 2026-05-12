import { autoUnit, debounce, formatNumber } from '../utils.js';

const R_UNITS = { Ω: 1, 'kΩ': 1e3, 'MΩ': 1e6 };
const C_UNITS = { pF: 1e-12, nF: 1e-9, 'μF': 1e-6, mF: 1e-3, F: 1 };

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔗</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">串并联 R / C 计算器</h1>
          <p class="tool-desc">电阻串联并联、电容串联并联等效值计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="rs">电阻串联</button>
          <button class="tab" data-mode="rp">电阻并联</button>
          <button class="tab" data-mode="cs">电容串联</button>
          <button class="tab" data-mode="cp">电容并联</button>
        </div>

        <div class="tab-content active" data-mode="rs">
          <div id="rs-inputs"></div>
          <button class="btn btn-secondary" id="rs-add" style="margin-top:10px;">+ 添加更多电阻</button>
          <div class="input-group" style="margin-top:16px;">
            <label>等效电阻 R<sub>t</sub></label>
            <div class="result-box" id="rs-res">—</div>
          </div>
          <div class="formula-box" style="margin-top:16px;">R<sub>t</sub> = R₁ + R₂ + … + Rₙ</div>
        </div>

        <div class="tab-content" data-mode="rp">
          <div id="rp-inputs"></div>
          <button class="btn btn-secondary" id="rp-add" style="margin-top:10px;">+ 添加更多电阻</button>
          <div class="input-group" style="margin-top:16px;">
            <label>等效电阻 R<sub>t</sub></label>
            <div class="result-box" id="rp-res">—</div>
          </div>
          <div class="formula-box" style="margin-top:16px;">1/R<sub>t</sub> = 1/R₁ + 1/R₂ + … + 1/Rₙ</div>
        </div>

        <div class="tab-content" data-mode="cs">
          <div id="cs-inputs"></div>
          <button class="btn btn-secondary" id="cs-add" style="margin-top:10px;">+ 添加更多电容</button>
          <div class="input-group" style="margin-top:16px;">
            <label>等效电容 C<sub>t</sub></label>
            <div class="result-box" id="cs-res">—</div>
          </div>
          <div class="formula-box" style="margin-top:16px;">1/C<sub>t</sub> = 1/C₁ + 1/C₂ + … + 1/Cₙ</div>
        </div>

        <div class="tab-content" data-mode="cp">
          <div id="cp-inputs"></div>
          <button class="btn btn-secondary" id="cp-add" style="margin-top:10px;">+ 添加更多电容</button>
          <div class="input-group" style="margin-top:16px;">
            <label>等效电容 C<sub>t</sub></label>
            <div class="result-box" id="cp-res">—</div>
          </div>
          <div class="formula-box" style="margin-top:16px;">C<sub>t</sub> = C₁ + C₂ + … + Cₙ</div>
        </div>
      </div>
    `;

    const tabs = container.querySelectorAll('.tab');
    const contents = container.querySelectorAll('.tab-content');

    function setMode(mode) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      contents.forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
      calculate();
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    function createInputRow(mode, index, isCap) {
      const units = isCap
        ? [['pF', 'pF'], ['nF', 'nF'], ['μF', 'μF'], ['mF', 'mF'], ['F', 'F']]
        : [['Ω', 'Ω'], ['kΩ', 'kΩ'], ['MΩ', 'MΩ']];
      const defUnit = isCap ? 'μF' : 'kΩ';
      const label = isCap ? `C${index + 1}` : `R${index + 1}`;
      const div = document.createElement('div');
      div.className = 'input-group';
      div.style.cssText = 'display:flex;align-items:flex-end;gap:10px;';
      // idx 未使用，已移除
      div.innerHTML = `
        <div style="flex:1;">
          <label>${label}</label>
          <div class="input-with-unit">
            <input type="number" class="${mode}-val" value="${index < 2 ? (isCap ? '10' : '1') : ''}" step="any" placeholder="数值" />
            <select class="${mode}-unit">
              ${units.map(([v, t]) => `<option value="${v}" ${v === defUnit ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn btn-danger ${mode}-del" style="padding:10px 14px;background:var(--danger);" title="删除">×</button>
      `;
      div.querySelector(`.${mode}-del`).addEventListener('click', () => {
        const wrapper = container.querySelector(`#${mode}-inputs`);
        if (wrapper.children.length > 2) {
          div.remove();
          reindexInputs(mode);
          calculate();
        }
      });
      div.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => calculate());
      });
      return div;
    }

    function reindexInputs(mode) {
      const wrapper = container.querySelector(`#${mode}-inputs`);
      const isCap = mode.startsWith('c');
      Array.from(wrapper.children).forEach((child, idx) => {
        const label = child.querySelector('label');
        label.textContent = isCap ? `C${idx + 1}` : `R${idx + 1}`;
      });
    }

    function renderInputs(mode) {
      const wrapper = container.querySelector(`#${mode}-inputs`);
      wrapper.innerHTML = '';
      for (let i = 0; i < 2; i++) {
        wrapper.appendChild(createInputRow(mode, i, mode.startsWith('c')));
      }
    }

    ['rs', 'rp', 'cs', 'cp'].forEach(m => renderInputs(m));

    ['rs', 'rp', 'cs', 'cp'].forEach(mode => {
      container.querySelector(`#${mode}-add`).addEventListener('click', () => {
        const wrapper = container.querySelector(`#${mode}-inputs`);
        const newIdx = wrapper.children.length;
        wrapper.appendChild(createInputRow(mode, newIdx, mode.startsWith('c')));
        calculate();
      });
    });

    function getVals(mode) {
      const isCap = mode.startsWith('c');
      const unitMap = isCap ? C_UNITS : R_UNITS;
      const vals = [];
      container.querySelectorAll(`.${mode}-val`).forEach((inp, idx) => {
        const v = parseFloat(inp.value);
        const u = container.querySelectorAll(`.${mode}-unit`)[idx]?.value || (isCap ? 'μF' : 'kΩ');
        if (!isNaN(v) && v > 0) vals.push(v * unitMap[u]);
      });
      return vals;
    }

    function calculate() {
      const mode = container.querySelector('.tab.active').dataset.mode;
      const vals = getVals(mode);
      const resEl = container.querySelector(`#${mode}-res`);

      if (vals.length < 2) {
        resEl.textContent = '—';
        return;
      }

      let result;
      if (mode === 'rs' || mode === 'cp') {
        result = vals.reduce((a, b) => a + b, 0);
      } else {
        const inv = vals.reduce((a, b) => a + 1 / b, 0);
        if (inv === 0) { resEl.textContent = '—'; return; }
        result = 1 / inv;
      }

      const au = autoUnit(result, mode.startsWith('c') ? 'capacitance' : 'resistance');
      resEl.textContent = `${formatNumber(au.value)} ${au.unit}`;
    }

    calculate();
  }
};
