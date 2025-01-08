// data.js
import { normalizeString, sortTable } from './utils.js';

let allData = [];
let totalSongCount = 0;

// 驗證 URL 函數
function isValidUrl(url) {
    const trustedDomains = ['www.youtube.com', 'youtu.be']; // 受信任的 YouTube 域名
    try {
        const parsedUrl = new URL(url);
        return trustedDomains.includes(parsedUrl.hostname);
    } catch (e) {
        return false;
    }
}

export function fetchData(callback) {
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

export function fetchAndDisplayData(query, numDates = 3) {
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

    const replaceSongs = {
        'rorikami': '粛聖‼ ロリ神レクイエム☆'
    };
    filteredData.forEach(row => {
        if (replaceSongs[row.song_name]) {
            row.song_name = replaceSongs[row.song_name];
        }
    });

    displayData(filteredData, numDates);
}

function displayData(data, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    const dateHeader = document.querySelector('.date-header');
    const initialColspan = numDates;

    // 設置初始 colspan
    dateHeader.colSpan = initialColspan;

    // 按曲名（日文順序）排序
    data.sort((a, b) => a.song_name.localeCompare(b.song_name, 'ja'));

    const groupedData = data.reduce((acc, row) => {
        const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(row);
        return acc;
    }, {});

    Object.values(groupedData).forEach(group => {
        group.sort((a, b) => new Date(b.date.substring(0, 4) + '-' + b.date.substring(4, 6) + '-' + b.date.substring(6))
            - new Date(a.date.substring(0, 4) + '-' + a.date.substring(4, 6) + '-' + a.date.substring(6)));
    });

    Object.entries(groupedData).forEach(([key, rows]) => {
        const newRow = songTableBody.insertRow();
        newRow.insertCell().textContent = rows[0].song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = rows[0].song_name;
        newRow.insertCell().textContent = rows[0].artist;
        newRow.insertCell().textContent = rows[0].source;

        // 生成日期儲存格
        rows.slice(0, numDates).forEach((row, index) => {
            const dateCell = newRow.insertCell();
            dateCell.classList.add('date-cell');
            const link = document.createElement('a');
            const date = row.date;
            const formattedDate = `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
            link.href = row.link;
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

            if (row.is_member_exclusive) {
                const lockIcon = document.createElement('span');
                lockIcon.classList.add('lock-icon');
                lockIcon.textContent = '🔒';
                link.appendChild(lockIcon);
            }
            if (row.is_acapella) {
                dateCell.classList.add('acapella');
            }
        });

        // 添加 "..." 按鈕如果有更多日期
        if (rows.length > numDates) {
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
                    rows.slice(numDates).forEach((row, index) => {
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
                            // 驗證 URL
                            if (isValidUrl(link.href)) {
                                openFloatingPlayer(link.href);
                            } else {
                                alert('Invalid URL');
                            }
                        };
                        dateCell.appendChild(link);

                        if (row.is_member_exclusive) {
                            const lockIcon = document.createElement('span');
                            lockIcon.classList.add('lock-icon');
                            lockIcon.textContent = '🔒';
                            link.appendChild(lockIcon);
                        }
                        if (row.is_acapella) {
                            dateCell.classList.add('acapella');
                        }
                    });
                    moreButton.setAttribute('data-expanded', 'true');
                    // 調整 colspan
                    dateHeader.colSpan = rows.length + 1; // +1 因為多了一个 "..." 按鈕
                }
            };
            const moreCell = newRow.insertCell();
            moreCell.classList.add('date-cell'); // 確保 "..." 按鈕也屬於日期欄
            moreCell.appendChild(moreButton);
        }
    });

    sortTable();
}
