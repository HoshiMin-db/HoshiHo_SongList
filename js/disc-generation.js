// YouTube 連結類型定義
const YT_TYPES = {
    PLAYLIST: 'playlist',
    VIDEO: 'video',
    MUSIC_TRACK: 'music_track'
};

// 解析 YouTube URL 或 ID
function parseYouTubeId(url) {
    try {
        // 直接處理 OLAK5uy_ 格式的 playlist ID
        if (url.startsWith('OLAK5uy_')) {
            return {
                id: url,
                type: YT_TYPES.PLAYLIST
            };
        }

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
        console.error('Error parsing YouTube URL:', error, 'URL:', url);
    }
    // 如果無法解析，直接使用原始URL作為playlist ID
    return {
        id: url,
        type: YT_TYPES.PLAYLIST
    };
}

// 讀取 JSON 內容
async function loadDiscData() {
    try {
        const response = await fetch('disc/disc.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const discography = await response.json();
        console.log('Loaded discography:', discography); // 調試用
        return discography;
    } catch (error) {
        console.error('Error loading disc data:', error);
        return null;
    }
}

// 創建專輯卡片的HTML
function createAlbumCard(album) {
    try {
        const tracksList = album.tracks.map((track, index) => {
            return `
                <li class="track-item">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-info">
                        <div class="track-title">${track.title}</div>
                        <div class="track-credit">${track.credits || ''}</div>
                    </div>
                    <button class="play-button" onclick="openFloatingPlayer('https://www.youtube.com/watch?v=${track.videoId}')">▷</button>
                </li>
            `;
        }).join('');

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
    } catch (error) {
        console.error('Error creating album card:', error, 'Album:', album);
        return '';
    }
}

// 生成整個專輯列表
async function generateDiscography() {
    const container = document.getElementById('discography-container');
    if (!container) {
        console.error('Discography container not found');
        return;
    }

    const discography = await loadDiscData();
    if (!discography) {
        console.error('Failed to load discography data');
        return;
    }

    // 收集所有 HTML 然後一次性設置
    let allCategoriesHtml = '';

    Object.entries(discography).forEach(([key, category]) => {
        console.log(`Processing category: ${key}, albums:`, category.albums); // 調試用
        
        if (category.albums.length === 0) return;

        const albumsHtml = category.albums.map(album => {
            console.log(`Creating card for album:`, album.title); // 調試用
            return createAlbumCard(album);
        }).join('');

        const categoryHtml = `
            <div class="category-section" id="${key}">
                <h2 class="category-title">${category.name}</h2>
                <p class="category-description">${category.description}</p>
                <div class="disc-container">
                    ${albumsHtml}
                </div>
            </div>
        `;

        allCategoriesHtml += categoryHtml;
    });

    // 一次性設置所有內容
    container.innerHTML = allCategoriesHtml;
}

// 確保 DOM 完全加載後再執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateDiscography);
} else {
    generateDiscography();
}
