import { debounce } from '../utils.js';

const TABS = [
  { key: 'resistance', label: '电阻', units: { Ω: 1, mΩ: 1e-3, kΩ: 1e3, MΩ: 1e6 } },
  { key: 'capacitance', label: '电容', units: { pF: 1e-12, nF: 1e-9, μF: 1e-6, mF: 1e-3, F: 1 } },
  { key: 'inductance', label: '电感', units: { pH: 1e-12, nH: 1e-9, μH: 1e-6, mH: 1e-3, H: 1 } },
  { key: 'frequency', label: '频率', units: { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 } },
  { key: 'voltage', label: '电压', units: { μV: 1e-6, mV: 1e-3, V: 1, kV: 1e3 } },
  { key: 'current', label: '电流', units: { μA: 1e-6, mA: 1e-3, A: 1 } },
  { key: 'power', label: '功率', units: { μW: 1e-6, mW: 1e-3, W: 1, kW: 1e3, MW: 1e6 } },
  { key: 'time', label: '时间', units: { ps: 1e-12, ns: 1e-9, μs: 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600, d: 86400 } },
  { key: 'length', label: '长度', units: { pm: 1e-12, nm: 1e-9, μm: 1e-6, mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, mil: 25.4e-6, inch: 25.4e-3, ft: 0.3048 } },
  { key: 'temperature', label: '温度', units: { '℃': 1, '℉': 1, K: 1 } },
];

function convertTemp(val, from, to) {
  let c;
  if (from === '℃') c = val;
  else if (from === '℉') c = (val - 32) * 5 / 9;
  else if (from === 'K') c = val - 273.15;
  if (to === '℃') return c;
  if (to === '℉') return c * 9 / 5 + 32;
  if (to === 'K') return c + 273.15;
  return val;
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔄</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">单位换算器</h1>
          <p class="tool-desc">电学常用单位快速换算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar" id="uc-tabs">
          ${TABS.map(t => `<button class="tab" data-key="${t.key}">${t.label}</button>`).join('')}
        </div>
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>输入值</label>
            <div class="input-with-unit">
              <input type="number" id="uc-input" value="1" step="any" />
              <select id="uc-input-unit"></select>
            </div>
          </div>
        </div>
        <div id="uc-results" style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;"></div>
      </div>
    `;

    const tabsEl = container.querySelector('#uc-tabs');
    const inputEl = container.querySelector('#uc-input');
    const inputUnitEl = container.querySelector('#uc-input-unit');
    const resultsEl = container.querySelector('#uc-results');
    let currentKey = 'resistance';

    function setTab(key) {
      currentKey = key;
      tabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.key === key));
      const tab = TABS.find(t => t.key === key);
      const units = Object.keys(tab.units);
      inputUnitEl.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
      inputUnitEl.value = units[0];
      calculate();
    }

    function calculate() {
      const val = parseFloat(inputEl.value);
      const fromUnit = inputUnitEl.value;
      const tab = TABS.find(t => t.key === currentKey);
      if (isNaN(val)) { resultsEl.innerHTML = ''; return; }

      let html = '';
      for (const [u, factor] of Object.entries(tab.units)) {
        if (u === fromUnit) continue;
        let out;
        if (currentKey === 'temperature') {
          out = convertTemp(val, fromUnit, u);
        } else {
          const base = val * tab.units[fromUnit];
          out = base / factor;
        }
        let outStr;
        if (Math.abs(out) >= 0.001 && Math.abs(out) < 10000) {
          outStr = out.toFixed(4);
        } else {
          outStr = out.toExponential(4);
        }
        html += `<div class="input-group">
          <label>${u}</label>
          <div class="result-box">${outStr}</div>
        </div>`;
      }
      resultsEl.innerHTML = html;
    }

    tabsEl.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => setTab(t.dataset.key));
    });
    inputEl.addEventListener('input', debounce(calculate, 100));
    inputUnitEl.addEventListener('change', calculate);

    setTab('resistance');
  }
};
