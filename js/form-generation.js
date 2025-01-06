document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    const showAllButton = document.getElementById('showAllButton'); // 新增
    const songTableBody = document.getElementById('songTable').getElementsByTagName('tbody')[0];
    let totalSongCount = 0; // 添加總歌曲數變量
    let showAllState = false; // 新增，追蹤按鈕狀態

    function normalizeString(str) {
        return str.normalize('NFKC').replace(/[~〜～]/g, '~');
    }

    function fetchData(callback) {
        // 使用 no-cache 確保獲取最新資料
        fetch('data.json', { cache: 'no-cache' })
            .then(response => response.json())
            .then(data => {
                // 初始化時設置總歌曲數
                if (totalSongCount === 0) {
                    const uniqueSongs = new Set(data.map(item => `${normalizeString(item.song_name)}-${normalizeString(item.artist)}`));
                    totalSongCount = uniqueSongs.size;
                    document.getElementById('songCount').textContent = totalSongCount;
                }
                callback(data);
            });
    }

    function fetchAndDisplayData(query, allData) {
        // 清空表格内容
        songTableBody.innerHTML = '';

        // 篩選數據
        const filteredData = allData.filter(row =>
            normalizeString(row.song_name).toLowerCase().includes(query) ||
            normalizeString(row.artist).toLowerCase().includes(query) ||
            normalizeString(row.source).toLowerCase().includes(query)
        );

        // 插入替換簡化曲名的代碼
        const replaceSongs = {
            'rorikami': '粛聖‼ ロリ神レクイエム☆'
        };
        filteredData.forEach(row => {
            if (replaceSongs[row.song_name]) {
                row.song_name = replaceSongs[row.song_name];
            }
        });

        // 顯示篩選後的數據
        displayData(filteredData);
    }

    searchInput.addEventListener('input', function(e) {
        const query = normalizeString(e.target.value.toLowerCase());
        fetchData(data => fetchAndDisplayData(query, data));
    });

    showAllButton.addEventListener('click', function() { // 新增事件監聽器
        showAllState = !showAllState; // 切換狀態
        showAllButton.classList.toggle('button-on', showAllState);
        showAllButton.classList.toggle('button-off', !showAllState);
        showAllButton.textContent = showAllState ? "隱藏" : "顯示全部"; // 更改按鈕文字

        // 清空表格内容
        songTableBody.innerHTML = '';

        // 根據狀態顯示所有數據或篩選數據
        fetchData(data => {
            if (showAllState) {
                displayData(data); // 顯示所有數據
            } else {
                fetchAndDisplayData('', data); // 恢復篩選數據
            }
        });
    });

    function displayData(data) {
        // 按 song_name 和 artist 分組並排序
        const groupedData = data.reduce((acc, row) => {
            const key = `${normalizeString(row.song_name)}-${normalizeString(row.artist)}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(row);
            return acc;
        }, {});

        Object.values(groupedData).forEach(group => {
            group.sort((a, b) => new Date(b.date.substring(0, 4) + '-' + b.date.substring(4, 6) + '-' + b.date.substring(6)) - 
                               new Date(a.date.substring(0, 4) + '-' + a.date.substring(4, 6) + '-' + a.date.substring(6)));
        });

        // 生成表格內容
        Object.entries(groupedData).forEach(([key, rows]) => {
            const newRow = songTableBody.insertRow();
            
            // 添加單元格
            newRow.insertCell().textContent = rows[0].song_name.charAt(0).toUpperCase(); // A-Z
            newRow.insertCell().textContent = rows[0].song_name;
            newRow.insertCell().textContent = rows[0].artist;
            newRow.insertCell().textContent = rows[0].source;
            newRow.insertCell().textContent = rows[0].note || '';  // 備注

            // 添加所有日期
            rows.forEach((row, index) => {
                const dateCell = newRow.insertCell();
                dateCell.classList.add('date-cell'); // 添加日期欄樣式
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

                // 添加鎖符號和清唱標籤
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

        // 表格按曲名排序
        sortTable();
    }

    function sortTable() {
        const table = document.getElementById('songTable');
        const rows = Array.from(table.getElementsByTagName('tbody')[0].rows);
        
        // 使用日文排序
        rows.sort((a, b) => {
            const aText = a.cells[1].textContent;
            const bText = b.cells[1].textContent;
            return aText.localeCompare(bText, 'ja-JP');
        });

        rows.forEach(row => table.getElementsByTagName('tbody')[0].appendChild(row));
    }

    // 初始加載所有數據
    fetchData(data => fetchAndDisplayData('', data));
});
