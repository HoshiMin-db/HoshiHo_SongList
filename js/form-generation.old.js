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
    return str.normalize('NFKC').replace(/[~〜～]/g, '~');
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
    const showAllButton = document.getElementById('showAllButton');
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    let showAllState = false;

    // 確認元素是否存在
    if (!searchInput || !showAllButton || !songTableBody) {
        console.error("Essential element not found");
        return;
    }

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
                callback(data);
            });
    }

    function fetchAndDisplayData(query, numDates = 3) {
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

    function displayData(data, numDates) {
        // 合并相同曲名和歌手的資料
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

        const sortedData = Object.values(groupedData).sort((a, b) => {
            return normalizeString(a.song_name).localeCompare(normalizeString(b.song_name), 'ja-JP');
        });

        sortedData.forEach(row => {
            const newRow = songTableBody.insertRow();
            newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
            newRow.insertCell().textContent = row.song_name;
            newRow.insertCell().textContent = row.artist;
            newRow.insertCell().textContent = row.source || '-';

            // 生成日期儲存格
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
                    dateCell.appendChild(lockIcon);
                }
                if (date.is_acapella) {
                    dateCell.classList.add('acapella');
                }
            });

            // 如果日期數量少於 numDates，補齊空白儲存格並設置背景顏色
            for (let i = row.dates.length; i < numDates; i++) {
                const emptyCell = newRow.insertCell();
                emptyCell.classList.add('date-cell');
                emptyCell.style.backgroundColor = "#f0f0f0";
            }
        });

        sortTable();
    }

    searchInput.addEventListener('input', debounce(function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchAndDisplayData(query);
    }, 300));

    showAllButton.addEventListener('click', function() {
        showAllState = !showAllState;
        showAllButton.classList.toggle('button-on', showAllState);
        showAllButton.classList.toggle('button-off', !showAllState);
        showAllButton.textContent = showAllState ? "隱藏" : "顯示全部";

        fetchAndDisplayData('', showAllState ? totalSongCount : 3);
    });

    fetchData(() => fetchAndDisplayData(''));
});

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
