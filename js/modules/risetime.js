import { formatNumber } from '../utils.js';

const timeUnitToSeconds = {
  'ms': 1e-3,
  'us': 1e-6,
  'ns': 1e-9,
  'ps': 1e-12
};

const freqUnitToHz = {
  'Hz': 1,
  'kHz': 1e3,
  'MHz': 1e6,
  'GHz': 1e9
};

function getExponent(unit, isFreq = false) {
  if (isFreq) {
    switch (unit) {
      case 'Hz': return '⁰';
      case 'kHz': return '³';
      case 'MHz': return '⁶';
      case 'GHz': return '⁹';
      default: return '';
    }
  } else {
    switch (unit) {
      case 'ms': return '⁻³';
      case 'us': return '⁻⁶';
      case 'ns': return '⁻⁹';
      case 'ps': return '⁻¹²';
      default: return '';
    }
  }
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📡</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">上升时间转换</h1>
          <p class="tool-desc">Tr与带宽双向换算</p>
        </div>
      </div>
      <div class="card">
        <div class="formula-box" style="text-align:center;">
          <div style="font-size:18px;font-weight:700;color:var(--primary);margin-bottom:6px;">带宽 (BW) ≈ 0.35 / 上升时间 (T<sub>r</sub>)</div>
          <div style="font-size:13px;color:var(--text-secondary);">其中：带宽(BW)单位Hz，上升时间(T<sub>r</sub>)单位秒(s)</div>
          <div style="font-size:13px;color:var(--text-secondary);">此公式适用于一阶系统的10%~90%上升时间与3dB带宽的换算</div>
        </div>

        <div class="tab-bar" style="justify-content:center;margin-bottom:20px;">
          <button class="tab active" data-dir="time-to-bw">上升时间 → 带宽</button>
          <button class="tab" data-dir="bw-to-time">带宽 → 上升时间</button>
        </div>

        <div class="grid-2">
          <div>
            <div class="input-group" id="rt-time-group">
              <label>上升时间 (T<sub>r</sub>)</label>
              <div class="input-with-unit">
                <input type="number" id="rt-time" value="1" step="any" min="0.001" />
                <select id="rt-time-unit">
                  <option value="ms">毫秒 (ms)</option>
                  <option value="us">微秒 (µs)</option>
                  <option value="ns" selected>纳秒 (ns)</option>
                  <option value="ps">皮秒 (ps)</option>
                </select>
              </div>
            </div>
            <div class="input-group" id="rt-bw-group" style="display:none;">
              <label>带宽</label>
              <div class="input-with-unit">
                <input type="number" id="rt-bw" value="350" step="any" min="0.001" />
                <select id="rt-bw-unit">
                  <option value="Hz">赫兹 (Hz)</option>
                  <option value="kHz" selected>千赫兹 (kHz)</option>
                  <option value="MHz">兆赫兹 (MHz)</option>
                  <option value="GHz">千兆赫兹 (GHz)</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <div id="rt-bw-result-wrap">
              <div class="input-group">
                <label>带宽输出</label>
                <div class="result-box" id="rt-bw-result">350 MHz</div>
              </div>
              <div style="font-size:12px;color:var(--text-secondary);text-align:center;">结果将自动选择合适的单位 (Hz, kHz, MHz, GHz)</div>
            </div>
            <div id="rt-time-result-wrap" style="display:none;">
              <div class="input-group">
                <label>上升时间输出</label>
                <div class="result-box" id="rt-time-result">1 ns</div>
              </div>
              <div style="font-size:12px;color:var(--text-secondary);text-align:center;">结果将自动选择合适的单位 (ms, µs, ns, ps)</div>
            </div>
          </div>
        </div>

        <div class="formula-box" id="rt-detail" style="margin-top:16px;text-align:center;">
          1 ns → 0.35 / (1×10⁻⁹ s) = 350,000,000 Hz = 350 MHz
        </div>

        <div class="card" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:12px;color:var(--warning);">💡 常见示例</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;" id="rt-examples">
            <div class="preset-btn" data-time="1" data-unit="ms" style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg);">
              <div>上升时间: <strong>1 ms</strong></div>
              <div>带宽: <strong>350 Hz</strong></div>
            </div>
            <div class="preset-btn" data-time="10" data-unit="us" style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg);">
              <div>上升时间: <strong>10 µs</strong></div>
              <div>带宽: <strong>35 kHz</strong></div>
            </div>
            <div class="preset-btn" data-time="1" data-unit="ns" style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg);">
              <div>上升时间: <strong>1 ns</strong></div>
              <div>带宽: <strong>350 MHz</strong></div>
            </div>
            <div class="preset-btn" data-time="100" data-unit="ps" style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg);">
              <div>上升时间: <strong>100 ps</strong></div>
              <div>带宽: <strong>3.5 GHz</strong></div>
            </div>
            <div class="preset-btn" data-time="0.5" data-unit="ns" style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg);">
              <div>上升时间: <strong>0.5 ns</strong></div>
              <div>带宽: <strong>700 MHz</strong></div>
            </div>
            <div class="preset-btn" data-time="2" data-unit="us" style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg);">
              <div>上升时间: <strong>2 µs</strong></div>
              <div>带宽: <strong>175 kHz</strong></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:20px;">
          <div style="font-weight:700;margin-bottom:8px;color:var(--warning);">ℹ️ 技术说明</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">
            <p>1. 该换算基于一阶系统的标准公式：BW ≈ 0.35 / T<sub>r</sub>，其中T<sub>r</sub>是10%到90%的上升时间，BW是3dB带宽。</p>
            <p>2. 对于不同阶数的系统，换算系数可能有所不同（例如，对于二阶系统，系数通常在0.33到0.45之间）。</p>
            <p>3. 实际应用中，需要根据具体电路特性调整换算系数。</p>
            <p>4. 本工具自动选择合适的输出单位，确保数值易于阅读。</p>
          </div>
        </div>
      </div>
    `;

    let isTimeToBw = true;

    const timeInput = container.querySelector('#rt-time');
    const timeUnit = container.querySelector('#rt-time-unit');
    const bwInput = container.querySelector('#rt-bw');
    const bwUnit = container.querySelector('#rt-bw-unit');
    const bwResult = container.querySelector('#rt-bw-result');
    const timeResult = container.querySelector('#rt-time-result');
    const detail = container.querySelector('#rt-detail');
    const timeGroup = container.querySelector('#rt-time-group');
    const bwGroup = container.querySelector('#rt-bw-group');
    const bwWrap = container.querySelector('#rt-bw-result-wrap');
    const timeWrap = container.querySelector('#rt-time-result-wrap');

    function setDir(dir) {
      isTimeToBw = dir === 'time-to-bw';
      container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.dir === dir));
      if (isTimeToBw) {
        timeGroup.style.display = 'block';
        bwGroup.style.display = 'none';
        bwWrap.style.display = 'block';
        timeWrap.style.display = 'none';
      } else {
        timeGroup.style.display = 'none';
        bwGroup.style.display = 'block';
        bwWrap.style.display = 'none';
        timeWrap.style.display = 'block';
      }
      calculate();
    }

    container.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => setDir(t.dataset.dir));
    });

    function calculate() {
      if (isTimeToBw) {
        const riseTime = parseFloat(timeInput.value);
        const unit = timeUnit.value;
        if (isNaN(riseTime) || riseTime <= 0) {
          bwResult.textContent = '请输入有效的上升时间';
          detail.textContent = '错误：上升时间必须为正数';
          return;
        }
        const riseTimeSeconds = riseTime * timeUnitToSeconds[unit];
        const bandwidthHz = 0.35 / riseTimeSeconds;
        let resultUnit, resultValue;
        if (bandwidthHz >= 1e9) { resultUnit = 'GHz'; resultValue = bandwidthHz / 1e9; }
        else if (bandwidthHz >= 1e6) { resultUnit = 'MHz'; resultValue = bandwidthHz / 1e6; }
        else if (bandwidthHz >= 1e3) { resultUnit = 'kHz'; resultValue = bandwidthHz / 1e3; }
        else { resultUnit = 'Hz'; resultValue = bandwidthHz; }
        resultValue = formatNumber(resultValue);
        bwResult.textContent = `${resultValue} ${resultUnit}`;
        detail.textContent = `${riseTime} ${unit} → 0.35 / (${riseTime}×10${getExponent(unit)} s) = ${formatNumber(bandwidthHz, 0)} Hz = ${resultValue} ${resultUnit}`;
      } else {
        const bandwidth = parseFloat(bwInput.value);
        const unit = bwUnit.value;
        if (isNaN(bandwidth) || bandwidth <= 0) {
          timeResult.textContent = '请输入有效的带宽';
          detail.textContent = '错误：带宽必须为正数';
          return;
        }
        const bandwidthHz = bandwidth * freqUnitToHz[unit];
        const riseTimeSeconds = 0.35 / bandwidthHz;
        let resultUnit, resultValue;
        if (riseTimeSeconds >= 1e-3) { resultUnit = 'ms'; resultValue = riseTimeSeconds / 1e-3; }
        else if (riseTimeSeconds >= 1e-6) { resultUnit = 'µs'; resultValue = riseTimeSeconds / 1e-6; }
        else if (riseTimeSeconds >= 1e-9) { resultUnit = 'ns'; resultValue = riseTimeSeconds / 1e-9; }
        else { resultUnit = 'ps'; resultValue = riseTimeSeconds / 1e-12; }
        resultValue = formatNumber(resultValue);
        timeResult.textContent = `${resultValue} ${resultUnit}`;
        detail.textContent = `${bandwidth} ${unit} → 0.35 / (${bandwidth}×10${getExponent(unit, true)} Hz) = ${formatNumber(riseTimeSeconds, 3)} s = ${resultValue} ${resultUnit}`;
      }
    }

    [timeInput, timeUnit, bwInput, bwUnit].forEach(el => el.addEventListener('input', calculate));

    container.querySelectorAll('.preset-btn').forEach(item => {
      item.addEventListener('click', () => {
        const time = parseFloat(item.dataset.time);
        const unit = item.dataset.unit;
        if (isTimeToBw) {
          timeInput.value = time;
          timeUnit.value = unit;
          calculate();
        } else {
          const timeInSeconds = time * timeUnitToSeconds[unit];
          const bandwidthHz = 0.35 / timeInSeconds;
          let bestBwUnit = 'Hz';
          let bestBwValue = bandwidthHz;
          if (bandwidthHz >= 1e9) { bestBwUnit = 'GHz'; bestBwValue = bandwidthHz / 1e9; }
          else if (bandwidthHz >= 1e6) { bestBwUnit = 'MHz'; bestBwValue = bandwidthHz / 1e6; }
          else if (bandwidthHz >= 1e3) { bestBwUnit = 'kHz'; bestBwValue = bandwidthHz / 1e3; }
          bwInput.value = Math.round(bestBwValue * 1000) / 1000;
          bwUnit.value = bestBwUnit;
          calculate();
        }
      });
    });

    calculate();
  }
};
