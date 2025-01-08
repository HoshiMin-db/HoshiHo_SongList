// data.js
import { normalizeString, sortTable } from './utils.js';

let allData = [];
let totalSongCount = 0;

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

        // Generate date cells
        const dateCell = newRow.insertCell();
        dateCell.classList.add('date-cell');
        rows.slice(0, numDates).forEach((row, index) => {
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
            if (index > 0) {
                dateCell.appendChild(document.createTextNode(', '));
            }
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

        // Add "..." button if there are more dates
        if (rows.length > numDates) {
            const moreButton = document.createElement('button');
            moreButton.textContent = '...';
            moreButton.onclick = () => {
                const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
                if (isExpanded) {
                    // Collapse dates
                    const toRemove = dateCell.querySelectorAll('.extra-date');
                    toRemove.forEach(el => el.remove());
                    moreButton.setAttribute('data-expanded', 'false');
                } else {
                    // Expand dates
                    rows.slice(numDates).forEach((row, index) => {
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
                        const span = document.createElement('span');
                        span.classList.add('extra-date');
                        span.appendChild(document.createTextNode(', '));
                        span.appendChild(link);
                        dateCell.appendChild(span);

                        if (row.is_member_exclusive) {
                            const lockIcon = document.createElement('span');
                            lockIcon.classList.add('lock-icon');
                            lockIcon.textContent = '🔒';
                            link.appendChild(lockIcon);
                        }
                        if (row.is_acapella) {
                            span.classList.add('acapella');
                        }
                    });
                    moreButton.setAttribute('data-expanded', 'true');
                }
            };
            dateCell.appendChild(moreButton);
        }
    });

    sortTable();
}

// 驗證 URL 函數
function isValidUrl(url) {
    const trustedDomains = ['yourtrusteddomain.com', 'anothertrusted.com']; // 受信任的域名
    try {
        const parsedUrl = new URL(url);
        return trustedDomains.includes(parsedUrl.hostname);
    } catch (e) {
        return false;
    }
}
