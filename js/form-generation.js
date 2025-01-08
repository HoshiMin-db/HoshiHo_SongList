// form-generation.js
import { debounce, normalizeString } from './utils.js';
import { fetchAndDisplayData, fetchData, allData } from './data.js';
import './events.js';

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

// 確保 displayData 函數可用
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

        // Generate date cells
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
                    openFloatingPlayer(link.href);
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

            // Add "..." button if there are more dates
            if (row.dates.length > numDates) {
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
                        row.dates.slice(numDates).forEach((date, index) => {
                            const link = document.createElement('a');
                            const formattedDate = `${date.date.substring(6, 8)}/${date.date.substring(4, 6)}/${date.date.substring(0, 4)}`;
                            link.href = date.link;
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
