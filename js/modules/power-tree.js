import { escapeHtml, formatNumber, debounce } from '../utils.js';

// ============ 纯函数核心(可在 Node 中独立测试) ============

const FREQ_MULT = { ghz: 1e9, mhz: 1e6, khz: 1e3, hz: 1 };

function parseValueToken(tok) {
  const m = String(tok).match(/^([\d.]+)\s*(mV|V|mA|A|kHz|MHz|GHz|Hz|%)?$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (!isFinite(num)) return null;
  const unit = m[2] || '';
  const u = unit.toLowerCase();
  if (u === 'v' || u === 'mv') return { kind: 'voltage', value: u === 'mv' ? num / 1000 : num };
  if (u === 'a' || u === 'ma') return { kind: 'current', value: u === 'ma' ? num / 1000 : num };
  if (u === '%') return { kind: 'eff', value: num / 100 };
  if (FREQ_MULT[u]) return { kind: 'freq', value: num * FREQ_MULT[u] };
  if (unit === '') return { kind: 'number', value: num };
  return null;
}

export function fmtFreq(hz) {
  if (hz >= 1e9) return formatNumber(hz / 1e9) + ' GHz';
  if (hz >= 1e6) return formatNumber(hz / 1e6) + ' MHz';
  if (hz >= 1e3) return formatNumber(hz / 1e3) + ' kHz';
  return formatNumber(hz) + ' Hz';
}

/**
 * 解析缩进树文本。
 * @param {string} src 每行一个节点,每级缩进 2 空格或 1 个 tab
 * @param {'power'|'clock'} mode
 *   power 行: `名称 电压 电流 [效率%]`  ;clock 行: `名称 频率 [负载数]`
 * @returns {{roots: Array, errors: string[]}}
 */
export function parseTree(src, mode = 'power') {
  const roots = [];
  const errors = [];
  const stack = []; // {node, level}

  String(src || '').split('\n').forEach((raw, idx) => {
    if (!raw.trim() || raw.trim().startsWith('#') || raw.trim().startsWith('//')) return;
    // 缩进层级: tab=1级, 空格=2个1级
    const lead = raw.match(/^[\t ]*/)[0];
    let level = 0;
    for (const ch of lead) {
      if (ch === '\t') level += 1;
      else level += 0.5;
    }
    if (level % 1 !== 0) {
      errors.push(`第 ${idx + 1} 行: 缩进不是 2 个空格的整数倍`);
      return;
    }
    const tokens = raw.trim().split(/\s+/);
    const name = tokens[0];
    const node = { name, children: [], line: idx + 1 };

    if (mode === 'power') {
      let v = null, i = null, eff = 1;
      for (const t of tokens.slice(1)) {
        const p = parseValueToken(t);
        if (!p) { errors.push(`第 ${idx + 1} 行: 无法识别的参数 "${t}"`); return; }
        if (p.kind === 'voltage') v = p.value;
        else if (p.kind === 'current') i = p.value;
        else if (p.kind === 'eff') eff = p.value;
        else if (p.kind === 'number') { if (v === null) v = p.value; else if (i === null) i = p.value; }
        else { errors.push(`第 ${idx + 1} 行: 电源树不接受频率参数 "${t}"`); return; }
      }
      if (v === null || i === null) {
        errors.push(`第 ${idx + 1} 行: 电源节点需要电压和电流(如 "BUCK1 5V 3A 90%")`);
        return;
      }
      node.v = v; node.i = i; node.eff = eff; node.pout = v * i;
    } else {
      let freq = null, loads = null;
      for (const t of tokens.slice(1)) {
        const p = parseValueToken(t);
        if (!p) { errors.push(`第 ${idx + 1} 行: 无法识别的参数 "${t}"`); return; }
        if (p.kind === 'freq') freq = p.value;
        else if (p.kind === 'number') loads = p.value;
        else { errors.push(`第 ${idx + 1} 行: 时钟树只接受频率和负载数 "${t}"`); return; }
      }
      if (freq === null) {
        errors.push(`第 ${idx + 1} 行: 时钟节点需要频率(如 "PLL0 100MHz 4")`);
        return;
      }
      node.freq = freq; node.loads = loads;
    }

    if (level === 0) {
      roots.push(node);
      stack.length = 0;
      stack.push({ node, level });
    } else {
      const parent = stack[stack.length - 1];
      if (!parent || level > parent.level + 1) {
        errors.push(`第 ${idx + 1} 行: 缩进跳级(最多比上一行深一级)`);
        return;
      }
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const par = stack[stack.length - 1];
      if (!par) {
        errors.push(`第 ${idx + 1} 行: 找不到父节点(缩进错误)`);
        return;
      }
      par.node.children.push(node);
      stack.push({ node, level });
    }
  });

  return { roots, errors };
}

/**
 * 电源树功率累计(后序):
 * 节点输入功率 = (本路输出功率 V·I + 各子节点输入功率之和) / 效率
 * @returns {{totalLoad: number, rootInput: number}} 全树负载功率与根输入功率
 */
export function computePower(roots) {
  let totalLoad = 0;
  function walk(node) {
    totalLoad += node.pout;
    const childIn = node.children.reduce((s, c) => s + walk(c), 0);
    node.subtreeOut = node.pout + childIn;
    node.pin = node.subtreeOut / (node.eff || 1);
    return node.pin;
  }
  const rootInput = roots.reduce((s, r) => s + walk(r), 0);
  return { totalLoad, rootInput };
}

/** 时钟树统计 */
export function computeClockStats(roots) {
  let loads = 0;
  const freqs = new Set();
  function walk(node) {
    freqs.add(node.freq);
    if (node.loads) loads += node.loads;
    node.children.forEach(walk);
  }
  roots.forEach(walk);
  return { sources: roots.length, loads, freqCount: freqs.size };
}

// ---- 布局 ----
const BOX_H = 46;
const GAP_Y = 12;
const GAP_X = 56;
const PAD = 14;

function textWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += ch.charCodeAt(0) > 0xff ? 15 : 8.5;
  return w;
}

function nodeLine2(node, mode) {
  if (mode === 'power') {
    let s = `${formatNumber(node.v)}V · ${formatNumber(node.i)}A · ${formatNumber(node.pout)}W`;
    if (node.eff && node.eff < 1) s += ` · η${formatNumber(node.eff * 100, 0)}%`;
    return s;
  }
  let s = fmtFreq(node.freq);
  if (node.loads != null) s += ` · ${node.loads}负载`;
  return s;
}

/**
 * 布局: 左根右叶横向树,父节点垂直居中对齐子树。
 * @returns {{nodes: Array, links: Array, width: number, height: number}}
 *   nodes: {node, x, y, w, h, depth}; links: {x1,y1,x2,y2}
 */
export function layoutTree(roots, mode = 'power') {
  if (!roots.length) return { nodes: [], links: [], width: 0, height: 0 };

  // 每个节点的框宽(由两行文字决定),列宽 = 每层最大框宽
  const all = [];
  (function collect(list, depth) {
    list.forEach(n => { n._depth = depth; all.push(n); collect(n.children, depth + 1); });
  })(roots, 0);
  all.forEach(n => {
    n._w = Math.max(textWidth(n.name), textWidth(nodeLine2(n, mode))) + 24;
    n._h = BOX_H;
  });
  const maxDepth = Math.max(...all.map(n => n._depth));
  const colX = [];
  let acc = PAD;
  for (let d = 0; d <= maxDepth; d++) {
    colX[d] = acc;
    const w = Math.max(...all.filter(n => n._depth === d).map(n => n._w));
    acc += w + GAP_X;
  }

  // 叶序 y 坐标,父 = 子跨度中点
  let cursor = PAD;
  function place(node) {
    node._x = colX[node._depth];
    if (!node.children.length) {
      node._y = cursor;
      cursor += BOX_H + GAP_Y;
    } else {
      node.children.forEach(place);
      const first = node.children[0], last = node.children[node.children.length - 1];
      node._y = (first._y + last._y) / 2;
    }
  }
  roots.forEach(place);

  const nodes = all.map(n => ({ node: n, x: n._x, y: n._y, w: n._w, h: n._h, depth: n._depth }));
  const links = [];
  all.forEach(n => n.children.forEach(c => {
    links.push({ x1: n._x + n._w, y1: n._y + BOX_H / 2, x2: c._x, y2: c._y + BOX_H / 2 });
  }));

  const width = Math.max(...nodes.map(n => n.x + n.w)) + PAD;
  const height = cursor - GAP_Y + PAD;
  return { nodes, links, width, height };
}

/** 渲染 SVG 字符串(含 xmlns,可直接存 .svg) */
export function renderTreeSVG(layout, mode = 'power') {
  if (!layout.nodes.length) return '';
  const ink = 'var(--text-primary, #1f2937)';
  const dim = 'var(--text-secondary, #9ca3af)';
  const acc = 'var(--primary, #2563eb)';

  let body = '';
  for (const l of layout.links) {
    const mx = (l.x1 + l.x2) / 2;
    body += `<path d="M ${l.x1} ${l.y1} L ${mx} ${l.y1} L ${mx} ${l.y2} L ${l.x2} ${l.y2}" fill="none" stroke="${dim}" stroke-width="1.4"/>\n`;
  }
  for (const b of layout.nodes) {
    const n = b.node;
    const heavy = mode === 'power' && n.pout >= 10;
    body += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${heavy ? 'var(--primary-bg, #eff6ff)' : 'transparent'}" stroke="${heavy ? '#dc2626' : acc}" stroke-width="${heavy ? 2 : 1.4}"/>\n`;
    body += `<text x="${b.x + 12}" y="${b.y + 19}" font-size="13" font-weight="bold" fill="${ink}">${escapeHtml(n.name)}</text>\n`;
    body += `<text x="${b.x + 12}" y="${b.y + 37}" font-size="11.5" fill="${dim}">${escapeHtml(nodeLine2(n, mode))}</text>\n`;
    if (mode === 'power' && n.children.length && n.eff < 1) {
      body += `<text x="${b.x + b.w - 8}" y="${b.y + 13}" text-anchor="end" font-size="10" fill="${dim}">入≈${formatNumber(n.pin)}W</text>\n`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" font-family="sans-serif">${body}</svg>`;
}

// ============ 页面模块 ============

const PRESETS = {
  power_main: {
    mode: 'power', label: '嵌入式主板电源树',
    src: `# 嵌入式主板电源树(名称 电压 电流 [效率])
适配器输入 12V 3A
  BUCK_5V 5V 2.5A 92%
    LDO_3V3 3.3V 1.2A 90%
      MCU核心 3.3V 0.3A
      外设IO 3.3V 0.5A
    LDO_1V8 1.8V 0.4A 88%
  BUCK_3V3A 3.3V 1A 90%`,
  },
  power_motor: {
    mode: 'power', label: '电机控制板电源树',
    src: `# 电机控制板电源树
直流母线 24V 5A
  BUCK_12V 12V 2A 93%
    散热风扇 12V 0.8A
    LDO_5V 5V 1A 88%
      MCU 5V 0.2A
      驱动逻辑 5V 0.5A
  IPM驱动电源 15V 0.5A 90%`,
  },
  clock_mcu: {
    mode: 'clock', label: 'MCU 时钟树',
    src: `# MCU 时钟树(名称 频率 [负载数])
HSE晶振 25MHz
  PLL0 400MHz 2
    CPU核心 400MHz 1
    AHB总线 200MHz 3
      APB1外设 50MHz 4
      APB2外设 100MHz 3
LSE晶振 32.768kHz
  RTC 32.768kHz 1`,
  },
};

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🌲</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">电源树 / 时钟树制作</h1>
          <p class="tool-desc">文本缩进定义层级,实时渲染树图,电源树自动累计功率,支持导出 SVG/PNG</p>
        </div>
      </div>
      <div class="card">
        <div class="tab-bar">
          <button class="tab active" data-mode="power">🔋 电源树</button>
          <button class="tab" data-mode="clock">⏰ 时钟树</button>
        </div>
        <div class="preset-btns" style="margin:12px 0;">
          <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">示例:</span>
          ${Object.entries(PRESETS).map(([k, p]) => `<button class="preset-btn" data-preset="${k}">${p.label}</button>`).join('')}
        </div>
        <div class="input-group">
          <label id="pt-syntax-label">电源树语法: 每行 <code>名称 电压 电流 [效率%]</code>,每级缩进 2 个空格</label>
          <textarea id="pt-src" class="auth-input" style="width:100%;min-height:180px;font-family:monospace;font-size:13px;line-height:1.6;resize:vertical;padding:10px;" spellcheck="false"></textarea>
        </div>
        <div id="pt-errors" style="color:var(--danger);font-size:13px;min-height:18px;margin-top:6px;"></div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <strong>预览</strong>
          <div style="display:flex;gap:8px;">
            <button class="btn" id="pt-copy-svg">复制 SVG</button>
            <button class="btn" id="pt-dl-svg">下载 SVG</button>
            <button class="btn" id="pt-dl-png">下载 PNG</button>
          </div>
        </div>
        <div id="pt-stats" style="margin-bottom:10px;font-size:13px;color:var(--text-secondary);"></div>
        <div id="pt-canvas" style="overflow-x:auto;padding:8px 0;"></div>
      </div>
      <div class="card">
        <strong>语法速查</strong>
        <table class="data-table" style="margin-top:10px;">
          <thead><tr><th>模式</th><th>行格式</th><th>示例</th></tr></thead>
          <tbody>
            <tr><td>电源树</td><td><code>名称 电压 电流 [效率%]</code></td><td><code>BUCK1 5V 3A 90%</code></td></tr>
            <tr><td>时钟树</td><td><code>名称 频率 [负载数]</code></td><td><code>PLL0 100MHz 4</code></td></tr>
            <tr><td>层级</td><td>每级缩进 2 个空格或 1 个 Tab</td><td>支持多个根节点(多路输入/多时钟源)</td></tr>
            <tr><td>注释</td><td><code>#</code> 或 <code>//</code> 开头</td><td>空行忽略</td></tr>
          </tbody>
        </table>
        <div style="margin-top:10px;color:var(--text-secondary);font-size:13px;">
          电源树中,节点的电流按"本路供给本地负载"理解;非叶节点右上角显示估算输入功率(含下游与效率折算),功率 ≥10W 的节点会高亮。
        </div>
      </div>
    `;

    const srcEl = container.querySelector('#pt-src');
    const errEl = container.querySelector('#pt-errors');
    const canvasEl = container.querySelector('#pt-canvas');
    const statsEl = container.querySelector('#pt-stats');
    const syntaxLabel = container.querySelector('#pt-syntax-label');
    let mode = 'power';
    let lastSVG = '';

    function render() {
      const { roots, errors } = parseTree(srcEl.value, mode);
      errEl.textContent = errors.join(';');
      if (!roots.length) {
        canvasEl.innerHTML = errors.length ? '' : '<span style="color:var(--text-secondary);font-size:13px;">请输入树结构描述</span>';
        statsEl.textContent = '';
        lastSVG = '';
        return;
      }
      if (mode === 'power') {
        const { totalLoad, rootInput } = computePower(roots);
        statsEl.textContent = `负载总功率 ${formatNumber(totalLoad)} W · 根输入功率估算 ${formatNumber(rootInput, 2)} W · 共 ${countNodes(roots)} 路`;
      } else {
        const s = computeClockStats(roots);
        statsEl.textContent = `时钟源 ${s.sources} 个 · 频率 ${s.freqCount} 种 · 总负载 ${s.loads}`;
      }
      lastSVG = renderTreeSVG(layoutTree(roots, mode), mode);
      canvasEl.innerHTML = lastSVG;
    }

    function countNodes(roots) {
      let n = 0;
      (function walk(list) { list.forEach(x => { n++; walk(x.children); }); })(roots);
      return n;
    }

    function setMode(m) {
      mode = m;
      container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      syntaxLabel.textContent = m === 'power'
        ? '电源树语法: 每行 名称 电压 电流 [效率%],每级缩进 2 个空格'
        : '时钟树语法: 每行 名称 频率 [负载数],每级缩进 2 个空格';
      const preset = Object.values(PRESETS).find(p => p.mode === m);
      if (preset) srcEl.value = preset.src;
      render();
    }

    container.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
    container.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.preset];
      if (!p) return;
      if (p.mode !== mode) setMode(p.mode);
      srcEl.value = p.src;
      render();
    }));
    srcEl.addEventListener('input', debounce(render, 200));

    function download(filename, blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    function standaloneSVG() {
      return lastSVG
        .replace(/var\(--text-primary, (#[0-9a-fA-F]{6})\)/g, '$1')
        .replace(/var\(--text-secondary, (#[0-9a-fA-F]{6})\)/g, '$1')
        .replace(/var\(--primary-bg, (#[0-9a-fA-F]{6})\)/g, '$1')
        .replace(/var\(--primary, (#[0-9a-fA-F]{6})\)/g, '$1');
    }

    container.querySelector('#pt-copy-svg').addEventListener('click', async () => {
      if (!lastSVG) return;
      try { await navigator.clipboard.writeText(standaloneSVG()); alert('SVG 源码已复制到剪贴板'); }
      catch (e) { alert('复制失败: ' + e.message); }
    });
    container.querySelector('#pt-dl-svg').addEventListener('click', () => {
      if (!lastSVG) return;
      download(mode === 'power' ? 'power-tree.svg' : 'clock-tree.svg', new Blob([standaloneSVG()], { type: 'image/svg+xml' }));
    });
    container.querySelector('#pt-dl-png').addEventListener('click', () => {
      if (!lastSVG) return;
      const svgEl = canvasEl.querySelector('svg');
      const w = svgEl ? Number(svgEl.getAttribute('width')) : 800;
      const h = svgEl ? Number(svgEl.getAttribute('height')) : 400;
      const img = new Image();
      const url = URL.createObjectURL(new Blob([standaloneSVG()], { type: 'image/svg+xml' }));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w * 2; c.height = h * 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b && download(mode === 'power' ? 'power-tree.png' : 'clock-tree.png', b), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); alert('PNG 导出失败'); };
      img.src = url;
    });

    setMode('power');
  }
};
