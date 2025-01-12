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
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const songTableHead = document.getElementById('songTable').getElementsByTagName('thead')[0];
    let totalSongCount = 0; 

    function fetchData(callback) {
        fetch('data.json', { cache: 'no-cache' })
            .then(response => response.json())
            .then(data => {
                if (totalSongCount === 0) {
                    const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                    totalSongCount = uniqueSongs.size;
                    document.getElementById('songCount').textContent = totalSongCount;
                }
                callback(data);
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function fetchAndDisplayData(query, allData) {
        songTableBody.innerHTML = '';
        const filteredData = allData.filter(row =>
            normalizeString(row.song_name).includes(query) ||
            normalizeString(row.artist).includes(query) ||
            normalizeString(row.source).includes(query)
        );
        displayData(filteredData);
    }
    
    // 使用防抖函數來處理搜尋輸入事件
    searchInput.addEventListener('input', debounce(function(e) { 
        const query = normalizeString(e.target.value.toLowerCase());
        fetchData(data => fetchAndDisplayData(query, data));
    }, 800)); // 設置防抖延遲時間為800毫秒

    function displayData(data, numDates = 3) {
        // 使用reduce來分組數據
        const groupedData = data.reduce((acc, row) => {
            const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
            if (!acc[key]) {
                acc[key] = {
                    ...row,
                    dates: []
                };
            }
            // 合併日期並立即排序
            const allDates = [...acc[key].dates, ...row.dates];
            acc[key].dates = allDates.sort((a, b) => {
                // 將日期和時間轉換為可比較的格式
                const dateA = new Date(a.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + a.time);
                const dateB = new Date(b.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'T' + b.time);
                return dateB - dateA;
            });
            return acc;
        }, {});

        // 清空表格
        songTableBody.innerHTML = '';

        // 遍歷分組後的數據，生成表格行
        Object.entries(groupedData).forEach(([key, item]) => {
            const newRow = createTableRow(item, numDates, songTableHead);
            songTableBody.appendChild(newRow);
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

    fetchData(data => fetchAndDisplayData('', data));
});
