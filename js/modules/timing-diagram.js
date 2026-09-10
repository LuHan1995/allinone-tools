import { escapeHtml, debounce } from '../utils.js';

// ============ 纯函数核心（可在 Node 中独立测试） ============

const BUS_CHARS = new Set(['=', '2', '3', '4', '5']);

/**
 * 解析时序图源码。
 * 每行一条信号: `名称: 波形 [数据标签...]`
 * 波形字符:
 *   0/1  低/高电平        p/n  正/反相时钟(一格一个周期)   .  延续上一状态
 *   =    数据总线          2-5  彩色数据总线                x  不确定态      z  高阻态
 * # 开头为注释行
 * @returns {{signals: Array, errors: string[]}}
 */
export function parseTimingSource(src) {
  const signals = [];
  const errors = [];
  const lines = String(src || '').split('\n');

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) return;
    const m = line.match(/^([^:：]+)[:：]\s*(\S+)\s*(.*)$/);
    if (!m) {
      errors.push(`第 ${idx + 1} 行格式无法识别(应为 "名称: 波形 [数据...]")`);
      return;
    }
    const name = m[1].trim();
    const wave = m[2];
    const data = m[3] ? m[3].trim().split(/[\s,，]+/).filter(Boolean) : [];

    const slots = [];
    let prev = null;
    let dataIdx = 0;
    for (const ch of wave) {
      let slot = null;
      if (ch === '0' || ch === '1') {
        slot = { type: 'level', level: ch === '1' ? 1 : 0 };
      } else if (ch === 'p' || ch === 'n') {
        slot = { type: 'clock', phase: ch };
      } else if (ch === '.') {
        if (!prev) {
          errors.push(`信号 "${name}": '.' 不能作为第一个字符`);
          return;
        }
        slot = { ...prev, cont: true };
      } else if (BUS_CHARS.has(ch)) {
        slot = { type: 'bus', colorIdx: ch === '=' ? 0 : Number(ch), label: data[dataIdx++] ?? '' };
      } else if (ch === 'x') {
        slot = { type: 'x' };
      } else if (ch === 'z') {
        slot = { type: 'z' };
      } else if (ch === ' ' || ch === '|') {
        continue;
      } else {
        errors.push(`信号 "${name}": 无法识别的字符 "${ch}"`);
        return;
      }
      slots.push(slot);
      prev = slot;
    }
    if (slots.length) signals.push({ name, slots });
  });

  return { signals, errors };
}

const SLOT_W = 44;
const ROW_H = 52;
const WAVE_H = 34;
const LABEL_PAD = 16;

function estimateLabelWidth(signals) {
  let max = 4;
  for (const s of signals) {
    let w = 0;
    for (const ch of s.name) w += ch.charCodeAt(0) > 0xff ? 15 : 8.5;
    if (w > max) max = w;
  }
  return Math.ceil(max) + LABEL_PAD;
}

const BUS_FILLS = ['none', '#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2', '#ede9fe'];

/**
 * 渲染为 SVG 字符串(含 xmlns,可直接保存为 .svg 文件)。
 * 线条颜色用 var(--text-primary) 并带兜底色,导出文件中同样有效。
 */
export function renderTimingSVG(signals) {
  if (!signals.length) return '';
  const maxSlots = Math.max(...signals.map(s => s.slots.length));
  const labelW = estimateLabelWidth(signals);
  const width = labelW + maxSlots * SLOT_W + 8;
  const height = signals.length * ROW_H + 16;
  const ink = 'var(--text-primary, #1f2937)';
  const dim = 'var(--text-secondary, #9ca3af)';

  let body = '';

  signals.forEach((sig, row) => {
    const yTop = 8 + row * ROW_H + (ROW_H - WAVE_H) / 2;
    const yHigh = yTop;
    const yLow = yTop + WAVE_H;
    const yMid = yTop + WAVE_H / 2;
    const xBase = labelW;

    body += `<text x="${xBase - 10}" y="${yMid + 5}" text-anchor="end" font-size="14" fill="${ink}" font-family="sans-serif">${escapeHtml(sig.name)}</text>\n`;

    let d = '';          // 数字电平/时钟/高阻 主路径
    let busD = '';       // 总线框线路径
    let fills = '';      // 总线底色
    let labels = '';
    let pen = null;      // 当前笔位置 {x, y}

    sig.slots.forEach((slot, i) => {
      const x0 = xBase + i * SLOT_W;
      const x1 = x0 + SLOT_W;
      const half = SLOT_W / 2;

      if (slot.type === 'level' || slot.type === 'clock') {
        // 电平序列: clock 拆成两个半格
        const seq = slot.type === 'level'
          ? [slot.level]
          : (slot.phase === 'p' ? [0, 1] : [1, 0]);
        seq.forEach((lv, k) => {
          const sx = k === 0 ? x0 : x0 + half;
          const ex = sx + (k === 0 && slot.type === 'clock' ? half : (slot.type === 'clock' ? half : SLOT_W));
          const y = lv ? yHigh : yLow;
          if (!pen) d += `M ${sx} ${y} `;
          else if (pen.y !== y) d += `L ${sx} ${pen.y} L ${sx} ${y} `;
          d += `L ${ex} ${y} `;
          pen = { x: ex, y };
        });
        // 从电平切到总线/x 时补结束笔
        const next = sig.slots[i + 1];
        if (next && (next.type === 'bus' || next.type === 'x')) pen = null;
      } else if (slot.type === 'z') {
        if (!pen) d += `M ${x0} ${yMid} `;
        else if (pen.y !== yMid) d += `L ${x0} ${pen.y} L ${x0} ${yMid} `;
        d += `L ${x1} ${yMid} `;
        pen = { x: x1, y: yMid };
      } else {
        // bus / x
        const isX = slot.type === 'x';
        const cont = slot.cont;
        const next = sig.slots[i + 1];
        const nextSame = next && (next.type === 'bus' || next.type === 'x');
        const capL = cont && !isX ? 0 : 7;
        const capR = nextSame && next.cont ? 0 : 7;

        if (!isX && slot.colorIdx > 0) {
          fills += `<path d="M ${x0 + capL} ${yHigh} L ${x1 - capR} ${yHigh} L ${x1} ${yMid} L ${x1 - capR} ${yLow} L ${x0 + capL} ${yLow} L ${x0} ${yMid} Z" fill="${BUS_FILLS[slot.colorIdx]}" stroke="none"/>`;
        }
        // 上沿
        busD += `M ${x0 + capL} ${yHigh} L ${x1 - capR} ${yHigh} `;
        // 下沿
        busD += `M ${x0 + capL} ${yLow} L ${x1 - capR} ${yLow} `;
        // 左侧尖角
        if (capL) busD += `M ${x0} ${yMid} L ${x0 + capL} ${yHigh} M ${x0} ${yMid} L ${x0 + capL} ${yLow} `;
        // 右侧尖角
        if (capR) busD += `M ${x1} ${yMid} L ${x1 - capR} ${yHigh} M ${x1} ${yMid} L ${x1 - capR} ${yLow} `;

        if (!isX && slot.label && !cont) {
          labels += `<text x="${(x0 + x1) / 2}" y="${yMid + 4.5}" text-anchor="middle" font-size="12" fill="${ink}" font-family="sans-serif">${escapeHtml(slot.label)}</text>`;
        }
        pen = null; // 数字主路径在总线后重新开始
      }
    });

    if (fills) body += fills;
    if (d) body += `<path d="${d.trim()}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>\n`;
    if (busD) body += `<path d="${busD.trim()}" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>\n`;
    body += labels;
    // 行间分隔虚线
    if (row < signals.length - 1) {
      const gy = 8 + (row + 1) * ROW_H;
      body += `<line x1="${xBase}" y1="${gy}" x2="${width - 8}" y2="${gy}" stroke="${dim}" stroke-width="0.5" stroke-dasharray="2,4" opacity="0.5"/>\n`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">${body}</svg>`;
}

// ============ 页面模块 ============

const PRESETS = {
  spi: {
    label: 'SPI 读时序 (Mode 0)',
    src: `# SPI Mode 0 读一个字节
CS:   1.0...............1
SCK:  1.p.p.p.p.p.p.p.p.1
MOSI: x.=.=.=.=.=.=.=.=.x D7 D6 D5 D4 D3 D2 D1 D0
MISO: z.=.=.=.=.=.=.=.=.z D7 D6 D5 D4 D3 D2 D1 D0`,
  },
  i2c: {
    label: 'I2C 起始+应答',
    src: `# I2C 起始条件 + 地址位 + ACK
SCL: 1.1.p......0
SDA: 1.0.=..=..1x A6 ACK`,
  },
  uart: {
    label: 'UART 一帧 (8N1)',
    src: `# UART 8N1 帧格式(低位先发)
TXD: 1.0.=.=.=.=.=.=.=.=.1. D0 D1 D2 D3 D4 D5 D6 D7`,
  },
  setup: {
    label: '建立/保持时间',
    src: `# 触发器建立与保持时间
CLK:  n...p...n...
DIN:  x..=...=...x 有效 无效
DOUT: x......=.... Q`,
  },
};

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📈</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">时序图绘制</h1>
          <p class="tool-desc">类 WaveDrom 语法在线绘制数字时序图,支持导出 SVG/PNG</p>
        </div>
      </div>
      <div class="card">
        <div class="preset-btns" style="margin-bottom:12px;">
          <span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">示例:</span>
          ${Object.entries(PRESETS).map(([k, p]) => `<button class="preset-btn" data-preset="${k}">${p.label}</button>`).join('')}
        </div>
        <div class="input-group">
          <label>时序描述(每行一条信号: <code>名称: 波形 [数据标签...]</code>)</label>
          <textarea id="td-src" class="auth-input" style="width:100%;min-height:150px;font-family:monospace;font-size:13px;line-height:1.6;resize:vertical;padding:10px;" spellcheck="false">${escapeHtml(PRESETS.spi.src)}</textarea>
        </div>
        <div id="td-errors" style="color:var(--danger);font-size:13px;min-height:18px;margin-top:6px;"></div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <strong>预览</strong>
          <div style="display:flex;gap:8px;">
            <button class="btn" id="td-copy-svg">复制 SVG</button>
            <button class="btn" id="td-dl-svg">下载 SVG</button>
            <button class="btn" id="td-dl-png">下载 PNG</button>
          </div>
        </div>
        <div id="td-canvas" style="overflow-x:auto;padding:8px 0;"></div>
      </div>
      <div class="card">
        <strong>语法速查</strong>
        <table class="data-table" style="margin-top:10px;">
          <thead><tr><th>字符</th><th>含义</th><th>字符</th><th>含义</th></tr></thead>
          <tbody>
            <tr><td><code>0</code> / <code>1</code></td><td>低 / 高电平</td><td><code>p</code> / <code>n</code></td><td>正相 / 反相时钟(一格一周期)</td></tr>
            <tr><td><code>.</code></td><td>延续上一状态</td><td><code>=</code></td><td>数据总线(按顺序取数据标签)</td></tr>
            <tr><td><code>2</code>~<code>5</code></td><td>彩色数据总线</td><td><code>x</code> / <code>z</code></td><td>不确定态 / 高阻态</td></tr>
            <tr><td><code>#</code></td><td>注释行</td><td><code>|</code> 空格</td><td>波形中的分隔符(忽略)</td></tr>
          </tbody>
        </table>
        <div style="margin-top:10px;color:var(--text-secondary);font-size:13px;">
          例: <code>SCK: p.......</code> 画 7 个时钟周期;<code>DATA: =.=.= D0 D1 D2</code> 画三段总线并标注 D0/D1/D2。
        </div>
      </div>
    `;

    const srcEl = container.querySelector('#td-src');
    const errEl = container.querySelector('#td-errors');
    const canvasEl = container.querySelector('#td-canvas');
    let lastSVG = '';

    function render() {
      const { signals, errors } = parseTimingSource(srcEl.value);
      errEl.textContent = errors.join(';');
      if (!signals.length) {
        canvasEl.innerHTML = errors.length ? '' : '<span style="color:var(--text-secondary);font-size:13px;">请输入时序描述</span>';
        lastSVG = '';
        return;
      }
      lastSVG = renderTimingSVG(signals);
      canvasEl.innerHTML = lastSVG;
    }

    srcEl.addEventListener('input', debounce(render, 200));
    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = PRESETS[btn.dataset.preset];
        if (p) { srcEl.value = p.src; render(); }
      });
    });

    function download(filename, blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }

    container.querySelector('#td-copy-svg').addEventListener('click', async () => {
      if (!lastSVG) return;
      try {
        await navigator.clipboard.writeText(lastSVG);
        alert('SVG 源码已复制到剪贴板');
      } catch (e) {
        alert('复制失败: ' + e.message);
      }
    });

    container.querySelector('#td-dl-svg').addEventListener('click', () => {
      if (!lastSVG) return;
      download('timing-diagram.svg', new Blob([lastSVG], { type: 'image/svg+xml' }));
    });

    container.querySelector('#td-dl-png').addEventListener('click', () => {
      if (!lastSVG) return;
      const svgEl = canvasEl.querySelector('svg');
      const w = svgEl ? Number(svgEl.getAttribute('width')) : 800;
      const h = svgEl ? Number(svgEl.getAttribute('height')) : 200;
      // 导出时将 CSS 变量替换为实色,保证脱离页面也能正常显示
      const standalone = lastSVG
        .replace(/var\(--text-primary, (#[0-9a-fA-F]{6})\)/g, '$1')
        .replace(/var\(--text-secondary, (#[0-9a-fA-F]{6})\)/g, '$1');
      const img = new Image();
      const url = URL.createObjectURL(new Blob([standalone], { type: 'image/svg+xml' }));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w * 2;
        c.height = h * 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b && download('timing-diagram.png', b), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); alert('PNG 导出失败'); };
      img.src = url;
    });

    render();
  }
};
