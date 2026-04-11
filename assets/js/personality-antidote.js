/**
 * 人生解药处方单页面
 *
 * 负责：
 * - 读取人格与处方数据
 * - 生成处方单文案
 * - 渲染前 8 条练习
 */
const sbtiData = window.MEDITATION_PLANET_SBTI;
const typeMap = buildTypeMap(sbtiData);
const prescriptions = window.SBTI_ANTIDOTE_DATA?.prescriptions || {};
const params = new URLSearchParams(window.location.search);
const requestedType = params.get('type') || 'HHHH';
const fallbackPrescription = {
  code: requestedType,
  displayName: '未知人格',
  prescriptionName: '临时药方',
  direction: '基础稳定',
  status: '没有找到对应药方，先从一条基础呼吸练习开始。',
  sensitive: false,
  practices: []
};
const prescription = prescriptions[requestedType] || prescriptions.HHHH || fallbackPrescription;
const type = typeMap[requestedType] || typeMap.HHHH || null;

renderPrescription(type, prescription);

function buildTypeMap(data) {
  const map = {};
  data.regularTypes.forEach((item) => {
    map[item.code] = item;
  });
  Object.values(data.specialTypes).forEach((item) => {
    map[item.code] = item;
  });
  return map;
}

function renderPrescription(typeItem, prescriptionItem) {
  const visiblePractices = getVisiblePractices(prescriptionItem);
  const typeName = getTypeName(typeItem, prescriptionItem);
  const prescriptionDate = formatPrescriptionDate(new Date());

  updatePageHead(prescriptionItem, prescriptionDate);
  updateIdentitySection(prescriptionItem, typeName);
  updateSymptomSection(typeItem, prescriptionItem);
  updateInstructionSection(prescriptionItem);
  updatePracticeSection(visiblePractices);
  updateSignatureSection(visiblePractices, prescriptionDate);
  updateFirstPracticeLink(visiblePractices[0]);
}

function getVisiblePractices(prescriptionItem) {
  return (prescriptionItem.practices || []).slice(0, 8);
}

function getTypeName(typeItem, prescriptionItem) {
  return typeItem?.name || prescriptionItem.displayName || prescriptionItem.code;
}

function updatePageHead(prescriptionItem, prescriptionDate) {
  document.title = `人生解药处方单｜${prescriptionItem.code}`;
  document.getElementById('pageTitle').textContent = '人生解药处方单';
  document.getElementById('clinicSubtitle').textContent =
    `这是为 ${prescriptionItem.displayName || prescriptionItem.code} 准备的当下练习处方。`;
  document.getElementById('prescriptionDate').textContent = `开方日期：${prescriptionDate}`;
}

function updateIdentitySection(prescriptionItem, typeName) {
  document.getElementById('prescriptionCode').textContent = `SBTI-${prescriptionItem.code}`;
  document.getElementById('prescriptionTitle').textContent = `${prescriptionItem.code}（${typeName}）`;
  document.getElementById('prescriptionName').textContent =
    prescriptionItem.prescriptionName || '临时药方';
  document.getElementById('prescriptionDirection').textContent =
    prescriptionItem.direction || '从一条可完成的基础练习开始。';
  document.getElementById('prescriptionSummary').textContent =
    buildPrescriptionSummary(prescriptionItem);
}

function updateSymptomSection(typeItem, prescriptionItem) {
  const sensitive = Boolean(typeItem?.sensitive || prescriptionItem.sensitive);

  document.getElementById('symptomDescription').textContent =
    buildSymptomDescription(prescriptionItem);
  document.getElementById('sensitiveNote').classList.toggle('hidden', !sensitive);
}

function updateInstructionSection(prescriptionItem) {
  const instructionItems = buildInstructionItems(prescriptionItem);

  document.getElementById('instructionLead').textContent = buildInstructionLead(prescriptionItem);
  document.getElementById('instructionList').innerHTML = instructionItems
    .map((text) => renderInstructionItem(text))
    .join('');
}

function updatePracticeSection(practices) {
  const practiceCountText = `共 ${practices.length} 味`;
  const practiceLeadText = practices.length
    ? `按顺序执行前 ${practices.length} 条练习，先完成一味即可。`
    : '当前暂无可展示练习，请先返回测评。';
  const practiceMarkup = practices.length
    ? practices.map((practice, index) => renderPractice(practice, index)).join('')
    : renderEmptyPractice();

  document.getElementById('practiceCount').textContent = practiceCountText;
  document.getElementById('practiceLead').textContent = practiceLeadText;
  document.getElementById('practiceList').innerHTML = practiceMarkup;
}

function updateSignatureSection(practices, prescriptionDate) {
  const firstPractice = practices[0];
  const signatureText = firstPractice?.title
    ? `建议先从《${firstPractice.title}》开始，完成一味即可，不必一次做完整张处方。`
    : '今天先从一条基础练习开始，保持连续比一次做完更重要。';

  document.getElementById('signatureText').textContent = signatureText;
}

function buildPrescriptionSummary(prescriptionItem) {
  return `这是为 ${prescriptionItem.displayName || prescriptionItem.code} 准备的一张练习处方单。先按能完成的节奏开始，不需要一次做完整张处方。`;
}

function updateFirstPracticeLink(firstPractice) {
  const firstPracticeLink = document.getElementById('firstPracticeLink');

  if (firstPractice?.url) {
    firstPracticeLink.href = firstPractice.url;
    firstPracticeLink.target = '_blank';
    firstPracticeLink.rel = 'noopener noreferrer';
    return;
  }

  firstPracticeLink.href = './index.html';
  firstPracticeLink.removeAttribute('target');
  firstPracticeLink.removeAttribute('rel');
}

function buildSymptomDescription(prescriptionItem) {
  if (prescriptionItem.symptomDescription) {
    return prescriptionItem.symptomDescription;
  }

  const statusText = stripTrailingPunctuation(
    prescriptionItem.status || '当前节奏偏紧，注意力容易被外界牵着走'
  );
  const directionText = prescriptionItem.direction
    ? `适合先从${prescriptionItem.direction}开始调理。`
    : '适合先从一条可完成的基础练习开始调理。';

  return `${statusText}。${directionText}`;
}

function buildInstructionLead(prescriptionItem) {
  if (prescriptionItem.instructionLead) {
    return prescriptionItem.instructionLead;
  }

  const mainDirection = getPrimaryDirection(prescriptionItem.direction);
  return `这张处方单会先帮你把注意力带回${mainDirection}，再逐步稳定当前节奏。`;
}

function buildInstructionItems(prescriptionItem) {
  if (Array.isArray(prescriptionItem.instructionItems) && prescriptionItem.instructionItems.length) {
    return prescriptionItem.instructionItems.slice(0, 3);
  }

  const statusText = stripTrailingPunctuation(prescriptionItem.status || '先把身体和注意力接回来');
  const directions = splitDirectionText(prescriptionItem.direction);

  return [
    `优先处理：${statusText}。`,
    directions[0]
      ? `本次调理重点：${directions[0]}。`
      : '本次调理重点：先从一条能完成的基础练习开始。',
    '执行方式：按顺序练习，先完成一味即可，不需要一次做完整张处方。'
  ];
}

function getPrimaryDirection(directionText) {
  return splitDirectionText(directionText)[0] || '当下';
}

function splitDirectionText(directionText) {
  return String(directionText || '')
    .split(/[、，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderInstructionItem(text) {
  return `<li>${escapeHtml(text)}</li>`;
}

function renderPractice(practice, index) {
  const practiceOrder = String(practice.priority || index + 1).padStart(2, '0');
  const practiceDuration = formatPracticeDuration(practice);
  const practiceTag = practice.url ? 'a' : 'article';
  const practiceHref = practice.url
    ? ` href="${escapeHtml(practice.url)}" target="_blank" rel="noopener noreferrer"`
    : '';

  return `
    <${practiceTag} class="rx-item"${practiceHref}>
      <div class="rx-item-main">
        <div class="rx-item-head">
          <span class="rx-index">${practiceOrder}</span>
          <h4>${escapeHtml(practice.title)}</h4>
        </div>
        <p class="rx-usage">用法：${escapeHtml(practice.reason || '按顺序完成这一味练习。')}</p>
      </div>
      <p class="rx-dose">剂量：${escapeHtml(practiceDuration)}</p>
    </${practiceTag}>
  `;
}

function renderEmptyPractice() {
  return '<p class="sheet-paragraph">当前没有可展示的处方练习，请先返回测评页重新生成结果。</p>';
}

function formatPracticeDuration(practice) {
  const minutesFromSeconds = getMinutesFromSeconds(practice.seconds);

  if (minutesFromSeconds > 0) {
    return `${minutesFromSeconds}分钟`;
  }

  const minutesFromDuration = parseDurationMinutes(practice.duration);
  return minutesFromDuration > 0 ? `${minutesFromDuration}分钟` : practice.duration || '未标注';
}

function getMinutesFromSeconds(seconds) {
  const secondValue = Number(seconds);
  return Number.isFinite(secondValue) && secondValue > 0 ? Math.ceil(secondValue / 60) : 0;
}

function parseDurationMinutes(durationText) {
  const rawText = String(durationText || '').trim();

  if (!rawText) {
    return 0;
  }

  if (rawText.includes(':')) {
    const [minutesText, secondsText = '0'] = rawText.split(':');
    const totalSeconds = Number(minutesText) * 60 + Number(secondsText);
    return Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.ceil(totalSeconds / 60) : 0;
  }

  const minuteValue = Number.parseInt(rawText, 10);
  return Number.isFinite(minuteValue) ? minuteValue : 0;
}

function formatPrescriptionDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function stripTrailingPunctuation(text) {
  return String(text || '').trim().replace(/[。！？!?,，、；;：:]+$/u, '');
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
