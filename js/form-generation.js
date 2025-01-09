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

// 字符串規範化函數，用於處理不同的字符串格式
function normalizeString(str) {
    return str.normalize('NFKC') // 將字符串規範化為 NFKC 形式
              .replace(/[~\u301c\uff5e]/g, '~') // 將全形和半形波浪號替換為半形波浪號
              .replace(/，/g, ',') // 將全形逗號替換為半形逗號
              .replace(/。/g, '.') // 將全形句號替換為半形句號
              .replace(/[‘’]/g, "'") // 將全形引號替換為半形引號
              .replace(/…/g, '...') // 將全形省略號替換為半形省略號
              .toLowerCase(); // 將字符串轉換為小寫形式
}

// 根據歌曲名稱對表格進行排序
function sortTable(data) {
    return data.sort((a, b) => {
        return normalizeString(a.song_name).localeCompare(normalizeString(b.song_name), 'ja-JP');
    });
}

let allData = [];
let totalSongCount = 0;

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');

    // 確認元素是否存在
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = normalizeString(e.target.value.toLowerCase());
            fetchAndDisplayData(query);
        }, 300));
    } else {
        console.error("searchInput element not found");
    }

    // 頁面加載時顯示全部表單
    fetchData(() => fetchAndDisplayData(''));
});

// 從 data.json 獲取數據並進行處理
function fetchData(callback) {
    fetch('data.json', { cache: 'no-cache' })
        .then(response => response.json())
        .then(data => {
            allData = data;
            if (totalSongCount === 0) {
                const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                totalSongCount = uniqueSongs.size;
                document.getElementById('songCount').textContent = totalSongCount;
            }
            callback();
        });
}

// 根據查詢條件獲取並顯示數據
function fetchAndDisplayData(query, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    songTableBody.innerHTML = '';

    let filteredData;
    if (query === '') {
        filteredData = allData; // 顯示全部表單
    } else {
        filteredData = allData.filter(row =>
            normalizeString(row.song_name).includes(query) ||
            normalizeString(row.artist).includes(query) ||
            normalizeString(row.source).includes(query)
        );
    }

    displayData(filteredData, numDates);
}

function displayData(data, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const songTableHead = document.getElementById('songTable').getElementsByTagName('thead')[0];
    
    // 清空現有內容
    songTableBody.innerHTML = '';
    
    // 重置表頭
    const headerRow = songTableHead.rows[0];
    while (headerRow.cells.length > 4) {
        headerRow.deleteCell(-1);
    }
    
    // 設置日期表頭的colspan（包含"..."按鈕的列）
    const dateHeaderCell = headerRow.insertCell(-1);
    dateHeaderCell.colSpan = numDates + 1; // +1 為"..."按鈕列
    dateHeaderCell.textContent = "日期";
    
    const groupedData = data.reduce((acc, row) => {
        const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
        if (!acc[key]) {
            acc[key] = {...row, dates: []};
        }
        if (row.dates) {
            acc[key].dates.push(...row.dates);
        }
        return acc;
    }, {});

    const sortedData = sortTable(Object.values(groupedData));
    
    sortedData.forEach(row => {
        const newRow = songTableBody.insertRow();
        
        // 基本欄位
        newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = row.song_name;
        newRow.insertCell().textContent = row.artist;
        newRow.insertCell().textContent = row.source || '-';
        
        // 日期欄位
        if (row.dates && row.dates.length > 0) {
            // 排序日期
            row.dates.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 顯示前numDates個日期
            for (let i = 0; i < numDates; i++) {
                const dateCell = newRow.insertCell();
                dateCell.classList.add('date-cell');
                
                if (i < row.dates.length) {
                    const date = row.dates[i];
                    const formattedDate = `${date.date.substring(6, 8)}/${date.date.substring(4, 6)}/${date.date.substring(0, 4)}`;
                    
                    const link = document.createElement('a');
                    link.href = date.link;
                    link.textContent = formattedDate;
                    link.target = '_blank';
                    link.onclick = function(event) {
                        event.preventDefault();
                        safeRedirect(link.href);
                    };
                    
                    dateCell.appendChild(link);
                    
                    if (date.is_member_exclusive) {
                        const lockIcon = document.createElement('span');
                        lockIcon.classList.add('lock-icon');
                        lockIcon.textContent = '🔒';
                        link.appendChild(lockIcon);
                    }
                    
                    if (date.is_acapella) {
                        dateCell.classList.add('acapella');
                    }
                } else {
                    dateCell.textContent = '-';
                }
            }
            
            // 添加"..."按鈕，如果有更多日期
            if (row.dates.length > numDates) {
                const moreButtonCell = newRow.insertCell();
                const moreButton = document.createElement('button');
                moreButton.textContent = '...';
                moreButton.onclick = () => {
                    const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
                    
                    if (isExpanded) {
                        // 折疊日期
                        const toRemove = newRow.querySelectorAll('.extra-date');
                        toRemove.forEach(el => el.remove());
                        moreButton.setAttribute('data-expanded', 'false');
                        dateHeaderCell.colSpan = numDates + 1;
                    } else {
                        // 展開額外的日期
                        row.dates.slice(numDates).forEach(date => {
                            const dateCell = newRow.insertCell();
                            dateCell.classList.add('date-cell', 'extra-date');
                            
                            const link = document.createElement('a');
                            const formattedDate = `${date.date.substring(6, 8)}/${date.date.substring(4, 6)}/${date.date.substring(0, 4)}`;
                            
                            link.href = date.link;
                            link.textContent = formattedDate;
                            link.target = '_blank';
                            link.onclick = function(event) {
                                event.preventDefault();
                                safeRedirect(link.href);
                            };
                            
                            dateCell.appendChild(link);
                            
                            if (date.is_member_exclusive) {
                                const lockIcon = document.createElement('span');
                                lockIcon.classList.add('lock-icon');
                                lockIcon.textContent = '🔒';
                                link.appendChild(lockIcon);
                            }
                            
                            if (date.is_acapella) {
                                dateCell.classList.add('acapella');
                            }
                        });
                        moreButton.setAttribute('data-expanded', 'true');
                        dateHeaderCell.colSpan = row.dates.length + 1;
                    }
                };
                moreButtonCell.appendChild(moreButton);
            } else {
                // 如果沒有更多日期，仍然添加一個空的儲存格保持表格結構
                newRow.insertCell();
            }
        } else {
            // 如果完全沒有日期，填充空白儲存格（包含"..."按鈕的位置）
            for (let i = 0; i < numDates + 1; i++) {
                newRow.insertCell().textContent = '-';
            }
        }
    });
}

// 引用 youtube-player.js 中的功能
document.addEventListener("DOMContentLoaded", function() {
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.openFloatingPlayer = openFloatingPlayer;
});
