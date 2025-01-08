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
    return str.normalize('NFKC').replace(/[~\u301c\uff5e]/g, '~');
}

// 根據歌曲名稱對表格進行排序
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

    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    if (virtualScrollContainer) {
        virtualScrollContainer.addEventListener('scroll', onScroll);
    } else {
        console.error("virtualScrollContainer element not found");
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
            normalizeString(row.song_name).toLowerCase().includes(query) ||
            normalizeString(row.artist).toLowerCase().includes(query) ||
            normalizeString(row.source).toLowerCase().includes(query)
        );
    }

    displayData(filteredData, numDates);
}

// 顯示數據
function displayData(data, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];

    const groupedData = data.reduce((acc, row) => {
        const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
        if (!acc[key]) {
            acc[key] = {
                ...row,
                dates: []
            };
        }
        acc[key].dates.push(...(row.dates || []));
        return acc;
    }, {});

    Object.values(groupedData).forEach(group => {
        group.dates.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    Object.entries(groupedData).forEach(([key, row]) => {
        const newRow = songTableBody.insertRow();
        newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = row.song_name;
        newRow.insertCell().textContent = row.artist;
        newRow.insertCell().textContent = row.source || '-';

        // 生成日期儲存格
        const dateCell = newRow.insertCell();
        dateCell.classList.add('date-cell');
        if (row.dates && Array.isArray(row.dates)) {
            row.dates.slice(0, numDates).forEach((date, index) => {
                const link = document.createElement('a');
                const formattedDate = `${date.date.substring(6, 8)}/${date.date.substring(4, 6)}/${date.date.substring(0, 4)}`;
                link.href = date.link;
                link.textContent = formattedDate;
                link.target = '_blank';
                link.onclick = function(event) {
                    event.preventDefault();
                    safeRedirect(link.href);
                };
                if (index > 0) {
                    dateCell.appendChild(document.createTextNode(', '));
                }
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

            // 添加 "..." 按鈕，如果有更多日期
            if (row.dates.length > numDates) {
                const moreButton = document.createElement('button');
                moreButton.textContent = '...';
                moreButton.onclick = () => {
                    const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
                    if (isExpanded) {
                        // 折疊日期
                        const toRemove = dateCell.querySelectorAll('.extra-date');
                        toRemove.forEach(el => el.remove());
                        moreButton.setAttribute('data-expanded', 'false');
                    } else {
                        // 展開日期
                        row.dates.slice(numDates).forEach((date, index) => {
                            const link = document.createElement('a');
                            const formattedDate = `${date.date.substring(6, 8)}/${date.date.substring(4, 6)}/${date.date.substring(0, 4)}`;
                            link.href = date.link;
                            link.textContent = formattedDate;
                            link.target = '_blank';
                            link.onclick = function(event) {
                                event.preventDefault();
                                safeRedirect(link.href);
                            };
                            const span = document.createElement('span');
                            span.classList.add('extra-date');
                            span.appendChild(document.createTextNode(', '));
                            span.appendChild(link);
                            dateCell.appendChild(span);

                            if (date.is_member_exclusive) {
                                const lockIcon = document.createElement('span');
                                lockIcon.classList.add('lock-icon');
                                lockIcon.textContent = '🔒';
                                link.appendChild(lockIcon);
                            }
                            if (date.is_acapella) {
                                span.classList.add('acapella');
                            }
                        });
                        moreButton.setAttribute('data-expanded', 'true');
                    }
                };
                dateCell.appendChild(moreButton);
            }
        } else {
            dateCell.textContent = '-';
        }
    });

    sortTable();
}

// 虛擬滾動處理函數
function onScroll() {
    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    
    // 計算可視區域的範圍
    const rowHeight = 20;  // 假設每行的高度為20像素
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

// 打開浮動播放器
function openFloatingPlayer(link) {
    const floatingPlayer = document.getElementById('floatingPlayer');
    floatingPlayer.src = link;
    document.getElementById('floatingPlayerContainer').style.display = 'block';
}

// 關閉浮動播放器
function closeFloatingPlayer() {
    const floatingPlayer = document.getElementById('floatingPlayer');
    floatingPlayer.src = '';
    document.getElementById('floatingPlayerContainer').style.display = 'none';
}

// 客戶端 URL 重定向保護
function safeRedirect(url) {
    // 允許的 YouTube 網域列表
    const allowedDomains = [
        'https://www.youtube.com',
        'https://youtu.be'
    ];

    // 檢查 URL 是否符合允許的網域
    if (allowedDomains.some(domain => url.startsWith(domain))) {
        window.location.href = url;
    } else {
        console.error('Invalid redirect URL');
    }
}
