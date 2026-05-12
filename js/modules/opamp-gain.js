import { autoUnit, debounce, generateSeries } from '../utils.js';

const e24Base = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const e24Series = generateSeries(e24Base, 10000000);

const R_UNITS = { Ω: 1, 'kΩ': 1e3, 'MΩ': 1e6 };

function findClosestE24(val) {
  let best = e24Series[0];
  let bestErr = Math.abs(e24Series[0] - val);
  for (const v of e24Series) {
    const err = Math.abs(v - val);
    if (err < bestErr) { bestErr = err; best = v; }
  }
  return best;
}

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🔺</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">运放增益计算器</h1>
          <p class="tool-desc">反相、同相、差分放大器增益计算与电阻推荐</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="inv">反相放大</button>
          <button class="tab" data-mode="noninv">同相放大</button>
          <button class="tab" data-mode="diff">差分放大</button>
        </div>

        <div class="tab-content active" data-mode="inv">
          <div class="preset-btns" style="margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">常用增益:</span>
            <button class="preset-btn" data-inv-av="1">Av=−1</button>
            <button class="preset-btn" data-inv-av="10">Av=−10</button>
            <button class="preset-btn" data-inv-av="100">Av=−100</button>
          </div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>R<sub>in</sub></label>
              <div class="input-with-unit">
                <input type="number" id="inv-rin" value="1" step="any" />
                <select id="inv-rin-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>R<sub>f</sub></label>
              <div class="input-with-unit">
                <input type="number" id="inv-rf" value="10" step="any" />
                <select id="inv-rf-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:16px;">
            <label>电压增益 A<sub>v</sub></label>
            <div class="result-box" id="inv-gain">—</div>
          </div>
          <div style="margin-top:20px;padding:16px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-weight:700;margin-bottom:12px;">反向求解：根据目标增益和已知电阻求另一颗</div>
            <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
              <div class="input-group">
                <label>目标增益 |A<sub>v</sub>|</label>
                <input type="number" id="inv-tg" value="10" step="any" />
              </div>
              <div class="input-group">
                <label>已知电阻类型</label>
                <select id="inv-known">
                  <option value="rin">已知 Rin，求 Rf</option>
                  <option value="rf">已知 Rf，求 Rin</option>
                </select>
              </div>
              <div class="input-group">
                <label>已知电阻值</label>
                <div class="input-with-unit">
                  <input type="number" id="inv-kv" value="1" step="any" />
                  <select id="inv-kv-u">
                    <option value="Ω">Ω</option>
                    <option value="kΩ" selected>kΩ</option>
                    <option value="MΩ">MΩ</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="input-group" style="margin-top:16px;">
              <label>计算结果电阻</label>
              <div class="result-box" id="inv-solve-res">—</div>
            </div>
            <div class="input-group" style="margin-top:10px;">
              <label>最接近 E24 标称值</label>
              <div class="result-box" id="inv-solve-e24">—</div>
            </div>
          </div>
          <div class="formula-box" style="margin-top:16px;">A<sub>v</sub> = −R<sub>f</sub> / R<sub>in</sub></div>
        </div>

        <div class="tab-content" data-mode="noninv">
          <div class="preset-btns" style="margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">常用增益:</span>
            <button class="preset-btn" data-non-av="2">Av=2</button>
            <button class="preset-btn" data-non-av="11">Av=11</button>
            <button class="preset-btn" data-non-av="101">Av=101</button>
          </div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>R<sub>1</sub> (接地电阻)</label>
              <div class="input-with-unit">
                <input type="number" id="non-r1" value="1" step="any" />
                <select id="non-r1-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>R<sub>2</sub> (反馈电阻)</label>
              <div class="input-with-unit">
                <input type="number" id="non-r2" value="9" step="any" />
                <select id="non-r2-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:16px;">
            <label>电压增益 A<sub>v</sub></label>
            <div class="result-box" id="non-gain">—</div>
          </div>
          <div style="margin-top:20px;padding:16px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-weight:700;margin-bottom:12px;">反向求解：根据目标增益和已知电阻求另一颗</div>
            <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
              <div class="input-group">
                <label>目标增益 A<sub>v</sub></label>
                <input type="number" id="non-tg" value="10" step="any" />
              </div>
              <div class="input-group">
                <label>已知电阻类型</label>
                <select id="non-known">
                  <option value="r1">已知 R1，求 R2</option>
                  <option value="r2">已知 R2，求 R1</option>
                </select>
              </div>
              <div class="input-group">
                <label>已知电阻值</label>
                <div class="input-with-unit">
                  <input type="number" id="non-kv" value="1" step="any" />
                  <select id="non-kv-u">
                    <option value="Ω">Ω</option>
                    <option value="kΩ" selected>kΩ</option>
                    <option value="MΩ">MΩ</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="input-group" style="margin-top:16px;">
              <label>计算结果电阻</label>
              <div class="result-box" id="non-solve-res">—</div>
            </div>
            <div class="input-group" style="margin-top:10px;">
              <label>最接近 E24 标称值</label>
              <div class="result-box" id="non-solve-e24">—</div>
            </div>
          </div>
          <div class="formula-box" style="margin-top:16px;">A<sub>v</sub> = 1 + R<sub>2</sub> / R<sub>1</sub></div>
        </div>

        <div class="tab-content" data-mode="diff">
          <div class="preset-btns" style="margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">常用增益:</span>
            <button class="preset-btn" data-diff-av="1">Av=1</button>
            <button class="preset-btn" data-diff-av="10">Av=10</button>
            <button class="preset-btn" data-diff-av="100">Av=100</button>
          </div>
          <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
            <div class="input-group">
              <label>R<sub>1</sub> = R<sub>3</sub></label>
              <div class="input-with-unit">
                <input type="number" id="diff-r1" value="1" step="any" />
                <select id="diff-r1-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>R<sub>2</sub> = R<sub>4</sub></label>
              <div class="input-with-unit">
                <input type="number" id="diff-r2" value="10" step="any" />
                <select id="diff-r2-u">
                  <option value="Ω">Ω</option>
                  <option value="kΩ" selected>kΩ</option>
                  <option value="MΩ">MΩ</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:16px;">
            <label>电压增益 A<sub>v</sub></label>
            <div class="result-box" id="diff-gain">—</div>
          </div>
          <div style="margin-top:20px;padding:16px;background:var(--bg);border-radius:var(--radius);">
            <div style="font-weight:700;margin-bottom:12px;">反向求解：根据目标增益和已知电阻求另一颗</div>
            <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
              <div class="input-group">
                <label>目标增益 A<sub>v</sub></label>
                <input type="number" id="diff-tg" value="10" step="any" />
              </div>
              <div class="input-group">
                <label>已知电阻类型</label>
                <select id="diff-known">
                  <option value="r1">已知 R1/R3，求 R2/R4</option>
                  <option value="r2">已知 R2/R4，求 R1/R3</option>
                </select>
              </div>
              <div class="input-group">
                <label>已知电阻值</label>
                <div class="input-with-unit">
                  <input type="number" id="diff-kv" value="1" step="any" />
                  <select id="diff-kv-u">
                    <option value="Ω">Ω</option>
                    <option value="kΩ" selected>kΩ</option>
                    <option value="MΩ">MΩ</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="input-group" style="margin-top:16px;">
              <label>计算结果电阻</label>
              <div class="result-box" id="diff-solve-res">—</div>
            </div>
            <div class="input-group" style="margin-top:10px;">
              <label>最接近 E24 标称值</label>
              <div class="result-box" id="diff-solve-e24">—</div>
            </div>
          </div>
          <div class="formula-box" style="margin-top:16px;">A<sub>v</sub> = R<sub>2</sub> / R<sub>1</sub>  (R<sub>1</sub>=R<sub>3</sub>, R<sub>2</sub>=R<sub>4</sub>)</div>
        </div>
      </div>
    `;

    const tabs = container.querySelectorAll('.tab');
    const contents = container.querySelectorAll('.tab-content');
    function setMode(mode) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      contents.forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
      calculate();
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    function getR(prefix, name) {
      const v = parseFloat(container.querySelector(`#${prefix}-${name}`).value);
      const u = container.querySelector(`#${prefix}-${name}-u`)?.value || 'kΩ';
      return isNaN(v) ? null : v * R_UNITS[u];
    }

    function setRes(id, val) {
      const el = container.querySelector(`#${id}`);
      if (val === null || isNaN(val) || !isFinite(val)) { el.textContent = '—'; return; }
      const au = autoUnit(val, 'resistance');
      el.textContent = `${au.value.toFixed(2)} ${au.unit}`;
    }

    function setGain(id, val) {
      const el = container.querySelector(`#${id}`);
      if (val === null || isNaN(val) || !isFinite(val)) { el.textContent = '—'; return; }
      el.textContent = `×${val.toFixed(3)} (${(20 * Math.log10(Math.abs(val))).toFixed(2)} dB)`;
    }

    function calculate() {
      const mode = container.querySelector('.tab.active').dataset.mode;
      if (mode === 'inv') {
        const rin = getR('inv', 'rin');
        const rf = getR('inv', 'rf');
        if (rin !== null && rf !== null && rin > 0) setGain('inv-gain', -rf / rin);
        else container.querySelector('#inv-gain').textContent = '—';

        const tg = parseFloat(container.querySelector('#inv-tg').value);
        const known = container.querySelector('#inv-known').value;
        const kv = getR('inv', 'kv');
        if (!isNaN(tg) && tg > 0 && kv !== null && kv > 0) {
          let res;
          if (known === 'rin') res = kv * tg; else res = kv / tg;
          setRes('inv-solve-res', res);
          setRes('inv-solve-e24', findClosestE24(res));
        } else {
          container.querySelector('#inv-solve-res').textContent = '—';
          container.querySelector('#inv-solve-e24').textContent = '—';
        }
      } else if (mode === 'noninv') {
        const r1 = getR('non', 'r1');
        const r2 = getR('non', 'r2');
        if (r1 !== null && r2 !== null && r1 > 0) setGain('non-gain', 1 + r2 / r1);
        else container.querySelector('#non-gain').textContent = '—';

        const tg = parseFloat(container.querySelector('#non-tg').value);
        const known = container.querySelector('#non-known').value;
        const kv = getR('non', 'kv');
        if (!isNaN(tg) && tg > 1 && kv !== null && kv > 0) {
          let res;
          if (known === 'r1') res = kv * (tg - 1); else res = kv / (tg - 1);
          setRes('non-solve-res', res);
          setRes('non-solve-e24', findClosestE24(res));
        } else {
          container.querySelector('#non-solve-res').textContent = '—';
          container.querySelector('#non-solve-e24').textContent = '—';
        }
      } else if (mode === 'diff') {
        const r1 = getR('diff', 'r1');
        const r2 = getR('diff', 'r2');
        if (r1 !== null && r2 !== null && r1 > 0) setGain('diff-gain', r2 / r1);
        else container.querySelector('#diff-gain').textContent = '—';

        const tg = parseFloat(container.querySelector('#diff-tg').value);
        const known = container.querySelector('#diff-known').value;
        const kv = getR('diff', 'kv');
        if (!isNaN(tg) && tg > 0 && kv !== null && kv > 0) {
          let res;
          if (known === 'r1') res = kv * tg; else res = kv / tg;
          setRes('diff-solve-res', res);
          setRes('diff-solve-e24', findClosestE24(res));
        } else {
          container.querySelector('#diff-solve-res').textContent = '—';
          container.querySelector('#diff-solve-e24').textContent = '—';
        }
      }
    }

    const debouncedCalc = debounce(calculate, 100);
    container.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

    // preset buttons
    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.invAv) {
          const av = parseFloat(btn.dataset.invAv);
          container.querySelector('#inv-rin').value = 1;
          container.querySelector('#inv-rin-u').value = 'kΩ';
          container.querySelector('#inv-rf').value = av;
          container.querySelector('#inv-rf-u').value = 'kΩ';
        } else if (btn.dataset.nonAv) {
          const av = parseFloat(btn.dataset.nonAv);
          container.querySelector('#non-r1').value = 1;
          container.querySelector('#non-r1-u').value = 'kΩ';
          container.querySelector('#non-r2').value = av - 1;
          container.querySelector('#non-r2-u').value = 'kΩ';
        } else if (btn.dataset.diffAv) {
          const av = parseFloat(btn.dataset.diffAv);
          container.querySelector('#diff-r1').value = 1;
          container.querySelector('#diff-r1-u').value = 'kΩ';
          container.querySelector('#diff-r2').value = av;
          container.querySelector('#diff-r2-u').value = 'kΩ';
        }
        calculate();
      });
    });

    calculate();
  }
};
