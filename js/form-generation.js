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

function normalizeString(str) {
    if (!str) return ''; // 檢查空或未定義的字符串
    
    // 進行轉換
    str = convert_jp(str);
    
    return str.normalize('NFKC') // 將字符串規範化為 NFKC 形式
              .replace(/[~\u301c\uff5e]/g, '~') // 將全形和半形波浪號替換為半形波浪號
              .replace(/，/g, ',') // 將全形逗號替換為半形逗號
              .replace(/。/g, '.') // 將全形句號替換為半形句號
              .replace(/[‘’]/g, "'") // 將全形引號替換為半形引號
              .replace(/…/g, '...') // 將全形省略號替換為半形省略號
              .replace(/\s+/g, '') // 忽略所有空格
              .toLowerCase(); // 將字符串轉換為小寫形式
}

// 創建表格行
function createTableRow(item, numDates, songTableHead) {
    const newRow = document.createElement('tr');
    
    const initialCell = newRow.insertCell();
    initialCell.textContent = item.song_name.charAt(0).toUpperCase();
    
    const songNameCell = newRow.insertCell();
    songNameCell.textContent = item.song_name;

    // 檢查是否為版權標記歌曲
    if (item.is_copyright) {
        songNameCell.style.color = 'red';
    }
    
    newRow.insertCell().textContent = item.artist;
    newRow.insertCell().textContent = item.source || '';
    
    // 生成日期欄位
    const dateCount = Math.min(numDates, item.dates.length);
    
    // 先生成所有需要的日期欄位
    for (let i = 0; i < dateCount; i++) {
        const dateCell = newRow.insertCell();
        const row = item.dates[i];
        const link = document.createElement('a');
        const date = row.date;
        const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
        link.href = row.link;
        link.textContent = formattedDate;
        link.target = '_blank';
        link.onclick = function(event) {
            event.preventDefault();
            openFloatingPlayer(link.href);
        };
        dateCell.appendChild(link);

        if (row.is_member_exclusive) {
            const lockIcon = document.createElement('span');
            lockIcon.classList.add('lock-icon');
            lockIcon.textContent = '🔒';
            dateCell.appendChild(lockIcon);
        }
        if (row.is_acapella) {
            dateCell.classList.add('acapella');
        }
    }

    // 補充空白儲存格
    for (let i = dateCount; i < numDates; i++) {
        newRow.insertCell();
    }

    // 添加更多按鈕或空白儲存格
    if (item.dates.length > numDates) {
        const moreButtonCell = newRow.insertCell();
        const moreButton = document.createElement('button');
        moreButton.textContent = '...';
        moreButton.className = 'more-button';
        moreButton.onclick = () => {
            const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
            const dateHeaderCell = songTableHead.rows[0].cells[4];
            
            if (isExpanded) {
                const toRemove = newRow.querySelectorAll('.extra-date');
                toRemove.forEach(el => el.remove());
                moreButton.setAttribute('data-expanded', 'false');
                dateHeaderCell.colSpan = numDates + 1;
            } else {
                item.dates.slice(numDates).forEach(row => {
                    const dateCell = newRow.insertCell();
                    dateCell.classList.add('date-cell', 'extra-date');
                    
                    const link = document.createElement('a');
                    const date = row.date;
                    const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
                    link.href = row.link;
                    link.textContent = formattedDate;
                    link.target = '_blank';
                    link.onclick = function(event) {
                        event.preventDefault();
                        openFloatingPlayer(link.href);
                    };
                    dateCell.appendChild(link);
                    
                    if (row.is_member_exclusive) {
                        const lockIcon = document.createElement('span');
                        lockIcon.classList.add('lock-icon');
                        lockIcon.textContent = '🔒';
                        dateCell.appendChild(lockIcon);
                    }
                    if (row.is_acapella) {
                        dateCell.classList.add('acapella');
                    }
                });
                moreButton.setAttribute('data-expanded', 'true');
                dateHeaderCell.colSpan = item.dates.length + 1;
            }
        };
        moreButtonCell.appendChild(moreButton);
    } else {
        newRow.insertCell();
    }

    return newRow;
}

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    const songTableHead = document.getElementById('songTable').getElementsByTagName('thead')[0];
    let allData = [];
    const rowHeight = 40;  // 假設每行的高度為40像素

    // 優化的 fetchData 函數
    async function fetchData(callback) {
        try {
            const response = await fetch('data.json', { cache: 'no-cache' });
            const data = await response.json();
            // 在這裡排序所有數據
            allData = data.sort((a, b) => {
                const aText = normalizeString(a.song_name);
                const bText = normalizeString(b.song_name);
                return aText.localeCompare(bText, 'ja-JP');
            });
            callback(allData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function fetchAndDisplayData(query) {
        const filteredData = allData.filter(row =>
            normalizeString(row.song_name).includes(query) ||
            normalizeString(row.artist).includes(query) ||
            normalizeString(row.source).includes(query)
        );
        displayData(filteredData);
    }

    function displayData(data, numDates = 3) {
        const groupedData = data.reduce((acc, row) => {
            const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
            if (!acc[key]) {
                acc[key] = {
                    ...row,
                    dates: []
                };
            }
            const allDates = [...acc[key].dates, ...row.dates];
            acc[key].dates = allDates.sort((a, b) => {
                const dateA = new Date(a.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + a.time);
                const dateB = new Date(b.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + b.time);
                return dateB - dateA;
            });
            return acc;
        }, {});

        const tbody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';

        Object.entries(groupedData).forEach(([key, item]) => {
            const newRow = createTableRow(item, numDates, songTableHead);
            tbody.appendChild(newRow);
        });

        sortTable();
    }

    function sortTable() {
        const table = document.getElementById('songTable');
        const rows = Array.from(table.getElementsByTagName('tbody')[0].rows);
        
        rows.sort((a, b) => {
            const aText = a.cells[1].textContent;
            const bText = b.cells[1].textContent;
            return aText.localeCompare(bText, 'ja-JP');
        });

        rows.forEach(row => table.getElementsByTagName('tbody')[0].appendChild(row));
    }

    function onScroll() {
        const virtualScrollContainer = document.getElementById('virtualScrollContainer');
        
        // 計算可視區域的範圍
        const visibleRowCount = Math.floor(virtualScrollContainer.clientHeight / rowHeight);
        const startIdx = Math.floor(virtualScrollContainer.scrollTop / rowHeight);
        const endIdx = Math.min(startIdx + visibleRowCount, allData.length);
        
        // 清空當前顯示的內容
        const tbody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';
        
        // 渲染可視區域內的數據
        const visibleData = allData.slice(startIdx, endIdx);
        displayData(visibleData, 3);
    }

    // 頁面加載時顯示全部表單
    fetchData(() => {
        fetchAndDisplayData('');
        const virtualScrollContainer = document.getElementById('virtualScrollContainer');
        if (virtualScrollContainer) {
            onScroll(); // 初始化顯示可視區域數據
        }
    });
});
