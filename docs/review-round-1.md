# 全面审查报告 - Round 1

> 审查范围：`js/app.js`、`js/utils.js`、`sw.js`、`index.html`、`css/*.css`、`js/modules/*.js`
> 审查方法：静态代码分析 + 功能逻辑推演 + 边界条件检查

---

## 严重问题（必须修复）

| # | 文件 | 行号 | 问题描述 | 影响 | 修复建议 |
|---|---|---|---|---|---|
| 1 | `js/modules/crc.js` | 24 | `const mask = (1 << width) - 1;` 在 `width=32` 时，`1 << 32` 在 JS 中等于 `1`（位运算只取低5位），导致 `mask = 0`。CRC-32 计算结果恒为 `0`，功能完全失效。同时 `topBit = 1 << 31` 得到 `-2147483648`（有符号整数），与无符号 CRC-32 语义冲突。 | CRC-32 所有计算结果错误；32位多项式算法崩溃 | 改用 `const mask = (2 ** width) - 1;`（可安全表示到 2^53）；CRC-32 计算全程使用 `>>> 0` 保持无符号。 |
| 2 | `js/modules/webrtc-chat.js` | 39 | 每次进入模块都执行 `let pc = new RTCPeerConnection(config)`，但模块切换时（`container.innerHTML` 被清空）**从不调用 `pc.close()`**。RTCPeerConnection 持有网络端口、ICE 候选列表和事件监听器，多次进入模块会产生多个僵尸连接，导致内存泄漏和 ICE 资源耗尽。 | 内存泄漏；WebRTC 连接资源耗尽；浏览器性能下降 | 在模块对象上暴露 `destroy()` 方法，在 `app.js` 切换路由前调用 `pc.close()` 并清理 `dc`；或在 `init` 开头检查并关闭旧实例。 |
| 3 | `js/modules/webrtc-chat.js` | 48 | `dc.onmessage` 中直接 `JSON.parse(e.data)`，若收到非 JSON 字符串（如对方手动发送纯文本或异常数据），会抛出未捕获异常，导致整个 `onmessage` 处理中断，后续文件传输或消息全部失效。 | 通信完全中断；文件传输中途崩溃 | 使用 `try { JSON.parse(...) } catch { return; }` 包裹解析逻辑，对非 JSON 数据静默丢弃或显示为原始文本。 |
| 4 | `js/modules/webrtc-chat.js` | 145 | 文件传输使用 `dc.send(value)` 直接发送 chunks，**未检查 `dc.bufferedAmount`**。WebRTC DataChannel 有缓冲区上限，大文件传输时会因缓冲区溢出抛出 `RTCError` 或关闭通道。 | 大文件传输失败；DataChannel 异常关闭 | 在发送 loop 前检查 `dc.bufferedAmount > dc.bufferedAmountLowThreshold`，使用 `setTimeout` 或 `bufferedamountlow` 事件做背压控制。 |
| 5 | `js/modules/settings.js` | 190 | `renderRecent()` 中将 `recent_tools` 的 `id` 直接拼接到 HTML 中（`${id}`），**未做 HTML 转义**。若 localStorage 被注入恶意数据（如 `<img src=x onerror=alert(1)>`），会导致 XSS 攻击。 | 存储型 XSS 漏洞 | 使用 `escapeHtml(id)` 对输出进行转义，或改用 `textContent`/`createElement` 安全构造 DOM。 |
| 6 | `js/modules/adc-calc.js` | 101 | `n = parseInt(nEl.value, 10)` 未设上限。当用户输入极大值（如 `n=1024`）时，`Math.pow(2, n)` 产生 `Infinity`，后续 `lsb = vref / Infinity = 0`，码值计算中 `Math.floor(vin / 0)` 返回 `Infinity`，最终显示 `"Infinity (0xINFINITY)"`，破坏界面并可能引发后续逻辑异常。 | 界面显示异常；极端输入导致不可预期行为 | 添加 `n > 32 || n > 64` 等合理上限校验，超出范围显示 `"位数过大"`。 |
| 7 | `js/modules/led-resistor.js` | 114 | 未处理 `i_f = 0`（期望电流为0）。计算时 `r = (vin - vf) / 0` 得到 `Infinity`，`p = 0 * Infinity` 得到 `NaN`，最终结果显示 `"NaN Ω"` 和 `"NaN W"`，用户体验极差且未给出有意义提示。 | 功能显示异常；用户无法理解结果 | 在 `calculate()` 开头添加 `i_f <= 0` 校验，显示 `"电流必须大于 0"`。 |
| 8 | `js/modules/power-eff.js` | 147 | LDO 模式未验证 `vin >= vout`。当输入 `vin < vout` 时，压降 `ploss = (vin - vout) * ioutA` 为负数，效率 `η = vout/vin * 100%` 超过 100%，这在物理上完全错误（LDO 不能升压）。 | 计算结果物理上荒谬；可能误导设计决策 | 添加 `vin >= vout` 校验，若不满足则显示 `"输入电压必须大于等于输出电压"`。 |

---

## 中等问题（建议修复）

| # | 文件 | 行号 | 问题描述 | 影响 | 修复建议 |
|---|---|---|---|---|---|
| 9 | `js/app.js` | 287-294 | 数字快捷键 `1~9` **未排除输入框焦点状态**。用户在 `<input>`/`<textarea>` 中输入数字时，会意外触发路由跳转，打断表单填写。 | 严重干扰表单输入体验 | 在快捷键处理开头添加 `const tag = document.activeElement.tagName; if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;`。 |
| 10 | `js/app.js` | 94-100 | `toggleTheme()` 只支持 `light ↔ dark` 切换，不支持 `system`。若用户在设置页选择了 `"跟随系统"`，点击顶部主题按钮会强制覆盖为固定主题，且无法再切回 system 模式（除非再次进入设置页）。 | 设置与快捷操作行为不一致；用户困惑 | 让 toggleTheme 在三态间循环：`light → dark → system → light...`，或根据当前状态智能判断。 |
| 11 | `sw.js` | 15-18 | `install` 阶段使用 `cache.addAll(CORE_ASSETS)`，**未做单个资源失败降级**。若任一核心文件（如 `manifest.json` 被误删）请求失败，整个 `Promise` reject，Service Worker 安装失败，离线功能完全不可用。 | 离线能力脆弱；单点故障 | 将 `cache.addAll` 替换为逐个 `cache.add` 并 catch 单个错误，记录警告但继续安装。 |
| 12 | `sw.js` | 1-2 | 缓存名称固定为 `tools-core-v1` / `tools-modules-v1`，**版本号永不递增**。更新代码后，CacheFirst 策略会导致用户永远加载旧版核心资源（HTML/CSS/JS）。 | 应用更新无法触达用户；缓存永不过期 | 采用内容哈希或构建时间戳命名缓存（如 `tools-core-v2`），并在 `activate` 中清理旧版本；或改用 NetworkFirst。 |
| 13 | `js/modules/calendar.js` | 319-324 | 跳转年份输入框（`#cal-jy`）**无任何范围限制**。用户输入 1800 或 2100 时，农历算法数组越界访问 `lunarInfo[y-1900]`（数组仅覆盖 1900-2049），返回 `undefined`，后续位运算产生 `NaN` 或错误农历日期，界面虽不会崩溃但显示完全错误的农历信息。 | 超出支持范围的日期显示错误农历 | 在 `jump` 逻辑中添加 `if (y < 1900 || y > 2049) { alert('年份超出支持范围'); return; }`。 |
| 14 | `js/modules/calendar.js` | 189-191 | 上月/下月填充格子的农历计算使用 `curMonth === 0 ? curYear - 1 : curYear` 等逻辑，但当跨年计算时（如 1900年1月 看上一月），年份变为 1899，触发农历数组越界。 | 边界月份农历显示错误 | 在 `render()` 的越界月份计算中同步添加年份范围保护。 |
| 15 | `js/modules/crystal-load.js` | 3-13 | `findClosestE12()` 只搜索基础值 `[10, 12, ..., 82]`，**未考虑数量级**。当计算结果超过 82pF（如 150pF）时，返回 82pF，误差高达 45%，失去推荐意义。 | 推荐电容值严重偏离实际需求 | 使用 `utils.js` 中的 `generateSeries` 生成完整 E12 系列（如 10pF~820pF），再查找最接近值。 |
| 16 | `js/modules/base-convert.js` | 103 | `String.fromCharCode(num)` 只能正确处理 BMP 字符（`U+0000~U+FFFF`）。当输入数值在 `0x10000~0x10FFFF` 之间（如 Emoji 或 CJK 扩展字符）时，只取低16位，产生完全错误的字符。 | Unicode 转换结果错误 | 替换为 `String.fromCodePoint(num)`，并在调用前检查 `num <= 0x10FFFF`。 |
| 17 | `js/modules/crc.js` | 41-46 | `hexStringToBytes` 对奇数长度清理后的字符串（如 `"123"`），最后一字节会被 `parseInt("3", 16)` 单独解析为 `0x03`，而用户本意可能是 `"01 23"`（需补零）。这会导致隐式数据错误且无任何警告。 | 十六进制输入解析歧义；数据静默错误 | 在 `cleaned.length % 2 !== 0` 时，在前面补 `'0'` 再解析，或向用户提示 `"十六进制字符数应为偶数"`。 |
| 18 | `js/modules/impedance.js` | 62 | 输入合法性检查使用 `if (!w || !h || !t || !er)`（falsy 判断）。当用户输入 `0` 或 `-1` 时，`0` 会被拦截但 `-1` 会通过，随后 `Math.log(负数)` 产生 `NaN`，结果显示 `"NaN Ω"`。 | 负数和零值未统一拒绝；界面显示 NaN | 改为 `if (w <= 0 || h <= 0 || t <= 0 || er <= 0)`，并给出明确提示。 |
| 19 | `js/modules/diff-impedance.js` | 104 | 与上一条相同：使用 `if (!w || !s || !h || !t || !er)` 做 falsy 判断，负数输入会产生 `NaN`。 | 同上 | 改为 `<= 0` 判断并提示用户。 |
| 20 | `js/modules/settings.js` | 85-90 | `loadTheme()` / `saveTheme()` 直接读写 `localStorage`，**未包裹 try-catch**。在隐私模式或存储配额满时，`localStorage` 操作会抛出 `SecurityError` 或 `QuotaExceededError`，导致设置页整个初始化失败。 | 设置页在受限环境下白屏或崩溃 | 对所有 `localStorage.getItem/setItem/removeItem` 包裹 `try-catch`，失败时降级到内存变量。 |
| 21 | `js/modules/resistor-color.js` | 242-251 | `valueToRings` 生成倍率色环时依赖 `MULTIPLIER_MAP` 的遍历顺序查找颜色。`MULTIPLIER_MAP` 最大仅到 `blue: 1e6`，而 `generateE96` 生成到 `1e7`。当阻值为 `10 MΩ`（倍率 `1e7`）时，找不到对应颜色，回退为 `black`（×1），色环显示完全错误。 | 大阻值反查色环结果错误 | 扩展 `MULTIPLIER_MAP` 以覆盖 `1e7`（white=10^9 不存在，但 `1e7` 可用 grey? 不，标准色环没有 10^7。应使用 `10^6 * 10` 即 blue+额外处理，或直接提示 `"该阻值无法用标准色环精确表示"`）。 |
| 22 | `js/modules/pwm-timer.js` | 175-184 | 反向计算循环 `psc = 0..65535`，当 `idealDiv` 极大（目标频率极低）时，`arr` 可能远超 65535 被大量 `continue`，但循环仍需跑满 65536 次。**缺少提前终止优化**。 | 低频目标时计算耗时增加（虽现代浏览器可接受，但不够优雅） | 当 `idealDiv / (psc+1) > 65535` 时，`arrPlus1` 必然超标，可推导 `psc` 下限并减少循环次数。 |

---

## 轻微问题（可选修复）

| # | 文件 | 行号 | 问题描述 | 修复建议 |
|---|---|---|---|---|
| 23 | `js/app.js` | 197-199 | `escapeHtml()` 函数与 `utils.js` 中导出的 `escapeHtml()` 完全重复，但 app.js 未从 utils 导入。 | 删除 app.js 中的本地实现，改为 `import { escapeHtml } from './utils.js'`。 |
| 24 | `js/modules/led-resistor.js` | 1 | 导入了 `generateSeries` 但未使用（模块内自行定义了 `e24Series`）。 | 移除未使用的导入 `generateSeries`。 |
| 25 | `js/modules/resistor-color.js` | 43-56 | 自行实现了 `generateE24` / `generateE96`，而 `utils.js` 已提供通用的 `generateSeries`。 | 复用 `utils.js` 中的 `generateSeries`，减少维护负担。 |
| 26 | `js/modules/r-c-series.js` | 85 | `createInputRow` 中设置了 `div.dataset.idx = index`，但后续 `reindexInputs` 和 `getVals` 均未使用 `dataset.idx`，依赖 `querySelectorAll` 顺序。 | 移除冗余的 `dataset.idx` 设置，或改为基于 dataset 查找以提升代码清晰度。 |
| 27 | `css/components.css` | 60-64 | `.input-group input:focus` 仅设置 `border-color`，而 `index.html` 中 `.search-box input:focus` 额外有 `box-shadow` 聚焦环。两者 focus 视觉反馈不一致。 | 统一为所有 input/select/textarea 的 focus 状态添加一致的 `box-shadow` 或统一移除。 |
| 28 | 多个模块 | — | Phase 1 模块（divider/risetime/current/impedance/pcb-spec/webrtc-chat/calendar）使用 `<span class="tool-icon">`，Phase 2/3 模块全部使用 `<div class="tool-icon">`。 | 统一为 `<span>`（行内语义更符合图标用途）。 |
| 29 | `js/modules/current.js` | 87-99 | 未验证输入为非负数。用户可输入负温升、负铜厚等，计算产生无意义的负电流结果。 | 为输入框添加 `min="0"` 属性，或在 JS 中做非负校验。 |
| 30 | `js/modules/thermal.js` | 107-110 | 散热器计算中，只有 `jc`、`cs`、`sa` **三者同时非空** 时才使用散热器模型。若用户只填了 `jc` 和 `sa`（忘记 `cs`），系统静默回退到 `θja`，用户无法感知计算方式已改变。 | 改为“只要填写了任意散热器相关参数，就启用散热器模型，未填的默认为 0”，或给出明确提示。 |
| 31 | `js/modules/battery.js` | 119 | `autoUnit(hours * 3600, 'time')` 对长续航（如数天）仍返回 `"秒"` 单位，导致显示 `"86400 s (1 天)"`，不够直观。 | 对超过 1 小时的结果优先使用 `"h"` 或 `"天"` 作为单位。 |
| 32 | `js/modules/filter.js` | 203-221 | `fillTable` 中 LC 低通的 `lp2` 分支在 `r <= 1` 时使用 `-20*log10(sqrt(1+r^4))`，公式正确，但代码注释未说明这是 Butterworth 近似，维护者可能困惑。 | 添加注释说明公式来源。 |
| 33 | `js/modules/ohms-law.js` | 137-145 | 当已填写的物理量之间**自相矛盾**时（如 V=5, I=0, P=10），代码按优先级分支处理，不会报错，而是根据优先级覆盖值，导致用户不知道自己输入了矛盾数据。 | 在计算前增加一致性校验：若已填值多于2个，检查它们是否满足 V=IR、P=VI 等关系，偏差过大时给出警告。 |
| 34 | `js/modules/settings.js` | 208 | `window._openHelpModal` 为全局函数，settings 模块卸载后该引用仍存在（虽然指向的 DOM 元素已不在文档中）。 | 在 app.js 路由切换时清理 `window._openHelpModal` 或将其挂载到不依赖 DOM 生命周期的地方。 |
| 35 | `js/modules/divider.js` | 15-23 | `runBruteForce` 使用双重循环 O(N²)。E96 系列约 768 个值，双循环约 59 万次/系列，合计约 118 万次迭代。虽然现代浏览器可轻松处理，但未使用 Web Worker，主线程会被阻塞几十到几百毫秒。 | 对更大系列或未来扩展，考虑将穷举逻辑移入 Web Worker。 |
| 36 | `js/modules/risetime.js` | 65 | `input` 的 `min="0.001"` 不能真正阻止用户输入更小值（仅 HTML5 验证，JS 仍需校验）。 | 已在 JS 中校验（`riseTime <= 0`），可移除 HTML 的 `min` 属性以避免误导，或保留两者。 |
| 37 | `js/modules/unit-convert.js` | 87-89 | 所有换算结果统一使用 `toExponential(4)`，对日常数值（如 25°C → 298.15 K）显示为 `"2.9815e+2"`，阅读体验差。 | 对绝对值在 `[0.001, 10000]` 范围内的结果改用 `toFixed(4)` 显示。 |
| 38 | `js/modules/db-convert.js` | 114-118 | 当输入功率极小（如 dBm = -1000）时，`Math.pow(10, -100)` 下溢为 `0`，后续 `Math.log10(0)` 产生 `-Infinity`。结果显示 `"-Infinity dBW"`，虽不崩溃但体验不佳。 | 对极小/极大结果做范围截断，显示 `"< 1e-308"` 或 `"> 1e308"`。 |
| 39 | `js/modules/resistor-color.js` | 209-228 | `findReverse()` 每次都会重新 `generateE24()` / `generateE96()` 并合并去重，而这两个函数每次都会重新分配大数组。 | 将生成结果缓存为模块级常量，避免重复计算。 |

---

## 一致性/风格问题

| # | 问题描述 | 涉及文件 | 修复建议 |
|---|---|---|---|
| 40 | **Tab 切换逻辑重复**：所有含 tab 的模块（resonance、filter、opamp-gain、power-eff、resistor-color、unit-convert 等）均重复实现了几乎相同的 `setMode` + `classList.toggle` 逻辑，代码冗余度高。 | `js/modules/resonance.js`, `js/modules/filter.js`, `js/modules/opamp-gain.js`, `js/modules/power-eff.js`, `js/modules/resistor-color.js`, `js/modules/unit-convert.js` | 在 `utils.js` 中封装通用函数 `initTabs(container, callback)`，统一绑定切换事件。 |
| 41 | **单位换算因子重复定义**：`R_UNITS`、`C_UNITS`、`L_UNITS` 在 resonance、filter、opamp-gain 等多个模块中重复硬编码。 | `js/modules/resonance.js`, `js/modules/filter.js`, `js/modules/r-c-series.js`, `js/modules/opamp-gain.js` | 将这些常量集中定义在 `utils.js` 中统一导出。 |
| 42 | **E24 基础值重复**：`e24Base` 数组在 divider.js、led-resistor.js、opamp-gain.js、resistor-color.js 中各定义一次。 | `js/modules/divider.js`, `js/modules/led-resistor.js`, `js/modules/opamp-gain.js`, `js/modules/resistor-color.js` | 统一放入 `utils.js`，或各模块导入同一个常量。 |
| 43 | **阻抗公式重复**：微带线/带状线单端阻抗公式在 `impedance.js` 和 `diff-impedance.js` 中各自硬编码。 | `js/modules/impedance.js`, `js/modules/diff-impedance.js` | 将公式提取到 `utils.js` 中作为 `calcMicrostripZ0(w, h, t, er)` 和 `calcStriplineZ0(w, b, t, er)` 导出。 |
| 44 | **结果框样式不统一**：大部分模块使用 `.result-box` 类，但部分模块（如 current.js 的过孔结果、filter.js 的结果）额外内联了 `style="font-size:20px;padding:12px;"`，破坏了组件化一致性。 | `js/modules/current.js`, `js/modules/filter.js`, `js/modules/diff-impedance.js` 等 | 移除硬编码内联样式，改为在 `components.css` 中定义 `.result-box.compact` 等修饰类。 |
| 45 | **主题 icon 更新不一致**：`app.js` 的 `updateThemeIcon` 更新 `#theme-toggle` 和 `#theme-toggle-mobile`，但 settings 页修改主题为 system 时，`app.js` 没有监听 `themechange` 自定义事件来同步顶部按钮的 icon。 | `js/app.js`, `js/modules/settings.js` | `app.js` 应监听 `window.addEventListener('themechange', ...)` 并调用 `updateThemeIcon`。 |
| 46 | **debounce 导入不一致**：部分模块从 `utils.js` 导入 `debounce`，部分模块（如 calendar.js）没有使用 debounce（其事件绑定直接触发 render，虽然日历 render 开销不大）。 | `js/modules/calendar.js` | 对日历的输入框（跳转年/月）也使用 debounce，保持一致性。 |
| 47 | **公式展示风格不一致**：部分模块使用 `.formula-box` 包裹公式，部分模块（如 ohms-law.js）使用内联 `<div>` 列表，且背景色和边框样式相同，但部分模块额外加了 `style="text-align:center;"`。 | `js/modules/ohms-law.js`, `js/modules/risetime.js` | 在 `components.css` 中新增 `.formula-box.center` 类，替换内联样式。 |

---

## 总体评估

### 功能正确性：B+（存在关键算法缺陷）
- **数学公式**：绝大多数模块的物理/电路公式正确，单位换算逻辑严谨。
- **致命伤**：`crc.js` 的 CRC-32 因 JS 位运算特性完全失效（mask=0），属于必须立即修复的严重功能错误。
- **边界处理**：除零、NaN 在部分模块（LED、欧姆定律、阻抗）已有防护，但一致性不足，仍有漏网之鱼。
- **localStorage**：读写基本正确，settings.js 的 XSS 风险和隐私模式异常处理缺失需要补齐。

### UI/UX 一致性：A-
- **组件规范**：`.tool-header`、`.card`、`.input-group`、`.result-box` 等核心组件在各模块中复用率高，整体视觉统一。
- **瑕疵**：Phase 1/2/3 模块的 `tool-icon` 标签不一致（span vs div）；focus 样式在搜索框与普通输入框之间不统一；部分模块结果框滥用内联样式。
- **主题切换**：明暗主题 CSS 变量覆盖全面，dark 模式下可读性良好。

### 代码质量：B
- **重复代码**：单位常量、E24 序列、Tab 切换逻辑、阻抗公式等重复率较高，建议提取到 `utils.js`。
- **内存管理**：`webrtc-chat.js` 的 RTCPeerConnection 泄漏是最大隐患；其他模块因 DOM 随 `innerHTML` 清空，事件监听器可被 GC，风险较低。
- **魔法数字**：公式中的物理常数（如 IPC-2221 系数、0.35 带宽系数）均有注释或上下文说明，可接受。

### 架构规范：B
- **路由与懒加载**：`app.js` 的 `import()` + catch 结构合理，但缺少模块 `destroy` 生命周期钩子。
- **Service Worker**：缓存策略设计合理（核心 CacheFirst + 模块 StaleWhileRevalidate），但缓存名称版本化缺失导致更新无法触达用户，这是 PWA 的典型痛点。
- **utils.js**：`autoUnit`、`formatNumber`、`debounce`、`storage`、`escapeHtml` 等工具函数设计良好，但未被所有模块充分利用（如 app.js 未导入 escapeHtml）。

### 修复优先级建议
1. **立即修复**：crc.js（CRC-32 失效）、webrtc-chat.js（内存泄漏 + 通信崩溃）、settings.js（XSS）、app.js（数字快捷键干扰输入）。
2. **本轮修复**：所有输入框的 `<=0` 校验统一、日历年份越界、晶体负载电容推荐值、base-convert 的 Unicode 支持。
3. **后续迭代**：代码重构（提取公共 Tab/单位/阻抗逻辑）、SW 缓存版本化、结果单位显示优化。
