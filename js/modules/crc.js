import { debounce } from '../utils.js';

const CRC_PRESETS = {
  'CRC-8/SMBUS': { width: 8, poly: 0x07, init: 0x00, refin: false, refout: false, xorout: 0x00 },
  'CRC-8/MAXIM': { width: 8, poly: 0x31, init: 0x00, refin: true, refout: true, xorout: 0x00 },
  'CRC-16/Modbus': { width: 16, poly: 0x8005, init: 0xFFFF, refin: true, refout: true, xorout: 0x00 },
  'CRC-16/USB': { width: 16, poly: 0x8005, init: 0xFFFF, refin: true, refout: true, xorout: 0xFFFF },
  'CRC-16/XMODEM': { width: 16, poly: 0x1021, init: 0x0000, refin: false, refout: false, xorout: 0x00 },
  'CRC-16/CCITT': { width: 16, poly: 0x1021, init: 0xFFFF, refin: false, refout: false, xorout: 0x00 },
  'CRC-32/IEEE': { width: 32, poly: 0x04C11DB7, init: 0xFFFFFFFF, refin: true, refout: true, xorout: 0xFFFFFFFF },
  'CRC-32/MPEG2': { width: 32, poly: 0x04C11DB7, init: 0xFFFFFFFF, refin: false, refout: false, xorout: 0x00 },
};

function reverseBits(val, width) {
  let rev = 0;
  for (let i = 0; i < width; i++) {
    rev = (rev << 1) | ((val >> i) & 1);
  }
  return rev & ((2 ** width) - 1);
}

function crcCompute(data, width, poly, init, refin, refout, xorout) {
  let crc = init >>> 0;
  const mask = (2 ** width) - 1;
  const topBit = 2 ** (width - 1);
  for (const byte of data) {
    let b = byte;
    if (refin) b = reverseBits(b, 8);
    crc ^= (b << (width - 8)) >>> 0;
    for (let i = 0; i < 8; i++) {
      if (crc & topBit) crc = (((crc << 1) >>> 0) ^ poly) & mask;
      else crc = ((crc << 1) >>> 0) & mask;
    }
  }
  if (refout) crc = reverseBits(crc, width);
  crc = (crc ^ xorout) >>> 0;
  if (width < 32) crc = crc & mask;
  return crc;
}

function hexStringToBytes(str) {
  let cleaned = str.replace(/[^0-9A-Fa-f]/g, '');
  if (cleaned.length % 2 !== 0) cleaned = '0' + cleaned;
  const bytes = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.substring(i, i + 2), 16));
  }
  return bytes;
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">✅</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">CRC 校验工具</h1>
          <p class="tool-desc">计算 CRC8/16/32 校验值</p>
        </div>
      </div>
      <div class="card">
        <div class="input-group">
          <label>输入数据 (十六进制，空格分隔)</label>
          <textarea id="crc-data" rows="3" placeholder="01 03 00 00 00 0A"></textarea>
        </div>
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div class="input-group">
            <label>算法</label>
            <select id="crc-preset">
              ${Object.keys(CRC_PRESETS).map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label>位数</label>
            <select id="crc-width">
              <option value="8">CRC-8</option>
              <option value="16" selected>CRC-16</option>
              <option value="32">CRC-32</option>
            </select>
          </div>
        </div>

        <div style="margin-top:12px;">
          <button class="btn btn-secondary" id="crc-adv-toggle" style="font-size:13px;padding:6px 12px;">展开高级选项 ▼</button>
          <div id="crc-adv" style="display:none;margin-top:12px;">
            <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
              <div class="input-group">
                <label>多项式 (Hex)</label>
                <input type="text" id="crc-poly" value="8005" />
              </div>
              <div class="input-group">
                <label>初始值 (Hex)</label>
                <input type="text" id="crc-init" value="FFFF" />
              </div>
              <div class="input-group">
                <label>输入反转</label>
                <select id="crc-refin"><option value="false">否</option><option value="true">是</option></select>
              </div>
              <div class="input-group">
                <label>输出反转</label>
                <select id="crc-refout"><option value="false">否</option><option value="true">是</option></select>
              </div>
              <div class="input-group">
                <label>结果异或值 (Hex)</label>
                <input type="text" id="crc-xorout" value="0000" />
              </div>
            </div>
          </div>
        </div>

        <div class="result-box" id="crc-result" style="margin-top:20px;">—</div>

        <div style="margin-top:20px;font-size:13px;color:var(--text-secondary);">
          <div style="font-weight:700;margin-bottom:8px;">常见协议说明</div>
          <div>• Modbus RTU：CRC-16，多项式 0x8005，初始值 0xFFFF，输入/输出反转</div>
          <div>• XMODEM：CRC-16，多项式 0x1021，初始值 0x0000，无反转</div>
          <div>• IEEE 802.3：CRC-32，多项式 0x04C11DB7，初始值 0xFFFFFFFF</div>
        </div>
      </div>
    `;

    const dataEl = container.querySelector('#crc-data');
    const presetEl = container.querySelector('#crc-preset');
    const widthEl = container.querySelector('#crc-width');
    const polyEl = container.querySelector('#crc-poly');
    const initEl = container.querySelector('#crc-init');
    const refinEl = container.querySelector('#crc-refin');
    const refoutEl = container.querySelector('#crc-refout');
    const xoroutEl = container.querySelector('#crc-xorout');
    const resultEl = container.querySelector('#crc-result');
    const advToggle = container.querySelector('#crc-adv-toggle');
    const advDiv = container.querySelector('#crc-adv');

    let advOpen = false;
    advToggle.addEventListener('click', () => {
      advOpen = !advOpen;
      advDiv.style.display = advOpen ? 'block' : 'none';
      advToggle.textContent = advOpen ? '收起高级选项 ▲' : '展开高级选项 ▼';
    });

    function applyPreset() {
      const p = CRC_PRESETS[presetEl.value];
      if (!p) return;
      widthEl.value = String(p.width);
      polyEl.value = p.poly.toString(16).toUpperCase();
      initEl.value = p.init.toString(16).toUpperCase().padStart(p.width / 4, '0');
      refinEl.value = String(p.refin);
      refoutEl.value = String(p.refout);
      xoroutEl.value = p.xorout.toString(16).toUpperCase().padStart(p.width / 4, '0');
    }

    function calculate() {
      const bytes = hexStringToBytes(dataEl.value);
      if (bytes.length === 0) { resultEl.textContent = '—'; return; }
      const width = parseInt(widthEl.value, 10);
      const poly = parseInt(polyEl.value, 16);
      const init = parseInt(initEl.value, 16);
      const refin = refinEl.value === 'true';
      const refout = refoutEl.value === 'true';
      const xorout = parseInt(xoroutEl.value, 16);

      if (isNaN(width) || isNaN(poly) || isNaN(init) || isNaN(xorout)) {
        resultEl.textContent = '参数错误';
        resultEl.style.color = 'var(--danger)';
        return;
      }

      const crc = crcCompute(bytes, width, poly, init, refin, refout, xorout);
      const hex = crc.toString(16).toUpperCase().padStart(width / 4, '0');
      resultEl.textContent = `0x${hex}`;
      resultEl.style.color = 'var(--primary)';
    }

    const debouncedCalc = debounce(calculate, 100);
    [dataEl, widthEl, polyEl, initEl, refinEl, refoutEl, xoroutEl].forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });
    presetEl.addEventListener('change', () => { applyPreset(); calculate(); });

    applyPreset();
    calculate();
  }
};
