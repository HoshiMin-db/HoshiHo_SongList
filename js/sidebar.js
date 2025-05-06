// 加載sidebar
async function loadSidebar() {
    try {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) {
            console.error('Sidebar container not found! Retrying in 100ms...');
            // 如果找不到容器，稍後重試
            setTimeout(loadSidebar, 100);
            return;
        }

        const response = await fetch('sidebar.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        // 先插入 HTML
        sidebarContainer.innerHTML = text;
        
        // 設置活動項目
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const links = document.querySelectorAll('.sidebar-nav a');
        links.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // 初始化語言選擇器
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', function(event) {
                if (typeof onLanguageChange === 'function') {
                    onLanguageChange(event.target.value);
                }
            });
        }

    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// 切換sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    if (sidebar && mainContent) {
        sidebar.classList.toggle('expanded');
        mainContent.classList.toggle('shifted');
    }
}

// 確保 DOM 完全加載後再執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebar);
} else {
    loadSidebar();
}
