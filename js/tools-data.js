export const MODULES = {
  'home': { name: '首页', category: 'general', icon: '🏠', desc: '鲁工不要慌工具箱功能总览', file: 'modules/home.js' },
  'calendar': { name: '万年历', category: 'general', icon: '📅', desc: '公历、农历与本地日程管理', file: 'modules/calendar.js' },
  'unit-convert': { name: '单位换算器', category: 'general', icon: '🔄', desc: '电学常用单位快速换算', file: 'modules/unit-convert.js' },
  'base-convert': { name: '进制/编码转换', category: 'general', icon: '🔡', desc: '多进制和编码互转', file: 'modules/base-convert.js' },
  'knowledge': { name: '硬件知识库', category: 'general', icon: '📚', desc: '人人都能学硬件 · ima 共享知识库', file: 'modules/knowledge.js' },
  'power-tree': { name: '电源树/时钟树', category: 'general', icon: '🌲', desc: '文本缩进定义层级绘制树图，功率自动累计，支持导出', file: 'modules/power-tree.js' },
  'timing-diagram': { name: '时序图绘制', category: 'general', icon: '📈', desc: '类 WaveDrom 语法在线绘制时序图，支持导出 SVG/PNG', file: 'modules/timing-diagram.js' },

  'dcdc-calc': { name: 'Buck/Boost 计算器', category: 'power', icon: '🔋', desc: '开关电源电感、电容、纹波电流计算', file: 'modules/dcdc-calc.js' },
  'flyback-calc': { name: '反激 Flyback 设计', category: 'power', icon: '⚡', desc: '反激变换器匝比、原边电感、峰值电流与器件应力', file: 'modules/flyback-calc.js' },
  'forward-calc': { name: '正激 Forward 设计', category: 'power', icon: '🔌', desc: '单管正激匝比、输出电感、开关应力计算', file: 'modules/forward-calc.js' },
  'llc-calc': { name: 'LLC 谐振设计', category: 'power', icon: '🌀', desc: '半桥 LLC 谐振参数与增益曲线(FHA 近似)', file: 'modules/llc-calc.js' },
  'smps-transformer': { name: '隔离电源变压器', category: 'power', icon: '🧲', desc: '反激/正激/推挽拓扑匝比、电感、磁芯选型计算', file: 'modules/smps-transformer.js' },
  'mosfet-loss': { name: 'MOSFET 损耗', category: 'power', icon: '🔥', desc: '导通损耗、开关损耗、驱动损耗估算', file: 'modules/mosfet-loss.js' },
  'power-eff': { name: '电源效率', category: 'power', icon: '⚡', desc: '线性/LDO 与 DC-DC 效率计算', file: 'modules/power-eff.js' },
  'cap-life': { name: '电解电容寿命', category: 'power', icon: '⏳', desc: '10℃ 法则 + 纹波发热修正的电容寿命估算', file: 'modules/cap-life.js' },
  'thermal': { name: '热阻/散热计算', category: 'power', icon: '🌡️', desc: '根据功耗和热阻估算结温', file: 'modules/thermal.js' },
  'battery': { name: '电池续航估算', category: 'power', icon: '🔋', desc: '估算电池续航时间', file: 'modules/battery.js' },

  'ohms-law': { name: '欧姆定律', category: 'analog', icon: '⚡', desc: 'V/I/R/P 四选二自动计算', file: 'modules/ohms-law.js' },
  'divider': { name: '分压计算器', category: 'analog', icon: '⚡', desc: 'E24/E96穷举最优分压电阻', file: 'modules/divider.js' },
  'r-c-series': { name: '串并联 R/C', category: 'analog', icon: '🔗', desc: '电阻电容串并联等效计算', file: 'modules/r-c-series.js' },
  'led-resistor': { name: 'LED 限流电阻', category: 'analog', icon: '💡', desc: 'LED 限流电阻与功率计算', file: 'modules/led-resistor.js' },
  'resistor-color': { name: '电阻色环识别', category: 'analog', icon: '🎨', desc: '4/5/6环电阻读值与反查', file: 'modules/resistor-color.js' },
  'resonance': { name: '谐振频率', category: 'analog', icon: '📡', desc: 'LC/RC/RL 谐振与截止频率', file: 'modules/resonance.js' },
  'rc-delay': { name: 'RC 延时计算', category: 'analog', icon: '⏱️', desc: 'RC 电路充放电到阈值的时间', file: 'modules/rc-delay.js' },
  'opamp-gain': { name: '运放增益', category: 'analog', icon: '🔺', desc: '反相/同相/差分放大器增益', file: 'modules/opamp-gain.js' },
  'level-shift': { name: '电平转换', category: 'analog', icon: '🔀', desc: '判断电压域逻辑电平兼容性', file: 'modules/level-shift.js' },

  'crystal-load': { name: '晶振负载电容', category: 'clock', icon: '💎', desc: '晶振外部匹配电容计算', file: 'modules/crystal-load.js' },
  'pwm-timer': { name: 'PWM 定时器', category: 'clock', icon: '⏱️', desc: 'MCU PWM 频率与分辨率计算', file: 'modules/pwm-timer.js' },
  'baud-error': { name: '波特率误差计算', category: 'clock', icon: '📟', desc: '晶振频率与波特率误差', file: 'modules/baud-error.js' },
  'risetime': { name: '上升时间转换', category: 'clock', icon: '📡', desc: 'Tr与带宽双向换算', file: 'modules/risetime.js' },

  'filter': { name: '滤波器波特图', category: 'signal', icon: '📉', desc: 'RC/RL/LC 滤波器截止频率', file: 'modules/filter.js' },
  'db-convert': { name: 'dB 换算器', category: 'signal', icon: '📶', desc: 'dBm/dBW/W/V 互转', file: 'modules/db-convert.js' },
  'signal-chain': { name: '信号链精度分析', category: 'signal', icon: '📊', desc: 'ADC/DAC 信号链噪声、INL/DNL、ENOB 与电压精度计算', file: 'modules/signal-chain.js' },
  'termination': { name: '端接电阻计算', category: 'signal', icon: '🔚', desc: '串联/并联/Thevenin/AC/差分端接电阻选型与SI计算', file: 'modules/termination.js' },

  'adc-calc': { name: 'ADC/DAC 分辨率', category: 'embedded', icon: '🔢', desc: 'ADC分辨率、LSB、SNR 计算', file: 'modules/adc-calc.js' },
  'crc': { name: 'CRC 校验工具', category: 'embedded', icon: '✅', desc: '计算 CRC8/16/32', file: 'modules/crc.js' },
  'i2c-pullup': { name: 'I2C 上拉电阻', category: 'embedded', icon: '🔗', desc: 'I2C 总线上拉电阻选型和总线电容估算', file: 'modules/i2c-pullup.js' },

  'current': { name: '载流计算', category: 'pcb', icon: '📟', desc: 'IPC-2221走线与过孔载流', file: 'modules/current.js' },
  'impedance': { name: '阻抗计算', category: 'pcb', icon: '🔌', desc: '微带线/带状线特征阻抗', file: 'modules/impedance.js' },
  'diff-impedance': { name: '差分阻抗计算器', category: 'pcb', icon: '⚡', desc: '差分微带线/带状线阻抗', file: 'modules/diff-impedance.js' },
  'length-match': { name: '等长Layout查询', category: 'pcb', icon: '📏', desc: '高速接口等长要求速查与层叠等长补偿计算', file: 'modules/length-match.js' },
  'pcb-spec': { name: 'PCB工艺规范', category: 'pcb', icon: '📋', desc: '生成PCB制作工艺单', file: 'modules/pcb-spec.js' },

  'webrtc-chat': { name: '局域网传文件', category: 'network', icon: '🌐', desc: 'WebRTC点对点传输', file: 'modules/webrtc-chat.js' },
  'serial': { name: '串口助手', category: 'network', icon: '🔌', desc: '基于 WebSerial API 的串口调试工具', file: 'modules/serial-web.js' },

  'settings': { name: '设置', category: 'general', icon: '⚙️', desc: '主题、数据管理与关于', file: 'modules/settings.js' },
};

export const CATEGORY_LABELS = {
  general: '📅 通用',
  power: '🔋 电源',
  analog: '🔺 模拟',
  clock: '⏰ 时钟',
  signal: '📶 信号',
  embedded: '🔢 嵌入式',
  pcb: '📟 PCB',
  network: '🌐 网络',
};

export const CATEGORY_ORDER = ['general', 'power', 'analog', 'clock', 'signal', 'embedded', 'pcb', 'network'];

// Expose for modules that read from window
if (typeof window !== 'undefined') {
  window.MODULES = MODULES;
  window.CATEGORY_LABELS = CATEGORY_LABELS;
}
