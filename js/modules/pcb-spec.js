export default {
  init(container) {
    container.innerHTML = `
      <div class="tool-header">
        <span class="tool-icon">📋</span>
        <div class="tool-title-wrap">
          <h1 class="tool-title">PCB工艺规范</h1>
          <p class="tool-desc">生成PCB制作工艺单</p>
        </div>
      </div>
      <div class="card">
        <form id="pcb-form">
          <div class="card" style="margin-bottom:16px;">
            <div style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--primary);">PCB基本信息</div>
            <div class="input-group">
              <label>板材类别</label>
              <select id="pcb-material" required>
                <option value="">请选择</option>
                <option value="FR-4">FR-4</option>
                <option value="FR-4(无卤)">FR-4(无卤)</option>
                <option value="FR-4(CT1600)">FR-4(CT1600)</option>
                <option value="铝基板">铝基板</option>
                <option value="铜基板">铜基板</option>
                <option value="高频/混压">高频/混压</option>
                <option value="HDI">HDI</option>
                <option value="FPC">FPC</option>
                <option value="CEM-1">CEM-1</option>
                <option value="22F">22F</option>
                <option value="CEM-3">CEM-3</option>
              </select>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>板子层数</label>
                <select id="pcb-layers" required>
                  <option value="">请选择</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="6">6</option>
                  <option value="8">8</option>
                  <option value="10">10</option>
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="更多层数">更多层数</option>
                </select>
              </div>
              <div class="input-group">
                <label>HDI(盲埋孔)</label>
                <select id="pcb-hdi" required>
                  <option value="无">无</option>
                  <option value="1阶">1阶</option>
                  <option value="2阶">2阶</option>
                  <option value="3阶">3阶</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>板子长度 (CM)</label>
                <input type="number" id="pcb-length" min="0" step="0.1" required />
              </div>
              <div class="input-group">
                <label>板子宽度 (CM)</label>
                <input type="number" id="pcb-width" min="0" step="0.1" required />
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>名称</label>
                <input type="text" id="pcb-name" placeholder="请输入板子名称" required />
              </div>
              <div class="input-group">
                <label>拼版款数</label>
                <input type="number" id="pcb-panel" min="1" value="1" />
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>出货方式</label>
                <select id="pcb-delivery" required>
                  <option value="单片出货">单片出货</option>
                  <option value="客户拼版">客户拼版</option>
                  <option value="捷配代拼">捷配代拼</option>
                </select>
              </div>
              <div class="input-group">
                <label>订单阶段</label>
                <select id="pcb-stage" required>
                  <option value="研发打样">研发打样</option>
                  <option value="量产试样">量产试样</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:16px;">
            <div style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--primary);">PCB工艺信息</div>
            <div class="grid-2">
              <div class="input-group">
                <label>板子厚度 (mm)</label>
                <select id="pcb-thickness" required>
                  <option value="">请选择</option>
                  <option value="0.4">0.4</option>
                  <option value="0.6">0.6</option>
                  <option value="0.8">0.8</option>
                  <option value="1.0">1.0</option>
                  <option value="1.2">1.2</option>
                  <option value="1.6">1.6</option>
                  <option value="2.0">2.0</option>
                  <option value="2.4">2.4</option>
                  <option value="2.5">2.5</option>
                  <option value="3.0">3.0</option>
                  <option value="3.6">3.6</option>
                  <option value="4.0">4.0</option>
                </select>
              </div>
              <div class="input-group">
                <label>铜箔厚度(外层)</label>
                <select id="pcb-copper" required>
                  <option value="">请选择</option>
                  <option value="1oz">1oz</option>
                  <option value="2oz">2oz</option>
                  <option value="3oz">3oz</option>
                </select>
              </div>
            </div>
            <div class="grid-2" id="pcb-innercopper-row" style="display:none;">
              <div class="input-group">
                <label>铜箔厚度(内层)</label>
                <select id="pcb-innercopper">
                  <option value="0.5oz">0.5oz</option>
                  <option value="1oz" selected>1oz</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>阻焊颜色</label>
                <select id="pcb-mask" required>
                  <option value="绿色">绿色</option>
                  <option value="冷白色">冷白色</option>
                  <option value="蓝色">蓝色</option>
                  <option value="黑色">黑色</option>
                  <option value="黄色">黄色</option>
                  <option value="红色">红色</option>
                  <option value="哑光黑">哑光黑</option>
                  <option value="哑光绿">哑光绿</option>
                  <option value="紫色">紫色</option>
                </select>
              </div>
              <div class="input-group">
                <label>字符颜色</label>
                <select id="pcb-legend" required>
                  <option value="白色">白色</option>
                  <option value="黑色">黑色</option>
                  <option value="黄色">黄色</option>
                  <option value="无">无</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>最小线宽/线距</label>
                <select id="pcb-minline" required>
                  <option value="3/3mil">3/3mil</option>
                  <option value="3.5/3.5mil">3.5/3.5mil</option>
                  <option value="4/4mil">4/4mil</option>
                  <option value="5/5mil">5/5mil</option>
                  <option value="6/6mil↑" selected>6/6mil↑</option>
                  <option value="8/8mil↑">8/8mil↑</option>
                  <option value="10/10mil↓">10/10mil↓</option>
                  <option value="20/20mil↑">20/20mil↑</option>
                </select>
              </div>
              <div class="input-group">
                <label>最小孔径 (mm)</label>
                <select id="pcb-minhole" required>
                  <option value="0.15">0.15</option>
                  <option value="0.2">0.2</option>
                  <option value="0.25">0.25</option>
                  <option value="0.3" selected>0.3</option>
                  <option value="0.35">0.35</option>
                  <option value="0.4">0.4</option>
                  <option value="0.5">0.5</option>
                  <option value="0.6">0.6</option>
                  <option value="0.7">0.7</option>
                  <option value="0.8↑">0.8↑</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>阻焊覆盖</label>
                <select id="pcb-maskcover" required>
                  <option value="过孔盖油">过孔盖油</option>
                  <option value="过孔塞油">过孔塞油</option>
                  <option value="过孔开窗">过孔开窗</option>
                  <option value="过孔塞树脂+过孔电镀盖帽">过孔塞树脂+过孔电镀盖帽</option>
                </select>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">*过孔>塞孔极限，会默认按盖油处理，如不接受，需备注接受缩孔塞油，gerber文件格式一律按文件加工，此选项无效！</div>
              </div>
              <div class="input-group">
                <label>测试方式</label>
                <select id="pcb-test" required>
                  <option value="100%飞针测试">100%飞针测试</option>
                  <option value="工程测试架">工程测试架</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>焊盘表面处理</label>
                <select id="pcb-finish" required>
                  <option value="裸铜">裸铜</option>
                  <option value="有铅喷锡">有铅喷锡</option>
                  <option value="无铅喷锡">无铅喷锡</option>
                  <option value="沉金">沉金</option>
                  <option value="OSP">OSP</option>
                  <option value="沉锡">沉锡</option>
                  <option value="沉银">沉银</option>
                  <option value="电镀金">电镀金</option>
                  <option value="化学镀锌金">化学镀锌金</option>
                  <option value="沉金+选择性OSP">沉金+选择性OSP</option>
                  <option value="无铅喷锡+选择性沉金">无铅喷锡+选择性沉金</option>
                  <option value="无铅喷锡+选择性电镀金">无铅喷锡+选择性电镀金</option>
                </select>
                <div class="input-group" id="pcb-goldthickness-wrap" style="display:none;margin-top:8px;">
                  <label>沉金厚度</label>
                  <select id="pcb-goldthickness">
                    <option value="1u" selected>1u</option>
                    <option value="2u">2u</option>
                  </select>
                </div>
              </div>
              <div class="input-group">
                <label>阻抗</label>
                <select id="pcb-impedance" required>
                  <option value="否">否</option>
                  <option value="是">是</option>
                </select>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">*请用文档标明需制作阻抗线的位置及阻值大小，并和PCB文件一起压缩上传</div>
              </div>
            </div>
            <div class="grid-2">
              <div class="input-group">
                <label>成型方式</label>
                <select id="pcb-forming" required>
                  <option value="机械成型">机械成型</option>
                  <option value="模具成型">模具成型</option>
                </select>
              </div>
              <div class="input-group">
                <label>半孔</label>
                <select id="pcb-halfhole" required>
                  <option value="无">无</option>
                  <option value="一边">一边</option>
                  <option value="两边">两边</option>
                  <option value="三边">三边</option>
                  <option value="四边">四边</option>
                </select>
              </div>
            </div>
            <div class="input-group">
              <label>孔铜</label>
              <select id="pcb-holecopper" required>
                <option value="18um">18um</option>
                <option value="20um">20um</option>
                <option value="25um">25um</option>
                <option value="30um">30um</option>
                <option value="35um">35um</option>
              </select>
            </div>
          </div>

          <div style="display:flex;gap:12px;justify-content:center;margin-bottom:16px;">
            <button type="button" class="btn" id="pcb-generate">生成工艺规范</button>
            <button type="button" class="btn btn-danger" id="pcb-reset">重置表单</button>
          </div>
        </form>

        <div id="pcb-result" class="card" style="display:none;background:var(--bg);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-size:16px;font-weight:700;">PCB制作工艺规范</div>
            <button type="button" class="btn btn-success" id="pcb-copy" style="padding:6px 14px;">复制内容</button>
          </div>
          <div id="pcb-result-content" style="white-space:pre-line;background:var(--surface);padding:16px;border:1px solid var(--border);border-radius:8px;max-height:500px;overflow-y:auto;font-size:14px;line-height:1.7;"></div>
          <div id="pcb-copy-msg" style="color:var(--success);font-size:13px;margin-top:8px;display:none;">内容已复制到剪贴板！</div>
        </div>
      </div>
    `;

    const form = container.querySelector('#pcb-form');
    const generateBtn = container.querySelector('#pcb-generate');
    const resetBtn = container.querySelector('#pcb-reset');
    const copyBtn = container.querySelector('#pcb-copy');
    const resultArea = container.querySelector('#pcb-result');
    const resultContent = container.querySelector('#pcb-result-content');
    const copyMsg = container.querySelector('#pcb-copy-msg');

    function getFormData() {
      return {
        boardName: container.querySelector('#pcb-name').value,
        materialType: container.querySelector('#pcb-material').value,
        layerCount: container.querySelector('#pcb-layers').value,
        hdiType: container.querySelector('#pcb-hdi').value,
        boardLength: container.querySelector('#pcb-length').value,
        boardWidth: container.querySelector('#pcb-width').value,
        deliveryMethod: container.querySelector('#pcb-delivery').value,
        panelCount: container.querySelector('#pcb-panel').value,
        orderStage: container.querySelector('#pcb-stage').value,
        boardThickness: container.querySelector('#pcb-thickness').value,
        copperThickness: container.querySelector('#pcb-copper').value,
        innerCopperThickness: container.querySelector('#pcb-innercopper').value,
        solderMaskColor: container.querySelector('#pcb-mask').value,
        legendColor: container.querySelector('#pcb-legend').value,
        minLineWidth: container.querySelector('#pcb-minline').value,
        minHoleSize: container.querySelector('#pcb-minhole').value,
        solderMaskCoverage: container.querySelector('#pcb-maskcover').value,
        testingMethod: container.querySelector('#pcb-test').value,
        surfaceFinish: container.querySelector('#pcb-finish').value,
        goldThickness: container.querySelector('#pcb-goldthickness').value,
        impedance: container.querySelector('#pcb-impedance').value,
        formingMethod: container.querySelector('#pcb-forming').value,
        halfHole: container.querySelector('#pcb-halfhole').value,
        holeCopper: container.querySelector('#pcb-holecopper').value,
      };
    }

    function generateSpecification(formData) {
      const isENIG = formData.surfaceFinish.includes('沉金');
      const layerNum = parseInt(formData.layerCount, 10);
      const hasInnerLayer = layerNum > 2 || formData.layerCount === '更多层数';
      return `PCB制作工艺规范
 生成日期: ${new Date().toLocaleDateString()}

==================== PCB基本信息 ====================

名称: ${formData.boardName}
板材类别: ${formData.materialType}
板子层数: ${formData.layerCount}
HDI(盲埋孔): ${formData.hdiType}
板子尺寸: ${formData.boardLength}cm × ${formData.boardWidth}cm
出货方式: ${formData.deliveryMethod}
拼版款数: ${formData.panelCount}
订单阶段: ${formData.orderStage}

==================== PCB工艺信息 ====================

板子厚度: ${formData.boardThickness}mm
铜箔厚度(外层): ${formData.copperThickness}${hasInnerLayer ? `
铜箔厚度(内层): ${formData.innerCopperThickness}` : ''}
阻焊颜色: ${formData.solderMaskColor}
字符颜色: ${formData.legendColor}
最小线宽/线距: ${formData.minLineWidth}
最小孔径: ${formData.minHoleSize}mm
阻焊覆盖: ${formData.solderMaskCoverage}
测试方式: ${formData.testingMethod}
焊盘表面处理: ${formData.surfaceFinish}${isENIG ? `
沉金厚度: ${formData.goldThickness}` : ''}
阻抗: ${formData.impedance}
成型方式: ${formData.formingMethod}
半孔: ${formData.halfHole}
孔铜: ${formData.holeCopper}

====================================================

备注:
1. 过孔>塞孔极限，会默认按盖油处理，如不接受，需备注接受缩孔塞油
2. gerber文件格式一律按文件加工，阻焊覆盖选项无效
3. 如选择阻抗为"是"，请用文档标明需制作阻抗线的位置及阻值大小，并和PCB文件一起压缩上传

PCB制作工艺生成器
生成时间: ${new Date().toLocaleString()}`;
    }

    const layersSelect = container.querySelector('#pcb-layers');
    const finishSelect = container.querySelector('#pcb-finish');
    const innerCopperRow = container.querySelector('#pcb-innercopper-row');
    const goldThicknessWrap = container.querySelector('#pcb-goldthickness-wrap');

    function updateConditionalFields() {
      const layerNum = parseInt(layersSelect.value, 10);
      innerCopperRow.style.display = (layerNum > 2 || layersSelect.value === '更多层数') ? '' : 'none';
      goldThicknessWrap.style.display = finishSelect.value.includes('沉金') ? '' : 'none';
    }
    layersSelect.addEventListener('change', updateConditionalFields);
    finishSelect.addEventListener('change', updateConditionalFields);
    updateConditionalFields();

    generateBtn.addEventListener('click', () => {
      if (!form.checkValidity()) {
        alert('请填写所有必填字段！');
        return;
      }
      const formData = getFormData();
      resultContent.textContent = generateSpecification(formData);
      resultArea.style.display = 'block';
      resultArea.scrollIntoView({ behavior: 'smooth' });
    });

    copyBtn.addEventListener('click', () => {
      const text = resultContent.textContent;
      navigator.clipboard.writeText(text).then(() => {
        copyMsg.style.display = 'block';
        setTimeout(() => copyMsg.style.display = 'none', 3000);
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyMsg.style.display = 'block';
        setTimeout(() => copyMsg.style.display = 'none', 3000);
      });
    });

    resetBtn.addEventListener('click', () => {
      if (confirm('确定要重置所有表单数据吗？')) {
        form.reset();
        updateConditionalFields();
        resultArea.style.display = 'none';
      }
    });
  }
};
