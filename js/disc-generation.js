//disc-generation.js

// 1. 讀取 JSON 內容[cite: 4]
async function loadDiscData() {
    try {
        const response = await fetch('disc/disc.json');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error loading disc data:', error);
        return null;
    }
}

// 2. 獲取 YouTube 縮圖（用於無影片時的背景）[cite: 4]
function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

// 3. HTML 轉義[cite: 4]
function escapeHtml(text) {
    if (!text) return "";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 4. 生成外部連結（調用 youtube-player.js 的解析邏輯）
function generateExternalLinksHtml(album) {
    let html = '';
    
    // 試聽按鈕：直接調用 window.playInCardById
    if (album.xfdVideoId) {
        html += `
            <button class="external-link external-link-xfd" 
                    onclick="window.playInCardById(this, '${album.xfdVideoId}')">
                <span class="btn-icon">🎵</span>
                <span class="btn-text" data-i18n="sample"></span>
            </button>
        `;
    }

    // 播放清單：利用 window.parseYouTubeUrl 統一處理網址[cite: 8]
    if (album.ytUrl && window.parseYouTubeUrl) {
        const ytInfo = window.parseYouTubeUrl(album.ytUrl);
        const ytLink = ytInfo.type === 'playlist' 
            ? `https://music.youtube.com/playlist?list=${ytInfo.id}`
            : `https://youtu.be/${ytInfo.id}`;
            
        html += `
            <a href="${ytLink}" target="_blank" class="external-link external-link-playlist">
                <span class="btn-icon">🎶</span>
                <span class="btn-text" data-i18n="playlist"></span>
            </a>
        `;
    }

    // 購買連結
    if (album.purchaseUrl) {
        html += `
            <a href="${album.purchaseUrl}" target="_blank" class="external-link external-link-purchase">
                <span class="btn-icon">🛒</span>
                <span class="btn-text" data-i18n="purchase"></span>
            </a>
        `;
    }
    return html;
}

// 5. 建立卡片內容（整合 window.playInCard）[cite: 8]
function createAlbumCard(album) {
    const isParticipation = !!album.circle;
    const xfdVideoId = album.xfdVideoId;

    // 生成曲目列表，點擊調用 window.playInCard[cite: 8]
    const tracksList = album.tracks.map((track, index) => {
        const isPartic = album.participationIndices && album.participationIndices.includes(index);
        const badge = isPartic ? '<span class="participation-badge">✦</span>' : '';
        const trackUrl = `https://www.youtube.com/watch?v=${track.videoId}`;
        
        return `
            <li class="track-item ${isPartic ? 'track-item-participation' : ''}">
                <span class="track-number">${index + 1}</span>
                ${badge}
                <div class="track-info">
                    <div class="track-title">${escapeHtml(track.title)}</div>
                    <div class="track-credit">${track.credits || ''}</div>
                </div>
                <button class="play-button-small" onclick="window.playInCard(this, '${trackUrl}')">▷</button>
            </li>
        `;
    }).join('');

    // 影片容器初始化：使用 window.createYoutubeEmbedFromId[cite: 8]
    let videoContainerHtml = '';
    if (xfdVideoId) {
        const thumb = getYouTubeThumbnail(xfdVideoId, 'hqdefault'); // 使用高品質縮圖
        // 初始只顯示背景圖和一個中央播放按鈕樣式
        videoContainerHtml = `
            <div class="video-placeholder" 
                 style="width:100%; height:100%; background: url('${thumb}') center/cover; cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center;"
                 onclick="window.playInCardById(this, '${xfdVideoId}')">
                <div class="play-overlay-icon" style="font-size: 50px; color: white; opacity: 0.8; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">▶</div>
            </div>`;
    } else {
        videoContainerHtml = `<div style="width:100%;height:100%;background:#333;"></div>`;
    }

    return `
        <div class="disc-card ${isParticipation ? 'disc-card-participation' : 'disc-card-main'}">
            <div class="disc-video-container" style="aspect-ratio: 16/9; background: #000;">${videoContainerHtml}</div>
            <div class="disc-header">
            <div class="disc-title">${escapeHtml(album.title)}</div>
            <!-- 根據是否為社團參與切換 CSS 類名 -->
            <div class="${isParticipation ? 'disc-circle' : 'disc-subtitle'}">
                ${isParticipation ? escapeHtml(album.circle) : album.type}
            </div>
            <div class="disc-release-date">${album.releaseDate}</div>
            </div>
            <ul class="track-list">${tracksList}</ul>
            <div class="external-links">${generateExternalLinksHtml(album)}</div>
        </div>
    `;
}

// 6. 核心生成邏輯與 i18n 觸發[cite: 4]
async function generateDiscography() {
    const container = document.getElementById('discography-container');
    if (!container) return;

    const discography = await loadDiscData();
    if (!discography) return;

    let allHtml = '';
    Object.entries(discography).forEach(([key, category]) => {
        if (category.albums.length === 0) return;
        const albumsHtml = category.albums.map(album => createAlbumCard(album)).join('');
        allHtml += `
            <div class="category-section" id="${key}">
                <h2 class="category-title">${category.name}</h2>
                <p class="category-description">${category.description}</p>
                <div class="disc-container">${albumsHtml}</div>
            </div>
        `;
    });

    container.innerHTML = allHtml;

    // 生成後立即觸發一次翻譯，填充所有 data-i18n 標籤
    if (window.updateUILS) {
        const currentLang = localStorage.getItem('language') || 'zh-TW';
        window.updateUILS(currentLang);
    }
}

// 7. 等待依賴項載入並初始化[cite: 4, 8]
function initDisc() {
    if (typeof window.playInCard === 'undefined' || typeof window.parseYouTubeUrl === 'undefined') {
        setTimeout(initDisc, 100);
        return;
    }
    generateDiscography();
}

initDisc();
