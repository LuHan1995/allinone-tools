export default {
  init(container) {
    let port = null;
    let reader = null;
    let writer = null;
    let readLoopPromise = null;
    let rxPaused = false;
    let rxBytes = 0;
    let txBytes = 0;
    let hexModeRx = false;
    let hexModeTx = false;
    let addCrLf = false;
    let addTimestamp = false;

    const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

    container.innerHTML = `
      <style>
        .serial-top { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:16px; }
        .serial-status { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; }
        .serial-status-dot { width:10px; height:10px; border-radius:50%; background:var(--text-secondary); }
        .serial-status-dot.connected { background:var(--success); box-shadow:0 0 0 3px rgba(16,185,129,0.25); }
        .serial-controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
        .serial-controls select, .serial-controls input { padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); font-size:13px; }
        .serial-controls select { min-width:100px; }
        .serial-controls label { font-size:12px; color:var(--text-secondary); margin-right:4px; }
        .serial-term { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); padding:12px; font-family:"SF Mono",Monaco,"Cascadia Code","Roboto Mono",Consolas,"Courier New",monospace; font-size:13px; line-height:1.6; height:360px; overflow-y:auto; white-space:pre-wrap; word-break:break-all; color:var(--text); }
        .serial-term-wrap { position:relative; }
        .serial-term-toolbar { display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
        .serial-send-row { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        .serial-send-row input { flex:1; min-width:200px; padding:10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); font-size:14px; }
        .serial-stats { display:flex; gap:16px; margin-top:10px; font-size:12px; color:var(--text-secondary); }
        .serial-compat-warn { background:rgba(245,158,11,0.12); border:1px solid var(--warning); color:#92400e; padding:10px 14px; border-radius:var(--radius); font-size:13px; margin-bottom:12px; }
        [data-theme="dark"] .serial-compat-warn { color:#fbbf24; }
        .serial-options { display:flex; gap:12px; margin-top:8px; flex-wrap:wrap; font-size:12px; color:var(--text-secondary); }
        .serial-options label { display:flex; align-items:center; gap:4px; cursor:pointer; }
      </style>

      <div class="tool-header">
        <span class="tool-icon">🔌</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">串口助手</h1>
          <p class="tool-desc">基于 WebSerial API 的浏览器串口调试工具</p>
        </div>
      </div>

      <div id="serial-compat" class="serial-compat-warn" style="display:none;">
        ⚠️ 您的浏览器不支持 WebSerial API。请使用 Chrome 89+ 或 Edge 89+ 浏览器，并确保通过 HTTPS 或 localhost 访问。
      </div>

      <div class="card">
        <div class="serial-top">
          <div class="serial-status">
            <span class="serial-status-dot" id="serial-dot"></span>
            <span id="serial-status-text">未连接</span>
          </div>
          <div class="serial-controls" style="flex:1;">
            <button class="btn" id="serial-choose">选择端口</button>
            <button class="btn btn-success" id="serial-open" disabled>打开串口</button>
            <button class="btn btn-danger" id="serial-close" disabled>关闭串口</button>
          </div>
        </div>

        <div class="serial-controls" style="margin-bottom:12px;">
          <div><label>波特率</label><select id="serial-baud">${BAUD_RATES.map(b => `<option value="${b}" ${b===115200?'selected':''}>${b}</option>`).join('')}</select></div>
          <div><label>数据位</label><select id="serial-databits"><option>7</option><option selected>8</option></select></div>
          <div><label>停止位</label><select id="serial-stopbits"><option>1</option><option>2</option></select></div>
          <div><label>校验</label><select id="serial-parity"><option>none</option><option>even</option><option>odd</option></select></div>
        </div>

        <div class="serial-term-toolbar">
          <button class="btn btn-secondary" id="serial-clear" style="padding:6px 14px;font-size:12px;">清空接收区</button>
          <button class="btn btn-secondary" id="serial-pause" style="padding:6px 14px;font-size:12px;">暂停接收</button>
          <button class="btn btn-secondary" id="serial-save" style="padding:6px 14px;font-size:12px;">保存日志</button>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer;">
            <input type="checkbox" id="serial-hex-rx" /> Hex 显示
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);cursor:pointer;">
            <input type="checkbox" id="serial-timestamp" /> 时间戳
          </label>
        </div>

        <div class="serial-term-wrap">
          <div class="serial-term" id="serial-rx"></div>
        </div>

        <div class="serial-options">
          <label><input type="checkbox" id="serial-hex-tx" /> Hex 发送</label>
          <label><input type="checkbox" id="serial-crlf" /> 追加 CR+LF (\\r\\n)</label>
        </div>

        <div class="serial-send-row">
          <input type="text" id="serial-tx-input" placeholder="输入要发送的内容..." />
          <button class="btn" id="serial-send">发送</button>
        </div>

        <div class="serial-stats">
          <span>接收: <strong id="serial-rx-bytes">0</strong> 字节</span>
          <span>发送: <strong id="serial-tx-bytes">0</strong> 字节</span>
        </div>
      </div>
    `;

    const dotEl = container.querySelector('#serial-dot');
    const statusTextEl = container.querySelector('#serial-status-text');
    const chooseBtn = container.querySelector('#serial-choose');
    const openBtn = container.querySelector('#serial-open');
    const closeBtn = container.querySelector('#serial-close');
    const rxEl = container.querySelector('#serial-rx');
    const txInput = container.querySelector('#serial-tx-input');
    const rxBytesEl = container.querySelector('#serial-rx-bytes');
    const txBytesEl = container.querySelector('#serial-tx-bytes');
    const compatWarn = container.querySelector('#serial-compat');

    // Check WebSerial support
    const hasSerial = 'serial' in navigator;
    if (!hasSerial) {
      compatWarn.style.display = 'block';
      chooseBtn.disabled = true;
      openBtn.disabled = true;
    }

    function setConnected(connected) {
      if (connected) {
        dotEl.classList.add('connected');
        statusTextEl.textContent = port && port.getInfo ? `已连接 (${port.getInfo().usbVendorId?.toString(16).toUpperCase() || '?'})` : '已连接';
        openBtn.disabled = true;
        closeBtn.disabled = false;
        chooseBtn.disabled = true;
      } else {
        dotEl.classList.remove('connected');
        statusTextEl.textContent = '未连接';
        openBtn.disabled = !port;
        closeBtn.disabled = true;
        chooseBtn.disabled = false;
      }
    }

    function appendRx(text, isHex = false) {
      if (rxPaused) return;
      let content = text;
      if (addTimestamp) {
        const now = new Date();
        const ts = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}] `;
        content = ts + content;
      }
      const atBottom = rxEl.scrollTop + rxEl.clientHeight >= rxEl.scrollHeight - 10;
      rxEl.textContent += content;
      if (atBottom) rxEl.scrollTop = rxEl.scrollHeight;
    }

    function appendRxBytes(bytes) {
      if (rxPaused) return;
      rxBytes += bytes.length;
      rxBytesEl.textContent = rxBytes.toLocaleString();

      if (hexModeRx) {
        const hexStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ') + ' ';
        appendRx(hexStr, true);
      } else {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        appendRx(decoder.decode(bytes, { stream: true }));
      }
    }

    async function readLoop() {
      while (port && port.readable) {
        try {
          reader = port.readable.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) appendRxBytes(value);
          }
        } catch (err) {
          if (err.name !== 'AbortError' && err.name !== 'BreakError') {
            console.error('Serial read error:', err);
            appendRx(`\n[错误: ${err.message}]\n`);
          }
          break;
        } finally {
          if (reader) {
            try { await reader.releaseLock(); } catch {}
            reader = null;
          }
        }
      }
    }

    chooseBtn.addEventListener('click', async () => {
      if (!hasSerial) return;
      try {
        port = await navigator.serial.requestPort();
        const info = port.getInfo();
        statusTextEl.textContent = `已选择端口 (VID:${info.usbVendorId?.toString(16).toUpperCase() || '?'} PID:${info.usbProductId?.toString(16).toUpperCase() || '?'})`;
        openBtn.disabled = false;
      } catch (err) {
        if (err.name !== 'NotFoundError') {
          console.error(err);
          appendRx(`[选择端口失败: ${err.message}]\n`);
        }
      }
    });

    openBtn.addEventListener('click', async () => {
      if (!port) return;
      try {
        const baudRate = parseInt(container.querySelector('#serial-baud').value);
        const dataBits = parseInt(container.querySelector('#serial-databits').value);
        const stopBits = parseInt(container.querySelector('#serial-stopbits').value);
        const parity = container.querySelector('#serial-parity').value;

        await port.open({ baudRate, dataBits, stopBits, parity });
        setConnected(true);
        appendRx(`[串口已打开 ${baudRate} ${dataBits}-${parity}-${stopBits}]\n`);

        readLoopPromise = readLoop();
      } catch (err) {
        console.error(err);
        appendRx(`[打开串口失败: ${err.message}]\n`);
      }
    });

    closeBtn.addEventListener('click', async () => {
      if (!port) return;
      try {
        if (reader) {
          await reader.cancel();
        }
        if (readLoopPromise) {
          await readLoopPromise.catch(() => {});
          readLoopPromise = null;
        }
        await port.close();
        appendRx('[串口已关闭]\n');
      } catch (err) {
        console.error(err);
      } finally {
        port = null;
        reader = null;
        writer = null;
        setConnected(false);
      }
    });

    async function sendData() {
      if (!port || !port.writable) {
        appendRx('[错误: 串口未打开]\n');
        return;
      }
      const text = txInput.value;
      if (!text) return;

      let data;
      if (hexModeTx) {
        // Parse hex string like "01 02 0A FF"
        const hexArr = text.replace(/[^0-9A-Fa-f]/g, '').match(/.{1,2}/g);
        if (!hexArr) {
          appendRx('[错误: 无效的 Hex 数据]\n');
          return;
        }
        data = new Uint8Array(hexArr.map(h => parseInt(h, 16)));
      } else {
        let payload = text;
        if (addCrLf) payload += '\r\n';
        const encoder = new TextEncoder();
        data = encoder.encode(payload);
      }

      try {
        writer = port.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        writer = null;
        txBytes += data.length;
        txBytesEl.textContent = txBytes.toLocaleString();
      } catch (err) {
        console.error(err);
        appendRx(`[发送失败: ${err.message}]\n`);
        if (writer) { try { writer.releaseLock(); } catch {} writer = null; }
      }
    }

    container.querySelector('#serial-send').addEventListener('click', sendData);
    txInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendData(); }
    });

    container.querySelector('#serial-clear').addEventListener('click', () => { rxEl.textContent = ''; rxBytes = 0; rxBytesEl.textContent = '0'; });
    container.querySelector('#serial-pause').addEventListener('click', (e) => {
      rxPaused = !rxPaused;
      e.target.textContent = rxPaused ? '继续接收' : '暂停接收';
    });
    container.querySelector('#serial-save').addEventListener('click', () => {
      const blob = new Blob([rxEl.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serial-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
    container.querySelector('#serial-hex-rx').addEventListener('change', (e) => { hexModeRx = e.target.checked; });
    container.querySelector('#serial-hex-tx').addEventListener('change', (e) => { hexModeTx = e.target.checked; });
    container.querySelector('#serial-crlf').addEventListener('change', (e) => { addCrLf = e.target.checked; });
    container.querySelector('#serial-timestamp').addEventListener('change', (e) => { addTimestamp = e.target.checked; });

    return {
      destroy() {
        if (port) {
          if (reader) { try { reader.cancel(); } catch {} }
          if (readLoopPromise) { readLoopPromise.catch(() => {}); }
          if (port.writable) { try { port.close(); } catch {} }
          port = null;
        }
      }
    };
  }
};
