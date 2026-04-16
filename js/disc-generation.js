// YouTube 連結類型定義
const YT_TYPES = {
    PLAYLIST: 'playlist',
    VIDEO: 'video',
    MUSIC_TRACK: 'music_track'
};

// 解析 YouTube URL 或 ID
function parseYouTubeId(url) {
    try {
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

// 獲取 YouTube 縮圖 URL（中心部分 - 真正的封面）
function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
    // hqdefault: 480x360 (CD 封面中心部分)
    // sddefault: 640x480 (可能有黑邊)
    // maxresdefault: 1280x720 (不總是有)
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

// 創建影片播放器嵌入
function createYoutubeEmbed(videoId) {
    return `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1`;
}

// 創建主作品卡片（Armony/Solo）
function createMainAlbumCard(album) {
    try {
        // 獲取第一首曲目作為背景
        const xfdVideoId = album.xfdVideoId;
        const backdropUrl = xfdVideoId ? getYouTubeThumbnail(xfdVideoId, 'hqdefault') : null;

        // 建構曲目列表
        const tracksList = album.tracks.map((track, index) => {
            return `
                <li class="track-item" onclick="playTrackInCard(this, 'https://www.youtube.com/watch?v=${track.videoId}')">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-info">
                        <div class="track-title">${escapeHtml(track.title)}</div>
                        <div class="track-credit">${track.credits || ''}</div>
                    </div>
                    <button class="play-button-small" onclick="event.stopPropagation();">▷</button>
                </li>
            `;
        }).join('');

        // 構建連結
        let ytLink = '';
        let ytInfo = {};
        if (album.ytUrl) {
            ytInfo = parseYouTubeId(album.ytUrl);
            ytLink = ytInfo.type === 'playlist' 
                ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
                : `https://youtu.be/${ytInfo.id}`;
        }

        // 外部連結
        let externalLinksHtml = '';
        
        if (album.xfdVideoId) {
            externalLinksHtml += `
                <button class="external-link external-link-xfd" 
                        onclick="playXFDInCard(this, '${album.xfdVideoId}')">
                    🎵 CD試聽
                </button>
            `;
        }

        if (ytLink) {
            externalLinksHtml += `
                <a href="${ytLink}" target="_blank" class="external-link external-link-playlist">
                    🎶 完整版
                </a>
            `;
        }

        if (album.purchaseUrl) {
            externalLinksHtml += `
                <a href="${album.purchaseUrl}" target="_blank" class="external-link external-link-purchase">
                    🛒 購買
                </a>
            `;
        }

        const videoContainerHtml = backdropUrl ? `
            <div class="disc-video-container">
                <div class="disc-video-placeholder" style="--thumbnail-url: url('${backdropUrl}')"
                     onclick="playXFDInCard(this, '${album.xfdVideoId}')">
                    <div class="play-icon">▶</div>
                </div>
            </div>
        ` : '<div class="disc-video-container" style="background: #ddd;"></div>';

        return `
            <div class="disc-card disc-card-main">
                ${videoContainerHtml}
                <div class="disc-header">
                    <div class="disc-title">${escapeHtml(album.title)}</div>
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
function createParticipationAlbumCard(album) {
    try {
        const backdropUrl = album.xfdVideoId ? getYouTubeThumbnail(album.xfdVideoId, 'hqdefault') : null;

        const tracksList = album.tracks.map((track, index) => {
            const isParticipating = album.participationIndices && album.participationIndices.includes(index);
            const participationBadge = isParticipating ? '<span class="participation-badge">✦</span>' : '';
            
            return `
                <li class="track-item ${isParticipating ? 'track-item-participation' : ''}" 
                    onclick="playTrackInCard(this, 'https://www.youtube.com/watch?v=${track.videoId}')">
                    <span class="track-number">${index + 1}</span>
                    ${participationBadge}
                    <div class="track-info">
                        <div class="track-title">${escapeHtml(track.title)}</div>
                        <div class="track-credit">${track.credits || ''}</div>
                    </div>
                    <button class="play-button-small" onclick="event.stopPropagation();">▷</button>
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

        let externalLinksHtml = '';
        
        if (album.xfdVideoId) {
            externalLinksHtml += `
                <button class="external-link external-link-xfd" 
                        onclick="playXFDInCard(this, '${album.xfdVideoId}')">
                    🎵 CD試聽
                </button>
            `;
        }

        if (ytLink) {
            externalLinksHtml += `
                <a href="${ytLink}" target="_blank" class="external-link external-link-playlist">
                    🎶 完整版
                </a>
            `;
        }

        if (album.purchaseUrl) {
            externalLinksHtml += `
                <a href="${album.purchaseUrl}" target="_blank" class="external-link external-link-purchase">
                    🛒 購買
                </a>
            `;
        }

        const videoContainerHtml = backdropUrl ? `
            <div class="disc-video-container">
                <div class="disc-video-placeholder" style="--thumbnail-url: url('${backdropUrl}')"
                     onclick="playXFDInCard(this, '${album.xfdVideoId}')">
                    <div class="play-icon">▶</div>
                </div>
            </div>
        ` : '<div class="disc-video-container" style="background: #ddd;"></div>';

        return `
            <div class="disc-card disc-card-participation">
                ${videoContainerHtml}
                <div class="disc-header">
                    <div class="disc-title">${escapeHtml(album.title)}</div>
                    <div class="disc-circle">${escapeHtml(album.circle)}</div>
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
        console.error('Error creating participation album card:', error, 'Album:', album);
        return '';
    }
}

// 根據類型建立卡片
function createAlbumCard(album) {
    if (album.circle) {
        return createParticipationAlbumCard(album);
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

    container.innerHTML = allCategoriesHtml;
}

// 輔助函數：HTML 轉義
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 在卡片內播放 XFD
function playXFDInCard(element, videoId) {
    const card = element.closest('.disc-card');
    const videoContainer = card.querySelector('.disc-video-container');
    
    videoContainer.innerHTML = `
        <iframe src="${createYoutubeEmbed(videoId)}" 
                allowfullscreen 
                style="width: 100%; height: 100%; border: none;"></iframe>
    `;
}

// 在卡片內播放曲目
function playTrackInCard(element, videoUrl) {
    const videoId = new URL(videoUrl).searchParams.get('v');
    const card = element.closest('.disc-card');
    const videoContainer = card.querySelector('.disc-video-container');
    
    videoContainer.innerHTML = `
        <iframe src="${createYoutubeEmbed(videoId)}" 
                allowfullscreen 
                style="width: 100%; height: 100%; border: none;"></iframe>
    `;
}

// 確保 DOM 完全加載後再執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateDiscography);
} else {
    generateDiscography();
}
