// form-generation.js

// 防抖函數，用於限制函數的觸發頻率
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 引用 youtube-player.js 中的功能
document.addEventListener("DOMContentLoaded", function() {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});

// 字符串規範化函數，用於處理不同的字符串格式
import { convert_jp } from './romaji.js';

// 增加輸入驗證和清理函數
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    // 使用正則表達式反覆替換直到所有不安全字符被移除
    let sanitizedInput = input;
    const unsafePatterns = /[<>&'"]|<[^>]*>|[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;

    while (unsafePatterns.test(sanitizedInput)) {
        sanitizedInput = sanitizedInput.replace(unsafePatterns, '');
    }

    return sanitizedInput;
}

// 改善 normalizeString 函數
function normalizeString(str) {
    if (!str) return '';

    // 先進行安全性清理
    str = sanitizeInput(str);

    // 再進行原有的轉換
    str = convert_jp(str);

    return str.normalize('NFKC')
             .replace(/[~\u301c\uff5e]/g, '~')
             .replace(/，/g, ',')
             .replace(/。/g, '.')
             .replace(/['']/g, "'")
             .replace(/…/g, '...')
             .replace(/\s+/g, '')
             .toLowerCase();
}

// 提取生成日期儲存格的公共邏輯
function createDateCell(row, newRow) {
    const dateCell = newRow.insertCell();
    const link = document.createElement('a');
    const date = row.date;
    const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
    link.href = row.link;
    link.textContent = formattedDate;
    link.target = '_blank';

    // 點擊行爲檢查有效性
    link.onclick = function(event) {
        event.preventDefault();
        if (isValidYouTubeURL(link.href)) {
            openFloatingPlayer(link.href);
        } else {
            console.error('Invalid URL:', link.href);
        }
    };

    dateCell.appendChild(link);

    // 添加會員限定標識
    if (row.is_member_exclusive) {
        const lockIcon = document.createElement('span');
        lockIcon.classList.add('lock-icon');
        lockIcon.textContent = '🔒';
        dateCell.appendChild(lockIcon);
    }

    // 添加清唱標識
    if (row.is_acapella) {
        dateCell.classList.add('acapella');
    }

    // 添加私人影片標識
    if (row.is_private) {
        const privateIcon = document.createElement('span');
        privateIcon.classList.add('private-icon');
        privateIcon.textContent = '🚫';
        dateCell.appendChild(privateIcon);
    }

    return dateCell;
}

// 創建表格行
function createTableRow(item, numDates) {
    const newRow = document.createElement('tr');

    const initialCell = newRow.insertCell();
    initialCell.textContent = item.az || item.song_name.charAt(0).toUpperCase();

    const songNameCell = newRow.insertCell();
    songNameCell.textContent = item.song_name;

    if (item.is_copyright) {
        songNameCell.style.color = 'red';
    }

    newRow.insertCell().textContent = item.artist;
    newRow.insertCell().textContent = item.source || '';

    // 生成日期欄位
    const dateCount = Math.min(numDates, item.dates.length);
    for (let i = 0; i < dateCount; i++) {
        createDateCell(item.dates[i], newRow);
    }

    // 補充空白儲存格
    for (let i = dateCount; i < numDates; i++) {
        newRow.insertCell();
    }

    // 添加更多按鈕
    if (item.dates.length > numDates) {
        const moreButtonCell = newRow.insertCell();
        const moreButton = document.createElement('button');
        moreButton.textContent = '...';
        moreButton.className = 'more-button';
        moreButton.onclick = () => {
            const isExpanded = moreButton.getAttribute('data-expanded') === 'true';

            if (isExpanded) {
                const toRemove = newRow.querySelectorAll('.extra-date');
                toRemove.forEach(el => el.remove());
                moreButton.setAttribute('data-expanded', 'false');
            } else {
                item.dates.slice(numDates).forEach(row => {
                    const dateCell = createDateCell(row, newRow); // 使用公共邏輯
                    dateCell.classList.add('date-cell', 'extra-date');
                });
                moreButton.setAttribute('data-expanded', 'true');
            }
        };
        moreButtonCell.appendChild(moreButton);
    } else {
        newRow.insertCell();
    }

    return newRow;
}

// 檢查 URL 是否為有效的 YouTube 網域
function isValidYouTubeURL(url) {
    try {
        const parsedURL = new URL(url);
        // 允許的 YouTube 網域清單
        const allowedDomains = ['www.youtube.com', 'youtu.be'];
        return allowedDomains.includes(parsedURL.hostname);
    } catch (e) {
        return false;
    }
}

// 載入表格數據
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const songCountElement = document.getElementById('songCount');
    let allData = [];

    async function fetchData() {
        try {
            const response = await fetch('data.json', { cache: 'no-cache' });
            const data = await response.json();
            allData = data;
            displayData(allData);
            if (songCountElement) {
                songCountElement.textContent = allData.length;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function displayData(data, numDates = 3) {
        songTableBody.innerHTML = '';
        data.forEach(item => {
            const newRow = createTableRow(item, numDates);
            songTableBody.appendChild(newRow);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = normalizeString(e.target.value.toLowerCase());
            const filteredData = allData.filter(row =>
                normalizeString(row.song_name).includes(query) ||
                normalizeString(row.artist).includes(query) ||
                normalizeString(row.source).includes(query)
            );
            displayData(filteredData);
        }, 800));
    } else {
        console.error("searchInput element not found");
    }

    fetchData();
});
