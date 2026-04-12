/**
 * 冥想星球 SBTI 测评页脚本
 *
 * 负责：
 * - 展示首页与答题页
 * - 收集用户答案并计算结果
 * - 写入结果快照并跳转结果页
 */
const RESULT_STORAGE_KEY = 'meditation-planet-sbti-result';
const RESULT_SNAPSHOT_VERSION = 1;
const sbtiData = window.MEDITATION_PLANET_SBTI;
const dimensionMeta = sbtiData.dimensionMeta;
const dimensionOrder = sbtiData.dimensionOrder;
const questions = sbtiData.questions.map(normalizeQuestion);
const regularTypes = sbtiData.regularTypes.map(normalizeType);
const specialTypes = Object.fromEntries(
  Object.entries(sbtiData.specialTypes).map(([code, type]) => [code, normalizeType(type)])
);
const state = {
  questions: [...questions],
  index: 0,
  answers: {}
};

let autoAdvanceTimer = null;

const screens = {
  intro: document.getElementById('introScreen'),
  test: document.getElementById('testScreen')
};
const startBtn = document.getElementById('startBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

document.title = sbtiData.siteTitle;

startBtn.addEventListener('click', startTest);
prevBtn.addEventListener('click', previousQuestion);
nextBtn.addEventListener('click', nextQuestion);
submitBtn.addEventListener('click', submitTest);

/**
 * 标准化题目选项，避免运行时修改源数据。
 * @param {object} question 原始题目
 * @returns {object} 标准化后的题目
 */
function normalizeQuestion(question) {
  return {
    ...question,
    options: question.options.map((option) => ({ ...option }))
  };
}

/**
 * 标准化人格结构，补齐结果展示字段。
 * @param {object} type 原始人格
 * @returns {object} 标准化后的人格
 */
function normalizeType(type) {
  return {
    ...type,
    rawName: type.name,
    displayName: type.name
  };
}

/**
 * 切换当前显示页面。
 * @param {'intro' | 'test'} name 页面标识
 */
function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.classList.toggle('hidden', key !== name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 重新开始测评并清理旧结果快照。
 */
function startTest() {
  clearAutoAdvance();
  clearResultSnapshot();
  state.questions = [...questions];
  state.index = 0;
  state.answers = {};
  showScreen('test');
  renderQuestion();
}

/**
 * 渲染当前题目和进度状态。
 */
function renderQuestion() {
  if (state.index >= state.questions.length) {
    state.index = state.questions.length - 1;
  }

  const currentQuestion = state.questions[state.index];
  const answeredCount = getAnsweredCount();
  const total = state.questions.length;
  const form = document.getElementById('questionForm');

  updateQuestionHead(currentQuestion, answeredCount, total);
  updateQuestionActions(currentQuestion.id, answeredCount, total);
  form.innerHTML = buildQuestionOptions(currentQuestion);
  bindQuestionOptions(form, currentQuestion.id);
}

/**
 * 更新题干与进度显示。
 * @param {object} question 当前题目
 * @param {number} answeredCount 已答数量
 * @param {number} total 题目总数
 */
function updateQuestionHead(question, answeredCount, total) {
  const questionMeta = `${dimensionMeta[question.dim].model}`;
  document.getElementById('questionMeta').textContent = questionMeta;
  document.getElementById('questionTitle').textContent = question.text;
  document.getElementById('progressText').textContent = `${answeredCount} / ${total}`;
  document.getElementById('progressBar').style.width = `${(answeredCount / total) * 100}%`;
}

/**
 * 更新题目操作按钮状态。
 * @param {string} questionId 当前题目ID
 * @param {number} answeredCount 已答数量
 * @param {number} total 题目总数
 */
function updateQuestionActions(questionId, answeredCount, total) {
  prevBtn.disabled = state.index === 0;
  nextBtn.disabled = !state.answers[questionId];
  nextBtn.classList.toggle('hidden', state.index === total - 1);
  submitBtn.classList.toggle('hidden', state.index !== total - 1);
  submitBtn.disabled = answeredCount !== total;
}

/**
 * 生成当前题目的选项列表。
 * @param {object} question 当前题目
 * @returns {string} 选项HTML
 */
function buildQuestionOptions(question) {
  return question.options.map((option) => buildQuestionOption(question.id, option)).join('');
}

/**
 * 生成单个选项HTML。
 * @param {string} questionId 题目ID
 * @param {object} option 题目选项
 * @returns {string} 选项HTML
 */
function buildQuestionOption(questionId, option) {
  const optionId = `${questionId}-${option.code}`;
  const isSelected = state.answers[questionId] === option.code;
  const optionClassName = isSelected ? 'option selected' : 'option';
  const checkedAttr = isSelected ? 'checked' : '';

  return `
    <label class="${optionClassName}" for="${optionId}">
      <input id="${optionId}" type="radio" name="${questionId}" value="${option.code}" ${checkedAttr} />
      <span class="option-label"><span class="option-code">${option.code}</span>${escapeHtml(option.label)}</span>
    </label>
  `;
}

/**
 * 绑定选项点击事件。
 * @param {HTMLFormElement} form 选项表单
 * @param {string} questionId 当前题目ID
 */
function bindQuestionOptions(form, questionId) {
  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', (event) => {
      state.answers[questionId] = event.target.value;
      renderQuestion();
      scheduleAutoAdvance(questionId);
    });
  });
}

/**
 * 获取已答题数量。
 * @returns {number} 已答数量
 */
function getAnsweredCount() {
  return state.questions.filter((question) => state.answers[question.id]).length;
}

/**
 * 清理自动跳题计时器。
 */
function clearAutoAdvance() {
  if (!autoAdvanceTimer) {
    return;
  }

  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = null;
}

/**
 * 设置自动跳题。
 * @param {string} questionId 当前题目ID
 */
function scheduleAutoAdvance(questionId) {
  clearAutoAdvance();
  if (state.index >= state.questions.length - 1) {
    return;
  }

  autoAdvanceTimer = setTimeout(() => {
    autoAdvanceTimer = null;
    const currentQuestion = state.questions[state.index];
    if (currentQuestion?.id !== questionId || !state.answers[questionId]) {
      return;
    }
    nextQuestion({ fromAuto: true });
  }, 500);
}

/**
 * 返回上一题。
 */
function previousQuestion() {
  clearAutoAdvance();
  state.index = Math.max(0, state.index - 1);
  renderQuestion();
}

/**
 * 进入下一题。
 * @param {{ fromAuto?: boolean }} [options] 触发来源
 */
function nextQuestion(options = {}) {
  if (!options.fromAuto) {
    clearAutoAdvance();
  }
  if (!state.answers[state.questions[state.index].id]) {
    return;
  }

  state.index = Math.min(state.questions.length - 1, state.index + 1);
  renderQuestion();
}

/**
 * 提交测评并跳转结果页。
 */
function submitTest() {
  clearAutoAdvance();
  if (!isQuestionnaireComplete()) {
    return;
  }

  const result = computeResult();
  saveResultSnapshot(result);
  window.location.href = './result.html';
}

/**
 * 判断题目是否全部完成。
 * @returns {boolean} 是否全部完成
 */
function isQuestionnaireComplete() {
  return state.questions.every((question) => state.answers[question.id]);
}

/**
 * 计算测评结果。
 * @returns {object} 结果快照源数据
 */
function computeResult() {
  const rawScores = buildRawScores();
  const levels = buildLevels(rawScores);
  const rankedTypes = rankTypesByDistance(levels);
  const bestType = rankedTypes[0];

  if (bestType.similarity < sbtiData.fallbackThreshold) {
    return buildFallbackResult(bestType, levels);
  }

  return {
    finalType: bestType,
    mode: '你的当前人格',
    badge: `匹配度 ${bestType.similarity}%`,
    levels
  };
}

/**
 * 统计每个维度的原始分数。
 * @returns {Record<string, number>} 维度分数
 */
function buildRawScores() {
  const rawScores = Object.fromEntries(dimensionOrder.map((dimension) => [dimension, 0]));

  questions.forEach((question) => {
    const answerCode = state.answers[question.id];
    const selectedOption = question.options.find((option) => option.code === answerCode);
    rawScores[question.dim] += selectedOption ? selectedOption.value : 0;
  });

  return rawScores;
}

/**
 * 将维度分数转换为档位。
 * @param {Record<string, number>} rawScores 维度分数
 * @returns {Record<string, 'L' | 'M' | 'H'>} 维度档位
 */
function buildLevels(rawScores) {
  return Object.fromEntries(
    dimensionOrder.map((dimension) => [dimension, sumToLevel(rawScores[dimension])])
  );
}

/**
 * 对所有人格进行距离排序。
 * @param {Record<string, 'L' | 'M' | 'H'>} levels 用户档位
 * @returns {Array<object>} 排序后的人格列表
 */
function rankTypesByDistance(levels) {
  const userVector = dimensionOrder.map((dimension) => levelNum(levels[dimension]));

  return regularTypes
    .map((type) => buildRankedType(type, userVector))
    .sort((left, right) => {
      return left.distance - right.distance || right.exact - left.exact || right.similarity - left.similarity;
    });
}

/**
 * 计算单个人格的匹配结果。
 * @param {object} type 人格定义
 * @param {number[]} userVector 用户档位向量
 * @returns {object} 带匹配信息的人格
 */
function buildRankedType(type, userVector) {
  const typeVector = type.pattern.replaceAll('-', '').split('').map(levelNum);
  let distance = 0;
  let exact = 0;

  typeVector.forEach((value, index) => {
    const diff = Math.abs(userVector[index] - value);
    distance += diff;
    if (diff === 0) {
      exact += 1;
    }
  });

  const similarity = Math.max(0, Math.round((1 - distance / sbtiData.dimensionMaxDistance) * 100));
  return { ...type, distance, exact, similarity };
}

/**
 * 构造兜底人格结果。
 * @param {object} bestType 当前最高匹配人格
 * @param {Record<string, 'L' | 'M' | 'H'>} levels 用户档位
 * @returns {object} 兜底结果
 */
function buildFallbackResult(bestType, levels) {
  return {
    finalType: {
      ...specialTypes.HHHH,
      similarity: bestType.similarity,
      exact: bestType.exact
    },
    mode: '系统强制兜底',
    badge: `最高匹配 ${bestType.similarity}%`,
    levels
  };
}

/**
 * 保存结果快照，供结果页读取。
 * @param {object} result 测评结果
 */
function saveResultSnapshot(result) {
  const resultSnapshot = {
    version: RESULT_SNAPSHOT_VERSION,
    createdAt: Date.now(),
    finalType: result.finalType,
    mode: result.mode,
    badge: result.badge,
    levels: result.levels
  };

  sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(resultSnapshot));
}

/**
 * 清理旧结果快照，避免重复测试串结果。
 */
function clearResultSnapshot() {
  sessionStorage.removeItem(RESULT_STORAGE_KEY);
}

/**
 * 将分数映射为档位。
 * @param {number} score 维度分数
 * @returns {'L' | 'M' | 'H'} 维度档位
 */
function sumToLevel(score) {
  if (score <= 3) {
    return 'L';
  }
  if (score === 4) {
    return 'M';
  }
  return 'H';
}

/**
 * 将档位映射为数值，用于距离计算。
 * @param {'L' | 'M' | 'H'} level 维度档位
 * @returns {number} 档位数值
 */
function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

/**
 * 转义文本，防止选项内容插入HTML。
 * @param {string} text 原始文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
