// utils.js
export function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

export function normalizeString(str) {
    return str.normalize('NFKC').replace(/[~\u301c\uff5e]/g, '~');
}

export function sortTable() {
    const table = document.getElementById('songTable');
    const rows = Array.from(table.getElementsByTagName('tbody')[0].rows);

    rows.sort((a, b) => {
        const aText = a.cells[1].textContent;
        const bText = b.cells[1].textContent;
        return aText.localeCompare(bText, 'ja-JP');
    });

    rows.forEach(row => table.getElementsByTagName('tbody')[0].appendChild(row));
}

// data.js
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
        });
}

export function fetchAndDisplayData(query, numDates = 3) {
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    songTableBody.innerHTML = '';

    const filteredData = allData.filter(row =>
        normalizeString(row.song_name).toLowerCase().includes(query) ||
        normalizeString(row.artist).toLowerCase().includes(query) ||
        normalizeString(row.source).toLowerCase().includes(query)
    );

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
            link.href = date.link;
            link.textContent = formattedDate;
            link.target = '_blank';
            link.onclick = function(event) {
                event.preventDefault();
                openFloatingPlayer(link.href);
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
                            openFloatingPlayer(link.href);
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

// events.js
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const showAllButton = document.getElementById('showAllButton');

    searchInput.addEventListener('input', debounce(function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchAndDisplayData(query);
    }, 300));

    showAllButton.addEventListener('click', function() {
        const showAllState = !showAllButton.classList.contains('button-on');
        showAllButton.classList.toggle('button-on', showAllState);
        showAllButton.classList.toggle('button-off', !showAllState);
        showAllButton.textContent = showAllState ? "隱藏" : "顯示全部";

        fetchAndDisplayData('', showAllState ? Infinity : 3);
    });
});

// form-generation.js
import { debounce, normalizeString, sortTable } from './utils.js';
import { fetchData, fetchAndDisplayData } from './data.js';

document.addEventListener("DOMContentLoaded", function() {
    fetchData(() => fetchAndDisplayData(''));

    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    virtualScrollContainer.addEventListener('scroll', onScroll);
});

function onScroll() {
    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    const virtualScrollContent = document.getElementById('virtualScrollContent');
    
    // 計算可視區域的範圍
    const startIdx = Math.floor(virtualScrollContainer.scrollTop / rowHeight);
    const endIdx = Math.min(startIdx + visibleRowCount, allData.length);
    
    // 清空當前顯示的內容
    const tbody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    
    // 渲染可視區域內的數據
    for (let i = startIdx; i < endIdx; i++) {
        const row = allData[i];
        const newRow = tbody.insertRow();
        newRow.insertCell().textContent = row.song_name.charAt(0).toUpperCase();
        newRow.insertCell().textContent = row.song_name;
        newRow.insertCell().textContent = row.artist;
        newRow.insertCell().textContent = row.source;

        row.dates.slice(0, 3).forEach(date => {
            const dateCell = newRow.insertCell();
            dateCell.classList.add('date-cell');
            const link = document.createElement('a');
            link.href = date.link;
            link.textContent = date.formattedDate;
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
    }
}
