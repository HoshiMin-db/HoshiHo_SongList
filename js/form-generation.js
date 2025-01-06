import './events.js';
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
        newRow.insertCell().textContent = row.note || '';

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
        });
    }
}
