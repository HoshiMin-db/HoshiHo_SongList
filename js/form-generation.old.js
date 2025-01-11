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
            });
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
    }, 300)); // 設置防抖延遲時間為300毫秒

    function displayData(data, numDates = 3) {
        const groupedData = data.reduce((acc, row) => {
            const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(row);
            return acc;
        }, {});

        Object.values(groupedData).forEach(group => {
            group.sort((a, b) => new Date(b.date.substring(0, 4) + '-' + b.date.substring(4, 6) + '-' + b.date.substring(6)) - 
                                 new Date(a.date.substring(0, 4) + '-' + a.date.substring(4, 6) + '-' + a.date.substring(6)));
        });

        Object.entries(groupedData).forEach(([key, rows]) => {
            const maxRows = Math.min(rows.length, 3);
            const newRow = songTableBody.insertRow();
            
            const initialCell = newRow.insertCell();
            initialCell.textContent = rows[0].song_name.charAt(0).toUpperCase();
            
            const songNameCell = newRow.insertCell();
            songNameCell.textContent = rows[0].song_name;

            // 檢查是否為版權標記歌曲，並設置字體顏色為紅色
            if (rows[0].is_copyright) {
                songNameCell.style.color = 'red';
            }
            
            newRow.insertCell().textContent = rows[0].artist;
            newRow.insertCell().textContent = rows[0].source || '';
            
            for (let i = 0; i < numDates; i++) {
                const dateCell = newRow.insertCell();
                if (i < maxRows) {
                    const row = rows[i];
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
            }

            if (rows.length > numDates) {
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
                        rows.slice(numDates).forEach(row => {
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
                        dateHeaderCell.colSpan = rows.length + 1;
                    }
                };
                moreButtonCell.appendChild(moreButton);
            } else {
                newRow.insertCell();
            }
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
