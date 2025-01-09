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
function normalizeString(str) {
    return str.normalize('NFKC') // 將字符串規範化為 NFKC 形式
              .replace(/[~\u301c\uff5e]/g, '~') // 將全形和半形波浪號替換為半形波浪號
              .replace(/，/g, ',') // 將全形逗號替換為半形逗號
              .replace(/。/g, '.') // 將全形句號替換為半形句號
              .replace(/[‘’]/g, "'") // 將全形引號替換為半形引號
              .replace(/…/g, '...') // 將全形省略號替換為半形省略號
              .toLowerCase(); // 將字符串轉換為小寫形式
}

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    let totalSongCount = 0; // 添加總歌曲數變量

    function fetchData(callback) {
        // 使用 no-cache 確保獲取最新資料
        fetch('data.json', { cache: 'no-cache' })
            .then(response => response.json())
            .then(data => {
                // 初始化時設置總歌曲數
                if (totalSongCount === 0) {
                    const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                    totalSongCount = uniqueSongs.size;
                    document.getElementById('songCount').textContent = totalSongCount;
                }
                callback(data);
            });
    }

    function fetchAndDisplayData(query, allData) {
        // 清空表格内容
        songTableBody.innerHTML = '';

        // 篩選數據
        const filteredData = allData.filter(row =>
            normalizeString(row.song_name).includes(query) ||
            normalizeString(row.artist).includes(query) ||
            normalizeString(row.source).includes(query)
        );

        // 顯示篩選後的數據
        displayData(filteredData);
    }

    searchInput.addEventListener('input', function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchData(data => fetchAndDisplayData(query, data));
    });

    function displayData(data, numDates = 3) {
        // 按 song_name 和 artist 分組並排序
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

        // 生成表格內容
        Object.entries(groupedData).forEach(([key, rows]) => {
            const maxRows = Math.min(rows.length, 3);
            const newRow = songTableBody.insertRow();
            
            // 添加單元格
            newRow.insertCell().textContent = rows[0].song_name.charAt(0).toUpperCase(); // A-Z
            newRow.insertCell().textContent = rows[0].song_name;
            newRow.insertCell().textContent = rows[0].artist;
            newRow.insertCell().textContent = rows[0].source || '';
            
            // 添加日期
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

                    // 添加鎖符號和清唱標籤
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

            // 添加"..."按鈕，如果有更多日期
            if (rows.length > numDates) {
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
                    } else {
                        // 展開額外的日期
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
                    }
                };
                moreButtonCell.appendChild(moreButton);
            } else {
                // 如果沒有更多日期，仍然添加一個空的儲存格保持表格結構
                newRow.insertCell();
            }
        });

        // 表格按曲名排序
        sortTable();
    }

    function sortTable() {
        const table = document.getElementById('songTable');
        const rows = Array.from(table.getElementsByTagName('tbody')[0].rows);
        
        // 使用日文排序
        rows.sort((a, b) => {
            const aText = a.cells[1].textContent;
            const bText = b.cells[1].textContent;
            return aText.localeCompare(bText, 'ja-JP');
        });

        rows.forEach(row => table.getElementsByTagName('tbody')[0].appendChild(row));
    }

    // 初始加載所有數據
    fetchData(data => fetchAndDisplayData('', data));
});
