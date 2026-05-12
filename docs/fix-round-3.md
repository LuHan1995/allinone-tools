# Round 3 修复摘要

## 1. `js/app.js` — `initTheme()` 增加 try-catch
- **位置**: 第 85 行
- **修复**: `localStorage.getItem('tools_theme')` 用 try-catch 包裹，防止隐私模式/安全策略下抛出 `SecurityError` 导致应用白屏。
- **改动**:
  ```javascript
  // 修复前
  const saved = localStorage.getItem('tools_theme') || 'light';
  // 修复后
  const saved = (() => { try { return localStorage.getItem('tools_theme'); } catch { return null; } })() || 'light';
  ```

## 2. `js/modules/webrtc-chat.js` — 文本发送增加 try-catch
- **位置**: `sendText()` 函数
- **修复**: `dc.send(JSON.stringify(...))` 包裹 try-catch，连接断开时给用户反馈，而不是抛未捕获异常。
- **改动**: 在 `dc.send(...)` 外套入 `try { ... } catch { appendMsg('系统', '发送失败：连接已关闭', 'me'); }`

## 3. `sw.js` — 限制缓存清理范围
- **位置**: `activate` 事件，第 31 行
- **修复**: 旧逻辑 `!k.includes(CACHE_VERSION)` 会误删同 origin 下其他应用的缓存。改为仅删除以 `tools-core-` 或 `tools-modules-` 开头且版本号不匹配的缓存。
- **改动**:
  ```javascript
  // 修复前
  keys.filter(k => !k.includes(CACHE_VERSION)).map(k => caches.delete(k))
  // 修复后
  keys.filter(k => (k.startsWith('tools-core-') || k.startsWith('tools-modules-')) && !k.endsWith(CACHE_VERSION)).map(k => caches.delete(k))
  ```

## 4. HTML 标签闭合错误批量修复

| 文件 | 处数 | 说明 |
|---|---|---|
| `js/modules/settings.js` | 6 处 | `<span>...</div>` → `<span>...</span>`（主题选项、导入模式、工具总数） |
| `js/modules/calendar.js` | 3 处 | `<span>...</div>` → `<span>...</span>`（年月标题、今天标签、模态框日期） |
| `js/modules/resistor-color.js` | 1 处 | 反查色环 `<span style="..."></div>` → `</span>` |
| `js/modules/filter.js` | 3 处 | 快速参数标签 `<span>...</div>` → `<span>...</span>` |
| `js/modules/opamp-gain.js` | 3 处 | 常用增益标签 `<span>...</div>` → `<span>...</span>` |

**验证**: 全局搜索 `<span[^>]*>[^<]*</div>` 已无任何匹配。

## 语法验证
所有修改后的 JS 文件均通过 `node --check` 语法检查：
- `js/app.js` ✅
- `js/modules/webrtc-chat.js` ✅
- `sw.js` ✅
- `js/modules/settings.js` ✅
- `js/modules/calendar.js` ✅
- `js/modules/resistor-color.js` ✅
- `js/modules/filter.js` ✅
- `js/modules/opamp-gain.js` ✅
