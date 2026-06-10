import { debounce, formatNumber } from '../utils.js';

const F_PRESETS = [50e3, 100e3, 150e3, 200e3, 300e3, 500e3, 1e6];
const RIPPLE_PRESETS = [20, 30, 40, 50];

const CORE_DB = [
  { name: 'EE13', Ae: 12.5, Aw: 13.0, Le: 27.6 },
  { name: 'EE16', Ae: 19.8, Aw: 19.0, Le: 30.2 },
  { name: 'EE19', Ae: 23.0, Aw: 25.5, Le: 33.5 },
  { name: 'EE22', Ae: 42.0, Aw: 31.0, Le: 39.0 },
  { name: 'EE25', Ae: 52.0, Aw: 40.0, Le: 46.0 },
  { name: 'EE30', Ae: 60.0, Aw: 60.0, Le: 55.5 },
  { name: 'EE33', Ae: 86.0, Aw: 72.0, Le: 59.0 },
  { name: 'EE40', Ae: 127, Aw: 109, Le: 76.0 },
  { name: 'EE42', Ae: 182, Aw: 150, Le: 88.0 },
  { name: 'EE55', Ae: 250, Aw: 220, Le: 102 },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔌</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">隔离电源变压器计算器</h1>
          <p class="tool-desc">反激/正激/推挽拓扑匝比、电感、磁芯选型与器件应力计算</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="flyback">反激 Flyback</button>
          <button class="tab" data-mode="forward">正激 Forward</button>
          <button class="tab" data-mode="pushpull">推挽 Push-Pull</button>
        </div>

        <!-- 公共参数 -->
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-top:16px;">
          <div class="input-group">
            <label>输入电压范围 V<sub>in</sub></label>
            <div style="display:flex;gap:8px;">
              <div class="input-with-unit" style="flex:1;"><input type="number" id="st-vin-min" value="85" step="any" placeholder="min" /><select disabled style="min-width:auto;padding:6px 10px;"><option>V</option></select></div>
              <div style="line-height:36px;">~</div>
              <div class="input-with-unit" style="flex:1;"><input type="number" id="st-vin-max" value="265" step="any" placeholder="max" /><select disabled style="min-width:auto;padding:6px 10px;"><option>V</option></select></div>
            </div>
          </div>
          <div class="input-group">
            <label>输出电压 V<sub>out</sub></label>
            <div class="input-with-unit"><input type="number" id="st-vout" value="12" step="any" /><select disabled><option>V</option></select></div>
          </div>
          <div class="input-group">
            <label>输出电流 I<sub>out</sub></label>
            <div class="input-with-unit"><input type="number" id="st-iout" value="2" step="any" /><select disabled><option>A</option></select></div>
          </div>
          <div class="input-group">
            <label>开关频率 f<sub>sw</sub></label>
            <div class="input-with-unit">
              <input type="number" id="st-fsw" value="100" step="any" />
              <select id="st-fsw-unit"><option value="1">Hz</option><option value="1000" selected>kHz</option><option value="1000000">MHz</option></select>
            </div>
            <div class="preset-btns" style="margin-top:6px;">
              ${F_PRESETS.map(v => `<button class="preset-btn" data-f="${v}">${v >= 1e6 ? (v/1e6)+'MHz' : (v/1e3)+'kHz'}</button>`).join('')}
            </div>
          </div>
          <div class="input-group">
            <label>预估效率 η</label>
            <div class="input-with-unit"><input type="number" id="st-eta" value="85" step="any" /><select disabled><option>%</option></select></div>
          </div>
          <div class="input-group">
            <label>整流管压降 V<sub>f</sub></label>
            <div class="input-with-unit"><input type="number" id="st-vf" value="0.7" step="any" /><select disabled><option>V</option></select></div>
          </div>
          <div class="input-group">
            <label>纹波电流比例 (%)</label>
            <div class="input-with-unit"><input type="number" id="st-ripple" value="30" step="any" /><select disabled><option>%</option></select></div>
            <div class="preset-btns" style="margin-top:6px;">
              ${RIPPLE_PRESETS.map(v => `<button class="preset-btn" data-ripple="${v}">${v}%</button>`).join('')}
            </div>
          </div>
          <div class="input-group" id="st-advanced-toggle" style="align-self:end;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:400;">
              <input type="checkbox" id="st-adv-check" /> 展开磁芯选型高级参数
            </label>
          </div>
        </div>

        <!-- 高级参数 -->
        <div id="st-advanced" style="display:none;margin-top:16px;padding:16px;border:1px dashed var(--border);border-radius:8px;background:rgba(128,128,128,0.03);">
          <div style="font-weight:700;margin-bottom:12px;">磁芯选型参数（AP 法）</div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div class="input-group">
              <label>磁通密度摆幅 ΔB</label>
              <div class="input-with-unit"><input type="number" id="st-dB" value="0.25" step="any" /><select disabled><option>T</option></select></div>
            </div>
            <div class="input-group">
              <label>电流密度 J</label>
              <div class="input-with-unit"><input type="number" id="st-J" value="5" step="any" /><select disabled><option>A/mm²</option></select></div>
            </div>
            <div class="input-group">
              <label>窗口利用系数 K<sub>u</sub></label>
              <div class="input-with-unit"><input type="number" id="st-Ku" value="0.4" step="any" /><select disabled></select></div>
            </div>
            <div class="input-group">
              <label>波形系数 K<sub>j</sub></label>
              <div class="input-with-unit"><input type="number" id="st-Kj" value="1.0" step="any" /><select disabled></select></div>
            </div>
          </div>
        </div>

        <div id="st-warn" style="margin-top:12px;color:var(--danger);font-weight:600;display:none;"></div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          <div class="input-group"><label>匝比 Np:Ns</label><div class="result-box" id="st-turns">—</div></div>
          <div class="input-group"><label>占空比 D</label><div class="result-box" id="st-d">—</div></div>
          <div class="input-group"><label>初级/励磁电感</label><div class="result-box" id="st-l">—</div></div>
          <div class="input-group"><label>峰值电流 I<sub>pk</sub></label><div class="result-box" id="st-ilp">—</div></div>
          <div class="input-group"><label>初级 RMS 电流</label><div class="result-box" id="st-irms">—</div></div>
          <div class="input-group"><label>MOS 管耐压需求</label><div class="result-box" id="st-vds">—</div></div>
          <div class="input-group"><label>整流管耐压需求</label><div class="result-box" id="st-vd">—</div></div>
          <div class="input-group"><label>输出滤波电感</label><div class="result-box" id="st-lout">—</div></div>
        </div>

        <div id="st-core-rec" style="margin-top:16px;padding:12px;border-radius:8px;background:rgba(128,128,128,0.05);display:none;">
          <div style="font-weight:700;margin-bottom:6px;">磁芯推荐（AP 法）</div>
          <div id="st-core-text" style="font-size:13px;color:var(--text-secondary);"></div>
        </div>

        <div class="formula-box" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;">公式说明</div>
          <div id="st-formula">选择拓扑以显示对应公式</div>
        </div>
      </div>
    `;

    const tabs = container.querySelectorAll('.tab');
    const contents = container.querySelectorAll('.tab-content');
    function setMode(mode) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      calculate();
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    function getFsw() {
      const val = parseFloat(container.querySelector('#st-fsw').value);
      const unit = parseFloat(container.querySelector('#st-fsw-unit').value);
      return isNaN(val) ? NaN : val * unit;
    }

    function getCommonInputs() {
      const vinMin = parseFloat(container.querySelector('#st-vin-min').value);
      const vinMax = parseFloat(container.querySelector('#st-vin-max').value);
      const vout = parseFloat(container.querySelector('#st-vout').value);
      const iout = parseFloat(container.querySelector('#st-iout').value);
      const fsw = getFsw();
      const eta = parseFloat(container.querySelector('#st-eta').value) / 100;
      const vf = parseFloat(container.querySelector('#st-vf').value);
      const ripplePct = parseFloat(container.querySelector('#st-ripple').value) / 100;
      return { vinMin, vinMax, vout, iout, fsw, eta, vf, ripplePct };
    }

    function getAdvanced() {
      return {
        dB: parseFloat(container.querySelector('#st-dB').value) || 0.25,
        J: parseFloat(container.querySelector('#st-J').value) || 5,
        Ku: parseFloat(container.querySelector('#st-Ku').value) || 0.4,
        Kj: parseFloat(container.querySelector('#st-Kj').value) || 1.0,
      };
    }

    function formatInductance(L) {
      if (L >= 1) return L.toFixed(3) + ' H';
      if (L >= 1e-3) return (L * 1e3).toFixed(2) + ' mH';
      if (L >= 1e-6) return (L * 1e6).toFixed(2) + ' μH';
      return (L * 1e9).toFixed(2) + ' nH';
    }

    function recommendCore(AP_need_cm4) {
      const cores = CORE_DB.map(c => ({ ...c, AP: c.Ae * c.Aw * 1e-8 })).filter(c => c.AP >= AP_need_cm4 * 0.7);
      cores.sort((a, b) => a.AP - b.AP);
      return cores.slice(0, 3);
    }

    function calcAP(Pt, fsw, adv) {
      // AP = (Pt * 10^4) / (Ku * Kj * dB * fsw * J)  [cm^4]
      // Pt 单位 W, fsw 单位 Hz, J 单位 A/cm^2 (1 A/mm^2 = 100 A/cm^2)
      const J_cm2 = adv.J * 100;
      return (Pt * 1e4) / (adv.Ku * adv.Kj * adv.dB * fsw * J_cm2);
    }

    function setResults(map) {
      for (const [id, val] of Object.entries(map)) {
        const el = container.querySelector('#' + id);
        if (el) el.textContent = val ?? '—';
      }
    }

    function calculateFlyback() {
      const { vinMin, vinMax, vout, iout, fsw, eta, vf, ripplePct } = getCommonInputs();
      const warnEl = container.querySelector('#st-warn');
      if ([vinMin, vinMax, vout, iout, fsw].some(isNaN) || fsw <= 0 || vinMin <= 0 || vout <= 0 || iout <= 0) {
        warnEl.style.display = 'none';
        setResults({ 'st-turns':'—','st-d':'—','st-l':'—','st-ilp':'—','st-irms':'—','st-vds':'—','st-vd':'—','st-lout':'—' });
        return;
      }
      const Pout = vout * iout;
      const Vro = vout + vf;
      // 反射电压法：假设 Dmax = 0.45（保守），则 n = (Vin_min * Dmax) / (Vro * (1-Dmax))
      const Dmax = 0.45;
      const n = (vinMin * Dmax) / (Vro * (1 - Dmax));
      const D = Vro / (vinMin / n + Vro); // 实际 Vin_min 下的占空比
      const DmaxReal = Vro / (vinMin / n + Vro);
      const dIL = ripplePct * (Pout / (vinMin * D * eta));
      const Lp = (vinMin * D) ** 2 / (2 * Pout * fsw * (ripplePct || 0.3));
      const Ipk = (2 * Pout) / (vinMin * D * eta) + dIL / 2;
      const Irms = Ipk * Math.sqrt(DmaxReal / 3); // DCM 近似
      const Vds = vinMax + n * Vro + 50; // 50V 尖峰裕量
      const Vd = vout + vinMax / n;

      setResults({
        'st-turns': formatNumber(n) + ' : 1',
        'st-d': (D * 100).toFixed(1) + ' % (max ' + (DmaxReal * 100).toFixed(1) + '%)',
        'st-l': formatInductance(Lp),
        'st-ilp': Ipk.toFixed(2) + ' A',
        'st-irms': Irms.toFixed(2) + ' A',
        'st-vds': '≥ ' + Math.round(Vds) + ' V',
        'st-vd': '≥ ' + Math.round(Vd) + ' V',
        'st-lout': '无需 ( Flyback )',
      });

      if (DmaxReal > 0.5) warnEl.textContent = '⚠️ 占空比超过 50%，建议增大匝比或降低输入电压范围';
      else warnEl.style.display = 'none';

      container.querySelector('#st-formula').innerHTML = `
        <div>反射电压 V<sub>r</sub> = N × (V<sub>out</sub> + V<sub>f</sub>)</div>
        <div>占空比 D = V<sub>r</sub> / (V<sub>in</sub> + V<sub>r</sub>)</div>
        <div>初级电感 L<sub>p</sub> = (V<sub>in</sub> × D)² / (2 × P<sub>out</sub> × f<sub>sw</sub> × K<sub>rf</sub>)</div>
        <div>峰值电流 I<sub>pk</sub> = (2P<sub>out</sub>) / (V<sub>in</sub>×D×η) + ΔI/2</div>
      `;

      // 磁芯推荐
      if (container.querySelector('#st-adv-check').checked) {
        const adv = getAdvanced();
        const Pt = Pout / eta + Pout;
        const AP = calcAP(Pt, fsw, adv);
        const recs = recommendCore(AP);
        const coreEl = container.querySelector('#st-core-rec');
        const coreText = container.querySelector('#st-core-text');
        if (recs.length) {
          coreEl.style.display = 'block';
          coreText.innerHTML = `所需 AP ≈ ${AP.toFixed(4)} cm⁴<br/>推荐：${recs.map(c => `<b>${c.name}</b>(AP=${c.AP.toFixed(3)}cm⁴)`).join('、')}`;
        } else {
          coreEl.style.display = 'none';
        }
      } else {
        container.querySelector('#st-core-rec').style.display = 'none';
      }
    }

    function calculateForward() {
      const { vinMin, vinMax, vout, iout, fsw, eta, vf, ripplePct } = getCommonInputs();
      const warnEl = container.querySelector('#st-warn');
      if ([vinMin, vinMax, vout, iout, fsw].some(isNaN) || fsw <= 0 || vinMin <= 0 || vout <= 0 || iout <= 0) {
        warnEl.style.display = 'none';
        setResults({ 'st-turns':'—','st-d':'—','st-l':'—','st-ilp':'—','st-irms':'—','st-vds':'—','st-vd':'—','st-lout':'—' });
        return;
      }
      const Dmax = 0.45;
      const n = (vinMin * Dmax) / (vout + vf);
      const D = (vout + vf) / (vinMin / n);
      const IL = iout;
      const dIL = ripplePct * IL;
      const Lout = ((vinMin / n) - (vout + vf)) * D / (dIL * fsw);
      const Ilp = IL + dIL / 2;
      const Vds = 2 * vinMax;
      const Vd = 2 * (vout + vf);

      setResults({
        'st-turns': formatNumber(n) + ' : 1',
        'st-d': (D * 100).toFixed(1) + ' % (max ' + (Dmax * 100).toFixed(1) + '%)',
        'st-l': '励磁电感由磁芯决定',
        'st-ilp': Ilp.toFixed(2) + ' A',
        'st-irms': (IL * Math.sqrt(D)).toFixed(2) + ' A (次级)',
        'st-vds': '≥ ' + Math.round(Vds) + ' V',
        'st-vd': '≥ ' + Math.round(Vd) + ' V',
        'st-lout': formatInductance(Lout),
      });

      if (D > 0.5) { warnEl.textContent = '⚠️ 占空比超过 50%，单管正激需复位绕组且 D<0.5'; warnEl.style.display = 'block'; }
      else warnEl.style.display = 'none';

      container.querySelector('#st-formula').innerHTML = `
        <div>匝比 N = (V<sub>in_min</sub> × D<sub>max</sub>) / (V<sub>out</sub> + V<sub>f</sub>)</div>
        <div>占空比 D = (V<sub>out</sub> + V<sub>f</sub>) / (V<sub>in</sub> / N)</div>
        <div>输出电感 L<sub>out</sub> = ((V<sub>in</sub>/N) − V<sub>out</sub>) × D / (ΔI<sub>L</sub> × f<sub>sw</sub>)</div>
        <div>MOS 耐压 ≥ 2 × V<sub>in_max</sub>（含复位）</div>
      `;

      if (container.querySelector('#st-adv-check').checked) {
        const adv = getAdvanced();
        const Pout = vout * iout;
        const Pt = Pout / eta + Pout;
        const AP = calcAP(Pt, fsw, adv);
        const recs = recommendCore(AP);
        const coreEl = container.querySelector('#st-core-rec');
        const coreText = container.querySelector('#st-core-text');
        if (recs.length) {
          coreEl.style.display = 'block';
          coreText.innerHTML = `所需 AP ≈ ${AP.toFixed(4)} cm⁴<br/>推荐：${recs.map(c => `<b>${c.name}</b>(AP=${c.AP.toFixed(3)}cm⁴)`).join('、')}`;
        } else coreEl.style.display = 'none';
      } else container.querySelector('#st-core-rec').style.display = 'none';
    }

    function calculatePushPull() {
      const { vinMin, vinMax, vout, iout, fsw, eta, vf, ripplePct } = getCommonInputs();
      const warnEl = container.querySelector('#st-warn');
      if ([vinMin, vinMax, vout, iout, fsw].some(isNaN) || fsw <= 0 || vinMin <= 0 || vout <= 0 || iout <= 0) {
        warnEl.style.display = 'none';
        setResults({ 'st-turns':'—','st-d':'—','st-l':'—','st-ilp':'—','st-irms':'—','st-vds':'—','st-vd':'—','st-lout':'—' });
        return;
      }
      const Dmax = 0.45;
      const n = (vinMin * 2 * Dmax) / (vout + vf);
      const D = n * (vout + vf) / (2 * vinMin);
      const IL = iout;
      const dIL = ripplePct * IL;
      const Lout = ((vinMin / n) - (vout + vf)) * D / (dIL * fsw);
      const Ilp = IL + dIL / 2;
      const Vds = 2 * vinMax;
      const Vd = 2 * (vout + vf);

      setResults({
        'st-turns': formatNumber(n) + ' : 1',
        'st-d': (D * 100).toFixed(1) + ' % (每臂 max ' + (Dmax * 100).toFixed(1) + '%)',
        'st-l': '中心抽头变压器',
        'st-ilp': Ilp.toFixed(2) + ' A (每臂)',
        'st-irms': (IL * Math.sqrt(D)).toFixed(2) + ' A (次级)',
        'st-vds': '≥ ' + Math.round(Vds) + ' V',
        'st-vd': '≥ ' + Math.round(Vd) + ' V',
        'st-lout': formatInductance(Lout),
      });

      if (D > 0.5) { warnEl.textContent = '⚠️ 推挽每臂占空比应 < 0.5，需留死区'; warnEl.style.display = 'block'; }
      else warnEl.style.display = 'none';

      container.querySelector('#st-formula').innerHTML = `
        <div>匝比 N = (V<sub>in_min</sub> × 2D<sub>max</sub>) / (V<sub>out</sub> + V<sub>f</sub>)</div>
        <div>占空比 D = N × (V<sub>out</sub> + V<sub>f</sub>) / (2 × V<sub>in</sub>)</div>
        <div>输出电感 L<sub>out</sub> = ((V<sub>in</sub>/N) − V<sub>out</sub>) × D / (ΔI<sub>L</sub> × f<sub>sw</sub>)</div>
        <div>MOS 耐压 ≥ 2 × V<sub>in_max</sub></div>
      `;

      if (container.querySelector('#st-adv-check').checked) {
        const adv = getAdvanced();
        const Pout = vout * iout;
        const Pt = Pout / eta + Pout;
        const AP = calcAP(Pt, fsw, adv);
        const recs = recommendCore(AP);
        const coreEl = container.querySelector('#st-core-rec');
        const coreText = container.querySelector('#st-core-text');
        if (recs.length) {
          coreEl.style.display = 'block';
          coreText.innerHTML = `所需 AP ≈ ${AP.toFixed(4)} cm⁴<br/>推荐：${recs.map(c => `<b>${c.name}</b>(AP=${c.AP.toFixed(3)}cm⁴)`).join('、')}`;
        } else coreEl.style.display = 'none';
      } else container.querySelector('#st-core-rec').style.display = 'none';
    }

    function calculate() {
      const mode = container.querySelector('.tab.active').dataset.mode;
      if (mode === 'flyback') calculateFlyback();
      else if (mode === 'forward') calculateForward();
      else calculatePushPull();
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => el.addEventListener('input', debouncedCalc));

    container.querySelectorAll('.preset-btn[data-f]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = parseFloat(btn.dataset.f);
        const input = container.querySelector('#st-fsw');
        const unitSel = container.querySelector('#st-fsw-unit');
        if (f >= 1e6) { input.value = f / 1e6; unitSel.value = 1000000; }
        else { input.value = f / 1e3; unitSel.value = 1000; }
        calculate();
      });
    });
    container.querySelectorAll('.preset-btn[data-ripple]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelector('#st-ripple').value = btn.dataset.ripple;
        calculate();
      });
    });
    container.querySelector('#st-adv-check').addEventListener('change', () => {
      container.querySelector('#st-advanced').style.display = container.querySelector('#st-adv-check').checked ? 'block' : 'none';
      calculate();
    });

    calculate();
  }
};
