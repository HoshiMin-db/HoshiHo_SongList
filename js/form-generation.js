/**
 * 按日期分組項目
 * @param {Array} data - 要分組的數據
 * @returns {Object} - 分組後的數據
 */
function groupByDate(data) {
  const grouped = {};
  data.forEach(item => {
    const date = item.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(item);
  });
  return grouped;
}

/**
 * 按標題首字母分組項目
 * @param {Array} items - 要分組的項目
 * @returns {Object} - 分組後的項目
 */
function groupByFirstLetter(items) {
  const grouped = {};
  items.forEach(item => {
    const firstLetter = item.title.charAt(0).toUpperCase();
    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }
    grouped[firstLetter].push(item);
  });
  return grouped;
}

/**
 * 創建日期標題元素
 * @param {string} date - 日期字符串
 * @param {boolean} isExpanded - 初始展開狀態
 * @returns {HTMLElement} - 日期標題元素
 */
function createDateHeader(date, isExpanded = true) {
  const header = document.createElement('div');
  header.className = 'date-header';
  header.innerHTML = `
    ${date}
    <button class="expand-btn">${isExpanded ? '▼' : '▶'}</button>
  `;
  
  header.querySelector('.expand-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const content = header.nextElementSibling;
    content.classList.toggle('collapsed');
    e.target.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
  });
  
  return header;
}

/**
 * 創建字母標題元素
 * @param {string} letter - 字母
 * @param {boolean} isExpanded - 初始展開狀態
 * @returns {HTMLElement} - 字母標題元素
 */
function createLetterHeader(letter, isExpanded = true) {
  const header = document.createElement('div');
  header.className = 'letter-header';
  header.innerHTML = `
    ${letter}
    <button class="expand-btn">${isExpanded ? '▼' : '▶'}</button>
  `;
  
  header.querySelector('.expand-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const content = header.nextElementSibling;
    content.classList.toggle('collapsed');
    e.target.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
  });
  
  return header;
}

/**
 * 生成帶有分組數據的表單
 * @param {Array} data - 要顯示的數據
 */
function generateForm(data) {
  const container = document.getElementById('form-container');
  container.innerHTML = '';

  const letterGroups = groupByFirstLetter(data);
  
  Object.entries(letterGroups).forEach(([letter, items]) => {
    const letterGroup = document.createElement('div');
    letterGroup.className = 'letter-group';
    
    letterGroup.appendChild(createLetterHeader(letter));
    
    const letterContent = document.createElement('div');
    letterContent.className = 'letter-content';
    
    items.forEach(item => {
      const formItem = createFormItem(item);
      letterContent.appendChild(formItem);
    });
    
    letterGroup.appendChild(letterContent);
    container.appendChild(letterGroup);
  });
}

/**
 * 創建表單項目元素
 * @param {Object} item - 數據項目
 * @returns {HTMLElement} - 表單項目元素
 */
function createFormItem(item) {
  const formItem = document.createElement('div');
  formItem.className = 'form-item';

  // 曲名欄
  const titleCell = document.createElement('div');
  titleCell.className = 'title-cell';
  titleCell.textContent = item.title;
  formItem.appendChild(titleCell);

  // 歌手欄
  const artistCell = document.createElement('div');
  artistCell.className = 'artist-cell';
  artistCell.textContent = item.artist;
  formItem.appendChild(artistCell);

  // 出典欄
  const sourceCell = document.createElement('div');
  sourceCell.className = 'source-cell';
  sourceCell.textContent = item.source;
  formItem.appendChild(sourceCell);

  // 日期欄
  const dateCell = document.createElement('div');
  dateCell.className = 'date-cell';
  const dates = item.dates.slice(0, 3).join(', ');
  dateCell.innerHTML = `
    ${dates} <button class="more-dates-btn">...</button>
  `;
  // 更多日期按鈕事件
  dateCell.querySelector('.more-dates-btn').addEventListener('click', () => {
    alert(`所有日期: ${item.dates.join(', ')}`);
  });
  formItem.appendChild(dateCell);

  return formItem;
}

export { generateForm };
