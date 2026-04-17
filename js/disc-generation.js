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

// 新增：生成外部連結 HTML 的共用函數
function generateExternalLinksHtml(album) {
    let externalLinksHtml = '';
    
    // 樣本按鈕
    if (album.xfdVideoId) {
        const sampleText = getTranslation('sample');
        externalLinksHtml += `
            <button class="external-link external-link-xfd" 
                    onclick="playInCardById(this, '${album.xfdVideoId}')"
                    title="🎵 ${sampleText}">
                <span class="btn-icon">🎵</span> <span class="btn-text">${sampleText}</span>
            </button>
        `;
    }

    // 播放清單連結
    let ytLink = '';
    if (album.ytUrl && window.parseYouTubeUrl) {
        const ytInfo = window.parseYouTubeUrl(album.ytUrl);
        ytLink = ytInfo.type === 'playlist' 
            ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
            : `https://youtu.be/${ytInfo.id}`;
    }
    
    if (ytLink) {
        const playlistText = getTranslation('playlist');
        externalLinksHtml += `
            <a href="${ytLink}" target="_blank" class="external-link external-link-playlist"
               title="🎶 ${playlistText}">
                <span class="btn-icon">🎶</span> <span class="btn-text">${playlistText}</span>
            </a>
        `;
    }

    // 購買連結
    if (album.purchaseUrl) {
        const purchaseText = getTranslation('purchase');
        externalLinksHtml += `
            <a href="${album.purchaseUrl}" target="_blank" class="external-link external-link-purchase"
               title="🛒 ${purchaseText}">
                <span class="btn-icon">🛒</span> <span class="btn-text">${purchaseText}</span>
            </a>
        `;
    }

    return externalLinksHtml;
}

// 修改 createMainAlbumCard - 簡化為使用共用函數
function createMainAlbumCard(album) {
    try {
        const xfdVideoId = album.xfdVideoId;
        const backdropUrl = xfdVideoId ? getYouTubeThumbnail(xfdVideoId, 'hqdefault') : null;
        const backgroundStyle = backdropUrl ? `background-image: url('${backdropUrl}'); background-size: cover; background-position: center;` : 'background: #ddd;';

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

        // 使用共用函數
        const externalLinksHtml = generateExternalLinksHtml(album);

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

// 修改 createParticipationAlbumCard - 簡化為使用共用函數
function createParticipationAlbumCard(album) {
    try {
        const xfdVideoId = album.xfdVideoId;
        const backdropUrl = xfdVideoId ? getYouTubeThumbnail(xfdVideoId, 'hqdefault') : null;
        const backgroundStyle = backdropUrl ? `background-image: url('${backdropUrl}'); background-size: cover; background-position: center;` : 'background: #ddd;';

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

        // 使用共用函數
        const externalLinksHtml = generateExternalLinksHtml(album);

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

// 新增：只更新翻譯文字（不重新生成卡片）
function updateDiscTranslations(lang) {
    document.querySelectorAll('.external-link').forEach(link => {
        const type = link.classList.contains('external-link-xfd') ? 'sample' :
                     link.classList.contains('external-link-playlist') ? 'playlist' : 'purchase';
        const newText = getTranslation(type, lang);
        
        // 更新 Title (滑鼠懸停提示)
        const emoji = link.querySelector('.btn-icon').textContent;
        link.title = `${emoji} ${newText}`;
        
        // 只更新 span 內的文字，不更動 emoji
        const textSpan = link.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = newText;
    });
}

// 匯出為全局函數
window.updateDiscTranslations = updateDiscTranslations;

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
