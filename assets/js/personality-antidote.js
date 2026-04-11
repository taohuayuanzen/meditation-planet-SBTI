const sbtiData = window.MEDITATION_PLANET_SBTI;
const typeMap = buildTypeMap(sbtiData);
const prescriptions = window.SBTI_ANTIDOTE_DATA?.prescriptions || {};
const params = new URLSearchParams(window.location.search);
const requestedType = params.get('type') || 'HHHH';

const prescription = prescriptions[requestedType] || prescriptions.HHHH || {
  code: requestedType,
  displayName: '未知人格',
  prescriptionName: '临时药方',
  direction: '基础稳定',
  status: '没有找到对应药方，先从一条基础呼吸练习开始。',
  sensitive: false,
  practices: []
};

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
  const practices = prescriptionItem.practices || [];
  const firstPractice = practices[0];
  const typeName = typeItem?.name || prescriptionItem.displayName || prescriptionItem.code;
  const typeIntro = typeItem?.intro || '';

  document.title = `${sbtiData.resultPageTitle}｜${prescriptionItem.code}`;
  document.getElementById('pageTitle').textContent = sbtiData.resultPageTitle;
  document.getElementById('prescriptionTitle').textContent = `${prescriptionItem.code}（${typeName}）`;
  document.getElementById('prescriptionName').textContent = prescriptionItem.prescriptionName || '临时药方';
  document.getElementById('prescriptionStatus').textContent =
    prescriptionItem.status || '先从身体能接住的一小步开始。';
  document.getElementById('prescriptionDirection').textContent = prescriptionItem.direction
    ? `调理方向：${prescriptionItem.direction}`
    : '调理方向：从一条可完成的练习开始。';

  const introNode = document.getElementById('prescriptionIntro');
  introNode.classList.toggle('hidden', !typeIntro);
  introNode.textContent = typeIntro;

  const sensitive = Boolean(typeItem?.sensitive || prescriptionItem.sensitive);
  document.getElementById('sensitiveNote').classList.toggle('hidden', !sensitive);
  document.getElementById('practiceCount').textContent = `${practices.length} 条`;

  document.getElementById('featuredPractices').innerHTML = practices
    .slice(0, 3)
    .map(renderFeaturedPractice)
    .join('');

  document.getElementById('practiceList').innerHTML = practices.map(renderPractice).join('');

  const firstPracticeLink = document.getElementById('firstPracticeLink');
  if (firstPractice?.url) {
    firstPracticeLink.href = firstPractice.url;
    firstPracticeLink.target = '_blank';
    firstPracticeLink.rel = 'noopener noreferrer';
  } else {
    firstPracticeLink.href = './index.html';
    firstPracticeLink.removeAttribute('target');
    firstPracticeLink.removeAttribute('rel');
  }
}

function renderFeaturedPractice(practice) {
  return `
    <a class="card practice-card practice-card--featured" href="${escapeHtml(practice.url)}" target="_blank" rel="noopener noreferrer">
      <span class="practice-order">${practice.priority}</span>
      <span class="practice-copy">
        <strong>${escapeHtml(practice.title)}</strong>
        <em>${escapeHtml(practice.reason)}</em>
      </span>
    </a>
  `;
}

function renderPractice(practice) {
  return `
    <article class="card practice-card practice-card--detail">
      <div class="practice-title-row">
        <span class="practice-order">${practice.priority}</span>
        <h4>${escapeHtml(practice.title)}</h4>
        <span class="practice-duration">${escapeHtml(practice.duration)}</span>
      </div>
      <p>${escapeHtml(practice.reason)}</p>
      <div class="practice-foot">
        <span>${escapeHtml(practice.tags || '未分类')}</span>
        <a href="${escapeHtml(practice.url)}" target="_blank" rel="noopener noreferrer">开始练习</a>
      </div>
    </article>
  `;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
