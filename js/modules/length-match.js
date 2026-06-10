import { debounce, formatNumber } from '../utils.js';

const LENGTH_MATCH_DB = [
  {
    id: 'USB2', name: 'USB 2.0', category: 'general',
    pairs: [
      { name: 'DP/DM', intraPair: '±5 mil (±0.13 mm)', impedance: '90 Ω ±10%', routing: '差分对等长，优先同层，避免跨分割' },
    ],
    notes: 'Full-Speed/High-Speed 对 DP/DM 差分对内等长要求严格；低速模式可放宽。走线尽量短，远离时钟和电源噪声。'
  },
  {
    id: 'USB3', name: 'USB 3.x / USB4', category: 'general',
    pairs: [
      { name: 'SSTX+/-', intraPair: '±2 mil (±0.05 mm)', interPair: '±20 mil (±0.5 mm)', impedance: '85 Ω ±7%', routing: 'TX/RX 对各自等长，对间可不等长' },
      { name: 'SSRX+/-', intraPair: '±2 mil (±0.05 mm)', interPair: '±20 mil (±0.5 mm)', impedance: '85 Ω ±7%', routing: 'TX/RX 对各自等长，对间可不等长' },
    ],
    notes: 'USB3 速率 5Gbps，USB3.1 10Gbps，USB4 20/40Gbps。高速线对应控制过孔stub，推荐背钻或盲埋孔。'
  },
  {
    id: 'HDMI', name: 'HDMI 2.0 / 2.1', category: 'display',
    pairs: [
      { name: 'TMDS CLK+/-', intraPair: '±5 mil', impedance: '100 Ω ±10%', routing: 'CLK 作为数据通道参考' },
      { name: 'TMDS Data0~2+/-', intraPair: '±5 mil', interPair: '±20 mil', impedance: '100 Ω ±10%', routing: '3 组数据对相对 CLK 等长 ±20 mil' },
      { name: 'DDC (SCL/SDA)', intraPair: null, impedance: null, routing: '普通低速 I²C，无需等长' },
    ],
    notes: 'HDMI 2.1 (FRL) 支持 8K@60Hz，等长要求更严；注意 ESD 器件寄生电容 ≤ 0.5 pF。'
  },
  {
    id: 'DP', name: 'DisplayPort 1.2 / 1.4', category: 'display',
    pairs: [
      { name: 'Lane0~3+/-', intraPair: '±2 mil', interPair: '±10 mil', impedance: '100 Ω ±10%', routing: '4 组 Lane 之间等长 ±10 mil' },
      { name: 'AUX (CH+/CH-)', intraPair: '±20 mil', impedance: '100 Ω ±20%', routing: '辅助通道，低速' },
    ],
    notes: 'DP 1.4 HBR3 (8.1 Gbps/lane) 对阻抗和等长要求高。注意 Lane 顺序可互换（极性可翻转）。'
  },
  {
    id: 'MIPI_DSI', name: 'MIPI DSI / CSI', category: 'display',
    pairs: [
      { name: 'CLK+/-', intraPair: '±5 mil (±0.13 mm)', impedance: '100 Ω ±10%', routing: 'CLK 作为数据参考' },
      { name: 'Data Lane0~3+/-', intraPair: '±5 mil (±0.13 mm)', interPair: '±20 mil (±0.5 mm)', impedance: '100 Ω ±10%', routing: '数据 Lane 相对 CLK 等长' },
    ],
    notes: 'MIPI D-PHY 速率 80~1500 Mbps/lane；C-PHY 为 3 线制，等长要求 ±10 mil。远离 RF、天线区域。'
  },
  {
    id: 'LVDS', name: 'LVDS', category: 'display',
    pairs: [
      { name: 'CLK+/-', intraPair: '±5 mil', impedance: '100 Ω ±10%', routing: '时钟对优先最短' },
      { name: 'Data+/-', intraPair: '±5 mil', interPair: '±25 mil', impedance: '100 Ω ±10%', routing: '数据对相对 CLK 等长' },
    ],
    notes: 'LVDS 点对点或多点拓扑，共模噪声抑制好。阻抗控制 100Ω 差分，避免直角走线。'
  },
  {
    id: 'DDR3', name: 'DDR3', category: 'memory',
    groups: [
      { name: 'DQ-DQS（每 Byte）', group: '±20 mil (±0.5 mm)', impedance: '40 Ω SE / 80 Ω Diff', routing: 'DQ 相对 DQS 等长，按 Byte Lane 分组' },
      { name: 'ADDR/CMD/CTL', group: '±100 mil (相对 CLK)', impedance: '40 Ω SE', routing: '地址命令控制相对 CLK 等长' },
      { name: 'CLK+/-', intraPair: '±5 mil', impedance: '80 Ω Diff', routing: '差分时钟，T 型拓扑或 Fly-by' },
    ],
    notes: 'DDR3 地址组通常采用 Fly-by 拓扑，需要写均衡 (Write Leveling)；数据按 Byte 分组等长。'
  },
  {
    id: 'DDR4', name: 'DDR4', category: 'memory',
    groups: [
      { name: 'DQ-DQS（每 Byte）', group: '±10 mil (±0.25 mm)', impedance: '40 Ω SE / 80 Ω Diff', routing: 'DQ 相对 DQS ±10 mil' },
      { name: 'ADDR/CMD/CTL', group: '±50 mil (相对 CLK)', impedance: '40 Ω SE', routing: 'Fly-by 拓扑' },
      { name: 'CLK+/-', intraPair: '±5 mil', impedance: '80 Ω Diff', routing: '差分时钟' },
    ],
    notes: 'DDR4 速率 1600~3200 MT/s，等长要求比 DDR3 更严；建议 DQ-DQS 在相同层走线。'
  },
  {
    id: 'DDR5', name: 'DDR5', category: 'memory',
    groups: [
      { name: 'DQ-DQS（每 Byte）', group: '±5 mil (±0.13 mm)', impedance: '40 Ω SE / 80 Ω Diff', routing: 'DQ 相对 DQS 极严格等长' },
      { name: 'ADDR/CMD/CTL', group: '±25 mil (相对 CLK)', impedance: '40 Ω SE', routing: 'Fly-by，需考虑片上端接 ODT' },
      { name: 'DMI', group: '±10 mil', impedance: '40 Ω SE', routing: '数据掩码/反相信号' },
    ],
    notes: 'DDR5 4800~6400 MT/s，单通道拆分为两个 32-bit 子通道；等长要求极高，建议仿真验证。'
  },
  {
    id: 'PCIe_G3', name: 'PCIe Gen1/2/3', category: 'storage',
    pairs: [
      { name: 'TX+/- / RX+/-', intraPair: '±2 mil (±0.05 mm)', interPair: '±20 mil (±0.5 mm)', impedance: '85 Ω ±10%', routing: '每对差分各自等长；TX/RX 对间可不等长' },
    ],
    notes: 'PCIe Gen3 8 GT/s，Gen4 16 GT/s，Gen5 32 GT/s。注意 AC 耦合电容 100nF~220nF，靠近发送端。'
  },
  {
    id: 'PCIe_G4', name: 'PCIe Gen4/5', category: 'storage',
    pairs: [
      { name: 'TX+/- / RX+/-', intraPair: '±1.5 mil (±0.04 mm)', interPair: '±10 mil (±0.25 mm)', impedance: '85 Ω ±5%', routing: '严格等长；推荐弧形绕线，避免锯齿' },
    ],
    notes: 'Gen4/5 速率极高，过孔 stub 需背钻；表面粗度、玻纤效应需考虑；建议 SI 仿真。'
  },
  {
    id: 'SATA', name: 'SATA 3.0', category: 'storage',
    pairs: [
      { name: 'TX+/-', intraPair: '±5 mil', impedance: '100 Ω ±10%', routing: '差分对，可弧形绕线' },
      { name: 'RX+/-', intraPair: '±5 mil', impedance: '100 Ω ±10%', routing: '差分对，可弧形绕线' },
    ],
    notes: 'SATA 6 Gbps；TX/RX 独立，可不等长；远离强噪声源，避免过孔换层。'
  },
  {
    id: 'RGMII', name: 'RGMII', category: 'network',
    groups: [
      { name: 'TXC + TXD[0:3] + TXCTL', group: '±100 mil (相对 TXC)', impedance: '50 Ω SE', routing: '发送数据组相对发送时钟等长' },
      { name: 'RXC + RXD[0:3] + RXCTL', group: '±100 mil (相对 RXC)', impedance: '50 Ω SE', routing: '接收数据组相对接收时钟等长' },
    ],
    notes: 'RGMII 125 MHz 时钟，建议源端串联端接；TXC/RXC 与对应数据线等长，组内绕线控制。'
  },
  {
    id: 'SGMII', name: 'SGMII', category: 'network',
    pairs: [
      { name: 'TX+/- / RX+/-', intraPair: '±5 mil', impedance: '100 Ω ±10%', routing: '两对差分，可不等长' },
    ],
    notes: 'SGMII = Serial GMII，1.25 Gbps；通常经变压器或电容耦合；等长要求较宽松。'
  },
  {
    id: 'Ethernet', name: '千兆以太网 (1000BASE-T)', category: 'network',
    pairs: [
      { name: 'MDI[0:3]+/-', intraPair: '±5 mil', interPair: '±20 mil', impedance: '100 Ω ±10%', routing: '4 对双绞线对应 4 对 PCB 差分' },
    ],
    notes: '千兆网 4 对同时收发；注意变压器中心抽头处理；对间等长 ±20 mil 即可。'
  },
  {
    id: 'CAN_FD', name: 'CAN-FD', category: 'industrial',
    pairs: [
      { name: 'CAN_H / CAN_L', intraPair: '±50 mil', impedance: '120 Ω ±10%', routing: '差分对，终端电阻 120Ω' },
    ],
    notes: 'CAN-FD 最高 8 Mbps；终端电阻 120Ω 在总线两端；支线长度尽量短 (<0.3m)。'
  },
  {
    id: 'RS485', name: 'RS-485', category: 'industrial',
    pairs: [
      { name: 'A / B', intraPair: '±50 mil', impedance: '100~120 Ω', routing: '差分对，双绞线/平行线' },
    ],
    notes: '半双工总线；终端电阻 120Ω（高速长距离时）；注意上下拉电阻保证空闲状态。'
  },
];

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'general', label: '通用接口' },
  { key: 'memory', label: '内存' },
  { key: 'storage', label: '存储' },
  { key: 'display', label: '显示' },
  { key: 'network', label: '网络' },
  { key: 'industrial', label: '工业' },
];

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📏</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">等长 Layout 查询</h1>
          <p class="tool-desc">高速接口等长要求速查与层叠等长补偿计算</p>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
          <input type="text" id="lm-search" placeholder="搜索接口，如 DDR4 / MIPI / USB..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);" />
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;" id="lm-filters">
          ${CATEGORIES.map(c => `<button class="btn ${c.key === 'all' ? 'active' : 'btn-secondary'}" data-cat="${c.key}" style="padding:5px 12px;font-size:13px;">${c.label}</button>`).join('')}
        </div>
        <div id="lm-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;"></div>
        <div id="lm-detail" style="display:none;margin-top:16px;padding:16px;border:1px dashed var(--border);border-radius:8px;background:rgba(128,128,128,0.03);"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div style="font-weight:700;font-size:16px;margin-bottom:12px;">📐 层叠等长补偿计算器</div>
        <div class="param-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          <div class="input-group">
            <label>表层走线长度</label>
            <div class="input-with-unit"><input type="number" id="lm-len" value="1000" step="any" /><select disabled><option>mil</option></select></div>
          </div>
          <div class="input-group">
            <label>表层介厚 H</label>
            <div class="input-with-unit"><input type="number" id="lm-h1" value="6" step="any" /><select disabled><option>mil</option></select></div>
          </div>
          <div class="input-group">
            <label>内层介厚 H</label>
            <div class="input-with-unit"><input type="number" id="lm-h2" value="12" step="any" /><select disabled><option>mil</option></select></div>
          </div>
          <div class="input-group">
            <label>介电常数 Er</label>
            <div class="input-with-unit"><input type="number" id="lm-er" value="4.2" step="0.1" /><select disabled></select></div>
          </div>
        </div>
        <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="input-group"><label>表层电长度</label><div class="result-box" id="lm-te1">—</div></div>
          <div class="input-group"><label>内层电长度</label><div class="result-box" id="lm-te2">—</div></div>
          <div class="input-group"><label>内层需补偿</label><div class="result-box" id="lm-comp">—</div></div>
        </div>
        <div class="formula-box" style="margin-top:16px;">
          <div>微带线（表层）延迟 ≈ 85 × √(0.475 × Er + 0.67) ps/inch</div>
          <div>带状线（内层）延迟 ≈ 85 × √Er ps/inch</div>
          <div>补偿长度 = L_surface × (t_pd_inner / t_pd_surface − 1)</div>
        </div>
      </div>
    `;

    let activeCat = 'all';
    let activeId = null;

    function renderGrid() {
      const q = (container.querySelector('#lm-search').value || '').toLowerCase().trim();
      const grid = container.querySelector('#lm-grid');
      grid.innerHTML = '';
      const matched = LENGTH_MATCH_DB.filter(item => {
        const catOk = activeCat === 'all' || item.category === activeCat;
        const qOk = !q || item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
        return catOk && qOk;
      });
      if (matched.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;color:var(--text-secondary);font-size:13px;">未找到匹配接口</div>';
        return;
      }
      matched.forEach(item => {
        const el = document.createElement('button');
        el.className = 'btn ' + (activeId === item.id ? 'active' : 'btn-secondary');
        el.style.cssText = 'text-align:left;padding:10px 12px;font-size:13px;justify-content:flex-start;';
        el.innerHTML = `<div><div style="font-weight:700;">${item.name}</div><div style="font-size:11px;opacity:0.8;">${item.pairs?.length ? item.pairs.length + '组等长' : (item.groups?.length + '组等长')}</div></div>`;
        el.addEventListener('click', () => {
          activeId = item.id;
          renderGrid();
          renderDetail(item);
        });
        grid.appendChild(el);
      });
    }

    function renderDetail(item) {
      const detail = container.querySelector('#lm-detail');
      detail.style.display = 'block';
      const rows = [];
      const entries = item.pairs || item.groups || [];
      entries.forEach(e => {
        rows.push(`<tr>
          <td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;">${e.name}</td>
          <td style="padding:8px;border-bottom:1px solid var(--border);">${e.intraPair || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid var(--border);">${e.interPair || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid var(--border);">${e.group || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid var(--border);">${e.impedance || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid var(--border);font-size:12px;">${e.routing}</td>
        </tr>`);
      });
      detail.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-weight:700;font-size:16px;">${item.name}</div>
          <button class="btn btn-danger" id="lm-close" style="padding:4px 10px;font-size:12px;">关闭</button>
        </div>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;min-width:600px;">
          <thead>
            <tr style="color:var(--text-secondary);font-size:12px;">
              <th style="padding:8px;border-bottom:1px solid var(--border);">信号组</th>
              <th style="padding:8px;border-bottom:1px solid var(--border);">差分对等长</th>
              <th style="padding:8px;border-bottom:1px solid var(--border);">对间等长</th>
              <th style="padding:8px;border-bottom:1px solid var(--border);">组内/相对时钟</th>
              <th style="padding:8px;border-bottom:1px solid var(--border);">阻抗</th>
              <th style="padding:8px;border-bottom:1px solid var(--border);">走线建议</th>
            </tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
        </div>
        <div style="margin-top:12px;padding:10px;border-radius:6px;background:rgba(128,128,128,0.06);font-size:13px;color:var(--text-secondary);">
          <strong>💡 Layout 提示：</strong>${item.notes}
        </div>
      `;
      detail.querySelector('#lm-close').addEventListener('click', () => {
        activeId = null;
        detail.style.display = 'none';
        renderGrid();
      });
    }

    function calcCompensation() {
      const len = parseFloat(container.querySelector('#lm-len').value) || 0;
      const h1 = parseFloat(container.querySelector('#lm-h1').value) || 0;
      const h2 = parseFloat(container.querySelector('#lm-h2').value) || 0;
      const er = parseFloat(container.querySelector('#lm-er').value) || 0;
      if (len <= 0 || er <= 0) return;
      const tpd1 = 85 * Math.sqrt(0.475 * er + 0.67); // ps/inch
      const tpd2 = 85 * Math.sqrt(er); // ps/inch
      const te1 = tpd1 * (len / 1000); // ps
      const te2 = tpd2 * (len / 1000); // ps
      const compLen = len * (tpd2 / tpd1 - 1);
      container.querySelector('#lm-te1').textContent = formatNumber(te1) + ' ps';
      container.querySelector('#lm-te2').textContent = formatNumber(te2) + ' ps';
      container.querySelector('#lm-comp').textContent = (compLen >= 0 ? '+' : '') + formatNumber(compLen) + ' mil';
    }

    container.querySelector('#lm-filters').addEventListener('click', (e) => {
      if (e.target.dataset.cat) {
        activeCat = e.target.dataset.cat;
        container.querySelectorAll('#lm-filters button').forEach(b => {
          b.classList.toggle('active', b.dataset.cat === activeCat);
          b.classList.toggle('btn-secondary', b.dataset.cat !== activeCat);
        });
        renderGrid();
      }
    });

    const debouncedRender = debounce(renderGrid, 100);
    container.querySelector('#lm-search').addEventListener('input', debouncedRender);
    container.querySelectorAll('#lm-len, #lm-h1, #lm-h2, #lm-er').forEach(el => el.addEventListener('input', calcCompensation));

    renderGrid();
    calcCompensation();
  }
};
