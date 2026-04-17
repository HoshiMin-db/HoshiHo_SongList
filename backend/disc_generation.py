import json
import hashlib
import os
import re
from urllib.parse import urlparse, parse_qs
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# 從環境變量中讀取 Google API 憑證
google_sheets_credentials = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
google_api_key = os.getenv('GOOGLE_API_KEY')

if not google_sheets_credentials or not google_api_key:
    raise ValueError("缺少 Google API 憑證或 API 密鑰")

try:
    credentials_info = json.loads(google_sheets_credentials)
    credentials = service_account.Credentials.from_service_account_info(credentials_info)
except Exception as e:
    raise ValueError("無效的 Google Sheets 憑證") from e

# YouTube Data API 客戶端
youtube = build('youtube', 'v3', developerKey=google_api_key)

# 路徑處理改用 os.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DISC_FILE_PATH = os.path.join(BASE_DIR, 'disc', 'disc.txt')
CACHE_FILE_PATH = os.path.join(BASE_DIR, 'disc', 'disc.json')

def extract_youtube_id(url_or_id):
    """
    安全地提取 YouTube ID (修正 CodeQL Incomplete URL substring sanitization)
    """
    if not url_or_id:
        return ""
    
    val = url_or_id.strip()
    # 如果已經是 11 碼 ID
    if len(val) == 11 and not ('/' in val or '.' in val):
        return val

    try:
        parsed = urlparse(val)
        if parsed.netloc == 'youtu.be':
            return parsed.path.lstrip('/')
        if 'youtube.com' in parsed.netloc:
            if parsed.path == '/watch':
                return parse_qs(parsed.query).get('v', [None])[0]
            if parsed.path.startswith(('/embed/', '/v/')):
                return parsed.path.split('/')[2]
    except:
        pass
    return val

def is_valid_playlist_id(playlist_id):
    """驗證 YouTube Playlist ID 是否有效"""
    if not playlist_id: return False
    pid = playlist_id.strip()
    # 簡單的正則檢查：通常以 PL, OL, UU 等開頭
    return bool(re.match(r'^[A-Za-z0-9_-]{12,}$', pid))

def fetch_youtube_playlist_tracks(playlist_url):
    """抓取 YouTube 播放清單中的曲目"""
    playlist_id = extract_youtube_id(playlist_url)
    if not is_valid_playlist_id(playlist_id):
        return []

    tracks = []
    try:
        request = youtube.playlistItems().list(
            part="snippet",
            playlistId=playlist_id,
            maxResults=50
        )
        response = request.execute()

        for item in response.get('items', []):
            snippet = item['snippet']
            tracks.append({
                "title": snippet['title'],
                "videoId": snippet.get('resourceId', {}).get('videoId', '')
            })
    except HttpError as e:
        print(f"抓取播放清單 {playlist_id} 失敗: {e}")
    except Exception as e:
        print(f"未知錯誤: {e}")
    
    return tracks

def parse_disc_file():
    """解析 disc.txt 檔案"""
    if not os.path.exists(DISC_FILE_PATH):
        raise FileNotFoundError(f"找不到檔案: {DISC_FILE_PATH}")

    discography = {}
    current_category = None

    with open(DISC_FILE_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue

            # 處理分類 [# 分類名稱|分類描述]
            if line.startswith('[#'):
                parts = line[2:-1].split('|')
                cat_id = parts[0].strip()
                cat_name = parts[0].strip()
                cat_desc = parts[1].strip() if len(parts) > 1 else ""
                
                current_category = cat_id
                discography[current_category] = {
                    "name": cat_name,
                    "description": cat_desc,
                    "albums": []
                }
                continue

            if current_category and '|' in line:
                fields = line.split('|')
                # 通用欄位解析
                title = fields[0].strip()
                f_type = fields[1].strip()
                release_date = fields[2].strip()
                yt_url = fields[3].strip() if len(fields) > 3 else ""
                purchase_url = fields[4].strip() if len(fields) > 4 else ""
                video_id = fields[5].strip() if len(fields) > 5 else ""

                album = {
                    "title": title,
                    "type": f_type,
                    "releaseDate": release_date,
                    "ytUrl": yt_url,
                    "purchaseUrl": purchase_url,
                    "xfdVideoId": extract_youtube_id(video_id),
                    "tracks": fetch_youtube_playlist_tracks(yt_url) if yt_url else []
                }

                # 特殊處理 Participation 類型的索引
                if current_category == "Participation" and len(fields) > 6:
                    indices = [int(i.strip()) for i in fields[6].split(',') if i.strip().isdigit()]
                    album["participationIndices"] = indices
                else:
                    album["participationIndices"] = []

                discography[current_category]["albums"].append(album)

    return discography

def save_to_json(data, file_path):
    # 確保資料夾存在
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)
    print(f"\n✓ 成功保存到 {file_path}")

if __name__ == "__main__":
    print("開始處理 disc.txt...\n")
    try:
        data = parse_disc_file()
        save_to_json(data, CACHE_FILE_PATH)
        print("\n處理完成！")
    except Exception as e:
        print(f"\n致命錯誤: {e}")
