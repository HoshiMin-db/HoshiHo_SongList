<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Search</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .controls {
            margin-bottom: 20px;
        }
        
        #searchInput {
            width: 100%;
            padding: 12px 20px;
            margin: 8px 0;
            box-sizing: border-box;
            border: 2px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
        }
        
        .sheet-selector {
            margin-bottom: 10px;
        }
        
        .sheet-selector select {
            padding: 8px;
            font-size: 16px;
            border-radius: 4px;
        }
        
        .data-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .data-item {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            background-color: #f9f9f9;
        }

        .last-updated {
            font-size: 0.8em;
            color: #666;
            margin-top: 10px;
        }

        .loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background-color: #f3f3f3;
            z-index: 1000;
        }

        .loading::after {
            content: '';
            position: absolute;
            width: 0;
            height: 100%;
            background-color: #4CAF50;
            animation: progress 1s infinite;
        }

        @keyframes progress {
            0% { width: 0; }
            100% { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="controls">
        <div class="sheet-selector">
            <select id="sheetSelect">
                <option value="Sheet1">工作表1</option>
                <option value="Sheet2">工作表2</option>
            </select>
        </div>
        <input type="text" id="searchInput" placeholder="搜尋...">
    </div>
    <div id="lastUpdated" class="last-updated"></div>
    <div id="loadingBar" class="loading" style="display: none;"></div>
    <div id="dataContainer" class="data-container"></div>

    <script>
        // 配置
        const SHEET_ID = 'YOUR_SHEET_ID';
        const UPDATE_INTERVAL = 60000; // 每60秒更新一次
        let currentSheet = 'Sheet1';
        let allData = {};
        let lastUpdateTime = {};

        function getSheetURL(sheetName) {
            return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
        }

        async function fetchSheetData(sheetName) {
            const loadingBar = document.getElementById('loadingBar');
            loadingBar.style.display = 'block';

            try {
                const response = await fetch(getSheetURL(sheetName));
                const text = await response.text();
                const jsonData = JSON.parse(text.substring(47).slice(0, -2));
                
                allData[sheetName] = jsonData.table.rows.map(row => {
                    return row.c.map(cell => cell ? cell.v : '');
                });

                lastUpdateTime[sheetName] = new Date();
                updateLastUpdatedTime();
                displayData(allData[sheetName]);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                loadingBar.style.display = 'none';
            }
        }

        function updateLastUpdatedTime() {
            const lastUpdated = document.getElementById('lastUpdated');
            const time = lastUpdateTime[currentSheet];
            if (time) {
                lastUpdated.textContent = `最後更新時間: ${time.toLocaleString()}`;
            }
        }

        function displayData(data) {
            const container = document.getElementById('dataContainer');
            container.innerHTML = '';

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="data-item">沒有找到資料</div>';
                return;
            }

            data.forEach(row => {
                const div = document.createElement('div');
                div.className = 'data-item';
                div.textContent = row.join(' - ');
                container.appendChild(div);
            });
        }

        function filterData(searchTerm) {
            const currentData = allData[currentSheet];
            if (!currentData) return;

            const filtered = currentData.filter(row => 
                row.some(cell => 
                    String(cell).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
            displayData(filtered);
        }

        // 事件監聽
        document.getElementById('searchInput').addEventListener('input', (e) => {
            filterData(e.target.value);
        });

        document.getElementById('sheetSelect').addEventListener('change', (e) => {
            currentSheet = e.target.value;
            if (!allData[currentSheet]) {
                fetchSheetData(currentSheet);
            } else {
                displayData(allData[currentSheet]);
                updateLastUpdatedTime();
            }
        });

        // 定期更新數據
        function setupAutoUpdate() {
            setInterval(() => {
                fetchSheetData(currentSheet);
            }, UPDATE_INTERVAL);
        }

        // 初始化
        async function initialize() {
            await fetchSheetData('Sheet1');
            await fetchSheetData('Sheet2');
            setupAutoUpdate();
        }

        initialize();
    </script>
</body>
</html>
