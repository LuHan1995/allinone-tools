import { autoUnit, formatNumber, debounce } from '../utils.js';

// ============ 纯函数核心 ============

/** FHA 一次谐波近似增益: M = 1/√((1 + (1/k)(1 − (fr/f)²))² + (Q·(f/fr − fr/f))²) */
export function llcGain(fOverFr, k, q) {
  const x = fOverFr;
  const a = 1 + (1 / k) * (1 - 1 / (x * x));
  const b = q * (x - 1 / x);
  return 1 / Math.sqrt(a * a + b * b);
}

/**
 * 半桥 LLC 谐振变换器设计
 * @param {object} p
 * @param {number} p.vinNom / p.vinMin / p.vinMax 母线电压 V
 * @param {number} p.vout 输出电压 V
 * @param {number} p.pout 输出功率 W
 * @param {number} p.fr 谐振频率 Hz
 * @param {number} p.k 电感比 Lm/Lr(典型 3~7)
 * @param {number} p.q 品质因数(典型 0.3~0.6)
 */
export function calcLLC(p) {
  const { vinNom, vinMin, vinMax, vout, pout, fr, k, q } = p;
  const n = vinNom / (2 * vout);                     // 匝比(谐振点增益=1)
  const rl = vout * vout / pout;                     // 负载电阻
  const rac = 8 * n * n * rl / (Math.PI * Math.PI);  // 等效交流电阻
  const lr = q * rac / (2 * Math.PI * fr);           // 谐振电感
  const cr = 1 / ((2 * Math.PI * fr) ** 2 * lr);     // 谐振电容
  const lm = k * lr;                                 // 励磁电感
  const mmin = 2 * n * vout / vinMax;                // 最高输入所需增益
  const mmax = 2 * n * vout / vinMin;                // 最低输入所需增益
  // 数值求解满足 Mmax 的最低工作频率(扫描 0.3fr ~ fr)
  let fmin = fr;
  for (let x = 0.3; x <= 1.0001; x += 0.0005) {
    if (llcGain(x, k, q) >= mmax) { fmin = x * fr; break; }
    fmin = x * fr;
  }
  const gainAtMin = llcGain(fmin / fr, k, q);
  const canRegulate = gainAtMin >= mmax;
  // 谐振点电流近似(副边电流折算到原边)
  const ir = Math.PI * (pout / vout) / n / (2 * Math.SQRT2); // 谐振腔电流有效值(近似)
  const imPk = n * vout / (4 * lm * fr);                      // 励磁电流峰值
  return { n, rl, rac, lr, cr, lm, mmin, mmax, fmin, canRegulate, ir, imPk };
}

/** 生成增益曲线 SVG(纯函数,可测试) */
export function renderGainCurveSVG(k, q, mmin, mmax) {
  const W = 560, H = 260, padL = 44, padR = 12, padT = 14, padB = 34;
  const x0 = 0.4, x1 = 2.5;
  const pts = [];
  let mMax = 0;
  for (let x = x0; x <= x1; x += 0.01) {
    const m = llcGain(x, k, q);
    pts.push([x, m]);
    if (m > mMax) mMax = m;
  }
  const yTop = Math.max(mMax, mmax, 1) * 1.15;
  const px = x => padL + (x - x0) / (x1 - x0) * (W - padL - padR);
  const py = m => padT + (1 - m / yTop) * (H - padT - padB);
  const ink = 'var(--text-primary, #1f2937)';
  const dim = 'var(--text-secondary, #9ca3af)';
  const acc = 'var(--primary, #2563eb)';

  let d = '';
  pts.forEach(([x, m], i) => { d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(m).toFixed(1) + ' '; });

  let grid = '';
  for (let x = 0.5; x <= 2.5; x += 0.5) {
    grid += `<line x1="${px(x)}" y1="${padT}" x2="${px(x)}" y2="${H - padB}" stroke="${dim}" stroke-width="0.5" opacity="0.4"/>` +
      `<text x="${px(x)}" y="${H - padB + 16}" text-anchor="middle" font-size="11" fill="${dim}">${x}</text>`;
  }
  for (let m = 0; m <= yTop; m += 0.5) {
    grid += `<line x1="${padL}" y1="${py(m)}" x2="${W - padR}" y2="${py(m)}" stroke="${dim}" stroke-width="0.5" opacity="0.4"/>` +
      `<text x="${padL - 6}" y="${py(m) + 4}" text-anchor="end" font-size="11" fill="${dim}">${formatNumber(m, 1)}</text>`;
  }
  const lines =
    `<line x1="${px(1)}" y1="${padT}" x2="${px(1)}" y2="${H - padB}" stroke="${acc}" stroke-width="1" stroke-dasharray="4,3"/>` +
    `<text x="${px(1) + 4}" y="${padT + 12}" font-size="11" fill="${acc}">fr</text>` +
    (mmax > 0 && mmax < yTop ? `<line x1="${padL}" y1="${py(mmax)}" x2="${W - padR}" y2="${py(mmax)}" stroke="#dc2626" stroke-width="1" stroke-dasharray="4,3"/><text x="${W - padR - 4}" y="${py(mmax) - 4}" text-anchor="end" font-size="11" fill="#dc2626">Mmax ${formatNumber(mmax, 2)}</text>` : '') +
    (mmin > 0 && mmin < yTop ? `<line x1="${padL}" y1="${py(mmin)}" x2="${W - padR}" y2="${py(mmin)}" stroke="#16a34a" stroke-width="1" stroke-dasharray="4,3"/><text x="${W - padR - 4}" y="${py(mmin) + 12}" text-anchor="end" font-size="11" fill="#16a34a">Mmin ${formatNumber(mmin, 2)}</text>` : '');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif">` +
    `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="${dim}">f / fr</text>` +
    `<text x="12" y="${padT + 6}" font-size="12" fill="${dim}">M</text>` +
    grid + lines +
    `<path d="${d.trim()}" fill="none" stroke="${ink}" stroke-width="2"/></svg>`;
}

// ============ 页面模块 ============

const PRESETS = {
  w100: { label: '12V/100W(400V 母线)', vinNom: 400, vinMin: 360, vinMax: 420, vout: 12, pout: 100, fr: 100, k: 5, q: 0.5 },
  w240: { label: '24V/240W(400V 母线)', vinNom: 400, vinMin: 360, vinMax: 420, vout: 24, pout: 240, fr: 100, k: 4, q: 0.45 },
  w150: { label: '48V/150W(400V 母线)', vinNom: 400, vinMin: 360, vinMax: 420, vout: 48, pout: 150, fr: 85, k: 6, q: 0.5 },
};

const FIELDS = [
  { id: 'vinNom', label: '母线电压额定 Vin(nom)', unit: 'V' },
  { id: 'vinMin', label: '母线电压下限 Vin(min)', unit: 'V' },
  { id: 'vinMax', label: '母线电压上限 Vin(max)', unit: 'V' },
  { id: 'vout', label: '输出电压 Vout', unit: 'V' },
  { id: 'pout', label: '输出功率 Pout', unit: 'W' },
  { id: 'fr', label: '谐振频率 fr', unit: 'kHz' },
  { id: 'k', label: '电感比 k = Lm/Lr', unit: '' },
  { id: 'q', label: '品质因数 Q', unit: '' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🌀</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">LLC 谐振变换器设计</h1>
          <p class="tool-desc">半桥 LLC 谐振参数(Lr/Cr/Lm)与增益特性计算(FHA 一次谐波近似)</p>
        </div>
      </div>
      <div class="card">
        <div class="preset-btns" style="margin-bottom:12px;">
          <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速参数:</span>
          ${Object.entries(PRESETS).map(([k2, p]) => `<button class="preset-btn" data-preset="${k2}">${p.label}</button>`).join('')}
        </div>
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          ${FIELDS.map(f => `
          <div class="input-group">
            <label>${f.label}</label>
            <div class="input-with-unit">
              <input type="number" id="llc-${f.id}" step="any" />
              ${f.unit ? `<span style="min-width:36px;text-align:left;color:var(--text-secondary);font-size:13px;">${f.unit}</span>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
          <div class="input-group"><label>谐振电感 Lr</label><div class="result-box" id="llc-lr">—</div></div>
          <div class="input-group"><label>谐振电容 Cr</label><div class="result-box" id="llc-cr">—</div></div>
          <div class="input-group"><label>励磁电感 Lm</label><div class="result-box" id="llc-lm">—</div></div>
          <div class="input-group"><label>最低工作频率</label><div class="result-box" id="llc-fmin">—</div></div>
        </div>
        <table class="data-table" id="llc-table">
          <thead><tr><th>参数</th><th>数值</th><th>说明</th></tr></thead>
          <tbody></tbody>
        </table>
        <div id="llc-warn" style="color:var(--danger);font-size:13px;margin-top:10px;"></div>
      </div>
      <div class="card">
        <strong>增益曲线(FHA 近似)</strong>
        <div id="llc-curve" style="overflow-x:auto;margin-top:10px;"></div>
        <div class="formula-box" style="margin-top:16px;">
          M(f) = 1/√((1 + (1/k)(1 − (f<sub>r</sub>/f)²))² + (Q·(f/f<sub>r</sub> − f<sub>r</sub>/f))²)
        </div>
      </div>
      <div class="card" style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
        <strong>设计提示</strong><br>
        · k 取 3~7: k 小则调频范围窄但励磁电流大、损耗高;k 大则轻载稳压困难<br>
        · Q 取 0.3~0.6: Q 大则增益曲线平缓,需要更宽的频率范围<br>
        · FHA 为近似方法,实际谐振点以下分感性/容性区,设计时请保证 fmin 仍在感性区(增益曲线下降沿)
      </div>
    `;

    const warnEl = container.querySelector('#llc-warn');

    function getParams() {
      const g = id => parseFloat(container.querySelector(`#llc-${id}`).value);
      const v = {
        vinNom: g('vinNom'), vinMin: g('vinMin'), vinMax: g('vinMax'), vout: g('vout'),
        pout: g('pout'), fr: g('fr') * 1e3, k: g('k'), q: g('q'),
      };
      return Object.values(v).every(x => isFinite(x) && x > 0) ? v : null;
    }

    function fmt(val, type) {
      const au = autoUnit(val, type);
      return `${formatNumber(au.value)} ${au.unit}`;
    }

    function calculate() {
      const p = getParams();
      if (!p) {
        ['lr', 'cr', 'lm', 'fmin'].forEach(k2 => container.querySelector(`#llc-${k2}`).textContent = '—');
        container.querySelector('#llc-table tbody').innerHTML = '';
        container.querySelector('#llc-curve').innerHTML = '';
        warnEl.textContent = '';
        return;
      }
      const r = calcLLC(p);
      container.querySelector('#llc-lr').textContent = `${formatNumber(r.lr * 1e6)} μH`;
      container.querySelector('#llc-cr').textContent =
        r.cr >= 1e-9 ? `${formatNumber(r.cr * 1e9)} nF` : `${formatNumber(r.cr * 1e12)} pF`;
      container.querySelector('#llc-lm').textContent = `${formatNumber(r.lm * 1e6)} μH`;
      container.querySelector('#llc-fmin').textContent = fmt(r.fmin, 'frequency');

      const rows = [
        ['变压器匝比 n', `${formatNumber(r.n, 3)} : 1`, '谐振点增益=1(半桥)'],
        ['等效交流电阻 Rac', fmt(r.rac, 'resistance'), 'Rac = 8n²·RL/π²'],
        ['增益需求 Mmin / Mmax', `${formatNumber(r.mmin, 3)} / ${formatNumber(r.mmax, 3)}`, '全输入电压范围'],
        ['谐振腔电流有效值', fmt(r.ir, 'current'), '谐振点附近近似'],
        ['励磁电流峰值', fmt(r.imPk, 'current'), 'Im = n·Vout/(4·Lm·fr)'],
      ];
      container.querySelector('#llc-table tbody').innerHTML =
        rows.map(r2 => `<tr><td>${r2[0]}</td><td><strong>${r2[1]}</strong></td><td style="color:var(--text-secondary);font-size:12px;">${r2[2]}</td></tr>`).join('');

      const warns = [];
      if (!r.canRegulate) warns.push('当前 k/Q 组合在 fr 以下无法达到 Mmax,低压输入将掉压:请减小 Q 或减小 k');
      if (p.k < 3) warns.push('k < 3,励磁电流偏大,注意轻载损耗');
      if (p.k > 8) warns.push('k > 8,轻载稳压可能困难');
      warnEl.textContent = warns.join(';');

      container.querySelector('#llc-curve').innerHTML = renderGainCurveSVG(p.k, p.q, r.mmin, r.mmax);
    }

    function applyPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      Object.entries(p).forEach(([k2, v]) => {
        const el = container.querySelector(`#llc-${k2}`);
        if (el && typeof v === 'number') el.value = v;
      });
      calculate();
    }

    const debounced = debounce(calculate, 100);
    container.querySelectorAll('input').forEach(el => el.addEventListener('input', debounced));
    container.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

    applyPreset('w100');
  }
};
