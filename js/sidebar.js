// 加載sidebar
async function loadSidebar() {
    const response = await fetch('sidebar.html');
    const text = await response.text();
    document.body.insertAdjacentHTML('afterbegin', text);
    
    // 根據當前頁面設置活動項目
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.sidebar-nav a');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

// 切換sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar.classList.toggle('expanded');
    mainContent.classList.toggle('shifted');
}

// 當文檔加載完成時初始化sidebar
document.addEventListener('DOMContentLoaded', loadSidebar);
