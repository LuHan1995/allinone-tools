import { autoUnit, formatNumber, debounce } from '../utils.js';

// ============ 纯函数核心 ============

/**
 * 单管正激(Forward)变换器设计(复位绕组 1:1, Dmax ≤ 0.5)
 * @param {object} p
 * @param {number} p.vinMin / p.vinMax 输入电压范围 V
 * @param {number} p.vout / p.iout 输出电压 V / 电流 A
 * @param {number} p.fs 开关频率 Hz
 * @param {number} p.eff 效率 0-1
 * @param {number} p.dmax 最大占空比(复位绕组 1:1 时 ≤0.5)
 * @param {number} p.ripple 输出电感电流纹波比(ΔI/Iout,0-1)
 * @param {number} p.vf 整流二极管压降 V
 * @param {number} p.lm 励磁电感 H
 * @param {number} p.dvout 输出纹波目标 V
 */
export function calcForward(p) {
  const { vinMin, vinMax, vout, iout, fs, eff, dmax, ripple, vf, lm, dvout } = p;
  const pout = vout * iout;
  const pin = pout / eff;
  const n = vinMin * dmax / (vout + vf);             // 匝比 Np/Ns
  const dmin = n * (vout + vf) / vinMax;             // 最高输入电压下的占空比
  const di = ripple * iout;                          // 电感电流纹波峰峰
  // 电感: Vinmax 时 D 最小,伏秒: (Vinmax/n − Vf − Vout)·Dmin = (Vout+Vf)·(1−Dmin)
  const lout = (vout + vf) * (1 - dmin) / (fs * di);
  const imagPk = vinMax * dmin / (lm * fs);          // 励磁电流峰值(Vinmax·Dmin 处最大伏秒)
  const iswPk = iout / n + di / (2 * n) + imagPk;    // 开关管峰值电流(折算+励磁)
  const iswRms = (iout / n) * Math.sqrt(dmax);       // 近似有效值
  const vsw = 2 * vinMax;                            // 复位绕组 1:1 时开关管耐压
  const vswRated = vsw * 1.25;
  // 副边: 整流管耐压 ≈ Vinmax/n,续流管耐压 ≈ Vinmax/n(正激两管近似相同)
  const vdiode = vinMax / n;
  const vdiodeRated = vdiode * 1.5;
  const cout = di / (8 * fs * dvout);                // 输出电容(纹波目标)
  const ilPk = iout + di / 2;                        // 电感峰值电流
  return {
    pout, pin, n, dmin, dmax, di, lout, imagPk, iswPk, iswRms,
    vsw, vswRated, vdiode, vdiodeRated, cout, ilPk,
    warnDmax: dmax > 0.5,
  };
}

// ============ 页面模块 ============

const PRESETS = {
  telecom: { label: '12V/5A 通信电源(36-72V)', vinMin: 36, vinMax: 72, vout: 12, iout: 5, fs: 100, eff: 88, dmax: 0.45, ripple: 30, vf: 0.5, lm: 1, dvout: 30 },
  lowvolt: { label: '5V/10A(18-36V)', vinMin: 18, vinMax: 36, vout: 5, iout: 10, fs: 150, eff: 85, dmax: 0.4, ripple: 25, vf: 0.4, lm: 0.5, dvout: 25 },
  wide: { label: '24V/4A(100-375V 宽压)', vinMin: 100, vinMax: 375, vout: 24, iout: 4, fs: 80, eff: 90, dmax: 0.42, ripple: 30, vf: 0.6, lm: 3, dvout: 50 },
};

const FIELDS = [
  { id: 'vinMin', label: '输入电压下限 Vin(min)', unit: 'V' },
  { id: 'vinMax', label: '输入电压上限 Vin(max)', unit: 'V' },
  { id: 'vout', label: '输出电压 Vout', unit: 'V' },
  { id: 'iout', label: '输出电流 Iout', unit: 'A' },
  { id: 'fs', label: '开关频率 fs', unit: 'kHz' },
  { id: 'eff', label: '预计效率 η', unit: '%' },
  { id: 'dmax', label: '最大占空比 Dmax', unit: '' },
  { id: 'ripple', label: '电感电流纹波比', unit: '%' },
  { id: 'vf', label: '整流管压降 Vf', unit: 'V' },
  { id: 'lm', label: '励磁电感 Lm', unit: 'mH' },
  { id: 'dvout', label: '输出纹波目标 ΔVout', unit: 'mV' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔌</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">正激(Forward)变换器设计</h1>
          <p class="tool-desc">单管正激(复位绕组 1:1)匝比、输出电感、开关应力计算</p>
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
              <input type="number" id="fw-${f.id}" step="any" />
              ${f.unit ? `<span style="min-width:36px;text-align:left;color:var(--text-secondary);font-size:13px;">${f.unit}</span>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
          <div class="input-group"><label>匝比 n = Np:Ns</label><div class="result-box" id="fw-n">—</div></div>
          <div class="input-group"><label>输出电感 Lout</label><div class="result-box" id="fw-lout">—</div></div>
          <div class="input-group"><label>占空比范围</label><div class="result-box" id="fw-duty">—</div></div>
          <div class="input-group"><label>开关管峰值电流</label><div class="result-box" id="fw-isw">—</div></div>
        </div>
        <table class="data-table" id="fw-table">
          <thead><tr><th>参数</th><th>数值</th><th>说明</th></tr></thead>
          <tbody></tbody>
        </table>
        <div id="fw-warn" style="color:var(--danger);font-size:13px;margin-top:10px;"></div>
        <div class="formula-box" style="margin-top:16px;">
          n = V<sub>in(min)</sub>·D<sub>max</sub>/(V<sub>out</sub>+V<sub>f</sub>) &nbsp;|&nbsp; L<sub>out</sub> = (V<sub>out</sub>+V<sub>f</sub>)·(1−D<sub>min</sub>)/(f<sub>s</sub>·ΔI) &nbsp;|&nbsp; V<sub>sw</sub> = 2·V<sub>in(max)</sub>(1:1 复位)
        </div>
      </div>
      <div class="card" style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
        <strong>设计提示</strong><br>
        · 复位绕组 1:1 时 Dmax 必须 &lt; 0.5,否则磁芯复位不完全会饱和;RCD 复位可放宽到 0.6~0.7<br>
        · 正激能量直接传输,输出电感必不可少;变压器只传功率不储能,磁芯不需开气隙<br>
        · 磁芯选型与匝数计算请使用「隔离电源变压器」工具
      </div>
    `;

    const warnEl = container.querySelector('#fw-warn');

    function getParams() {
      const g = id => parseFloat(container.querySelector(`#fw-${id}`).value);
      const v = {
        vinMin: g('vinMin'), vinMax: g('vinMax'), vout: g('vout'), iout: g('iout'),
        fs: g('fs') * 1e3, eff: g('eff') / 100, dmax: g('dmax'),
        ripple: g('ripple') / 100, vf: g('vf'), lm: g('lm') * 1e-3, dvout: g('dvout') * 1e-3,
      };
      return Object.values(v).every(x => isFinite(x) && x > 0) && v.dmax < 1 ? v : null;
    }

    function fmt(val, type) {
      const au = autoUnit(val, type);
      return `${formatNumber(au.value)} ${au.unit}`;
    }
    function fmtL(v) { return v >= 1e-3 ? `${formatNumber(v * 1e3)} mH` : `${formatNumber(v * 1e6)} μH`; }

    function calculate() {
      const p = getParams();
      if (!p) {
        ['n', 'lout', 'duty', 'isw'].forEach(k => container.querySelector(`#fw-${k}`).textContent = '—');
        container.querySelector('#fw-table tbody').innerHTML = '';
        warnEl.textContent = '';
        return;
      }
      const r = calcForward(p);
      container.querySelector('#fw-n').textContent = `${formatNumber(r.n)} : 1`;
      container.querySelector('#fw-lout').textContent = fmtL(r.lout);
      container.querySelector('#fw-duty').textContent = `${formatNumber(r.dmin, 3)} ~ ${formatNumber(r.dmax, 3)}`;
      container.querySelector('#fw-isw').textContent = fmt(r.iswPk, 'current');

      const rows = [
        ['输出功率 / 输入功率', `${formatNumber(r.pout)} W / ${formatNumber(r.pin, 2)} W`, 'Pin = Pout/η'],
        ['电感电流纹波 ΔI', fmt(r.di, 'current'), `纹波比 ${formatNumber(p.ripple * 100, 1)}%`],
        ['电感峰值电流', fmt(r.ilPk, 'current'), '电感饱和电流需大于此值'],
        ['励磁电流峰值', fmt(r.imagPk, 'current'), 'Lm 越小励磁电流越大'],
        ['开关管有效值电流', fmt(r.iswRms, 'current'), '近似估算,MOS 电流定额依据'],
        ['开关管耐压', `${fmt(r.vsw, 'voltage')} → 建议 ≥ ${fmt(r.vswRated, 'voltage')}`, '1:1 复位绕组承受 2·Vin(max)'],
        ['副边二极管耐压', `${fmt(r.vdiode, 'voltage')} → 建议 ≥ ${fmt(r.vdiodeRated, 'voltage')}`, '整流/续流管,含 50% 裕量'],
        ['输出电容最小值', r.cout >= 1e-3 ? `${formatNumber(r.cout * 1e3)} mF` : `${formatNumber(r.cout * 1e6)} μF`, '按纹波目标;ESR 影响另计'],
      ];
      container.querySelector('#fw-table tbody').innerHTML =
        rows.map(r2 => `<tr><td>${r2[0]}</td><td><strong>${r2[1]}</strong></td><td style="color:var(--text-secondary);font-size:12px;">${r2[2]}</td></tr>`).join('');

      const warns = [];
      if (r.warnDmax) warns.push('Dmax > 0.5:复位绕组 1:1 时磁芯复位时间不足,请降低 Dmax 或改用 RCD/有源复位');
      if (r.dmin < 0.05) warns.push('Dmin 过小(<0.05),占空比范围过宽,建议检查匝比');
      warnEl.textContent = warns.join(';');
    }

    function applyPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      Object.entries(p).forEach(([k, v]) => {
        const el = container.querySelector(`#fw-${k}`);
        if (el && typeof v === 'number') el.value = v;
      });
      calculate();
    }

    const debounced = debounce(calculate, 100);
    container.querySelectorAll('input').forEach(el => el.addEventListener('input', debounced));
    container.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

    applyPreset('telecom');
  }
};
