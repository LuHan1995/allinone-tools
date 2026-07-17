const WIKI_URL = 'https://ima.qq.com/wiki/?shareId=21e2ae4ad6950f121f780138468d73932ed794c4e18458a87779369b87fe4456';

export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📚</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">硬件知识库</h1>
          <p class="tool-desc">人人都能学硬件 · ima 共享知识库（253 个内容）</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;flex:1;min-width:240px;">
            收录常用运放、ADC/DAC 手册与全部接口协议等硬件学习资料，支持基于知识库的 AI 问答。
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn" id="kb-open" style="padding:8px 16px;">↗ 新窗口打开</button>
            <button class="btn btn-secondary" id="kb-copy" style="padding:8px 16px;">复制链接</button>
          </div>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--warning);">
          💡 页面空白或加载慢？ima 部分内容需微信扫码登录后查看，建议点击「新窗口打开」获得完整体验。
        </div>
      </div>

      <div class="card" style="padding:8px;">
        <iframe
          id="kb-frame"
          src="${WIKI_URL}"
          loading="lazy"
          referrerpolicy="no-referrer"
          style="width:100%;height:calc(100vh - 300px);min-height:480px;border:none;border-radius:calc(var(--radius) - 4px);background:var(--bg);"
        ></iframe>
      </div>
    `;

    container.querySelector('#kb-open').addEventListener('click', () => {
      window.open(WIKI_URL, '_blank', 'noopener');
    });

    const copyBtn = container.querySelector('#kb-copy');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(WIKI_URL);
        copyBtn.textContent = '已复制 ✓';
      } catch {
        // clipboard API 不可用（非安全上下文）时降级为手动选择复制
        const ta = document.createElement('textarea');
        ta.value = WIKI_URL;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = '已复制 ✓'; }
        catch { copyBtn.textContent = '复制失败'; }
        ta.remove();
      }
      setTimeout(() => { copyBtn.textContent = '复制链接'; }, 1500);
    });

    return {
      destroy() {
        // 释放 iframe 加载的外部页面资源
        const frame = container.querySelector('#kb-frame');
        if (frame) frame.src = 'about:blank';
      }
    };
  }
};
