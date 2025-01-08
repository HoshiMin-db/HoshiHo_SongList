// form-generation.js

// Utils functions
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function normalizeString(str) {
    return str.normalize('NFKC').replace(/[~\u301c\uff5e]/g, '~').toLowerCase();
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

function isValidUrl(url) {
    const trustedDomains = ['www.youtube.com', 'youtu.be']; // Trusted domains
    try {
        const parsedUrl = new URL(url);
        return trustedDomains.includes(parsedUrl.hostname);
    } catch (e) {
        return false;
    }
}

// Data handling functions
let allData = [];
let totalSongCount = 0;

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
        })
        .catch(error => console.error('Error fetching data:', error));
}

function fetchAndDisplayData(query, rowsToDisplay = 50, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    songTableBody.innerHTML = '';

    let filteredData;
    if (query === '') {
        filteredData = allData.slice(0, rowsToDisplay); // 顯示部分表單
    } else {
        filteredData = allData.filter(row =>
            normalizeString(row.song_name).includes(query.toLowerCase()) ||
            normalizeString(row.artist).includes(query.toLowerCase()) ||
            (row.source && normalizeString(row.source).includes(query.toLowerCase()))
        ).slice(0, rowsToDisplay);
    }

    displayData(filteredData, numDates); // 顯示前三個日期列
}

function displayData(data, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const dateHeader = document.querySelector('.date-header');
    const initialColspan = numDates;

    // 設置初始 colspan
    dateHeader.colSpan = initialColspan;

    // 按曲名（日文順序）排序
    data.sort((a, b) => normalizeString(a.song_name).localeCompare(normalizeString(b.song_name), 'ja'));

    data.forEach(row => {
        const newRow = songTableBody.insertRow();
        newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = row.song_name;
        newRow.insertCell().textContent = row.artist;
        newRow.insertCell().textContent = row.source || '-';

        // 生成日期儲存格
        for (let i = 0; i < numDates; i++) {
            const dateCell = newRow.insertCell();
            dateCell.classList.add('date-cell');
            if (row.dates && Array.isArray(row.dates) && i < row.dates.length) {
                const dateRow = row.dates[i];
                const link = document.createElement('a');
                const date = dateRow.date;
                const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
                link.href = dateRow.link;
                link.textContent = formattedDate;
                link.target = '_blank';
                link.onclick = function(event) {
                    event.preventDefault();
                    // 驗證 URL
                    if (isValidUrl(link.href)) {
                        openFloatingPlayer(link.href);
                    } else {
                        alert('Invalid URL');
                    }
                };
                dateCell.appendChild(link);

                if (dateRow.is_member_exclusive) {
                    const lockIcon = document.createElement('span');
                    lockIcon.classList.add('lock-icon');
                    lockIcon.textContent = '🔒';
                    link.appendChild(lockIcon);
                }
                if (dateRow.is_acapella) {
                    dateCell.classList.add('acapella');
                }
            } else {
                dateCell.textContent = '-'; // 如果沒有更多日期，顯示占位符
            }
        }

        // 添加 "..." 按鈕如果有更多日期
        if (row.dates && Array.isArray(row.dates) && row.dates.length > numDates) {
            const moreButton = document.createElement('button');
            moreButton.textContent = '...';
            moreButton.onclick = () => {
                const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
                if (isExpanded) {
                    // 折疊日期
                    const toRemove = newRow.querySelectorAll('.extra-date');
                    toRemove.forEach(el => el.remove());
                    moreButton.setAttribute('data-expanded', 'false');
                    // 調整 colspan
                    dateHeader.colSpan = initialColspan;
                } else {
                    // 展開日期
                    row.dates.slice(numDates).forEach((dateRow, index) => {
                        const dateCell = newRow.insertCell();
                        dateCell.classList.add('date-cell', 'extra-date');
                        const link = document.createElement('a');
                        const date = dateRow.date;
                        const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
                        link.href = dateRow.link;
                        link.textContent = formattedDate;
                        link.target = '_blank';
                        link.onclick = function(event) {
                            event.preventDefault();
                            // 驗證 URL
                            if (isValidUrl(link.href)) {
                                openFloatingPlayer(link.href);
                            } else {
                                alert('Invalid URL');
                            }
                        };
                        dateCell.appendChild(link);

                        if (dateRow.is_member_exclusive) {
                            const lockIcon = document.createElement('span');
                            lockIcon.classList.add('lock-icon');
                            lockIcon.textContent = '🔒';
                            link.appendChild(lockIcon);
                        }
                        if (dateRow.is_acapella) {
                            dateCell.classList.add('acapella');
                        }
                    });
                    moreButton.setAttribute('data-expanded', 'true');
                    // 調整 colspan
                    dateHeader.colSpan = row.dates.length + 1; // +1 因為多了一个 "..." 按鈕
                }
            };
            const moreCell = newRow.insertCell();
            moreCell.classList.add('date-cell'); // 確保 "..." 按鈕也屬於日期欄
            moreCell.appendChild(moreButton);
        }
    });

    sortTable();
}

function openFloatingPlayer(url) {
    if (isValidUrl(url)) {
        const player = document.getElementById('floatingPlayer');
        player.src = url;
        document.getElementById('floatingPlayerContainer').style.display = 'block';
    } else {
        alert('Invalid URL');
    }
}

// Event handling
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

function onScroll() {
    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    const virtualScrollContent = document.getElementById('virtualScrollContent');
    
    // 計算可視區域的範圍
    const rowHeight = 20;  // 假設每行的高度為20像素
    const visibleRowCount = Math.floor(virtualScrollContainer.clientHeight / rowHeight);
    const startIdx = Math.floor(virtualScrollContainer.scrollTop / rowHeight);
    const endIdx = startIdx + visibleRowCount;
    
    // 清空當前顯示的內容
    const tbody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    
    // 渲染可視區域內的數據
    for (let i = startIdx; i < endIdx; i++) {
        const row = allData[i];
        if (!row) continue; // 確保 row 定義
        
        const newRow = tbody.insertRow();
        newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = row.song_name;
        newRow.insertCell().textContent = row.artist;
        newRow.insertCell().textContent = row.source || '-';

        if (row.dates && Array.isArray(row.dates)) {
            row.dates.slice(0, 3).forEach(date => {
                const dateCell = newRow.insertCell();
                dateCell.classList.add('date-cell');
                const link = document.createElement('a');
                link.href = date.link;
                link.textContent = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
                link.target = '_blank';
                link.onclick = function(event) {
                    event.preventDefault();
                    openFloatingPlayer(link.href);
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
        } else {
            const dateCell = newRow.insertCell();
            dateCell.textContent = '-'; // 如果沒有日期，顯示占位符
        }
    }
}
