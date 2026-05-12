# 全面审查报告 - Round 2

> 审查范围：`js/app.js`、`js/utils.js`、`sw.js`、`index.html`、`css/*.css`、`js/modules/*.js`
> 审查方法：静态代码分析 + 功能逻辑推演 + 边界条件检查 + 上轮修复回归验证

---

## 上轮修复验证

### 严重问题（8项）

| # | 原问题 | 修复状态 | 验证方法 | 结论 |
|---|---|---|---|---|
| 1 | `crc.js` `mask = (1 << width) - 1` 在 width=32 时 mask=0 | `mask` 已改为 `(2 ** width) - 1`，不再为 0；但返回前 `& mask` 在 JS 中仍产生 32 位有符号整数，CRC-32 结果最高位为 1 时 `toString(16)` 输出负数 | 代码审查 + Node.js 推演（`123456789` 的 CRC-32/IEEE 返回 `-872372442`，显示为 `0x-340BC6DA`） | **未完全修复**，计算结果正确但显示格式错误 |
| 2 | `webrtc-chat.js` 未关闭 RTCPeerConnection | 暴露 `destroy()`，通过 `window.__webrtc_chat_instance` 在 `init()` 开头清理旧实例；`app.js` 切换路由时调用 `destroy()` | 代码审查 | 已修复 |
| 3 | `webrtc-chat.js` `JSON.parse` 未捕获异常 | `dc.onmessage` 中 `JSON.parse` 已包裹 `try-catch` | 代码审查 | 已修复 |
| 4 | `webrtc-chat.js` DataChannel 无背压控制 | 文件发送循环中检查 `dc.bufferedAmount > 65535`，超限时等待 `bufferedamountlow` 事件 | 代码审查 | 已修复，但 `dc.send(value)` 缺少 try-catch（见新问题 #2） |
| 5 | `settings.js` `renderRecent()` XSS | 代码中已使用 `escapeHtml(id)`，但**模块顶部未导入 `escapeHtml`** | 代码审查 | **修复不完整**，运行时 `ReferenceError` |
| 6 | `adc-calc.js` 极大位数导致 `Infinity` | 已添加 `if (n > 32)` 上限校验 | 代码审查 | 已修复 |
| 7 | `led-resistor.js` 电流为 0 导致 `Infinity` | 已添加 `i_f <= 0` 校验；但模块**引用了 `generateSeries` 却未导入** | 代码审查 | **修复引入回归**，运行时 `ReferenceError` |
| 8 | `power-eff.js` LDO `vin < vout` 产生 >100% 效率 | 已添加 `vin < vout` 校验，显示红色提示 | 代码审查 | 已修复 |

### 中等问题（14项）

| # | 原问题 | 修复状态 | 结论 |
|---|---|---|---|
| 9 | `app.js` 数字快捷键干扰输入 | 已添加 `['INPUT','TEXTAREA','SELECT'].includes(tag)` 判断 | 已修复 |
| 10 | `app.js` 主题切换不支持 `system` | `toggleTheme()` 已改为三态循环；`settings.js` 已支持 `system`；`app.js` 监听 `themechange` 同步 icon | 已修复 |
| 11 | `sw.js` `cache.addAll` 单点故障 | 已改为逐个 `cache.add(asset).catch(...)` | 已修复 |
| 12 | `sw.js` 缓存版本化缺失 | 已定义 `CACHE_VERSION = 'v2'`，`activate` 清理旧缓存 | 已修复 |
| 13 | `calendar.js` 跳转年份越界 | `jump` 逻辑已添加 `y < 1900 \|\| y > 2049` 校验 | 已修复 |
| 14 | `calendar.js` 跨年月农历越界 | `render()` 中已添加年份保护，但上月填充时强制将月份改为 1（见轻微问题 #3） | 基本修复，有小瑕疵 |
| 15 | `crystal-load.js` E12 未考虑数量级 | 已使用 `utils.js` 的 `generateSeries` 生成完整系列 | 已修复 |
| 16 | `base-convert.js` Unicode 码点转换错误 | 已替换为 `String.fromCodePoint(num)`，并检查 `num <= 0x10FFFF` | 已修复 |
| 17 | `crc.js` 奇数长度十六进制 | `hexStringToBytes` 已在前补 `'0'` | 已修复 |
| 18 | `impedance.js` 负数输入未拦截 | 已改为 `w <= 0 \|\| h <= 0 \|\| t <= 0 \|\| er <= 0` | 已修复 |
| 19 | `diff-impedance.js` 负数输入未拦截 | 同上，并已复用 `utils.js` 的阻抗公式 | 已修复 |
| 20 | `settings.js` `localStorage` 未包裹 try-catch | 所有读写操作已包裹 `try-catch` | 已修复 |
| 21 | `resistor-color.js` 大阻值反查色环错误 | 找不到倍率时返回 `null`，表格渲染显示提示信息 | 已修复 |
| 22 | `pwm-timer.js` 反向计算循环效率低 | `arrPlus1 > 65535 \|\| arrPlus1 < 2` 时 `continue`，减少无效计算 | 已修复（未减少循环次数，但已按修复报告实现） |

### 轻微问题（17项）

| # | 原问题 | 修复状态 | 结论 |
|---|---|---|---|
| 23 | `app.js` `escapeHtml()` 重复定义 | 已删除本地实现，改为导入 `utils.js` | 已修复 |
| 24 | `led-resistor.js` 未使用 `generateSeries` | 代码已改为使用 `generateSeries`，但导入被误移除（见严重问题 #3） | 修复引入新问题 |
| 25 | `resistor-color.js` 自行实现 `generateE24` / `generateE96` | 已复用 `utils.js` 的 `generateSeries` 和常量 | 已修复 |
| 26 | `r-c-series.js` 冗余 `dataset.idx` | 已移除 | 已修复 |
| 27 | `css/components.css` focus 样式不统一 | 已为 `input:focus/select:focus/textarea:focus` 统一添加 `box-shadow` | 已修复 |
| 28 | 多个模块 `tool-icon` 标签不一致 | 已全部统一为 `<span class="tool-icon">` | 已修复 |
| 29 | `current.js` 负数输入未校验 | 已添加 `min="0"` 属性 | 已修复（仅 HTML，JS 未校验） |
| 30 | `thermal.js` 散热器回退无提示 | 已改为任意参数即启用散热器模型，未填的按 0 计算并提示 | 已修复 |
| 31 | `battery.js` 时间单位不直观 | 超过 24h 显示"天"，超过 1h 显示"小时" | 已修复 |
| 32 | `filter.js` LC 低通公式缺少注释 | 已添加 Butterworth 二阶近似注释 | 已修复 |
| 33 | `ohms-law.js` 矛盾数据无警告 | 已填值多于 2 个时，检查 V=IR/P=VI 等关系 | 已修复 |
| 34 | `settings.js` `window._openHelpModal` 全局泄漏 | `app.js` 切换路由时执行 `delete window._openHelpModal` | 已修复 |
| 35 | `divider.js` Web Worker 未使用 | 本轮跳过 | 未修复 |
| 36 | `risetime.js` `min="0.001"` 属性 | 本轮跳过 | 未修复 |
| 37 | `unit-convert.js` 科学计数法阅读体验差 | 绝对值在 `[0.001, 10000)` 改用 `toFixed(4)` | 已修复 |
| 38 | `db-convert.js` 极小值显示 `-Infinity` | 已添加 `safeFmt()` 截断 | 已修复 |
| 39 | `resistor-color.js` 每次反查重新生成序列 | 已缓存为模块级常量 `E24_SERIES` / `E96_SERIES` | 已修复 |

### 一致性/风格问题（8项）

| # | 问题 | 修复状态 |
|---|---|---|
| 40 | Tab 切换逻辑重复 | 跳过 |
| 41 | 单位常量重复定义 | `utils.js` 已导出 `R_UNITS`/`C_UNITS`/`L_UNITS`，部分模块仍使用本地定义 |
| 42 | E24 基础值重复 | `utils.js` 已导出 `E24_BASE`/`E96_BASE`，部分模块已替换 |
| 43 | 阻抗公式重复 | `utils.js` 已导出 `calcMicrostripZ0`/`calcStriplineZ0`，`diff-impedance.js` 已使用 |
| 44 | 结果框内联样式不统一 | 已移除硬编码 `style="font-size:20px;padding:12px;"` |
| 45 | 主题 icon 更新不一致 | `app.js` 已监听 `themechange` 事件同步更新 |
| 46 | debounce 导入不一致 | 跳过 |
| 47 | 公式展示风格不一致 | 已新增 `.formula-box.center` 类 |

---

## 新问题（本轮发现）

### 严重问题

| # | 文件 | 行号 | 问题描述 | 修复建议 |
|---|---|---|---|---|
| 1 | `js/modules/settings.js` | 1（缺少导入）、201（使用处） | 上轮修复在 `renderRecent()` 中使用了 `escapeHtml(id)`，但模块顶部**未导入 `escapeHtml`**。浏览器运行时将抛出 `ReferenceError: escapeHtml is not defined`，导致设置页初始化崩溃、完全白屏。 | 在文件顶部添加 `import { escapeHtml } from '../utils.js';` |
| 2 | `js/modules/led-resistor.js` | 1（缺少导入）、4（使用处） | 上轮修复将 `e24Series` 改为调用 `generateSeries(e24Base, 10000000)`，但模块顶部**未导入 `generateSeries`**（只导入了 `autoUnit` 和 `debounce`）。运行时将抛出 `ReferenceError: generateSeries is not defined`，导致 LED 计算器完全白屏。 | 将导入改为 `import { autoUnit, debounce, generateSeries } from '../utils.js';` |
| 3 | `js/modules/crc.js` | 36（返回）、168（显示） | 上轮修复解决了 `mask=0` 问题，但 `crcCompute` 最终返回前执行 `& mask`（`& 0xFFFFFFFF`）。JavaScript 的 `&` 运算符返回 32 位**有符号**整数，当 CRC-32 结果最高位为 1 时（如标准测试值 `123456789` 的 CRC-32/IEEE 应为 `0xCBF43926`），`toString(16)` 会输出 `-340bc6da`，最终显示为 **`0x-340BC6DA`**，完全不是有效的十六进制表示。 | 在 `crcCompute` 返回值前再加一次 `>>> 0`：`return (((crc ^ xorout) >>> 0) & mask) >>> 0;` |

### 中等问题

| # | 文件 | 行号 | 问题描述 | 修复建议 |
|---|---|---|---|---|
| 4 | `js/app.js` | 112-120 | `recordRecent()` 在写入 `localStorage.setItem(key, JSON.stringify(list))` 时**未包裹 try-catch**。在隐私模式、存储配额满或 Safari 无痕模式下会抛出 `QuotaExceededError` 或 `SecurityError`，导致 `navigateTo` 中断，用户无法完成路由切换。 | 将 `localStorage.setItem` 包裹 `try-catch`，失败时静默忽略；或改用 `utils.js` 中已提供的 `storage` 工具 |
| 5 | `js/modules/webrtc-chat.js` | 168 | 上轮新增的背压控制文件发送循环中，`dc.send(value)` **未包裹 try-catch**。如果用户在发送过程中切换路由（触发 `destroy()` 关闭 DataChannel），`send()` 会抛出 `InvalidStateError`，async 函数异常终止，"发送完成"提示永远不会出现，且异常向上传播。 | 将 `dc.send(value)` 包裹 `try-catch`，捕获后显示"发送失败：连接已关闭"或类似提示 |
| 6 | `js/modules/settings.js` | 16, 20, 24, 42, 46 | HTML 模板字符串中多处 `<span>` 被 `</div>` 闭合（如 `<span>跟随系统</div>`）。浏览器虽能容错，但会导致 DOM 结构异常、后续 querySelector 行为不可预期。 | 统一修正为 `</span>` |
| 7 | `js/modules/calendar.js` | 95, 106 | HTML 模板中 `<span id="cal-ym"></div></div>` 和 `<span id="cal-today-label"></div>` 的 `<span>` 未正确闭合。 | 修正为 `<span id="cal-ym"></span></div>` 和 `<span id="cal-today-label"></span>` |
| 8 | `js/modules/resistor-color.js` | 223 | 反查结果表格中色环 `<span>` 被 `</div>` 闭合：`<span style="..."></div>`。 | 修正为 `</span>` |

### 轻微问题

| # | 文件 | 行号 | 问题描述 | 修复建议 |
|---|---|---|---|---|
| 9 | `js/modules/crystal-load.js` | 1-3 | 从同一模块 `../utils.js` 写了两行 `import` 语句，可合并为一行。 | 合并为 `import { debounce, formatNumber, generateSeries } from '../utils.js';` |
| 10 | `js/modules/calendar.js` | 188-190 | 上月填充的年份保护逻辑：`if (gY < 1900) { gY = 1900; gM = 1; }`。当 `curYear=1900, curMonth=0` 时，上月应为 1899 年 12 月，但代码强制将月份改为 1，导致显示为 1900 年 1 月的农历。 | 保留原月份 `gM = 12`，仅修正年份为 1900 |

---

## 总体结论

### 是否通过验收
**未通过验收。** 本轮发现 3 个严重问题，其中 2 个是上轮修复不完整/引入的回归缺陷（`settings.js` 缺少 `escapeHtml` 导入、`led-resistor.js` 缺少 `generateSeries` 导入），1 个是 `crc.js` 的无符号处理遗漏导致 CRC-32 显示为负数。这些问题都会在用户使用时直接导致功能崩溃或显示错误。

### 是否还有阻塞性问题
**是。** 以下 3 个问题为阻塞性：
1. `settings.js` 未导入 `escapeHtml` → 设置页白屏
2. `led-resistor.js` 未导入 `generateSeries` → LED 计算器白屏
3. `crc.js` CRC-32 显示为负十六进制 → 核心算法结果格式错误

### 建议
1. **立即修复**上述 3 个严重问题，修复后建议做一次完整的冒烟测试（依次打开 settings、led-resistor、crc 模块，确认无控制台报错）。
2. **建议同步修复**中等问题 #4（`app.js` `recordRecent` 异常），因为它会在隐私模式下阻断导航。
3. **建议同步修复**中等问题 #5（`webrtc-chat.js` `send` 错误处理），大文件发送场景下用户体验差。
4. **建议同步修复** HTML 标签未闭合问题（#6-#8），虽然浏览器容错，但属于低成本的代码质量提升。
5. 本轮修复完成后，建议进行 **Round 3 复查**，重点验证：
   - `settings.js` 和 `led-resistor.js` 的导入是否补全
   - `crc.js` 的 CRC-32 显示是否正确（可用输入 `31 32 33 34 35 36 37 38 39` 验证结果应为 `0xCBF43926`）
   - `app.js` `recordRecent` 在隐私模式下是否不再抛错
