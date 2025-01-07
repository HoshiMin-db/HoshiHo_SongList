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
  
  const dateGroups = groupByDate(data);
  
  Object.entries(dateGroups).forEach(([date, items]) => {
    const dateGroup = document.createElement('div');
    dateGroup.className = 'date-group';
    
    dateGroup.appendChild(createDateHeader(date));
    
    const dateContent = document.createElement('div');
    dateContent.className = 'date-content';
    
    const letterGroups = groupByFirstLetter(items);
    
    Object.entries(letterGroups).forEach(([letter, letterItems]) => {
      const letterGroup = document.createElement('div');
      letterGroup.className = 'letter-group';
      
      letterGroup.appendChild(createLetterHeader(letter));
      
      const letterContent = document.createElement('div');
      letterContent.className = 'letter-content';
      
      letterItems.forEach(item => {
        const formItem = createFormItem(item);
        letterContent.appendChild(formItem);
      });
      
      letterGroup.appendChild(letterContent);
      dateContent.appendChild(letterGroup);
    });
    
    dateGroup.appendChild(dateContent);
    container.appendChild(dateGroup);
  });
}

/**
 * 創建表單項目元素
 * @param {Object} item - 數據項目
 * @returns {HTMLElement} - 表單項目元素
 */
function createFormItem(item) {
  const formItem = document.createElement('div');
  // 在這裡添加你的表單元素
  formItem.textContent = `${item.title} - ${item.artist} (${item.date})`;
  return formItem;
}

export { generateForm };
