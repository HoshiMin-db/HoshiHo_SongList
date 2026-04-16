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
        console.log('Loaded discography:', discography);
        return discography;
    } catch (error) {
        console.error('Error loading disc data:', error);
        return null;
    }
}

// 獲取 YouTube 預覽圖 URL
function getYouTubeThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// 創建主作品卡片（Armony/Solo）
function createMainAlbumCard(album) {
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

        // 取得第一個曲目的影片ID作為背景圖片
        const backdropVideoId = album.tracks.length > 0 
            ? album.tracks[0].videoId 
            : (album.xfdVideoId || null);
        const backdropUrl = backdropVideoId 
            ? getYouTubeThumbnail(backdropVideoId)
            : 'none';

        // 準備外部連結
        let externalLinksHtml = '';
        
        // XFD 連結（如果存在）
        if (album.xfdVideoId) {
            externalLinksHtml += `
                <a href="https://www.youtube.com/watch?v=${album.xfdVideoId}" 
                   target="_blank" class="external-link external-link-xfd">
                    🎵 CD試聽 (XFD)
                </a>
            `;
        }

        // Playlist 連結
        if (ytLink) {
            externalLinksHtml += `
                <a href="${ytLink}" target="_blank" class="external-link external-link-playlist">
                    ${ytInfo.type === 'playlist' ? '🎶 完整版' : '🎬 YouTube'}
                </a>
            `;
        }

        // 購買連結
        if (album.purchaseUrl) {
            externalLinksHtml += `
                <a href="${album.purchaseUrl}" 
                   target="_blank" class="external-link external-link-purchase">
                    🛒 購買
                </a>
            `;
        }

        return `
            <div class="disc-card disc-card-main" style="background-image: url('${backdropUrl}')">
                <div class="disc-card-overlay"></div>
                <div class="disc-header">
                    <div class="disc-title">${album.title}</div>
                    <div class="disc-type">${album.type}</div>
                    <div class="disc-release-date">${album.releaseDate}</div>
                </div>
                <ul class="track-list">
                    ${tracksList}
                </ul>
                <div class="external-links">
                    ${externalLinksHtml}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error creating main album card:', error, 'Album:', album);
        return '';
    }
}

// 創建參與作品卡片（Other Circles）
function createParticipationCard(album) {
    try {
        const backdropUrl = album.videoId 
            ? getYouTubeThumbnail(album.videoId)
            : 'none';

        let externalLinksHtml = '';
        
        // 影片連結
        if (album.videoId) {
            externalLinksHtml += `
                <a href="https://www.youtube.com/watch?v=${album.videoId}" 
                   target="_blank" class="external-link external-link-video">
                    🎬 觀看
                </a>
            `;
        }

        // 購買連結
        if (album.purchaseUrl) {
            externalLinksHtml += `
                <a href="${album.purchaseUrl}" 
                   target="_blank" class="external-link external-link-purchase">
                    🛒 購買
                </a>
            `;
        }

        return `
            <div class="disc-card disc-card-participation" style="background-image: url('${backdropUrl}')">
                <div class="disc-card-overlay"></div>
                <div class="disc-header disc-header-participation">
                    <div class="disc-title disc-title-participation">${album.title}</div>
                    <div class="disc-circle">${album.circle}</div>
                    <div class="disc-release-date">${album.releaseDate}</div>
                </div>
                <div class="external-links">
                    ${externalLinksHtml}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error creating participation card:', error, 'Album:', album);
        return '';
    }
}

// 根據類型建立卡片
function createAlbumCard(album) {
    if (album.isParticipation) {
        return createParticipationCard(album);
    } else {
        return createMainAlbumCard(album);
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
        console.log(`Processing category: ${key}, albums:`, category.albums);
        
        if (category.albums.length === 0) return;

        const albumsHtml = category.albums.map(album => {
            console.log(`Creating card for album:`, album.title);
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
