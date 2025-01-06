document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const showAllButton = document.getElementById('showAllButton');
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    let totalSongCount = 0;
    let showAllState = false;

    function normalizeString(str) {
        return str.normalize('NFKC').replace(/[~〜～]/g, '~');
    }

    function fetchData(callback) {
        fetch('data.json', { cache: 'no-cache' })
            .then(response => response.json())
            .then(data => {
                if (totalSongCount === 0) {
                    const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                    totalSongCount = uniqueSongs.size;
                    document.getElementById('songCount').textContent = totalSongCount;
                }
                callback(data);
            });
    }

    function fetchAndDisplayData(query, allData, numDates = 3) {
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

    searchInput.addEventListener('input', function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchData(data => fetchAndDisplayData(query, data));
    });

    showAllButton.addEventListener('click', function() {
        showAllState = !showAllState;
        showAllButton.classList.toggle('button-on', showAllState);
        showAllButton.classList.toggle('button-off', !showAllState);
        showAllButton.textContent = showAllState ? "隱藏" : "顯示全部";

        fetchData(data => {
            if (showAllState) {
                fetchAndDisplayData('', data, data.length); // 顯示所有日期
            } else {
                fetchAndDisplayData('', data); // 顯示最近3個日期
            }
        });
    });

    function displayData(data, numDates) {
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
            newRow.insertCell().textContent = rows[0].note || '';

            rows.slice(0, numDates).forEach((row) => {
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
                    openFloatingPlayer(link.href);
                };
                dateCell.appendChild(link);

                if (row.is_member_exclusive) {
                    const lockIcon = document.createElement('span');
                    lockIcon.classList.add('lock-icon');
                    lockIcon.textContent = '🔒';
                    dateCell.appendChild(lockIcon);
                }
                if (row.is_acapella) {
                    dateCell.classList.add('acapella');
                }
            });
        });

        sortTable();
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

    fetchData(data => fetchAndDisplayData('', data));
});
