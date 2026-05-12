export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">🌐</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">局域网传文件</h1>
          <p class="tool-desc">WebRTC点对点传输文件与聊天</p>
        </div>
      </div>
      <div style="display:flex;gap:0;height:calc(100vh - 200px);min-height:400px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface);">
        <div style="width:260px;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--bg);flex-shrink:0;">
          <div style="padding:16px;border-bottom:1px solid var(--border);">
            <h3 style="margin:0 0 8px 0;font-size:16px;">局域网伙伴</h3>
            <p style="font-size:12px;color:var(--text-secondary);margin:0 0 10px 0;">由于浏览器限制，初次连接需手动交换 Token</p>
            <button class="btn" id="rtc-create" style="width:100%;padding:8px 12px;font-size:13px;">发起连接 (生成我的Token)</button>
          </div>
          <div id="rtc-peer-list" style="flex:1;overflow-y:auto;padding:8px 0;"></div>
          <div style="padding:12px;border-top:1px solid var(--border);">
            <textarea id="rtc-token" placeholder="在此粘贴对方的 Token" style="width:100%;height:60px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);resize:vertical;font-size:12px;"></textarea>
            <button class="btn" id="rtc-handle" style="width:100%;margin-top:6px;padding:6px 10px;font-size:13px;">接收 Token</button>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
          <div id="rtc-chat" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--bg);">
            <div class="msg other" style="max-width:70%;padding:10px;border-radius:10px;word-break:break-all;align-self:flex-start;background:var(--surface);border:1px solid var(--border);">欢迎！由于纯 HTML 无法直接扫描 IP，请点击左侧按钮交换 Token 建立点对点连接。</div>
          </div>
          <div style="padding:12px;border-top:1px solid var(--border);display:flex;gap:8px;background:var(--surface);align-items:center;">
            <input type="file" id="rtc-file" style="display:none;" />
            <button class="btn" onclick="document.getElementById('rtc-file').click()" style="padding:8px 14px;font-size:13px;">📁 文件</button>
            <input type="text" id="rtc-msg" placeholder="输入消息..." style="flex:1;padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);font-size:14px;" />
            <button class="btn" id="rtc-send" style="padding:8px 18px;font-size:13px;">发送</button>
          </div>
        </div>
      </div>
    `;

    // 清理旧实例
    if (window.__webrtc_chat_instance) {
      try { window.__webrtc_chat_instance.destroy(); } catch {}
    }

    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    let pc = new RTCPeerConnection(config);
    let dc = null;

    const chatBox = container.querySelector('#rtc-chat');
    const msgInput = container.querySelector('#rtc-msg');
    const tokenIO = container.querySelector('#rtc-token');

    function setupDataChannel() {
      dc.onopen = () => appendMsg('系统', '连接已建立！可以开始聊天了。', 'other');
      dc.onmessage = e => {
        if (typeof e.data === 'string') {
          let data;
          try {
            data = JSON.parse(e.data);
          } catch {
            appendMsg('伙伴', e.data, 'other');
            return;
          }
          if (data.type === 'text') appendMsg('伙伴', data.content, 'other');
          if (data.type === 'file') downloadFile(data);
        } else {
          handleRawBlob(e.data);
        }
      };
    }

    async function createOffer() {
      dc = pc.createDataChannel('chat');
      setupDataChannel();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          tokenIO.value = btoa(JSON.stringify(pc.localDescription));
          alert('请复制 Token 给对方！');
        }
      };
    }

    async function handleToken() {
      const raw = tokenIO.value.trim();
      if (!raw) return;
      const desc = new RTCSessionDescription(JSON.parse(atob(raw)));
      if (desc.type === 'offer') {
        await pc.setRemoteDescription(desc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            tokenIO.value = btoa(JSON.stringify(pc.localDescription));
            alert('请把生成的应答 Token 传回给发起者！');
          }
        };
      } else {
        await pc.setRemoteDescription(desc);
      }
    }

    pc.ondatachannel = (e) => {
      dc = e.channel;
      setupDataChannel();
    };

    function sendText() {
      const text = msgInput.value;
      if (!text || !dc) return;
      try {
        dc.send(JSON.stringify({ type: 'text', content: text }));
        appendMsg('我', text, 'me');
        msgInput.value = '';
      } catch {
        appendMsg('系统', '发送失败：连接已关闭', 'me');
      }
    }

    function appendMsg(sender, text, cls) {
      const div = document.createElement('div');
      div.style.cssText = 'max-width:70%;padding:10px;border-radius:10px;word-break:break-all;font-size:14px;';
      if (cls === 'me') {
        div.style.alignSelf = 'flex-end';
        div.style.background = 'var(--primary)';
        div.style.color = '#fff';
      } else {
        div.style.alignSelf = 'flex-start';
        div.style.background = 'var(--surface)';
        div.style.border = '1px solid var(--border)';
      }
      div.textContent = `${sender}: ${text}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    container.querySelector('#rtc-create').addEventListener('click', createOffer);
    container.querySelector('#rtc-handle').addEventListener('click', handleToken);
    container.querySelector('#rtc-send').addEventListener('click', sendText);
    msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendText(); });

    let incomingFile = null;
    let receivedSize = 0;
    let chunks = [];

    container.querySelector('#rtc-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !dc) return;
      appendMsg('系统', `正在发送文件: ${file.name}...`, 'me');
      dc.send(JSON.stringify({
        type: 'file',
        name: file.name,
        size: file.size,
        mime: file.type
      }));
      const chunkSize = 16384;
      const reader = file.stream().getReader();
      const bufferedAmountHighThreshold = 65535;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // 背压控制
        if (dc.bufferedAmount > bufferedAmountHighThreshold) {
          await new Promise(resolve => {
            const onLow = () => {
              dc.removeEventListener('bufferedamountlow', onLow);
              resolve();
            };
            dc.addEventListener('bufferedamountlow', onLow);
            dc.bufferedAmountLowThreshold = 1024;
          });
        }
        try { dc.send(value); } catch (err) { appendMsg('系统', '发送失败: ' + err.message, 'me'); break; }
      }
      appendMsg('系统', '发送完成', 'me');
      e.target.value = '';
    });

    function downloadFile(meta) {
      incomingFile = meta;
      receivedSize = 0;
      chunks = [];
      appendMsg('系统', `正在接收文件: ${meta.name}...`, 'other');
    }

    function handleRawBlob(data) {
      chunks.push(data);
      receivedSize += data.byteLength;
      if (receivedSize >= incomingFile.size) {
        const blob = new Blob(chunks, { type: incomingFile.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = incomingFile.name;
        a.textContent = `✅ 点击下载: ${incomingFile.name}`;
        a.style.cssText = 'display:block;margin-top:4px;color:var(--primary);font-weight:600;';
        const last = chatBox.lastElementChild;
        if (last) last.appendChild(document.createElement('br'));
        if (last) last.appendChild(a);
        incomingFile = null;
      }
    }

    // 暴露 destroy 方法用于清理
    const instance = {
      destroy() {
        if (dc) { try { dc.close(); } catch {} dc = null; }
        if (pc) { try { pc.close(); } catch {} pc = null; }
      }
    };
    window.__webrtc_chat_instance = instance;
    return instance;
  }
};
