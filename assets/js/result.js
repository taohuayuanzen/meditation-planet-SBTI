/**
 * 冥想星球 SBTI 结果页脚本
 *
 * 负责：
 * - 读取结果快照
 * - 渲染结果页内容
 * - 绑定结果页操作按钮
 */
const RESULT_STORAGE_KEY = 'meditation-planet-sbti-result';
const RESULT_SNAPSHOT_VERSION = 1;
const VIP_LINK = 'http://mk.xinlifm.site/mpus/dptg95e';
const sbtiData = window.MEDITATION_PLANET_SBTI;
const antidoteData = window.SBTI_ANTIDOTE_DATA?.prescriptions || {};
const dimensionMeta = sbtiData.dimensionMeta;
const dimensionOrder = sbtiData.dimensionOrder;
const resetTopBtn = document.getElementById('resetTopBtn');
const restartBtn = document.getElementById('restartBtn');
const antidoteBtn = document.getElementById('antidoteBtn');
const resultSnapshot = readResultSnapshot();

document.title = sbtiData.siteTitle;

if (!resultSnapshot) {
  clearResultSnapshot();
  redirectToIndex();
} else {
  bindPageActions(resultSnapshot);
  renderResult(resultSnapshot);
}

/**
 * 读取并校验结果快照。
 * @returns {object | null} 结果快照
 */
function readResultSnapshot() {
  const rawSnapshot = sessionStorage.getItem(RESULT_STORAGE_KEY);
  if (!rawSnapshot) {
    return null;
  }

  try {
    const parsedSnapshot = JSON.parse(rawSnapshot);
    return isValidResultSnapshot(parsedSnapshot) ? parsedSnapshot : null;
  } catch (error) {
    return null;
  }
}

/**
 * 校验结果快照结构。
 * @param {object} snapshot 结果快照
 * @returns {boolean} 是否有效
 */
function isValidResultSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      snapshot.version === RESULT_SNAPSHOT_VERSION &&
      snapshot.finalType?.code &&
      snapshot.finalType?.displayName &&
      snapshot.finalType?.intro &&
      snapshot.finalType?.desc &&
      snapshot.mode &&
      snapshot.badge &&
      snapshot.levels
  );
}

/**
 * 绑定页面按钮行为。
 * @param {object} snapshot 结果快照
 */
function bindPageActions(snapshot) {
  resetTopBtn.addEventListener('click', () => {
    clearResultSnapshot();
    redirectToIndex();
  });
  restartBtn.addEventListener('click', () => {
    window.location.href = VIP_LINK;
  });
  antidoteBtn.addEventListener('click', () => {
    redirectToAntidote(snapshot.finalType.code);
  });
}

/**
 * 渲染结果页。
 * @param {object} snapshot 结果快照
 */
function renderResult(snapshot) {
  const prescription = getPrescription(snapshot.finalType.code);
  renderResultSummary(snapshot);
  document.getElementById('resultIntro').textContent = snapshot.finalType.intro;
  document.getElementById('resultDesc').textContent = snapshot.finalType.desc;
  document.getElementById('antidoteTitle').textContent = prescription.prescriptionName;
  document.getElementById('antidoteSubtitle').textContent = prescription.status;
  renderDimensionList(snapshot.levels);
  renderSafetyNote(snapshot.finalType.sensitive);
}

/**
 * 渲染结果摘要。
 * @param {object} snapshot 结果快照
 */
function renderResultSummary(snapshot) {
  const type = snapshot.finalType;
  document.getElementById('resultKicker').textContent = snapshot.mode;
  document.getElementById('resultName').textContent = `${type.code}（${type.displayName}）`;
  document.getElementById('matchBadge').textContent = snapshot.badge;
  document.getElementById('resultFigureLabel').textContent = `${type.code} 人格图占位`;
}

/**
 * 获取人格对应的人生解药。
 * @param {string} typeCode 人格编码
 * @returns {object} 对应处方
 */
function getPrescription(typeCode) {
  return antidoteData[typeCode] || antidoteData.HHHH || {
    prescriptionName: '人格解药',
    status: '从一条适合现在状态的练习开始。'
  };
}

/**
 * 渲染十五维度列表。
 * @param {Record<string, 'L' | 'M' | 'H'>} levels 维度档位
 */
function renderDimensionList(levels) {
  const dimensionList = document.getElementById('dimensionList');
  const items = dimensionOrder.map((dimensionCode) => {
    return buildDimensionItem(dimensionCode, levels[dimensionCode]);
  });
  dimensionList.replaceChildren(...items);
}

/**
 * 构造单个维度节点。
 * @param {string} dimensionCode 维度编码
 * @param {'L' | 'M' | 'H'} level 维度档位
 * @returns {HTMLDivElement} 维度节点
 */
function buildDimensionItem(dimensionCode, level) {
  const meta = dimensionMeta[dimensionCode];
  const item = document.createElement('div');
  const code = document.createElement('p');
  const copy = document.createElement('div');
  const model = document.createElement('p');
  const name = document.createElement('p');
  const levelBadge = document.createElement('p');

  item.className = 'dimension-item';
  code.className = 'dimension-code';
  copy.className = 'dimension-copy';
  model.className = 'dimension-model';
  name.className = 'dimension-name';
  levelBadge.className = 'dimension-level';
  code.textContent = dimensionCode;
  model.textContent = meta.model;
  name.textContent = meta.name;
  levelBadge.textContent = `${level || 'L'} 档`;
  copy.append(model, name);
  item.append(code, copy, levelBadge);
  return item;
}

/**
 * 渲染敏感结果提示。
 * @param {boolean} isSensitive 是否敏感人格
 */
function renderSafetyNote(isSensitive) {
  const safetyNote = document.getElementById('safetyNote');
  safetyNote.classList.toggle('hidden', !isSensitive);
  safetyNote.textContent = isSensitive
    ? '提示：这个结果只用于娱乐和练习推荐，不是心理诊断。若你正处在强烈痛苦、失控或危险状态，请优先联系可信任的人或专业支持。'
    : '';
}

/**
 * 跳转到人生解药页。
 * @param {string} typeCode 人格编码
 */
function redirectToAntidote(typeCode) {
  window.location.href = `./personality-antidote.html?type=${encodeURIComponent(typeCode)}`;
}

/**
 * 清理结果快照。
 */
function clearResultSnapshot() {
  sessionStorage.removeItem(RESULT_STORAGE_KEY);
}

/**
 * 跳回测评首页。
 */
function redirectToIndex() {
  window.location.replace('./index.html');
}
