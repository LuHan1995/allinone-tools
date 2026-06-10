import { debounce, formatNumber, E24_BASE, E96_BASE, generateSeries } from '../utils.js';

const Z0_PRESETS = [50, 75, 90, 100, 110];
const ZS_PRESETS = [0, 20, 30, 50];
const V_PRESETS = [1.8, 2.5, 3.3, 5];

const SERIES_NAMES = { E24: 'E24', E96: 'E96' };

function nearestStandard(value, series) {
  if (!isFinite(value) || value <= 0) return null;
  const max = Math.max(value * 100, 1e7);
  const list = series === 'E96' ? generateSeries(E96_BASE, max) : generateSeries(E24_BASE, max);
  let best = list[0];
  let bestErr = Infinity;
  for (const r of list) {
    const err = Math.abs(Math.log(r / value));
    if (err < bestErr) { bestErr = err; best = r; }
  }
  return best;
}

function formatR(val) {
  if (!isFinite(val) || val <= 0) return '—';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + ' MΩ';
  if (val >= 1e3) return (val / 1e3).toFixed(2) + ' kΩ';
  if (val >= 1) return val.toFixed(1) + ' Ω';
  if (val >= 1e-3) return (val * 1e3).toFixed(2) + ' mΩ';
  return val.toExponential(2) + ' Ω';
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔚</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">端接电阻计算器</h1>
          <p class="tool-desc">串联/并联/Thevenin/AC/差分端接电阻选型与信号完整性估算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="series">串联端接</button>
          <button class="tab" data-mode="parallel">并联端接</button>
          <button class="tab" data-mode="thevenin">Thevenin 端接</button>
          <button class="tab" data-mode="ac">AC 端接</button>
          <button class="tab" data-mode="diff">差分端接</button>
        </div>

        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-top:16px;">
          <div class="input-group" id="grp-z0">
            <label>传输线阻抗 Z<sub>0</sub> / Z<sub>diff</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-z0" value="50" step="any" />
              <select disabled><option>Ω</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${Z0_PRESETS.map(v => `<button class="preset-btn" data-z0="${v}">${v}Ω</button>`).join('')}
            </div>
          </div>
          <div class="input-group" id="grp-zs">
            <label>驱动器输出阻抗 Z<sub>s</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-zs" value="30" step="any" />
              <select disabled><option>Ω</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${ZS_PRESETS.map(v => `<button class="preset-btn" data-zs="${v}">${v}Ω</button>`).join('')}
            </div>
          </div>
          <div class="input-group" id="grp-zl">
            <label>负载阻抗 Z<sub>L</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-zl" value="1e6" step="any" />
              <select disabled><option>Ω</option></select>
            </div>
          </div>
          <div class="input-group" id="grp-vcc">
            <label>上拉/分压电源 V<sub>CC</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-vcc" value="3.3" step="any" />
              <select disabled><option>V</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${V_PRESETS.map(v => `<button class="preset-btn" data-v="${v}">${v}V</button>`).join('')}
            </div>
          </div>
          <div class="input-group" id="grp-vswing">
            <label>信号摆幅 V<sub>swing</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-vswing" value="3.3" step="any" />
              <select disabled><option>V</option></select>
            </div>
          </div>
          <div class="input-group" id="grp-tr">
            <label>信号上升时间 T<sub>r</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-tr" value="1" step="any" />
              <select id="term-tr-unit"><option value="1e-12">ps</option><option value="1e-9" selected>ns</option><option value="1e-6">μs</option></select>
            </div>
          </div>
          <div class="input-group" id="grp-tpd">
            <label>传输线延迟 t<sub>pd</sub></label>
            <div class="input-with-unit">
              <input type="number" id="term-tpd" value="150" step="any" />
              <select disabled><option>ps/in</option></select>
            </div>
          </div>
          <div class="input-group" id="grp-len">
            <label>线长</label>
            <div class="input-with-unit">
              <input type="number" id="term-len" value="6" step="any" />
              <select id="term-len-unit"><option value="0.0254">mil</option><option value="1" selected>inch</option><option value="39.37">cm</option><option value="1000">m</option></select>
            </div>
          </div>
          <div class="input-group" id="grp-series">
            <label>标准电阻系列</label>
            <select id="term-series" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);">
              <option value="E24">E24</option>
              <option value="E96" selected>E96</option>
            </select>
          </div>
        </div>

        <div id="term-warn" style="margin-top:12px;color:var(--danger);font-weight:600;display:none;"></div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          <div class="input-group"><label>推荐电阻值</label><div class="result-box" id="term-res">—</div></div>
          <div class="input-group"><label>最近标准值</label><div class="result-box" id="term-std">—</div></div>
          <div class="input-group"><label>反射系数 Γ</label><div class="result-box" id="term-gamma">—</div></div>
          <div class="input-group"><label>端接功耗</label><div class="result-box" id="term-pwr">—</div></div>
          <div class="input-group" id="grp-extra-label"><label>补充信息</label><div class="result-box" id="term-extra">—</div></div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">公式与说明</div>
          <div id="term-formula">选择端接类型以显示对应公式</div>
        </div>
      </div>
    `;

    const tabs = container.querySelectorAll('.tab');
    let mode = 'series';
    function setMode(m) {
      mode = m;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      updateVisibility();
      calculate();
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    const inputs = {
      z0: container.querySelector('#term-z0'),
      zs: container.querySelector('#term-zs'),
      zl: container.querySelector('#term-zl'),
      vcc: container.querySelector('#term-vcc'),
      vswing: container.querySelector('#term-vswing'),
      tr: container.querySelector('#term-tr'),
      trUnit: container.querySelector('#term-tr-unit'),
      tpd: container.querySelector('#term-tpd'),
      len: container.querySelector('#term-len'),
      lenUnit: container.querySelector('#term-len-unit'),
      series: container.querySelector('#term-series'),
    };

    function updateVisibility() {
      const show = (id, visible) => {
        const el = container.querySelector(id);
        if (el) el.style.display = visible ? '' : 'none';
      };
      show('#grp-zs', ['series'].includes(mode));
      show('#grp-zl', ['parallel', 'thevenin', 'ac', 'series'].includes(mode));
      show('#grp-vcc', ['thevenin', 'parallel'].includes(mode));
      show('#grp-vswing', ['parallel', 'thevenin', 'diff'].includes(mode));
      show('#grp-tr', ['series', 'ac'].includes(mode));
      show('#grp-tpd', ['ac'].includes(mode));
      show('#grp-len', ['ac'].includes(mode));
      show('#grp-z0 label', true);
      container.querySelector('#grp-z0 label').innerHTML = mode === 'diff' ? '差分阻抗 Z<sub>diff</sub>' : '传输线阻抗 Z<sub>0</sub>';
    }

    function getVal(el) {
      const v = parseFloat(el.value);
      return isNaN(v) ? 0 : v;
    }
    function getTime() { return getVal(inputs.tr) * parseFloat(inputs.trUnit.value); }
    function getLength() { return getVal(inputs.len) * parseFloat(inputs.lenUnit.value); }

    function setWarn(msg) {
      const el = container.querySelector('#term-warn');
      if (msg) { el.textContent = msg; el.style.display = 'block'; }
      else el.style.display = 'none';
    }
    function clearResults() {
      container.querySelector('#term-res').textContent = '—';
      container.querySelector('#term-std').textContent = '—';
      container.querySelector('#term-gamma').textContent = '—';
      container.querySelector('#term-pwr').textContent = '—';
      container.querySelector('#term-extra').textContent = '—';
    }

    function calculateSeries() {
      const z0 = getVal(inputs.z0);
      const zs = getVal(inputs.zs);
      const zl = getVal(inputs.zl);
      const tr = getTime();
      if (z0 <= 0) { setWarn('Z₀ 必须大于 0'); clearResults(); return; }
      const rs = Math.max(0, z0 - zs);
      const std = nearestStandard(rs, inputs.series.value);
      const gamma = zl > 0 ? (zl - z0) / (zl + z0) : 1;
      const tau = rs * (tr ? tr / 2.2 : 1e-12); // C_load 未知，用简化
      const rcDelay = tr ? formatNumber(tau * 1e12) + ' ps (RC 近似)' : '—';
      container.querySelector('#term-res').textContent = formatR(rs);
      container.querySelector('#term-std').textContent = std ? formatR(std) : '—';
      container.querySelector('#term-gamma').textContent = Math.abs(gamma).toFixed(3) + (gamma > 0 ? '（正反射）' : '（负反射）');
      container.querySelector('#term-pwr').textContent = '0（动态损耗极小）';
      container.querySelector('#term-extra').textContent = `Rs + Zs ≈ ${formatR(rs + zs)} ≈ Z₀; 估算 RC 延迟 ${rcDelay}; ${gamma === 0 ? '理想匹配' : '负载端仍有反射，源端吸收返回波'}`;
      container.querySelector('#term-formula').innerHTML = `
        <div>串联电阻 R<sub>s</sub> = Z₀ − Z<sub>s_driver</sub></div>
        <div>反射系数 Γ = (Z<sub>L</sub> − Z₀) / (Z<sub>L</sub> + Z₀)</div>
        <div>适用：点对点单向传输，CMOS/TTL 高阻负载</div>
        <div>注意：接收端先看到全幅反射，半往返后源端吸收反射波</div>
      `;
    }

    function calculateParallel() {
      const z0 = getVal(inputs.z0);
      const zl = getVal(inputs.zl);
      const vswing = getVal(inputs.vswing);
      const vcc = getVal(inputs.vcc);
      if (z0 <= 0) { setWarn('Z₀ 必须大于 0'); return; }
      const rp = z0;
      const std = nearestStandard(rp, inputs.series.value);
      const gamma = zl > 0 ? ((zl * rp) / (zl + rp) - z0) / ((zl * rp) / (zl + rp) + z0) : -1;
      const vterm = vcc || 0;
      const pdc = vterm > 0 ? (vterm * vterm) / rp : (vswing * vswing) / (4 * rp);
      const swingAtLoad = vswing * (rp / (z0 + rp));
      container.querySelector('#term-res').textContent = formatR(rp);
      container.querySelector('#term-std').textContent = std ? formatR(std) : '—';
      container.querySelector('#term-gamma').textContent = Math.abs(gamma).toFixed(3);
      container.querySelector('#term-pwr').textContent = formatNumber(pdc * 1e3) + ' mW (静态)';
      container.querySelector('#term-extra').textContent = `负载端信号幅度 ≈ ${(swingAtLoad).toFixed(2)} V（衰减 ${(vswing - swingAtLoad).toFixed(2)} V）`;
      container.querySelector('#term-formula').innerHTML = `
        <div>并联电阻 R<sub>p</sub> = Z₀</div>
        <div>静态功耗 P = V<sub>term</sub>² / R<sub>p</sub></div>
        <div>反射系数 Γ = (Z<sub>eq</sub> − Z₀) / (Z<sub>eq</sub> + Z₀)，其中 Z<sub>eq</sub> = Z<sub>L</sub> ∥ R<sub>p</sub></div>
        <div>适用：高速 CMOS、需要严格阻抗匹配且功耗可接受</div>
      `;
    }

    function calculateThevenin() {
      const z0 = getVal(inputs.z0);
      const vcc = getVal(inputs.vcc);
      const vswing = getVal(inputs.vswing);
      const zl = getVal(inputs.zl);
      if (z0 <= 0 || vcc <= 0) { setWarn('Z₀ 和 Vcc 必须大于 0'); clearResults(); return; }
      const r1 = 2 * z0;
      const r2 = 2 * z0;
      const std1 = nearestStandard(r1, inputs.series.value);
      const std2 = nearestStandard(r2, inputs.series.value);
      const vth = vcc * r2 / (r1 + r2);
      const req = (r1 * r2) / (r1 + r2);
      const gamma = zl > 0 ? ((zl * req) / (zl + req) - z0) / ((zl * req) / (zl + req) + z0) : -1;
      const pdc = (vcc * vcc) / (r1 + r2);
      container.querySelector('#term-res').textContent = `R₁=${formatR(r1)}, R₂=${formatR(r2)}`;
      container.querySelector('#term-std').textContent = std1 && std2 ? `R₁=${formatR(std1)}, R₂=${formatR(std2)}` : '—';
      container.querySelector('#term-gamma').textContent = Math.abs(gamma).toFixed(3);
      container.querySelector('#term-pwr').textContent = formatNumber(pdc * 1e3) + ' mW (静态)';
      container.querySelector('#term-extra').textContent = `Thevenin 电压 V<sub>TH</sub> ≈ ${vth.toFixed(2)} V；逻辑高电平 ≈ ${(vswing * req / (z0 + req)).toFixed(2)} V`;
      container.querySelector('#term-formula').innerHTML = `
        <div>Thevenin 端接：R₁ = R₂ = 2 × Z₀</div>
        <div>等效电阻 R<sub>eq</sub> = R₁ ∥ R₂ = Z₀</div>
        <div>Thevenin 电压 V<sub>TH</sub> = V<sub>CC</sub> × R₂ / (R₁ + R₂) = V<sub>CC</sub> / 2</div>
        <div>适用：TTL/ECL 等需要直流偏置的高速信号</div>
      `;
    }

    function calculateAC() {
      const z0 = getVal(inputs.z0);
      const tr = getTime();
      const tpd = getVal(inputs.tpd); // ps/in
      const len = getLength(); // inch
      if (z0 <= 0 || tpd <= 0 || len <= 0) { setWarn('Z₀、t_pd 和线长必须大于 0'); clearResults(); return; }
      const rac = z0;
      const stdR = nearestStandard(rac, inputs.series.value);
      // C = 3 * Tflight / Z0, Tflight in seconds
      const tFlight = tpd * len * 1e-12; // seconds
      const cac = (3 * tFlight) / z0;
      // Pick nearest E6/E12 cap
      const capStd = nearestCapStandard(cac);
      const fc = 1 / (2 * Math.PI * rac * cac);
      container.querySelector('#term-res').textContent = `R=${formatR(rac)}, C=${formatC(cac)}`;
      container.querySelector('#term-std').textContent = stdR && capStd ? `R=${formatR(stdR)}, C=${formatC(capStd)}` : '—';
      container.querySelector('#term-gamma').textContent = '低频理想匹配（电容隔直）';
      container.querySelector('#term-pwr').textContent = '≈ 0（无直流路径）';
      container.querySelector('#term-extra').textContent = `RC 截止频率 ≈ ${formatNumber(fc)} Hz；线传输时延 ≈ ${formatNumber(tFlight * 1e12)} ps`;
      container.querySelector('#term-formula').innerHTML = `
        <div>AC 端接：R = Z₀，C = 3 × t<sub>flight</sub> / Z₀</div>
        <div>t<sub>flight</sub> = t<sub>pd</sub> × 线长</div>
        <div>截止频率 f<sub>c</sub> = 1 / (2πRC)</div>
        <div>适用：低功耗高速链路，无需直流路径（如时钟线）</div>
      `;
    }

    function calculateDiff() {
      const z0 = getVal(inputs.z0); // actually Zdiff
      const vswing = getVal(inputs.vswing);
      if (z0 <= 0) { setWarn('Zdiff 必须大于 0'); clearResults(); return; }
      const rt = z0;
      const std = nearestStandard(rt, inputs.series.value);
      const pwr = (vswing * vswing) / rt;
      container.querySelector('#term-res').textContent = formatR(rt);
      container.querySelector('#term-std').textContent = std ? formatR(std) : '—';
      container.querySelector('#term-gamma').textContent = '0.000（理想匹配）';
      container.querySelector('#term-pwr').textContent = vswing > 0 ? formatNumber(pwr * 1e3) + ' mW' : '—';
      container.querySelector('#term-extra').textContent = '跨接在差分对 P/N 之间，靠近接收端放置';
      container.querySelector('#term-formula').innerHTML = `
        <div>差分端接电阻 R<sub>t</sub> = Z<sub>diff</sub></div>
        <div>功耗 P = V<sub>diff</sub>² / R<sub>t</sub></div>
        <div>适用：LVDS/LVPECL/USB/HDMI/MIPI 等差分信号</div>
        <div>注意：共模端接与差分端接不同，此处仅计算差分端接</div>
      `;
    }

    function nearestCapStandard(value) {
      // Simple E12 cap series: 1.0, 1.5, 2.2, 3.3, 4.7, 6.8
      const E12 = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8];
      if (!isFinite(value) || value <= 0) return null;
      const decades = [1e-12, 1e-11, 1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3];
      let best = null, bestErr = Infinity;
      for (const d of decades) {
        for (const b of E12) {
          const c = b * d;
          const err = Math.abs(Math.log(c / value));
          if (err < bestErr) { bestErr = err; best = c; }
        }
      }
      return best;
    }

    function formatC(val) {
      if (!isFinite(val) || val <= 0) return '—';
      if (val >= 1e-3) return (val * 1e3).toFixed(2) + ' mF';
      if (val >= 1e-6) return (val * 1e6).toFixed(2) + ' μF';
      if (val >= 1e-9) return (val * 1e9).toFixed(2) + ' nF';
      if (val >= 1e-12) return (val * 1e12).toFixed(2) + ' pF';
      return val.toExponential(2) + ' F';
    }

    function calculate() {
      setWarn('');
      if (mode === 'series') calculateSeries();
      else if (mode === 'parallel') calculateParallel();
      else if (mode === 'thevenin') calculateThevenin();
      else if (mode === 'ac') calculateAC();
      else calculateDiff();
    }

    const debouncedCalc = debounce(calculate, 100);
    Object.values(inputs).forEach(el => el.addEventListener('input', debouncedCalc));

    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.z0 !== undefined) inputs.z0.value = btn.dataset.z0;
        if (btn.dataset.zs !== undefined) inputs.zs.value = btn.dataset.zs;
        if (btn.dataset.v !== undefined) inputs.vcc.value = btn.dataset.v;
        calculate();
      });
    });

    updateVisibility();
    calculate();
  }
};
