// disc-generation.js

const DISC_FILE_PATH = 'disc/disc.json';

// 讀取 JSON 內容
async function loadDiscData() {
    try {
        const response = await fetch(DISC_FILE_PATH);
        if (!response.ok) throw new Error('Network response was not ok');
        const discography = await response.json();
        return discography;
    } catch (error) {
        console.error('Error loading disc data:', error);
        return null;
    }
}

// 創建專輯卡片的HTML
function createAlbumCard(album) {
    const tracksList = album.tracks.map((track, index) => `
        <li class="track-item">
            <span class="track-number">${index + 1}</span>
            <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-credit">${track.credits}</div>
            </div>
        </li>
    `).join('');

    const ytInfo = album.ytInfo;
    const ytLink = ytInfo.type === 'playlist' 
        ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
        : `https://youtu.be/${ytInfo.id}`;

    return `
        <div class="disc-card">
            <div class="disc-header">
                <div class="disc-title">${album.title}</div>
                <div class="disc-type">${album.type}</div>
                <div class="disc-release-date">${album.releaseDate}</div>
            </div>
            ${createEmbedPlayer(album.ytInfo)}
            <ul class="track-list">
                ${tracksList}
            </ul>
            <div class="external-links">
                <a href="${ytLink}" target="_blank" class="external-link">
                    ${ytInfo.type === 'playlist' ? 'YouTube Music' : 'YouTube'}
                </a>
                ${album.linkcore ? `
                    <a href="https://linkco.re/${album.linkcore}" 
                       target="_blank" class="external-link">其他平台</a>
                ` : ''}
            </div>
        </div>
    `;
}

// 生成整個專輯列表
async function generateDiscography() {
    const container = document.getElementById('discography-container');
    if (!container) return;

    const discography = await loadDiscData();
    if (!discography) return;

    Object.entries(discography).forEach(([key, category]) => {
        if (category.albums.length === 0) return;

        const categoryHtml = `
            <div class="category-section" id="${key}">
                <h2 class="category-title">${category.name}</h2>
                <p class="category-description">${category.description}</p>
                <div class="disc-container">
                    ${category.albums.map(album => createAlbumCard(album)).join('')}
                </div>
            </div>
        `;

        container.innerHTML += categoryHtml;
    });
}

// 頁面加載時生成專輯列表
document.addEventListener('DOMContentLoaded', generateDiscography);

// 導出函數供其他文件使用
export { generateDiscography };
