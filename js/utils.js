// E24/E96 标准电阻序列生成
export function generateSeries(baseValues, max) {
  const series = [];
  const multipliers = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];
  for (const m of multipliers) {
    for (const v of baseValues) {
      const val = parseFloat((v * m).toFixed(2));
      if (val >= 1 && val <= max) {
        series.push(val);
      }
    }
  }
  return [...new Set(series)]; // 去重
}

// 常用常量导出
export const E24_BASE = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
export const E96_BASE = [1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09, 3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76];

export const R_UNITS = { Ω: 1, 'kΩ': 1e3, 'MΩ': 1e6 };
export const C_UNITS = { pF: 1e-12, nF: 1e-9, 'μF': 1e-6, mF: 1e-3, F: 1 };
export const L_UNITS = { nH: 1e-9, 'μH': 1e-6, mH: 1e-3, H: 1 };

// 阻抗公式
export function calcMicrostripZ0(w, h, t, er) {
  const term1 = 87 / Math.sqrt(er + 1.41);
  const term2 = Math.log((5.98 * h) / (0.8 * w + t));
  return term1 * term2;
}

export function calcStriplineZ0(w, b, t, er) {
  const term1 = 60 / Math.sqrt(er);
  const term2 = Math.log((1.9 * b) / (0.8 * w + t));
  return term1 * term2;
}

// 单位自动换算
export function autoUnit(value, type) {
  const units = {
    resistance: ['Ω', 'kΩ', 'MΩ'],
    capacitance: ['pF', 'nF', 'μF', 'mF', 'F'],
    frequency: ['Hz', 'kHz', 'MHz', 'GHz'],
    time: ['ps', 'ns', 'μs', 'ms', 's'],
    voltage: ['μV', 'mV', 'V', 'kV'],
    current: ['μA', 'mA', 'A'],
    power: ['μW', 'mW', 'W', 'kW'],
  };
  const thresholds = {
    resistance: [1, 1000, 1000000],
    capacitance: [1, 1000, 1000000, 1000000000],
    frequency: [1, 1000, 1000000, 1000000000],
    time: [1e-12, 1e-9, 1e-6, 1e-3, 1],
    voltage: [1e-6, 1e-3, 1, 1000],
    current: [1e-6, 1e-3, 1],
    power: [1e-6, 1e-3, 1, 1000],
  };

  const u = units[type];
  const t = thresholds[type];
  if (!u || !t) return { value, unit: '' };

  for (let i = t.length - 1; i >= 0; i--) {
    if (Math.abs(value) >= t[i]) {
      return { value: value / t[i], unit: u[i] };
    }
  }
  return { value: value / t[0], unit: u[0] };
}

// localStorage 封装（带 try-catch 降级）
const memoryStore = {};
export const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem('tools_' + key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      const v = memoryStore['tools_' + key];
      return v === undefined ? null : v;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('tools_' + key, JSON.stringify(value));
    } catch {
      memoryStore['tools_' + key] = value;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem('tools_' + key);
    } catch {}
    delete memoryStore['tools_' + key];
  },
};

// 防抖
export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// 数字格式化
export function formatNumber(num, maxDecimals = 4) {
  if (num === 0) return '0';
  const abs = Math.abs(num);
  if (abs >= 1000) return num.toFixed(0);
  if (abs >= 100) return num.toFixed(1);
  if (abs >= 10) return num.toFixed(2);
  if (abs >= 1) return num.toFixed(3);
  if (abs >= 0.1) return num.toFixed(4);
  if (abs >= 0.01) return num.toFixed(5);
  return num.toExponential(3);
}

// 转义HTML
export function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
