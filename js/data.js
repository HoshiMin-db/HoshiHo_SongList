// data.js
import { normalizeString, sortTable } from './utils.js';

export let allData = [];
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

export function displayData(data, numDates = 3) {
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

        // Generate date cells
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

            // Add "..." button if there are more dates
            if (row.dates.length > numDates) {
                const moreButton = document.createElement('button');
                moreButton.textContent = '...';
                moreButton.onclick = () => {
                    const isExpanded = moreButton.getAttribute('data-expanded') === 'true';
                    if (isExpanded) {
                        // Collapse dates
                        const toRemove = newRow.querySelectorAll('.extra-date');
                        toRemove.forEach(el => el.remove());
                        moreButton.setAttribute('data-expanded', 'false');
                    } else {
                        // Expand dates
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
                        moreButton.setAttribute('data-expanded', 'true');
                    }
                };
                const moreButtonCell = newRow.insertCell();
                moreButtonCell.appendChild(moreButton);
            }
        } else {
            const dateCell = newRow.insertCell();
            dateCell.textContent = '-';
        }
    });

    sortTable();
}
