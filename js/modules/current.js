export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📟</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">载流计算</h1>
          <p class="tool-desc">基于 IPC-2221 标准的走线与过孔载流计算</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h2 style="margin-top:0;font-size:18px;display:flex;align-items:center;gap:8px;color:var(--primary);">📏 走线载流 (Trace)</h2>
          <div class="input-group">
            <label>走线宽度</label>
            <div class="input-with-unit">
              <input type="number" id="t-width" value="20" step="any" min="0" />
              <select id="t-width-unit">
                <option value="mil">mil</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>铜箔厚度 (oz)</label>
            <input type="number" id="t-thick" value="1" step="0.5" min="0" />
          </div>
          <div class="input-group">
            <label>允许温升 (°C)</label>
            <input type="number" id="t-temp" value="10" min="0" />
          </div>
          <div class="input-group">
            <label>层位置</label>
            <select id="t-layer">
              <option value="ext">外层 (External)</option>
              <option value="int">内层 (Internal)</option>
            </select>
          </div>
          <div class="result-box" id="t-result" style="margin-top:12px;">0.00 A</div>
        </div>

        <div class="card">
          <h2 style="margin-top:0;font-size:18px;display:flex;align-items:center;gap:8px;color:var(--success);">🕳️ 过孔载流 (Via)</h2>
          <div class="input-group">
            <label>过孔孔径</label>
            <div class="input-with-unit">
              <input type="number" id="v-diam" value="0.3" step="0.1" min="0" />
              <select id="v-diam-unit">
                <option value="mm">mm</option>
                <option value="mil">mil</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>孔壁电镀厚度 (mil)</label>
            <input type="number" id="v-plate" value="0.8" step="0.1" min="0" />
          </div>
          <div class="input-group">
            <label>允许温升 (°C)</label>
            <input type="number" id="v-temp" value="10" min="0" />
          </div>
          <div class="result-box" id="v-result" style="margin-top:12px;background:rgba(16,185,129,0.12);color:var(--success);">0.00 A</div>
        </div>
      </div>
      <div style="margin-top:20px;text-align:center;font-size:13px;color:var(--text-secondary);">
        注意：计算结果仅供参考。高压或大电流设计请务必留出 20%-30% 的降额空间。
      </div>
    `;

    const tWidth = container.querySelector('#t-width');
    const tWidthUnit = container.querySelector('#t-width-unit');
    const tThick = container.querySelector('#t-thick');
    const tTemp = container.querySelector('#t-temp');
    const tLayer = container.querySelector('#t-layer');
    const tResult = container.querySelector('#t-result');

    const vDiam = container.querySelector('#v-diam');
    const vDiamUnit = container.querySelector('#v-diam-unit');
    const vPlate = container.querySelector('#v-plate');
    const vTemp = container.querySelector('#v-temp');
    const vResult = container.querySelector('#v-result');

    function calcAll() {
      let tW = parseFloat(tWidth.value);
      if (tWidthUnit.value === 'mm') tW /= 0.0254;
      const tT = parseFloat(tThick.value) * 1.37;
      const tRise = parseFloat(tTemp.value);
      const tK = tLayer.value === 'ext' ? 0.048 : 0.024;
      const tArea = tW * tT;
      const tCurr = tK * Math.pow(tRise, 0.44) * Math.pow(tArea, 0.725);
      tResult.textContent = (isNaN(tCurr) ? 0 : tCurr).toFixed(2) + ' A';

      let vD = parseFloat(vDiam.value);
      if (vDiamUnit.value === 'mm') vD /= 0.0254;
      const vP = parseFloat(vPlate.value);
      const vRise = parseFloat(vTemp.value);
      const vArea = Math.PI * vD * vP;
      const vCurr = 0.024 * Math.pow(vRise, 0.44) * Math.pow(vArea, 0.725);
      vResult.textContent = (isNaN(vCurr) ? 0 : vCurr).toFixed(2) + ' A';
    }

    [tWidth, tWidthUnit, tThick, tTemp, tLayer, vDiam, vDiamUnit, vPlate, vTemp].forEach(el => {
      el.addEventListener('input', calcAll);
    });

    calcAll();
  }
};
