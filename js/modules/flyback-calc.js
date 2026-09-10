import { autoUnit, formatNumber, debounce } from '../utils.js';

// ============ 纯函数核心 ============

/**
 * 反激(Flyback)变换器电气设计(CCM/DCM 边界法)
 * @param {object} p
 * @param {number} p.vinMin 最低输入电压 V
 * @param {number} p.vinMax 最高输入电压 V
 * @param {number} p.vout   输出电压 V
 * @param {number} p.iout   输出电流 A
 * @param {number} p.fs     开关频率 Hz
 * @param {number} p.eff    效率 0-1
 * @param {number} p.dmax   最大占空比(建议 ≤0.5)
 * @param {number} p.vf     输出二极管压降 V
 * @param {number} p.kr     电流纹波系数(1=DCM边界, <1=CCM)
 * @param {number} p.dvout  输出电压纹波目标 V
 */
export function calcFlyback(p) {
  const { vinMin, vinMax, vout, iout, fs, eff, dmax, vf, kr, dvout } = p;
  const pout = vout * iout;
  const pin = pout / eff;
  const vor = dmax * vinMin / (1 - dmax);           // 反射电压
  const n = vor / (vout + vf);                       // 匝比 Np/Ns
  const iavg = pin / vinMin;                         // 平均输入电流
  const ipk = iavg / ((1 - 0.5 * kr) * dmax);        // 原边峰值电流
  const lp = vinMin * dmax / (ipk * kr * fs);        // 原边电感
  const irms = ipk * Math.sqrt(dmax * (kr * kr / 3 - kr + 1)); // 原边有效值
  const ispk = ipk * n;                              // 副边峰值电流
  // 副边导通时间占比(断续边界近似): toff = (1-dmax) 在 Vinmin
  const isrms = ispk * Math.sqrt((1 - dmax) * (kr * kr / 3 - kr + 1));
  const vmos = vinMax + vor;                         // MOS 耐压(不含尖峰)
  const vmosRated = vmos * 1.3;                      // 30% 裕量
  const vdiode = vout + vinMax / n;                  // 二极管耐压
  const vdiodeRated = vdiode * 1.3;
  const cout = iout * dmax / (fs * dvout);           // 输出电容最小值
  // 输出电容纹波电流有效值 ≈ √(Isrms² − Iout²)
  const icapRms = Math.sqrt(Math.max(isrms * isrms - iout * iout, 0));
  return {
    pout, pin, vor, n, iavg, ipk, lp, irms, ispk, isrms,
    vmos, vmosRated, vdiode, vdiodeRated, cout, icapRms,
    mode: kr >= 1 ? 'DCM(断续)' : 'CCM(连续)',
  };
}

// ============ 页面模块 ============

const PRESETS = {
  adapter: { label: '5V/2A 适配器(宽压)', vinMin: 100, vinMax: 375, vout: 5, iout: 2, fs: 65, eff: 82, dmax: 0.45, vf: 0.5, kr: 1.0, dvout: 50 },
  aux: { label: '12V/1A 辅助电源(宽压)', vinMin: 100, vinMax: 375, vout: 12, iout: 1, fs: 65, eff: 85, dmax: 0.45, vf: 0.5, kr: 0.8, dvout: 60 },
  industrial: { label: '24V/0.5A(18-36V)', vinMin: 18, vinMax: 36, vout: 24, iout: 0.5, fs: 100, eff: 85, dmax: 0.45, vf: 0.5, kr: 0.7, dvout: 100 },
};

const FIELDS = [
  { id: 'vinMin', label: '输入电压下限 Vin(min)', unit: 'V' },
  { id: 'vinMax', label: '输入电压上限 Vin(max)', unit: 'V' },
  { id: 'vout', label: '输出电压 Vout', unit: 'V' },
  { id: 'iout', label: '输出电流 Iout', unit: 'A' },
  { id: 'fs', label: '开关频率 fs', unit: 'kHz' },
  { id: 'eff', label: '预计效率 η', unit: '%' },
  { id: 'dmax', label: '最大占空比 Dmax', unit: '' },
  { id: 'vf', label: '二极管压降 Vf', unit: 'V' },
  { id: 'kr', label: '纹波系数 Kr(1=DCM边界)', unit: '' },
  { id: 'dvout', label: '输出纹波目标 ΔVout', unit: 'mV' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">⚡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">反激(Flyback)变换器设计</h1>
          <p class="tool-desc">匝比、原边电感、峰值电流、器件耐压与输出电容计算(CCM/DCM)</p>
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
              <input type="number" id="fb-${f.id}" step="any" />
              ${f.unit ? `<span style="min-width:36px;text-align:left;color:var(--text-secondary);font-size:13px;">${f.unit}</span>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
          <div class="input-group"><label>原边电感 Lp</label><div class="result-box" id="fb-lp">—</div></div>
          <div class="input-group"><label>匝比 n = Np:Ns</label><div class="result-box" id="fb-n">—</div></div>
          <div class="input-group"><label>原边峰值电流 Ipk</label><div class="result-box" id="fb-ipk">—</div></div>
          <div class="input-group"><label>工作模式</label><div class="result-box" id="fb-mode">—</div></div>
        </div>
        <table class="data-table" id="fb-table">
          <thead><tr><th>参数</th><th>数值</th><th>说明</th></tr></thead>
          <tbody></tbody>
        </table>
        <div id="fb-warn" style="color:var(--danger);font-size:13px;margin-top:10px;"></div>
        <div class="formula-box" style="margin-top:16px;">
          V<sub>OR</sub> = D<sub>max</sub>·V<sub>in(min)</sub>/(1−D<sub>max</sub>) &nbsp;|&nbsp; n = V<sub>OR</sub>/(V<sub>out</sub>+V<sub>f</sub>) &nbsp;|&nbsp; L<sub>p</sub> = V<sub>in(min)</sub>·D<sub>max</sub>/(I<sub>pk</sub>·K<sub>r</sub>·f<sub>s</sub>)
        </div>
      </div>
      <div class="card" style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
        <strong>设计提示</strong><br>
        · 宽电压输入(85-265Vac 整流后约 100-375Vdc)建议 Kr 取 0.8~1.0,低压输入可取 0.5~0.7 减小峰值电流<br>
        · 磁芯选型、匝数计算与气隙请使用「隔离电源变压器」工具,把这里的 Lp、Ipk 填进去<br>
        · 原边建议加 RCD 吸收钳位漏感尖峰,MOS 实际耐压按 V<sub>ds</sub> = Vin(max) + V<sub>OR</sub> + 尖峰(预留 30% 裕量)
      </div>
    `;

    const warnEl = container.querySelector('#fb-warn');

    function getParams() {
      const g = id => parseFloat(container.querySelector(`#fb-${id}`).value);
      const v = {
        vinMin: g('vinMin'), vinMax: g('vinMax'), vout: g('vout'), iout: g('iout'),
        fs: g('fs') * 1e3, eff: g('eff') / 100, dmax: g('dmax'),
        vf: g('vf'), kr: g('kr'), dvout: g('dvout') * 1e-3,
      };
      return Object.values(v).every(x => isFinite(x) && x > 0) && v.dmax < 1 ? v : null;
    }

    function fmt(val, type) {
      const au = autoUnit(val, type);
      return `${formatNumber(au.value)} ${au.unit}`;
    }

    function calculate() {
      const p = getParams();
      if (!p) {
        ['lp', 'n', 'ipk', 'mode'].forEach(k => container.querySelector(`#fb-${k}`).textContent = '—');
        container.querySelector('#fb-table tbody').innerHTML = '';
        warnEl.textContent = '';
        return;
      }
      const r = calcFlyback(p);
      container.querySelector('#fb-lp').textContent =
        r.lp >= 1e-3 ? `${formatNumber(r.lp * 1e3)} mH` : `${formatNumber(r.lp * 1e6)} μH`;
      container.querySelector('#fb-n').textContent = `${formatNumber(r.n)} : 1`;
      container.querySelector('#fb-ipk').textContent = fmt(r.ipk, 'current');
      container.querySelector('#fb-mode').textContent = r.mode;

      const rows = [
        ['输出功率 / 输入功率', `${formatNumber(r.pout)} W / ${formatNumber(r.pin, 2)} W`, 'Pout = Vout·Iout,Pin = Pout/η'],
        ['反射电压 VOR', fmt(r.vor, 'voltage'), '决定匝比与 MOS 应力'],
        ['平均输入电流', fmt(r.iavg, 'current'), 'Vin(min) 满载时'],
        ['原边有效值电流', fmt(r.irms, 'current'), '绕组线径与 MOS 电流定额依据'],
        ['副边峰值电流', fmt(r.ispk, 'current'), 'Ipk × n'],
        ['副边有效值电流', fmt(r.isrms, 'current'), '副边绕组线径依据'],
        ['MOS 耐压需求', `${fmt(r.vmos, 'voltage')} → 建议 ≥ ${fmt(r.vmosRated, 'voltage')}`, '含 30% 裕量,不含漏感尖峰'],
        ['副边二极管耐压', `${fmt(r.vdiode, 'voltage')} → 建议 ≥ ${fmt(r.vdiodeRated, 'voltage')}`, '含 30% 裕量'],
        ['输出电容最小值', r.cout >= 1e-3 ? `${formatNumber(r.cout * 1e3)} mF` : `${formatNumber(r.cout * 1e6)} μF`, '按纹波目标;ESR 影响另计'],
        ['输出电容纹波电流', fmt(r.icapRms, 'current'), '选电容时核对纹波电流定额'],
      ];
      container.querySelector('#fb-table tbody').innerHTML =
        rows.map(r2 => `<tr><td>${r2[0]}</td><td><strong>${r2[1]}</strong></td><td style="color:var(--text-secondary);font-size:12px;">${r2[2]}</td></tr>`).join('');

      const warns = [];
      if (p.dmax > 0.5) warns.push('Dmax > 0.5,宽输入范围下次级应力偏大,一般不建议');
      if (r.vor > 150) warns.push('反射电压偏高,MOS 应力大,可适当减小 Dmax');
      warnEl.textContent = warns.join(';');
    }

    function applyPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      Object.entries(p).forEach(([k, v]) => {
        const el = container.querySelector(`#fb-${k}`);
        if (el && typeof v === 'number') el.value = v;
      });
      calculate();
    }

    const debounced = debounce(calculate, 100);
    container.querySelectorAll('input').forEach(el => el.addEventListener('input', debounced));
    container.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

    applyPreset('adapter');
  }
};
