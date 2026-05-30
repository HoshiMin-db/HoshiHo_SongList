document.addEventListener("DOMContentLoaded", function() {
    const VALID_HOSTS = ['www.youtube.com', 'music.youtube.com', 'youtu.be'];
    const YT_TYPES = { PLAYLIST: 'playlist', VIDEO: 'video', MUSIC_TRACK: 'music_track' };
    const YT_ALLOW_POLICIES = "autoplay; encrypted-media; fullscreen; picture-in-picture";

    // ==================== [ 第一區：核心解析與驗證工具 ] ====================

    // 統一的影片 ID 與時間解析器
    function parseVideoDetails(url) {
        try {
            const urlObj = new URL(url);
            // 驗證 Host
            if (!VALID_HOSTS.some(host => urlObj.hostname === host || urlObj.hostname === 'www.' + host)) {
                return null;
            }

            let videoId = null;
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else {
                videoId = urlObj.searchParams.get('v');
            }

            if (!videoId) return null;

            // 處理時間戳記 (支援 t=90, t=90s, t=1m30s)
            let startTime = 0;
            const tParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('start');
            if (tParam) {
                // 將 1m30s 轉成秒數
                const timeMatch = tParam.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
                if (timeMatch) {
                    const h = parseInt(timeMatch[1] || 0) * 3600;
                    const m = parseInt(timeMatch[2] || 0) * 60;
                    const s = parseInt(timeMatch[3] || 0);
                    startTime = h + m + s;
                } else if (!isNaN(tParam)) {
                    startTime = parseInt(tParam);
                }
            }

            return { videoId, startTime };
        } catch (e) {
            return null; // 非法 URL 結構
        }
    }

    function isValidYouTubeURL(url) {
        return parseVideoDetails(url) !== null;
    }

    function extractVideoId(url) {
        const details = parseVideoDetails(url);
        return details ? details.videoId : null;
    }

    function parseYouTubeUrl(url) {
        if (!url) return { id: '', type: YT_TYPES.VIDEO };
        
        if (url.startsWith('OLAK5uy_')) return { id: url, type: YT_TYPES.PLAYLIST };
        
        // 嘗試提取標準影片 ID
        const details = parseVideoDetails(url);
        if (details) return { id: details.videoId, type: YT_TYPES.VIDEO };

        // 處理播放清單
        try {
            const urlObj = new URL(url);
            if (urlObj.searchParams.has('list')) {
                return { id: urlObj.searchParams.get('list'), type: YT_TYPES.PLAYLIST };
            }
        } catch (e) { /* fallthrough */ }

        return { id: url, type: YT_TYPES.PLAYLIST }; // Fallback
    }

    // ==================== [ 第二區：播放器嵌入生成 ] ====================

    function createYoutubeEmbedFromId(videoId, startTime = 0) {
        if (!videoId || typeof videoId !== 'string') return null;
        return `https://www.youtube.com/embed/${videoId.trim()}?start=${startTime}&controls=1&modestbranding=1`;
    }

    function createYoutubeEmbed(url) {
        const details = parseVideoDetails(url);
        if (!details) return null;
        return createYoutubeEmbedFromId(details.videoId, details.startTime);
    }

    // 統一的 Iframe 注入器 (DRY 優化)
    function injectIframe(container, embedUrl) {
        if (!container || !embedUrl) return;
        const finalUrl = embedUrl.includes('?') ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`;
        container.innerHTML = `
            <iframe src="${finalUrl}" 
                    allow="${YT_ALLOW_POLICIES}" 
                    allowfullscreen 
                    style="width: 100%; height: 100%; border: none;"></iframe>
        `;
    }

    function playInCard(element, url) {
        const embedUrl = createYoutubeEmbed(url);
        if (embedUrl) {
            injectIframe(element.closest('.disc-card')?.querySelector('.disc-video-container'), embedUrl);
        } else {
            console.error("Invalid YouTube URL:", url);
        }
    }

    function playInCardById(element, videoId) {
        const embedUrl = createYoutubeEmbedFromId(videoId);
        if (embedUrl) {
            injectIframe(element.closest('.disc-card')?.querySelector('.disc-video-container'), embedUrl);
        }
    }

    // ==================== [ 第三區：行動裝置 Deep Link 與浮動播放器 ] ====================

    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    // 優先喚醒 App，失敗則開啟新分頁
    function openInAppOrBrowser(url) {
        const details = parseVideoDetails(url);
        if (!details) {
            window.open(url, '_blank');
            return;
        }

        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        let appOpened = false;
        const timeParam = details.startTime > 0 ? `&t=${details.startTime}s` : '';

        // 使用 Visibility API 判斷是否成功跳轉出瀏覽器進入 App
        const visibilityHandler = () => {
            if (document.hidden) appOpened = true;
        };
        document.addEventListener('visibilitychange', visibilityHandler, { once: true });

        // 嘗試觸發 Deep Link，並將 timeParam 附加在 videoId 後面
        if (/android/i.test(userAgent)) {
            // Android Intent Scheme
            window.location.href = `intent://youtube.com/watch?v=${details.videoId}${timeParam}#Intent;package=com.google.android.youtube;scheme=https;end`;
        } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            // iOS Custom URL Scheme
            window.location.href = `youtube://watch?v=${details.videoId}${timeParam}`;
        } else {
            window.open(url, '_blank');
            return;
        }

        // Fallback 機制：如果 3 秒後網頁依然在前景，代表用戶沒安裝 App，此時再開新分頁
        setTimeout(() => {
            document.removeEventListener('visibilitychange', visibilityHandler);
            if (!appOpened) {
                window.open(url, '_blank');
            }
        }, 3000);
    }

    function openFloatingPlayer(url) {
        if (!isValidYouTubeURL(url)) {
            console.error("Invalid YouTube URL:", url);
            return;
        }

        if (isMobileDevice()) {
            openInAppOrBrowser(url); // 呼叫新的喚醒邏輯
        } else {
            const floatingPlayerContainer = document.getElementById('floatingPlayerContainer');
            const floatingPlayer = document.getElementById('floatingPlayer');
            
            if (floatingPlayerContainer && floatingPlayer) {
                const embedUrl = createYoutubeEmbed(url);
                if (embedUrl) {
                    floatingPlayer.src = embedUrl;
                    floatingPlayer.style.width = '100%';
                    floatingPlayer.style.height = '100%';
                    floatingPlayerContainer.style.display = 'block';
                }
            }
        }
    }

    function closeFloatingPlayer() {
        const floatingPlayerContainer = document.getElementById('floatingPlayerContainer');
        const floatingPlayer = document.getElementById('floatingPlayer');
        if (floatingPlayerContainer && floatingPlayer) {
            floatingPlayer.src = '';
            floatingPlayerContainer.style.display = 'none';
        }
    }

    // ==================== [ 導出至全域 ] ====================
    window.isValidYouTubeURL = isValidYouTubeURL;
    window.parseYouTubeUrl = parseYouTubeUrl;  
    window.extractVideoId = extractVideoId;
    window.createYoutubeEmbed = createYoutubeEmbed;
    window.createYoutubeEmbedFromId = createYoutubeEmbedFromId;
    window.openFloatingPlayer = openFloatingPlayer;
    window.closeFloatingPlayer = closeFloatingPlayer;
    window.playInCard = playInCard;
    window.playInCardById = playInCardById;
});
