import { formatNumber, debounce } from '../utils.js';

// ============ 纯函数核心 ============

/**
 * 铝电解电容寿命估算(10℃ 法则 + 纹波发热修正)
 * @param {object} p
 * @param {number} p.l0  额定寿命 h
 * @param {number} p.t0  额定温度 ℃
 * @param {number} p.ta  实际环境温度 ℃
 * @param {number} p.ir0 额定纹波电流 A
 * @param {number} p.ir  实际纹波电流 A
 * @param {number} p.dt0 额定纹波下芯子温升 ℃(105℃品典型 5,85℃品约 10)
 */
export function calcCapLife(p) {
  const { l0, t0, ta, ir0, ir, dt0 } = p;
  const dt = dt0 * (ir / ir0) ** 2;      // 实际芯子温升
  const tc = ta + dt;                     // 芯子温度
  const life = l0 * Math.pow(2, (t0 - tc) / 10);
  return {
    dt, tc, life,
    lifeYears247: life / 8760,            // 24h 连续
    lifeYears8h: life / (8760 / 3),       // 每天 8h
    overRipple: ir > ir0,                 // 纹波超额定
    overTemp: tc >= t0,                   // 芯温超额定
  };
}

/** 寿命格式化为易读字符串 */
export function fmtLife(hours) {
  if (hours >= 8760 * 2) return `${formatNumber(hours / 8760, 1)} 年(连续)`;
  if (hours >= 8760) return `${formatNumber(hours / 8760, 2)} 年(连续)`;
  return `${formatNumber(hours, 0)} 小时`;
}

// ============ 页面模块 ============

const PRESETS = {
  gp: { label: '105℃/2000h 通用品', l0: 2000, t0: 105, ta: 65, ir0: 1.0, ir: 0.9, dt0: 5 },
  longlife: { label: '105℃/10000h 长寿命品', l0: 10000, t0: 105, ta: 60, ir0: 1.5, ir: 1.0, dt0: 5 },
  lighting: { label: '85℃/2000h 照明电源', l0: 2000, t0: 85, ta: 55, ir0: 0.5, ir: 0.45, dt0: 10 },
};

const FIELDS = [
  { id: 'l0', label: '额定寿命 L0', unit: 'h' },
  { id: 't0', label: '额定温度 T0', unit: '℃' },
  { id: 'ta', label: '实际环境温度 Ta', unit: '℃' },
  { id: 'ir0', label: '额定纹波电流 Ir0', unit: 'A' },
  { id: 'ir', label: '实际纹波电流 Ir', unit: 'A' },
  { id: 'dt0', label: '额定纹波芯子温升 ΔT0', unit: '℃' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⏳</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">电解电容寿命估算</h1>
          <p class="tool-desc">铝电解电容寿命:10℃ 法则 + 纹波电流发热修正</p>
        </div>
      </div>
      <div class="card">
        <div class="preset-btns" style="margin-bottom:12px;">
          <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速参数:</span>
          ${Object.entries(PRESETS).map(([k, p]) => `<button class="preset-btn" data-preset="${k}">${p.label}</button>`).join('')}
        </div>
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          ${FIELDS.map(f => `
          <div class="input-group">
            <label>${f.label}</label>
            <div class="input-with-unit">
              <input type="number" id="cl-${f.id}" step="any" />
              <span style="min-width:30px;text-align:left;color:var(--text-secondary);font-size:13px;">${f.unit}</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
          <div class="input-group"><label>估算寿命(连续运行)</label><div class="result-box" id="cl-life">—</div></div>
          <div class="input-group"><label>芯子温度</label><div class="result-box" id="cl-tc">—</div></div>
          <div class="input-group"><label>按每天 8h 使用</label><div class="result-box" id="cl-life8">—</div></div>
        </div>
        <table class="data-table" id="cl-table">
          <thead><tr><th>环境温度</th><th>芯子温度</th><th>估算寿命</th></tr></thead>
          <tbody></tbody>
        </table>
        <div id="cl-warn" style="color:var(--danger);font-size:13px;margin-top:10px;"></div>
        <div class="formula-box" style="margin-top:16px;">
          L = L0 · 2<sup>(T0 − Tc)/10</sup> &nbsp;|&nbsp; Tc = Ta + ΔT &nbsp;|&nbsp; ΔT = ΔT0·(Ir/Ir0)²
        </div>
      </div>
      <div class="card" style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
        <strong>使用说明</strong><br>
        · 10℃ 法则: 芯子温度每降 10℃,寿命约翻倍;每升 10℃,寿命约减半<br>
        · 纹波电流通过 ESR 发热使芯子温度高于环境温度,是寿命缩短的主因之一<br>
        · ΔT0 查电容规格书(通常 105℃ 品为 5℃,85℃ 品为 10℃);估算结果仅供参考,高温长寿命场合建议实测芯温
      </div>
    `;

    const warnEl = container.querySelector('#cl-warn');

    function getParams() {
      const g = id => parseFloat(container.querySelector(`#cl-${id}`).value);
      const v = { l0: g('l0'), t0: g('t0'), ta: g('ta'), ir0: g('ir0'), ir: g('ir'), dt0: g('dt0') };
      return Object.values(v).every(x => isFinite(x)) && v.l0 > 0 && v.ir0 > 0 && v.dt0 > 0 ? v : null;
    }

    function calculate() {
      const p = getParams();
      if (!p) {
        ['life', 'tc', 'life8'].forEach(k => container.querySelector(`#cl-${k}`).textContent = '—');
        container.querySelector('#cl-table tbody').innerHTML = '';
        warnEl.textContent = '';
        return;
      }
      const r = calcCapLife(p);
      container.querySelector('#cl-life').textContent = fmtLife(r.life);
      container.querySelector('#cl-tc').textContent = `${formatNumber(r.tc, 1)} ℃`;
      container.querySelector('#cl-life8').textContent = `${formatNumber(r.lifeYears8h, 1)} 年`;

      const rows = [p.ta - 10, p.ta, p.ta + 10].map(ta => {
        const rr = calcCapLife({ ...p, ta });
        const mark = ta === p.ta ? ' style="font-weight:bold;"' : '';
        return `<tr${mark}><td>${formatNumber(ta, 0)} ℃${ta === p.ta ? '(当前)' : ''}</td><td>${formatNumber(rr.tc, 1)} ℃</td><td>${fmtLife(rr.life)}</td></tr>`;
      });
      container.querySelector('#cl-table tbody').innerHTML = rows.join('');

      const warns = [];
      if (r.overRipple) warns.push('实际纹波电流超过额定值,芯子发热加剧,寿命估算可能偏乐观,建议换更大规格');
      if (r.overTemp) warns.push('芯子温度已达到/超过额定温度,寿命将低于额定寿命 L0');
      warnEl.textContent = warns.join(';');
    }

    function applyPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      Object.entries(p).forEach(([k, v]) => {
        const el = container.querySelector(`#cl-${k}`);
        if (el && typeof v === 'number') el.value = v;
      });
      calculate();
    }

    const debounced = debounce(calculate, 100);
    container.querySelectorAll('input').forEach(el => el.addEventListener('input', debounced));
    container.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

    applyPreset('gp');
  }
};
