import json
import os
import re
from urllib.parse import urlparse, parse_qs
from google.oauth2 import service_account
from googleapiclient.discovery import build

# 環境變數與憑證設定
google_sheets_credentials = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
google_api_key = os.getenv('GOOGLE_API_KEY')

if not google_sheets_credentials or not google_api_key:
    raise ValueError("缺少 Google API 憑證或 API 密鑰")

credentials_info = json.loads(google_sheets_credentials)
credentials = service_account.Credentials.from_service_account_info(credentials_info)
youtube = build('youtube', 'v3', developerKey=google_api_key)

# 路徑定位 (確保 GitHub Actions 執行時能找到根目錄的 disc 資料夾)[cite: 1]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
DISC_FILE_PATH = os.path.join(ROOT_DIR, 'disc', 'disc.txt')
CACHE_FILE_PATH = os.path.join(ROOT_DIR, 'disc', 'disc.json')

def extract_youtube_id(url_or_id):
    if not url_or_id: return ""
    val = url_or_id.strip()
    if not ('/' in val or '.' in val or '?' in val): return val
    try:
        parsed = urlparse(val)
        if parsed.netloc == 'youtu.be': return parsed.path.lstrip('/')
        if parsed.netloc in ('www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com'):
            qs = parse_qs(parsed.query)
            if parsed.path == '/playlist': return qs.get('list', [None])[0]
            if parsed.path == '/watch':
                if 'list' in qs: return qs.get('list')[0]
                return qs.get('v', [None])[0]
            if parsed.path.startswith(('/embed/', '/v/')):
                parts = parsed.path.split('/')
                if len(parts) >= 3: return parts[2]
            if parsed.path.startswith('/shorts/'): return parsed.path.split('/')[2]
    except Exception: pass
    return val

def fetch_youtube_playlist_tracks(playlist_url):
    playlist_id = extract_youtube_id(playlist_url)
    if not playlist_id or len(playlist_id) < 12: return []
    tracks = []
    try:
        request = youtube.playlistItems().list(part="snippet", playlistId=playlist_id, maxResults=50)
        response = request.execute()
        for item in response.get('items', []):
            snippet = item['snippet']
            tracks.append({"title": snippet['title'], "videoId": snippet.get('resourceId', {}).get('videoId', '')})
    except Exception: pass
    return tracks

def parse_disc_file():
    """解析 disc.txt 檔案並對應至固定 ID"""
    if not os.path.exists(DISC_FILE_PATH):
        raise FileNotFoundError(f"找不到檔案: {DISC_FILE_PATH}")

    # 初始化固定結構，確保 ID 不會變動
    discography = {
        "armony": {"name": "Armony", "description": "音樂企劃Armony的作品", "albums": []},
        "other_circles": {"name": "Other Circles", "description": "參與其他社團的作品", "albums": []},
        "solo": {"name": "Solo Works", "description": "個人作品", "albums": []}
    }

    current_id = None
    
    # 使用 utf-8-sig 處理可能存在的 BOM
    with open(DISC_FILE_PATH, 'r', encoding='utf-8-sig') as f:
        for line in f:
            trimmed = line.strip()
            
            # 1. 跳過空行與註釋
            if not trimmed or trimmed.startswith('//'):
                continue

            # 2. 處理分類標籤 (對應固定 ID)
            if trimmed.startswith('[') and trimmed.endswith(']'):
                cat_name = trimmed[1:-1].strip()
                if cat_name == 'Armony':
                    current_id = 'armony'
                elif cat_name == 'Other Circles':
                    current_id = 'other_circles'
                elif cat_name == 'Solo Works':
                    current_id = 'solo'
                else:
                    current_id = None # 未定義的分類則忽略其內容
                continue

            # 3. 處理內容行
            if current_id and '|' in trimmed:
                # 補齊欄位，確保不會因為欄位不足而報錯
                fields = (trimmed.split('|') + [None] * 7)[:7]
                title = fields[0].strip() if fields[0] else ""
                field2 = fields[1].strip() if fields[1] else ""
                release_date = fields[2].strip() if fields[2] else ""
                yt_url = fields[3].strip() if fields[3] else ""
                purchase_url = fields[4].strip() if fields[4] else ""
                xfd_id = extract_youtube_id(fields[5]) if fields[5] else ""
                participation = fields[6].strip() if fields[6] else ""

                if not title: continue

                # 建立基礎物件
                album = {
                    "title": title,
                    "releaseDate": release_date,
                    "ytUrl": yt_url,
                    "purchaseUrl": purchase_url,
                    "xfdVideoId": xfd_id,
                    "tracks": fetch_youtube_playlist_tracks(yt_url) if yt_url else [],
                    "participationIndices": []
                }

                # 根據不同分類使用不同鍵名 (比照舊版邏輯)
                if current_id == 'other_circles':
                    album["circle"] = field2
                    # 處理參與索引
                    if participation:
                        album["participationIndices"] = [int(i.strip()) for i in participation.split(',') if i.strip().isdigit()]
                else:
                    album["type"] = field2
                
                discography[current_id]["albums"].append(album)

    return discography

def save_to_json(data, file_path):
    # 防禦性寫入：如果三個分類都沒抓到資料，不覆蓋舊檔案
    total_albums = sum(len(v["albums"]) for v in data.values())
    if total_albums == 0:
        print("⚠️ 未解析到任何作品，取消寫入以保護原始資料。")
        return

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)
    print(f"✅ 成功更新 {total_albums} 個作品至 {file_path}")

if __name__ == "__main__":
    try:
        data = parse_disc_file()
        save_to_json(data, CACHE_FILE_PATH)
    except Exception as e:
        print(f"❌ 致命錯誤: {e}")
