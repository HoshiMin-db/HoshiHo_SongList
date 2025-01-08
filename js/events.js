// events.js
import { debounce, normalizeString } from './utils.js';
import { fetchAndDisplayData } from './data.js';

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const showAllButton = document.getElementById('showAllButton');

    // 確認元素是否存在
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = normalizeString(e.target.value.toLowerCase());
            if (query === '') {
                fetchAndDisplayData(''); // 顯示全部表單
            } else {
                fetchAndDisplayData(query);
            }
        }, 300));
    } else {
        console.error("searchInput element not found");
    }

    if (showAllButton) {
        showAllButton.addEventListener('click', function() {
            const showAllState = !showAllButton.classList.contains('button-on');
            showAllButton.classList.toggle('button-on', showAllState);
            showAllButton.classList.toggle('button-off', !showAllState);
            showAllButton.textContent = showAllState ? "隱藏" : "顯示全部";

            fetchAndDisplayData('', showAllState ? Infinity : 3);
        });
    } else {
        console.error("showAllButton element not found");
    }

    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    if (virtualScrollContainer) {
        virtualScrollContainer.addEventListener('scroll', onScroll);
    } else {
        console.error("virtualScrollContainer element not found");
    }
});

function onScroll() {
    const virtualScrollContainer = document.getElementById('virtualScrollContainer');
    const virtualScrollContent = document.getElementById('virtualScrollContent');
    
    // 計算可視區域的範圍
    const rowHeight = 20;  // 假設每行的高度為20像素
    const visibleRowCount = Math.floor(virtualScrollContainer.clientHeight / rowHeight);
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
