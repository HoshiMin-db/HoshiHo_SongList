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

// 顯示數據
function displayData(data, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const songTableHeadRow = document.getElementById('songTable').getElementsByTagName('thead')[0].rows[0];

    // 初始化表頭的 colspan
    const dateHeaderCell = songTableHeadRow.insertCell(-1);
    dateHeaderCell.colSpan = numDates + 1; // 預設為 3 個日期列 + 1 個 "..." 按鈕列
    dateHeaderCell.textContent = "Dates";

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

    const sortedData = sortTable(Object.values(groupedData));

    sortedData.forEach(row => {
        const newRow = songTableBody.insertRow();
        newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = row.song_name;
        newRow.insertCell().textContent = row.artist;
        newRow.insertCell().textContent = row.source || '-';

        // 生成日期儲存格
        if (row.dates && Array.isArray(row.dates)) {
            row.dates.slice(0, numDates).forEach(date => {
                const dateCell = newRow.insertCell();
                dateCell.classList.add('date-cell');
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

            // 如果有更多日期，添加 "..." 按鈕
            if (row.dates.length > numDates) {
                const moreButton = document.createElement('button');
                moreButton.textContent = '...';
                moreButton.onclick = () => {
                    const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
                    if (isExpanded) {
                        // 折疊日期
                        const toRemove = newRow.querySelectorAll('.extra-date');
                        toRemove.forEach(el => el.remove());
                        moreButton.setAttribute('data-expanded', 'false');
                        dateHeaderCell.colSpan = numDates + 1; // 恢復原始 colspan
                    } else {
                        // 展開日期
                        row.dates.slice(numDates).forEach(date => {
                            const dateCell = newRow.insertCell();
                            dateCell.classList.add('extra-date');
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
                        dateHeaderCell.colSpan = row.dates.length + 1; // 動態調整 colspan
                    }
                };
                const moreButtonCell = newRow.insertCell();
                moreButtonCell.appendChild(moreButton);
            }
        } else {
            const dateCell = newRow.insertCell();
            dateCell.textContent = '-';
            dateCell.colSpan = numDates; // 設置 colspan 屬性
        }
    });
}

// 打開浮動播放器
function openFloatingPlayer(link) {
    if (isValidUrl(link)) {
        const floatingPlayer = document.getElementById('floatingPlayer');
        floatingPlayer.src = link;
        document.getElementById('floatingPlayerContainer').style.display = 'block';
    } else {
        console.error('Invalid link for floating player');
    }
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
        'www.youtube.com',
        'youtu.be'
    ];

    try {
        const parsedUrl = new URL(url);
        // 檢查 URL 是否符合允許的網域
        if (allowedDomains.includes(parsedUrl.hostname)) {
            window.location.href = url;
        } else {
            console.error('Invalid redirect URL');
        }
    } catch (e) {
        console.error('Invalid URL format', e);
    }
}

// 檢查 URL 是否有效
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}
