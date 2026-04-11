const sbtiData = window.MEDITATION_PLANET_SBTI;
const antidoteData = window.SBTI_ANTIDOTE_DATA?.prescriptions || {};

const dimensionMeta = sbtiData.dimensionMeta;
const dimensionOrder = sbtiData.dimensionOrder;
const questions = sbtiData.questions.map(normalizeQuestion);
const specialQuestions = sbtiData.specialQuestions.map(normalizeQuestion);
const regularTypes = sbtiData.regularTypes.map(normalizeType);
const specialTypes = Object.fromEntries(
  Object.entries(sbtiData.specialTypes).map(([code, type]) => [code, normalizeType(type)])
);

const state = {
  questions: [...questions, specialQuestions[0]],
  index: 0,
  answers: {},
  result: null
};

let autoAdvanceTimer = null;

const screens = {
  intro: document.getElementById('introScreen'),
  test: document.getElementById('testScreen'),
  result: document.getElementById('resultScreen')
};

const topbar = document.getElementById('topbar');
const resetTopBtn = document.getElementById('resetTopBtn');
const startBtn = document.getElementById('startBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const restartBtn = document.getElementById('restartBtn');
const copyBtn = document.getElementById('copyBtn');
const antidoteBtn = document.getElementById('antidoteBtn');

document.title = sbtiData.siteTitle;

startBtn.addEventListener('click', startTest);
prevBtn.addEventListener('click', previousQuestion);
nextBtn.addEventListener('click', nextQuestion);
submitBtn.addEventListener('click', submitTest);
restartBtn.addEventListener('click', startTest);
resetTopBtn.addEventListener('click', startTest);
copyBtn.addEventListener('click', copyResult);
antidoteBtn.addEventListener('click', () => {
  const typeCode = state.result?.finalType.code || 'HHHH';
  window.location.href = `./personality-antidote.html?type=${encodeURIComponent(typeCode)}`;
});

function normalizeQuestion(question) {
  return {
    ...question,
    options: question.options.map((option) => ({ ...option }))
  };
}

function normalizeType(type) {
  return {
    ...type,
    rawName: type.name,
    displayName: type.name
  };
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle('hidden', key !== name));
  topbar.classList.toggle('hidden', name === 'test');
  resetTopBtn.classList.toggle('hidden', name === 'intro');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startTest() {
  clearAutoAdvance();
  state.questions = [...questions, specialQuestions[0]];
  state.index = 0;
  state.answers = {};
  state.result = null;
  showScreen('test');
  renderQuestion();
}

function getVisibleQuestions() {
  const visible = [...state.questions];
  const gateIndex = visible.findIndex((question) => question.id === 'drink_gate_q1');
  const hasSecondDrinkQuestion = visible.some((question) => question.id === 'drink_gate_q2');
  if (gateIndex !== -1 && state.answers.drink_gate_q1 === 'C' && !hasSecondDrinkQuestion) {
    visible.splice(gateIndex + 1, 0, specialQuestions[1]);
  }
  return visible;
}

function renderQuestion() {
  state.questions = getVisibleQuestions();
  if (state.index >= state.questions.length) state.index = state.questions.length - 1;

  const question = state.questions[state.index];
  const total = state.questions.length;
  const answeredCount = state.questions.filter((item) => state.answers[item.id]).length;
  const questionMeta = question.special
    ? `隐藏题 · ${state.index + 1} / ${total}`
    : `${dimensionMeta[question.dim].model} · ${dimensionMeta[question.dim].name}`;

  document.getElementById('questionMeta').textContent = questionMeta;
  document.getElementById('questionTitle').textContent = question.text;
  document.getElementById('progressText').textContent = `${answeredCount} / ${total}`;
  document.getElementById('progressBar').style.width = `${(answeredCount / total) * 100}%`;

  prevBtn.disabled = state.index === 0;
  nextBtn.disabled = !state.answers[question.id];
  nextBtn.classList.toggle('hidden', state.index === total - 1);
  submitBtn.classList.toggle('hidden', state.index !== total - 1);
  submitBtn.disabled = answeredCount !== total;

  const form = document.getElementById('questionForm');
  form.innerHTML = '';
  question.options.forEach((option) => {
    const id = `${question.id}-${option.code}`;
    const label = document.createElement('label');
    label.className = 'option-row';
    label.setAttribute('for', id);
    label.innerHTML = `
      <input id="${id}" type="radio" name="${question.id}" value="${option.code}" ${state.answers[question.id] === option.code ? 'checked' : ''} />
      <span class="option-label"><span class="option-code">${option.code}</span>${escapeHtml(option.label)}</span>
    `;
    form.appendChild(label);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', (event) => {
      state.answers[question.id] = event.target.value;
      if (question.id === 'drink_gate_q1' && event.target.value !== 'C') {
        delete state.answers.drink_gate_q2;
      }
      renderQuestion();
      scheduleAutoAdvance(question.id);
    });
  });
}

function clearAutoAdvance() {
  if (!autoAdvanceTimer) return;
  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = null;
}

function scheduleAutoAdvance(questionId) {
  clearAutoAdvance();
  if (state.index >= state.questions.length - 1) return;

  autoAdvanceTimer = setTimeout(() => {
    autoAdvanceTimer = null;
    const currentQuestion = state.questions[state.index];
    if (currentQuestion?.id !== questionId || !state.answers[questionId]) return;
    nextQuestion({ fromAuto: true });
  }, 500);
}

function previousQuestion() {
  clearAutoAdvance();
  state.index = Math.max(0, state.index - 1);
  renderQuestion();
}

function nextQuestion(options = {}) {
  if (!options.fromAuto) clearAutoAdvance();
  if (!state.answers[state.questions[state.index].id]) return;
  state.index = Math.min(state.questions.length - 1, state.index + 1);
  renderQuestion();
}

function submitTest() {
  clearAutoAdvance();
  const visible = getVisibleQuestions();
  const complete = visible.every((question) => state.answers[question.id]);
  if (!complete) return;

  state.result = computeResult();
  renderResult(state.result);
  showScreen('result');
}

function computeResult() {
  const rawScores = Object.fromEntries(dimensionOrder.map((dimension) => [dimension, 0]));
  questions.forEach((question) => {
    const code = state.answers[question.id];
    const option = question.options.find((item) => item.code === code);
    rawScores[question.dim] += option ? option.value : 0;
  });

  const levels = Object.fromEntries(dimensionOrder.map((dimension) => [dimension, sumToLevel(rawScores[dimension])]));
  const userVector = dimensionOrder.map((dimension) => levelNum(levels[dimension]));
  const ranked = regularTypes
    .map((type) => {
      const vector = type.pattern.replaceAll('-', '').split('').map(levelNum);
      let distance = 0;
      let exact = 0;
      vector.forEach((value, index) => {
        const diff = Math.abs(userVector[index] - value);
        distance += diff;
        if (diff === 0) exact += 1;
      });
      const similarity = Math.max(
        0,
        Math.round((1 - distance / sbtiData.dimensionMaxDistance) * 100)
      );
      return { ...type, distance, exact, similarity };
    })
    .sort((a, b) => a.distance - b.distance || b.exact - a.exact || b.similarity - a.similarity);

  let finalType = ranked[0];
  let mode = '你的主类型';
  let badge = `匹配度 ${finalType.similarity}%`;

  if (state.answers.drink_gate_q1 === 'C' && state.answers.drink_gate_q2 === 'B') {
    finalType = { ...specialTypes.DRUNK, similarity: 100, exact: 15 };
    mode = '隐藏人格已激活';
    badge = '隐藏结果已激活';
  } else if (ranked[0].similarity < sbtiData.fallbackThreshold) {
    finalType = { ...specialTypes.HHHH, similarity: ranked[0].similarity, exact: ranked[0].exact };
    mode = '系统强制兜底';
    badge = `最高匹配 ${ranked[0].similarity}%`;
  }

  return { rawScores, levels, ranked, finalType, mode, badge };
}

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function getPrescription(code) {
  return antidoteData[code] || antidoteData.HHHH || null;
}

function renderResult(result) {
  const type = result.finalType;
  const prescription = getPrescription(type.code);

  document.getElementById('resultKicker').textContent = result.mode;
  document.getElementById('resultName').textContent = `${type.code}（${type.displayName}）`;
  document.getElementById('matchBadge').textContent = result.badge;
  document.getElementById('resultIntro').textContent = type.intro;
  document.getElementById('resultDesc').textContent = type.desc;
  document.getElementById('antidoteTitle').textContent = prescription?.prescriptionName || '人格解药';
  document.getElementById('antidoteSubtitle').textContent = prescription?.status || '从一条适合现在状态的练习开始。';

  const safetyNote = document.getElementById('safetyNote');
  safetyNote.classList.toggle('hidden', !type.sensitive);
  safetyNote.textContent = type.sensitive
    ? '提示：这个结果只用于娱乐和练习推荐，不是心理诊断。若你正处在强烈痛苦、失控或危险状态，请优先联系可信任的人或专业支持。'
    : '';
}

async function copyResult() {
  if (!state.result) return;
  const type = state.result.finalType;
  const text = `我的 冥想星球·MBTI 人格解药结果：${type.code}（${type.displayName}）｜${type.intro}`;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '已复制';
    setTimeout(() => {
      copyBtn.textContent = '复制结果';
    }, 1400);
  } catch {
    alert(text);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
