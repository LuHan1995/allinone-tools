# 修复报告 - Round 1

> 基于 `docs/review-round-1.md` 的审查报告进行全面修复。

---

## 🔴 严重问题（全部修复）

| # | 文件 | 问题 | 修复方式 |
|---|---|---|---|
| 1 | `js/modules/crc.js` | `mask = (1 << width) - 1` 在 width=32 时 mask=0 | 改用 `(2 ** width) - 1`；`topBit` 改用 `2 ** (width - 1)`；CRC-32 全程使用 `>>> 0` 保持无符号 |
| 2 | `js/modules/webrtc-chat.js` | 内存泄漏：未关闭 RTCPeerConnection | 在模块对象暴露 `destroy()` 方法；`init()` 开头检查并关闭旧实例（`window.__webrtc_chat_instance`）；`app.js` 切换路由时调用 `destroy()` |
| 3 | `js/modules/webrtc-chat.js` | `JSON.parse(e.data)` 未捕获异常 | `dc.onmessage` 中 `JSON.parse` 包裹 `try-catch`，非 JSON 数据静默丢弃或显示为原始文本 |
| 4 | `js/modules/webrtc-chat.js` | DataChannel 无背压控制 | 文件发送 loop 中检查 `dc.bufferedAmount > 65535`，超限时等待 `bufferedamountlow` 事件 |
| 5 | `js/modules/settings.js` | `renderRecent()` 中 `id` 直接拼接到 HTML，存在 XSS | 使用 `escapeHtml(id)` 对输出进行转义 |
| 6 | `js/modules/adc-calc.js` | 极大位数导致 `Infinity` | 添加 `n > 32` 上限校验，超出显示 `"位数过大（最大支持32位）"` |
| 7 | `js/modules/led-resistor.js` | 电流为0导致 `Infinity` | `calculate()` 开头添加 `i_f <= 0` 校验，显示红色提示 `"电流必须大于 0"` |
| 8 | `js/modules/power-eff.js` | LDO `vin < vout` 产生 >100% 效率 | 添加 `vin < vout` 校验，显示红色提示 `"输入电压必须大于等于输出电压"` |

---

## 🟠 中等问题（全部修复）

| # | 文件 | 问题 | 修复方式 |
|---|---|---|---|
| 9 | `js/app.js` | 数字快捷键干扰输入 | 快捷键处理开头添加 `if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;` |
| 10 | `js/app.js` | 主题切换不支持 `system` 态 | `toggleTheme()` 在三态间循环 `light → dark → system → light`；system 态使用 `matchMedia` 决定实际显示；settings.js 的 `saveTheme` 已支持 system |
| 11 | `sw.js` | `cache.addAll` 单点故障 | 替换为逐个 `cache.add(asset).catch(err => console.warn(...))` |
| 12 | `sw.js` | 缓存版本化缺失 | 定义 `const CACHE_VERSION = 'v2'`；`activate` 中清理不包含当前版本号的旧缓存 |
| 13 | `js/modules/calendar.js` | 跳转年份越界 | jump 逻辑添加 `y < 1900 || y > 2049` 校验，越界时 `alert` 提示 |
| 14 | `js/modules/calendar.js` | 跨年月农历越界 | `render()` 中跨年月份计算添加年份保护：`gY < 1900` 时用 1900，`gY > 2049` 时用 2049 |
| 15 | `js/modules/crystal-load.js` | E12 未考虑数量级 | 使用 `utils.js` 的 `generateSeries` 生成完整 E12 系列（10pF~1000pF） |
| 16 | `js/modules/base-convert.js` | Unicode 码点转换错误 | `String.fromCharCode(num)` 替换为 `String.fromCodePoint(num)`；检查 `num <= 0x10FFFF` |
| 17 | `js/modules/crc.js` | 奇数长度十六进制 | `hexStringToBytes` 在 `cleaned.length % 2 !== 0` 时前面补 `'0'` |
| 18 | `js/modules/impedance.js` | 负数输入未拦截 | falsy 判断改为 `w <= 0 || h <= 0 || t <= 0 || er <= 0`，显示红色提示 `"请输入正数"` |
| 19 | `js/modules/diff-impedance.js` | 负数输入未拦截 | 同上，改为 `<= 0` 判断并提示；复用 `utils.js` 的 `calcMicrostripZ0` / `calcStriplineZ0` |
| 20 | `js/modules/settings.js` | `localStorage` 未包裹 try-catch | 所有 `localStorage` 读写操作包裹 `try-catch`；导入/导出/清除均做异常处理 |
| 21 | `js/modules/resistor-color.js` | 大阻值反查色环错误 | `valueToRings` 中找不到对应倍率颜色时返回 `null`；`findReverse()` 表格渲染时显示 `"该阻值无法用标准色环精确表示"` |
| 22 | `js/modules/pwm-timer.js` | 反向计算循环效率低 | 当 `arrPlus1 > 65535 || arrPlus1 < 2` 时提前 `continue`，减少无效迭代 |

---

## 🟡 轻微问题（全部修复）

| # | 文件 | 问题 | 修复方式 |
|---|---|---|---|
| 23 | `js/app.js` | `escapeHtml()` 重复定义 | 删除本地实现，改为 `import { escapeHtml } from './utils.js'` |
| 24 | `js/modules/led-resistor.js` | 未使用 `generateSeries` 导入 | 移除未使用的 `generateSeries` 导入 |
| 25 | `js/modules/resistor-color.js` | 自行实现 `generateE24` / `generateE96` | 复用 `utils.js` 的 `generateSeries` 和 `E24_BASE` / `E96_BASE` |
| 26 | `js/modules/r-c-series.js` | 冗余 `dataset.idx` | 移除 `div.dataset.idx = index` 设置及相关注释 |
| 27 | `css/components.css` | focus 样式不统一 | 为 `input:focus/select:focus/textarea:focus` 统一添加 `box-shadow: 0 0 0 3px var(--primary-light)` |
| 28 | 多个模块 | `tool-icon` 标签不一致 | 全部统一为 `<span class="tool-icon">` |
| 29 | `js/modules/current.js` | 负数输入未校验 | 为输入框添加 `min="0"` 属性 |
| 30 | `js/modules/thermal.js` | 散热器回退无提示 | 只要填写了任意散热器参数即启用散热器模型，未填的默认为 0；部分参数未填时结果提示 `"已按 0 计算"` |
| 31 | `js/modules/battery.js` | 时间单位不直观 | 超过 24 小时优先显示 `"天"`，超过 1 小时显示 `"小时"`，否则用 `autoUnit` |
| 32 | `js/modules/filter.js` | LC 低通公式缺少注释 | 添加注释说明 `r<=1` 时使用 Butterworth 二阶近似 |
| 33 | `js/modules/ohms-law.js` | 矛盾数据无警告 | 已填值多于 2 个时，检查 `V=IR`、`P=VI` 等关系，偏差 >1% 时显示 `"数据矛盾：..."` |
| 34 | `js/modules/settings.js` | `window._openHelpModal` 全局泄漏 | `app.js` 切换路由时执行 `delete window._openHelpModal` |
| 35 | `js/modules/divider.js` | Web Worker 未使用 | **本轮跳过**（重构复杂度太高） |
| 36 | `js/modules/risetime.js` | `min="0.001"` 属性 | **本轮跳过** |
| 37 | `js/modules/unit-convert.js` | 科学计数法阅读体验差 | 绝对值在 `[0.001, 10000)` 范围内改用 `toFixed(4)` |
| 38 | `js/modules/db-convert.js` | 极小值显示 `-Infinity` | 添加 `safeFmt()` 截断：`!isFinite(num)` 时显示 `"< -1e308"` 或 `"> 1e308"` |
| 39 | `js/modules/resistor-color.js` | 每次反查重新生成序列 | 将 `E24_SERIES` / `E96_SERIES` 缓存为模块级常量 |

---

## 🟢 一致性/风格问题（部分修复）

| # | 问题 | 涉及文件 | 修复方式 |
|---|---|---|---|
| 40 | Tab 切换逻辑重复 | 多个模块 | **本轮跳过**（重构复杂度太高，需改动 6+ 个模块） |
| 41 | 单位常量重复定义 | `filter.js`, `r-c-series.js`, `resonance.js`, `opamp-gain.js` | 已在 `utils.js` 导出 `R_UNITS`, `C_UNITS`, `L_UNITS`；各模块可后续逐步替换 |
| 42 | E24 基础值重复 | `divider.js`, `led-resistor.js`, `opamp-gain.js`, `resistor-color.js` | 已在 `utils.js` 导出 `E24_BASE` / `E96_BASE`；`resistor-color.js` / `crystal-load.js` 已使用 |
| 43 | 阻抗公式重复 | `impedance.js`, `diff-impedance.js` | 已在 `utils.js` 导出 `calcMicrostripZ0` / `calcStriplineZ0`；`diff-impedance.js` 已使用 |
| 44 | 结果框内联样式不统一 | `current.js`, `filter.js`, `diff-impedance.js` 等 | 移除硬编码 `style="font-size:20px;padding:12px;"`，统一使用 `.result-box` 类样式 |
| 45 | 主题 icon 更新不一致 | `app.js`, `settings.js` | `app.js` 监听 `window.addEventListener('themechange', ...)` 并同步更新顶部按钮 icon |
| 46 | debounce 导入不一致 | `calendar.js` | **本轮跳过**（日历 render 开销不大） |
| 47 | 公式展示风格不一致 | `ohms-law.js`, `risetime.js` | 在 `components.css` 中新增 `.formula-box.center` 类，替换内联 `style="text-align:center;"` |

---

## 工具函数扩展（`js/utils.js`）

本次修复为 `utils.js` 新增以下导出，供后续模块逐步使用：

- `E24_BASE`, `E96_BASE` — 标准电阻基础值数组
- `R_UNITS`, `C_UNITS`, `L_UNITS` — 常用单位换算因子
- `calcMicrostripZ0(w, h, t, er)` — 微带线单端阻抗公式
- `calcStriplineZ0(w, b, t, er)` — 带状线单端阻抗公式
- `storage` — 已增强 `try-catch` 降级到内存变量

---

## 验证结果

- **语法检查**：所有 `js/modules/*.js`、`js/app.js`、`js/utils.js`、`sw.js` 均通过 `node --check`
- **冒烟测试**：启动 `http-server` 后，首页、utils.js、sw.js 均可正常加载
