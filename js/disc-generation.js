// disc-generation.js

// YouTube 連結類型定義
const YT_TYPES = {
    PLAYLIST: 'playlist',
    VIDEO: 'video',
    MUSIC_TRACK: 'music_track'
};

// 解析 YouTube URL 或 ID
function parseYouTubeId(url) {
    try {
        if (!url.includes('/') && !url.includes('.')) {
            return {
                id: url,
                type: url.length > 20 ? YT_TYPES.PLAYLIST : YT_TYPES.VIDEO
            };
        }

        const urlObj = new URL(url);
        
        if (urlObj.hostname === 'music.youtube.com' && urlObj.searchParams.has('list')) {
            return {
                id: urlObj.searchParams.get('list'),
                type: YT_TYPES.PLAYLIST
            };
        }
        
        if (urlObj.hostname === 'music.youtube.com' && urlObj.pathname.includes('/watch')) {
            return {
                id: urlObj.searchParams.get('v'),
                type: YT_TYPES.MUSIC_TRACK
            };
        }

        if (urlObj.searchParams.has('list')) {
            return {
                id: urlObj.searchParams.get('list'),
                type: YT_TYPES.PLAYLIST
            };
        }

        if (urlObj.pathname.includes('/watch') || urlObj.hostname === 'youtu.be') {
            const videoId = urlObj.hostname === 'youtu.be' 
                ? urlObj.pathname.slice(1)
                : urlObj.searchParams.get('v');
            return {
                id: videoId,
                type: YT_TYPES.VIDEO
            };
        }

    } catch (error) {
        console.error('Error parsing YouTube URL:', error);
    }
    return null;
}

// 讀取 JSON 內容
async function loadDiscData() {
    try {
        const response = await fetch('disc/disc.json');
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
                <div class="track-credit">${track.credits || ''}</div>
            </div>
            <button class="play-button" onclick="openFloatingPlayer('https://youtu.be/${track.videoId}')">播放</button>
        </li>
    `).join('');

    let ytLink = '';
    let ytInfo = {};
    if (album.ytUrl) {
        ytInfo = parseYouTubeId(album.ytUrl);
        ytLink = ytInfo.type === 'playlist' 
            ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
            : `https://youtu.be/${ytInfo.id}`;
    }

    return `
        <div class="disc-card">
            <div class="disc-header">
                <div class="disc-title">${album.title}</div>
                <div class="disc-type">${album.type}</div>
                <div class="disc-release-date">${album.releaseDate}</div>
            </div>
            <ul class="track-list">
                ${tracksList}
            </ul>
            <div class="external-links">
                ${ytLink ? `
                    <a href="${ytLink}" target="_blank" class="external-link">
                        ${ytInfo.type === 'playlist' ? 'YouTube Music' : 'YouTube'}
                    </a>
                ` : ''}
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
