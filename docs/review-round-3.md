# 全面审查报告 - Round 3

> 审查范围：`js/app.js`、`js/utils.js`、`sw.js`、`index.html`、`css/*.css`、`js/modules/*.js`
> 审查方法：静态代码分析 + 功能逻辑推演 + 边界条件检查 + 上轮修复回归验证 + Node.js CRC 冒烟测试

---

## 上轮修复验证

### 严重问题修复验证

| # | 原问题 | 修复状态 | 验证说明 |
|---|---|---|---|
| 1 | `crc.js` `mask = (1 << width) - 1` 在 width=32 时 mask=0，且返回有符号负数 | **已修复** | `mask` 已改为 `(2 ** width) - 1`；`crcCompute` 在返回前对 32 位场景执行 `crc = (crc ^ xorout) >>> 0`，强制无符号。Node.js 实测：输入 `31 32 33 34 35 36 37 38 39` 的 CRC-32/IEEE 返回 `3421780262` (`0xCBF43926`)，不再出现负十六进制。 |
| 2 | `settings.js` 未导入 `escapeHtml`，`renderRecent()` 运行时报 `ReferenceError` | **已修复** | 文件第 1 行已添加 `import { escapeHtml } from '../utils.js';`，`renderRecent()` 可正常调用。 |
| 3 | `led-resistor.js` 未导入 `generateSeries`，运行时报 `ReferenceError` | **已修复** | 文件第 1 行已改为 `import { autoUnit, debounce, generateSeries } from '../utils.js';`，`e24Series` 可正常生成。 |

### 中等问题修复验证

| # | 原问题 | 修复状态 | 验证说明 |
|---|---|---|---|
| 1 | `app.js` `recordRecent()` 中 `localStorage.setItem` 未包裹 try-catch | **已修复** | 第 119 行已包裹 `try { localStorage.setItem(key, JSON.stringify(list)); } catch {}`，隐私模式下不再阻断路由切换。 |
| 2 | `webrtc-chat.js` 文件发送循环中 `dc.send(value)` 未处理 `InvalidStateError` | **已修复** | 第 168 行已包裹 `try { dc.send(value); } catch (err) { appendMsg('系统', '发送失败: ' + err.message, 'me'); break; }`。 |
| 3 | `settings.js` 多处 HTML `<span>` 被 `</div>` 闭合（Round 2 #6） | **未修复** | 第 18、22、26、44、48、64 行仍存在 `<span>...</div>` 或 `<span id="..."></div>` 的闭合错误。 |
| 4 | `calendar.js` 两处 HTML `<span>` 被 `</div>` 闭合（Round 2 #7） | **未修复** | 第 95、106 行仍存在 `<span id="..."></div>` 的闭合错误。 |
| 5 | `resistor-color.js` 反查色环 `<span>` 被 `</div>` 闭合（Round 2 #8） | **未修复** | 第 223 行仍存在 `<span style="..."></div>` 的闭合错误。 |
| 6 | `calendar.js` 上月填充年份保护逻辑将月份强制改为 1（Round 2 #10） | **未修复** | 第 188–190 行代码仍为 `if (gY < 1900) { gY = 1900; gM = 1; }`，当 1900 年 1 月查看上月时，农历显示为 1900 年 1 月而非 12 月。 |

---

## 本轮新发现问题

### 严重问题

**无严重问题。**

### 中等问题

| # | 文件 | 行号 | 问题描述 | 修复建议 |
|---|---|---|---|---|
| 1 | `js/app.js` | 85 | `initTheme()` 中 `localStorage.getItem('tools_theme')` **未包裹 try-catch**。在完全禁用 localStorage 的环境（如部分浏览器隐私策略、企业安全策略）下，`getItem` 会抛出 `SecurityError`，导致整个 `DOMContentLoaded` 回调中断。后果：`renderNav()`、`onHashChange()`、所有事件监听均不会执行，应用表现为侧边栏空白、主内容区无渲染，等同于白屏。 | 参照同文件 `toggleTheme` 的写法，改为 `const saved = (() => { try { return localStorage.getItem('tools_theme'); } catch { return null; } })() || 'light';` |
| 2 | `js/modules/webrtc-chat.js` | 110 | `sendText()` 中 `dc.send(JSON.stringify(...))` **未包裹 try-catch**。虽然 Round 2 修复了文件发送路径的 `dc.send`，但文本消息发送路径仍存在同样的 `InvalidStateError` 风险：连接断开或用户切换路由触发 `destroy()` 后，点击发送按钮会直接抛异常，用户无反馈。 | 包裹 `try { dc.send(JSON.stringify({ type: 'text', content: text })); } catch { appendMsg('系统', '发送失败：连接已关闭', 'me'); }` |
| 3 | `sw.js` | 31 | `activate` 事件清理旧缓存的条件 `keys.filter(k => !k.includes(CACHE_VERSION))` 过于宽泛。该条件会删除同 origin 下**所有**不包含 `"v2"` 的缓存，包括其他应用或 Service Worker 的缓存。 | 改为只匹配本应用前缀且版本不符的缓存，例如：<br>`keys.filter(k => (k.startsWith('tools-core-') \|\| k.startsWith('tools-modules-')) && !k.endsWith(CACHE_VERSION))` |
| 4 | `js/modules/calendar.js` | 114 | **新增** HTML 标签未闭合：日程模态框标题 `<h3 style="...">日程 — <span id="cal-modal-date"></div></h3>`，`<span>` 被 `</div>` 闭合，导致 DOM 结构异常。 | 修正为 `<span id="cal-modal-date"></span></h3>` |
| 5 | `js/modules/filter.js` | 29, 80, 128 | 三处 "快速参数" 标签 HTML 未闭合：`<span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">快速参数:</div>`，`<span>` 被 `</div>` 闭合。 | 统一修正为 `</span>` |
| 6 | `js/modules/opamp-gain.js` | 37, 110, 183 | 三处 "常用增益" 标签 HTML 未闭合：`<span style="font-size:13px;color:var(--text-secondary);margin-right:8px;">常用增益:</div>`，`<span>` 被 `</div>` 闭合。 | 统一修正为 `</span>` |

### 轻微问题

| # | 文件 | 行号 | 问题描述 | 修复建议 |
|---|---|---|---|---|
| 1 | `js/modules/crystal-load.js` | 1–3 | 从同一模块 `../utils.js` 写了两行 `import` 语句，可合并为一行。 | 合并为 `import { debounce, formatNumber, generateSeries } from '../utils.js';` |
| 2 | `js/modules/risetime.js` | 64, 76 | 输入框带有 `min="0.001"` 属性，在极小值场景下（如 ps 级上升时间）无法输入小于 0.001 的数值（但用户可通过单位选择绕过）。 | 移除 `min` 属性或在 JS 中做更灵活的校验 |
| 3 | `js/modules/baud-error.js` | 83 | `xtal <= 0` 未校验。若输入 0 或负数晶振频率，`brrInt` 可能为 0，导致 `realBaud` 计算为 `Infinity`。 | 增加 `xtal <= 0` 校验，与 `baud <= 0` 并列处理 |
| 4 | `js/modules/webrtc-chat.js` | 86 | `handleToken()` 中 `JSON.parse(atob(raw))` 未包裹 try-catch。粘贴非法 Token 时，用户不会收到任何错误提示，异常仅输出到控制台。 | 添加 try-catch，捕获后通过 `appendMsg` 或 `alert` 提示用户 Token 格式错误 |

---

## 总体结论

### 是否通过验收
**未通过验收。**

虽然上轮发现的 3 个严重问题（`crc.js` 负数、`settings.js` 缺少导入、`led-resistor.js` 缺少导入）和 2 个指定中等问题（`app.js` `recordRecent` try-catch、`webrtc-chat.js` 文件发送 `dc.send` 保护）**均已修复**，但：

1. **上轮遗留的 HTML 标签未闭合问题（#3~#5）仍未修复**，涉及 `settings.js`、`calendar.js`、`resistor-color.js` 共 9 处。
2. **本轮新发现 6 项中等问题**，包括 `app.js` 启动路径的 localStorage 未保护、`webrtc-chat.js` 文本发送未保护、`sw.js` 缓存清理策略过宽，以及 `filter.js` / `opamp-gain.js` / `calendar.js` 新增的 HTML 标签未闭合。

### 是否还有阻塞性问题
**否。** 本轮没有发现会导致功能崩溃或数据损坏的严重/阻塞性问题。所有中等问题均属于：
- 特定环境（隐私模式 / 同 origin 多应用）下的边界行为异常；
- 或 HTML 标签不匹配导致的 DOM 结构瑕疵（浏览器可容错，不会白屏）。

### 建议
1. **优先修复** `app.js` 第 85 行 `initTheme` 的 try-catch 缺失，这是唯一可能在特定环境下导致应用初始化失败的中等问题。
2. **批量修复**所有 HTML 标签闭合错误（共 16 处，分布在 5 个文件中）。建议用全局搜索 `<span` + `</div>` 一次性扫清。
3. **同步修复** `webrtc-chat.js` 文本发送的 `dc.send` 保护和 `sw.js` 的缓存清理范围限制。
4. 上述修复完成后，建议进行一轮**冒烟测试**：依次打开 settings、led-resistor、crc、webrtc-chat、calendar 模块，确认控制台无报错，功能正常。
5. 若仅修复第 1~3 项中的功能缺陷并批量修正 HTML 标签，即可进入最终验收。
