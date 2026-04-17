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

// 獲取 YouTube 縮圖 URL
function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
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

// 創建主作品卡片（Armony）
function createMainAlbumCard(album) {
    try {
        const xfdVideoId = album.xfdVideoId;
        // 獲取並應用背景縮圖
        const backdropUrl = xfdVideoId ? getYouTubeThumbnail(xfdVideoId, 'hqdefault') : null;
        const backgroundStyle = backdropUrl ? `background-image: url('${backdropUrl}'); background-size: cover; background-position: center;` : 'background: #ddd;';

        // 建構曲目列表 - 點擊按鈕在卡片內播放
        const tracksList = album.tracks.map((track, index) => {
            return `
                <li class="track-item">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-info">
                        <div class="track-title">${escapeHtml(track.title)}</div>
                        <div class="track-credit">${track.credits || ''}</div>
                    </div>
                    <button class="play-button-small" onclick="playInCard(this, 'https://www.youtube.com/watch?v=${track.videoId}')">▷</button>
                </li>
            `;
        }).join('');

        // 改用全局函數：window.parseYouTubeUrl
        let ytLink = '';
        if (album.ytUrl && window.parseYouTubeUrl) {
            const ytInfo = window.parseYouTubeUrl(album.ytUrl);
            ytLink = ytInfo.type === 'playlist' 
                ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
                : `https://youtu.be/${ytInfo.id}`;
        }

        // 使用 page-tl.js 的翻譯函數
        let externalLinksHtml = '';
        
        if (album.xfdVideoId) {
            const sampleText = getTranslation('sample');
            externalLinksHtml += `
                <button class="external-link external-link-xfd" 
                        onclick="playInCardById(this, '${album.xfdVideoId}')"
                        title="🎵 ${sampleText}">
                    🎵 ${sampleText}
                </button>
            `;
        }

        if (ytLink) {
            const playlistText = getTranslation('playlist');
            externalLinksHtml += `
                <a href="${ytLink}" target="_blank" class="external-link external-link-playlist"
                   title="🎶 ${playlistText}">
                    🎶 ${playlistText}
                </a>
            `;
        }

        if (album.purchaseUrl) {
            const purchaseText = getTranslation('purchase');
            externalLinksHtml += `
                <a href="${album.purchaseUrl}" target="_blank" class="external-link external-link-purchase"
                   title="🛒 ${purchaseText}">
                    🛒 ${purchaseText}
                </a>
            `;
        }

        // 改用全局函數
        let videoContainerHtml = '';
        if (album.xfdVideoId) {
            const embedUrl = window.createYoutubeEmbedFromId(album.xfdVideoId);
            if (embedUrl) {
                videoContainerHtml = `
                    <div class="disc-video-container">
                        <iframe src="${embedUrl}" 
                                allowfullscreen 
                                style="width: 100%; height: 100%; border: none;"></iframe>
                    </div>
                `;
            }
        } else {
            // 應用背景縮圖作為占位符
            videoContainerHtml = `<div class="disc-video-container" style="${backgroundStyle}"></div>`;
        }

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
        const xfdVideoId = album.xfdVideoId;
        // 獲取並應用背景縮圖
        const backdropUrl = xfdVideoId ? getYouTubeThumbnail(xfdVideoId, 'hqdefault') : null;
        const backgroundStyle = backdropUrl ? `background-image: url('${backdropUrl}'); background-size: cover; background-position: center;` : 'background: #ddd;';

        // 建構曲目列表
        const tracksList = album.tracks.map((track, index) => {
            const isParticipating = album.participationIndices && album.participationIndices.includes(index);
            const participationBadge = isParticipating ? '<span class="participation-badge">✦</span>' : '';
            
            return `
                <li class="track-item ${isParticipating ? 'track-item-participation' : ''}">
                    <span class="track-number">${index + 1}</span>
                    ${participationBadge}
                    <div class="track-info">
                        <div class="track-title">${escapeHtml(track.title)}</div>
                        <div class="track-credit">${track.credits || ''}</div>
                    </div>
                    <button class="play-button-small" onclick="playInCard(this, 'https://www.youtube.com/watch?v=${track.videoId}')">▷</button>
                </li>
            `;
        }).join('');

        // 改用全局函數：window.parseYouTubeUrl
        let ytLink = '';
        if (album.ytUrl && window.parseYouTubeUrl) {
            const ytInfo = window.parseYouTubeUrl(album.ytUrl);
            ytLink = ytInfo.type === 'playlist' 
                ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
                : `https://youtu.be/${ytInfo.id}`;
        }

        // 使用 page-tl.js 的翻譯函數
        let externalLinksHtml = '';
        
        if (album.xfdVideoId) {
            const sampleText = getTranslation('sample');
            externalLinksHtml += `
                <button class="external-link external-link-xfd" 
                        onclick="playInCardById(this, '${album.xfdVideoId}')"
                        title="🎵 ${sampleText}">
                    🎵 ${sampleText}
                </button>
            `;
        }

        if (ytLink) {
            const playlistText = getTranslation('playlist');
            externalLinksHtml += `
                <a href="${ytLink}" target="_blank" class="external-link external-link-playlist"
                   title="🎶 ${playlistText}">
                    🎶 ${playlistText}
                </a>
            `;
        }

        if (album.purchaseUrl) {
            const purchaseText = getTranslation('purchase');
            externalLinksHtml += `
                <a href="${album.purchaseUrl}" target="_blank" class="external-link external-link-purchase"
                   title="🛒 ${purchaseText}">
                    🛒 ${purchaseText}
                </a>
            `;
        }

        // 改用全局函數：window.createYoutubeEmbedFromId
        let videoContainerHtml = '';
        if (album.xfdVideoId) {
            const embedUrl = window.createYoutubeEmbedFromId(album.xfdVideoId);
            if (embedUrl) {
                videoContainerHtml = `
                    <div class="disc-video-container">
                        <iframe src="${embedUrl}" 
                                allowfullscreen 
                                style="width: 100%; height: 100%; border: none;"></iframe>
                    </div>
                `;
            }
        } else {
            // 應用背景縮圖作為占位符
            videoContainerHtml = `<div class="disc-video-container" style="${backgroundStyle}"></div>`;
        }

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

// 等待 youtube-player.js 載入完成，然後檢查全局函數是否存在
function initDiscGeneration() {
    if (typeof window.createYoutubeEmbedFromId === 'undefined') {
        console.warn('Waiting for youtube-player.js to load...');
        setTimeout(initDiscGeneration, 100);
        return;
    }
    
    // 全局函數已載入，執行專輯生成
    generateDiscography();
}

// 確保 DOM 完全加載後再執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiscGeneration);
} else {
    initDiscGeneration();
}
