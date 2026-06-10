import { debounce, formatNumber, PHYSICAL, equivNoiseBW, thermalNoise, rss, calcENOB, calcNFCR } from '../utils.js';

const STAGE_META = {
  divider: { name: '分压器', icon: '🔗', params: [
    { key: 'r1', label: 'R₁', unit: 'Ω', val: 10000 },
    { key: 'r2', label: 'R₂', unit: 'Ω', val: 10000 },
  ]},
  opamp: { name: '运放增益级', icon: '🔺', params: [
    { key: 'gain', label: '闭环增益 G', unit: 'V/V', val: 10 },
    { key: 'vos', label: '输入失调 Vos', unit: 'µV', val: 100 },
    { key: 'ge', label: '增益误差', unit: '%', val: 0.1 },
    { key: 'bw', label: '-3dB 带宽', unit: 'Hz', val: 1000000 },
    { key: 'en', label: '电压噪声密度 en', unit: 'nV/√Hz', val: 4 },
    { key: 'in', label: '电流噪声密度 in', unit: 'pA/√Hz', val: 0.5 },
    { key: 'rg', label: '等效输入电阻 Req', unit: 'Ω', val: 1000 },
  ]},
  rc: { name: 'RC 低通', icon: '📉', params: [
    { key: 'r', label: 'R', unit: 'Ω', val: 100 },
    { key: 'c', label: 'C', unit: 'nF', val: 100 },
  ]},
  adc: { name: 'ADC', icon: '🔢', params: [
    { key: 'bits', label: '位数', unit: 'bit', val: 16 },
    { key: 'vref', label: '参考电压 Vref', unit: 'V', val: 3.3 },
    { key: 'inl', label: 'INL', unit: 'LSB', val: 2 },
    { key: 'dnl', label: 'DNL', unit: 'LSB', val: 0.5 },
    { key: 'fs', label: '采样率', unit: 'SPS', val: 1000000 },
  ]},
  dac: { name: 'DAC', icon: '🔢', params: [
    { key: 'bits', label: '位数', unit: 'bit', val: 12 },
    { key: 'vref', label: '参考电压 Vref', unit: 'V', val: 3.3 },
    { key: 'inl', label: 'INL', unit: 'LSB', val: 1 },
    { key: 'dnl', label: 'DNL', unit: 'LSB', val: 0.5 },
    { key: 'fupdate', label: '更新率', unit: 'SPS', val: 1000000 },
  ]},
};

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📊</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">信号链精度与噪声分析</h1>
          <p class="tool-desc">ADC/DAC 信号链级联噪声、INL/DNL、ENOB 与电压精度计算</p>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
          <div style="font-weight:700;">信号链方向：</div>
          <button class="btn active" id="sc-dir-acq" style="padding:6px 14px;">采集链路 → ADC</button>
          <button class="btn btn-secondary" id="sc-dir-out" style="padding:6px 14px;">DAC → 输出链路</button>
        </div>

        <div id="sc-chain" style="display:flex;flex-direction:column;gap:12px;"></div>

        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select id="sc-add-type" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg);">
            <option value="divider">分压器</option>
            <option value="opamp" selected>运放增益级</option>
            <option value="rc">RC 低通</option>
          </select>
          <button class="btn" id="sc-add" style="padding:6px 14px;">+ 添加级</button>
          <span style="font-size:12px;color:var(--text-secondary);">最少2级，最多5级；采集链路末端需为ADC，输出链路首端需为DAC</span>
        </div>
        <div id="sc-warn" style="margin-top:8px;color:var(--danger);font-weight:600;display:none;font-size:13px;"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div style="font-weight:700;font-size:16px;margin-bottom:12px;">📊 计算结果</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group"><label>总增益 / 衰减</label><div class="result-box" id="sc-total-gain">—</div></div>
          <div class="input-group"><label>总 -3dB 带宽</label><div class="result-box" id="sc-total-bw">—</div></div>
          <div class="input-group"><label>满量程 V<sub>FS</sub></label><div class="result-box" id="sc-vfs">—</div></div>
        </div>

        <div style="margin-top:16px;">
          <div style="font-weight:700;margin-bottom:8px;font-size:14px;">噪声预算 (折合到输出端)</div>
          <div id="sc-noise-list" style="font-size:13px;color:var(--text-secondary);line-height:1.8;"></div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;gap:24px;flex-wrap:wrap;font-weight:700;">
            <div>总噪声 RSS: <span id="sc-noise-total">—</span></div>
            <div>峰峰值 (6.6σ): <span id="sc-noise-pp">—</span></div>
          </div>
        </div>

        <div style="margin-top:16px;">
          <div style="font-weight:700;margin-bottom:8px;font-size:14px;">误差预算</div>
          <div id="sc-error-list" style="font-size:13px;color:var(--text-secondary);line-height:1.8;"></div>
        </div>

        <div style="margin-top:16px;padding:16px;border-radius:8px;background:rgba(128,128,128,0.05);">
          <div style="font-weight:700;margin-bottom:10px;font-size:15px;">🔑 最终精度</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div class="input-group"><label>理论分辨率</label><div class="result-box" id="sc-bits">—</div></div>
            <div class="input-group"><label>有效位数 ENOB</label><div class="result-box" id="sc-enob">—</div></div>
            <div class="input-group"><label>无噪声分辨率</label><div class="result-box" id="sc-nfcr">—</div></div>
            <div class="input-group"><label>最小可辨电压 (pp)</label><div class="result-box" id="sc-vmin">—</div></div>
            <div class="input-group"><label>绝对精度 (±3σ)</label><div class="result-box" id="sc-accuracy">—</div></div>
          </div>
        </div>
      </div>
    `;

    let direction = 'acq'; // 'acq' | 'out'
    let chain = []; // array of { id, type, params }
    let nextId = 1;

    function initChain() {
      chain = [];
      nextId = 1;
      if (direction === 'acq') {
        chain.push({ id: nextId++, type: 'opamp', params: {} });
        chain.push({ id: nextId++, type: 'adc', params: {} });
      } else {
        chain.push({ id: nextId++, type: 'dac', params: {} });
        chain.push({ id: nextId++, type: 'opamp', params: {} });
      }
      renderChain();
      calculate();
    }

    function renderChain() {
      const wrap = container.querySelector('#sc-chain');
      wrap.innerHTML = '';
      chain.forEach((stage, idx) => {
        const meta = STAGE_META[stage.type];
        const isFixed = (direction === 'acq' && idx === chain.length - 1 && stage.type === 'adc') ||
                        (direction === 'out' && idx === 0 && stage.type === 'dac');
        const div = document.createElement('div');
        div.className = 'card';
        div.style.cssText = 'padding:12px 16px;margin:0;';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">${meta.icon}</span>
              <span style="font-weight:700;">级 ${idx + 1}: ${meta.name}</span>
              ${isFixed ? '<span style="font-size:11px;color:var(--text-secondary);background:var(--border);padding:2px 6px;border-radius:4px;">固定</span>' : ''}
            </div>
            <div style="display:flex;gap:6px;">
              ${!isFixed ? `<button class="btn btn-danger" data-del="${stage.id}" style="padding:4px 10px;font-size:12px;">删除</button>` : ''}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
            ${meta.params.map(p => {
              const v = stage.params[p.key] !== undefined ? stage.params[p.key] : p.val;
              return `<div class="input-group" style="margin:0;">
                <label style="font-size:11px;">${p.label}</label>
                <div class="input-with-unit">
                  <input type="number" data-sid="${stage.id}" data-pkey="${p.key}" value="${v}" step="any" style="padding:5px 8px;font-size:13px;" />
                  <select disabled style="padding:5px;font-size:12px;"><option>${p.unit}</option></select>
                </div>
              </div>`;
            }).join('')}
          </div>
        `;
        wrap.appendChild(div);
      });

      // bind delete
      wrap.querySelectorAll('button[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = +btn.dataset.del;
          chain = chain.filter(s => s.id !== id);
          renderChain();
          calculate();
        });
      });
      // bind input
      wrap.querySelectorAll('input[data-sid]').forEach(inp => {
        inp.addEventListener('input', () => {
          const sid = +inp.dataset.sid;
          const pkey = inp.dataset.pkey;
          const s = chain.find(x => x.id === sid);
          if (s) {
            s.params[pkey] = parseFloat(inp.value);
            calculate();
          }
        });
      });
    }

    function addStage() {
      const typeSel = container.querySelector('#sc-add-type');
      const type = typeSel.value;
      if (chain.length >= 5) {
        showWarn('最多支持 5 级');
        return;
      }
      if (direction === 'acq') {
        // insert before last (ADC)
        chain.splice(chain.length - 1, 0, { id: nextId++, type, params: {} });
      } else {
        // insert after first (DAC)
        chain.splice(1, 0, { id: nextId++, type, params: {} });
      }
      showWarn('');
      renderChain();
      calculate();
    }

    function showWarn(msg) {
      const el = container.querySelector('#sc-warn');
      if (msg) { el.textContent = msg; el.style.display = 'block'; }
      else el.style.display = 'none';
    }

    function getParam(stage, key, defaultVal) {
      const v = stage.params[key];
      if (v !== undefined && !isNaN(v)) return v;
      const meta = STAGE_META[stage.type].params.find(p => p.key === key);
      return meta ? (meta.val !== undefined ? meta.val : defaultVal) : defaultVal;
    }

    function calculate() {
      // Validate
      if (direction === 'acq') {
        if (chain[chain.length - 1].type !== 'adc') { showWarn('采集链路最后一级必须是 ADC'); return; }
      } else {
        if (chain[0].type !== 'dac') { showWarn('输出链路第一级必须是 DAC'); return; }
      }
      showWarn('');

      // Stage gains and bandwidths
      const gains = [];
      const bws = [];
      const noiseDetails = [];
      const errorDetails = [];

      // Compute per-stage gain and BW
      for (let i = 0; i < chain.length; i++) {
        const s = chain[i];
        let G = 1, BW = Infinity;
        if (s.type === 'divider') {
          const r1 = getParam(s, 'r1', 10000);
          const r2 = getParam(s, 'r2', 10000);
          G = r2 / (r1 + r2);
        } else if (s.type === 'opamp') {
          G = getParam(s, 'gain', 1);
          BW = getParam(s, 'bw', 1e9);
        } else if (s.type === 'rc') {
          const r = getParam(s, 'r', 100);
          const c = getParam(s, 'c', 1e-7);
          G = 1;
          BW = 1 / (2 * Math.PI * r * c);
        } else if (s.type === 'adc' || s.type === 'dac') {
          G = 1;
          const fs = getParam(s, s.type === 'adc' ? 'fs' : 'fupdate', 1e6);
          BW = fs * 0.5;
        }
        gains.push(G);
        bws.push(BW);
      }

      const totalGain = gains.reduce((a, b) => a * b, 1);
      const invSqSum = bws.reduce((sum, bw) => sum + (bw > 0 && isFinite(bw) ? 1 / (bw * bw) : 0), 0);
      const totalBW = invSqSum > 0 ? 1 / Math.sqrt(invSqSum) : Infinity;
      const bwNoise = equivNoiseBW(totalBW);

      // Determine VFS (full scale voltage at output)
      let vfs = 0, bits = 0;
      if (direction === 'acq') {
        const adc = chain[chain.length - 1];
        vfs = getParam(adc, 'vref', 3.3);
        bits = getParam(adc, 'bits', 16);
      } else {
        const dac = chain[0];
        vfs = getParam(dac, 'vref', 3.3);
        bits = getParam(dac, 'bits', 12);
      }
      const lsb = vfs / Math.pow(2, bits);

      // Noise calculation (each stage noise referred to chain output)
      for (let i = 0; i < chain.length; i++) {
        const s = chain[i];
        const gainAfter = gains.slice(i + 1).reduce((a, b) => a * b, 1);

        if (s.type === 'divider') {
          const r1 = getParam(s, 'r1', 10000);
          const r2 = getParam(s, 'r2', 10000);
          const req = (r1 * r2) / (r1 + r2);
          const vn = thermalNoise(req, PHYSICAL.T0, bwNoise);
          const vnOut = vn * gainAfter;
          noiseDetails.push({ name: `级${i+1} 分压器热噪声`, val: vnOut });
        } else if (s.type === 'opamp') {
          const en = getParam(s, 'en', 4) * 1e-9; // nV -> V
          const inn = getParam(s, 'in', 0.5) * 1e-12; // pA -> A
          const rg = getParam(s, 'rg', 1000);
          const vn_v = en * Math.sqrt(bwNoise);
          const vn_i = inn * rg * Math.sqrt(bwNoise);
          const vn_r = thermalNoise(rg, PHYSICAL.T0, bwNoise);
          const vn = rss([vn_v, vn_i, vn_r]);
          const vnOut = vn * gainAfter;
          noiseDetails.push({ name: `级${i+1} 运放噪声`, val: vnOut });
        } else if (s.type === 'rc') {
          const r = getParam(s, 'r', 100);
          const vn = thermalNoise(r, PHYSICAL.T0, bwNoise);
          const vnOut = vn * gainAfter;
          noiseDetails.push({ name: `级${i+1} RC热噪声`, val: vnOut });
        } else if (s.type === 'adc') {
          const vn = lsb / Math.sqrt(12);
          noiseDetails.push({ name: `级${i+1} ADC量化噪声`, val: vn });
        } else if (s.type === 'dac') {
          const vn = lsb / Math.sqrt(12);
          const gainAfterOut = gains.slice(i + 1).reduce((a, b) => a * b, 1);
          noiseDetails.push({ name: `级${i+1} DAC量化噪声`, val: vn * gainAfterOut });
        }
      }

      const totalNoise = rss(noiseDetails.map(d => d.val));
      const vpp = totalNoise * 6.6;

      // Error budget
      for (let i = 0; i < chain.length; i++) {
        const s = chain[i];
        const gainAfter = gains.slice(i + 1).reduce((a, b) => a * b, 1);
        if (s.type === 'adc' || s.type === 'dac') {
          const inl = getParam(s, 'inl', 1);
          const dnl = getParam(s, 'dnl', 0.5);
          errorDetails.push({ name: `级${i+1} INL误差`, val: inl * lsb * gainAfter, type: 'sys' });
          errorDetails.push({ name: `级${i+1} DNL误差`, val: dnl * lsb * gainAfter, type: 'rand' });
        } else if (s.type === 'opamp') {
          const vos = getParam(s, 'vos', 100) * 1e-6; // µV -> V
          const ge = getParam(s, 'ge', 0.1) / 100;
          const G = getParam(s, 'gain', 1);
          const errVos = vos * G * gainAfter; // Vos * noise_gain * after_gain; simplified
          const errGE = vfs * ge * gainAfter; // full-scale gain error contribution
          errorDetails.push({ name: `级${i+1} Vos误差`, val: errVos, type: 'sys' });
          errorDetails.push({ name: `级${i+1} Gain Error`, val: errGE, type: 'sys' });
        }
      }

      const sysErrors = errorDetails.filter(e => e.type === 'sys').map(e => e.val);
      const randErrors = errorDetails.filter(e => e.type === 'rand').map(e => e.val);
      const totalSys = sysErrors.reduce((s, v) => s + v, 0); // worst-case sum for systematic
      const totalRand = rss([...randErrors, totalNoise]);
      const accuracy = totalSys + 3 * totalRand; // ±3σ

      const enob = calcENOB(vfs, totalNoise);
      const nfcr = calcNFCR(vfs, totalNoise);

      // Render results
      const gainDb = totalGain > 0 ? (20 * Math.log10(totalGain)).toFixed(1) + ' dB' : '-∞';
      container.querySelector('#sc-total-gain').textContent = formatNumber(totalGain) + ' V/V (' + gainDb + ')';
      container.querySelector('#sc-total-bw').textContent = isFinite(totalBW) ? formatNumber(totalBW) + ' Hz' : '—';
      container.querySelector('#sc-vfs').textContent = vfs.toFixed(3) + ' V';

      const noiseList = container.querySelector('#sc-noise-list');
      noiseList.innerHTML = noiseDetails.map(d => `<div>• ${d.name}: ${formatNumber(d.val * 1e6)} µVrms</div>`).join('') +
        `<div style="margin-top:4px;font-weight:600;color:var(--text);">• 总噪声 RSS: ${formatNumber(totalNoise * 1e6)} µVrms</div>`;
      container.querySelector('#sc-noise-total').textContent = formatNumber(totalNoise * 1e6) + ' µVrms';
      container.querySelector('#sc-noise-pp').textContent = formatNumber(vpp * 1e6) + ' µVpp';

      const errList = container.querySelector('#sc-error-list');
      errList.innerHTML = errorDetails.map(d => `<div>• ${d.name}: ${formatNumber(d.val * 1e6)} µV (${d.type === 'sys' ? '系统' : '随机'})</div>`).join('');

      container.querySelector('#sc-bits').textContent = bits + ' bit';
      container.querySelector('#sc-enob').textContent = enob > 0 ? enob.toFixed(2) + ' bit' : '—';
      container.querySelector('#sc-nfcr').textContent = nfcr > 0 ? nfcr.toFixed(2) + ' bit' : '—';
      container.querySelector('#sc-vmin').textContent = vpp > 0 ? formatNumber(vpp * 1e6) + ' µVpp' : '—';
      container.querySelector('#sc-accuracy').textContent = '±' + formatNumber(accuracy * 1e6) + ' µV';
    }

    // Direction buttons
    container.querySelector('#sc-dir-acq').addEventListener('click', () => {
      direction = 'acq';
      container.querySelector('#sc-dir-acq').classList.add('active');
      container.querySelector('#sc-dir-acq').classList.remove('btn-secondary');
      container.querySelector('#sc-dir-out').classList.remove('active');
      container.querySelector('#sc-dir-out').classList.add('btn-secondary');
      initChain();
    });
    container.querySelector('#sc-dir-out').addEventListener('click', () => {
      direction = 'out';
      container.querySelector('#sc-dir-out').classList.add('active');
      container.querySelector('#sc-dir-out').classList.remove('btn-secondary');
      container.querySelector('#sc-dir-acq').classList.remove('active');
      container.querySelector('#sc-dir-acq').classList.add('btn-secondary');
      initChain();
    });

    container.querySelector('#sc-add').addEventListener('click', addStage);

    initChain();
  }
};
