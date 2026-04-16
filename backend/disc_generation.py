import json
import hashlib
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

# 從環境變量中讀取 Google API 憑證
google_sheets_credentials = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
google_api_key = os.getenv('GOOGLE_API_KEY')

if not google_sheets_credentials or not google_api_key:
    raise ValueError("缺少Google API憑證或API密鑰")

try:
    credentials_info = json.loads(google_sheets_credentials)
    credentials = service_account.Credentials.from_service_account_info(credentials_info)
except Exception as e:
    raise ValueError("無效的Google Sheets憑證") from e

# YouTube Data API 客戶端
youtube = build('youtube', 'v3', developerKey=google_api_key)

DISC_FILE_PATH = './disc/disc.txt'
CACHE_FILE_PATH = './disc/disc.json'

def fetch_youtube_playlist_tracks(playlist_id):
    request = youtube.playlistItems().list(
        part="snippet",
        playlistId=playlist_id,
        maxResults=50
    )
    response = request.execute()
    
    tracks = []
    for item in response.get("items", []):
        track = {
            "title": item["snippet"]["title"],
            "videoId": item["snippet"]["resourceId"]["videoId"]
        }
        tracks.append(track)
    
    return tracks

def extract_video_id(url_or_id):
    """
    從 YouTube URL 或 ID 中提取影片 ID
    """
    if not url_or_id:
        return None
    
    # 如果是直接 ID
    if not url_or_id.startswith('http'):
        return url_or_id.strip()
    
    try:
        url = url_or_id
        if 'youtu.be' in url:
            return url.split('youtu.be/')[-1].split('?')[0]
        elif 'youtube.com' in url:
            return url.split('v=')[-1].split('&')[0]
    except:
        pass
    
    return url_or_id.strip()

def parse_participation_indices(participation_str):
    """
    解析參與歌曲索引
    例如："0,2,4" -> [0, 2, 4]
    """
    if not participation_str or not participation_str.strip():
        return []
    
    try:
        indices = [int(x.strip()) for x in participation_str.split(',')]
        return indices
    except:
        return []

def parse_disc_file():
    discography = {
        "armony": {"name": "Armony", "description": "音樂企劃Armony的作品", "albums": []},
        "other_circles": {"name": "Other Circles", "description": "參與其他社團的作品", "albums": []},
        "solo": {"name": "Solo Works", "description": "個人作品", "albums": []}
    }

    current_category = None
    with open(DISC_FILE_PATH, 'r', encoding='utf-8') as file:
        for line in file:
            trimmed_line = line.strip()
            if not trimmed_line:
                continue

            if trimmed_line.startswith('[') and trimmed_line.endswith(']'):
                category_name = trimmed_line[1:-1]
                if category_name == 'Armony':
                    current_category = 'armony'
                elif category_name == 'Other Circles':
                    current_category = 'other_circles'
                elif category_name == 'Solo Works':
                    current_category = 'solo'
                continue

            if current_category:
                parts = (trimmed_line.split('|') + [None] * 7)[:7]
                title, field2, release_date, yt_url, purchase_url, video_id, participation = parts
                
                yt_url = yt_url.strip() if yt_url else None
                purchase_url = purchase_url.strip() if purchase_url else None
                video_id = extract_video_id(video_id) if video_id else None
                
                if current_category == 'other_circles':
                    # Other Circles: 作品名稱|社團名稱|發售日|YouTube播放清單ID|購買連結|XFD影片ID|參與索引
                    participation_indices = parse_participation_indices(participation)
                    
                    album = {
                        "title": title.strip(),
                        "circle": field2.strip(),  # 社團名稱
                        "releaseDate": release_date.strip(),
                        "ytUrl": yt_url,
                        "purchaseUrl": purchase_url,
                        "xfdVideoId": video_id,
                        "participationIndices": participation_indices,  # 新增：參與歌曲索引
                        "tracks": fetch_youtube_playlist_tracks(yt_url) if yt_url else []
                    }
                else:
                    # Armony/Solo: 標題|類型|發售日|YouTube播放清單ID|購買連結|XFD影片ID
                    album = {
                        "title": title.strip(),
                        "type": field2.strip(),  # 類型
                        "releaseDate": release_date.strip(),
                        "ytUrl": yt_url,
                        "purchaseUrl": purchase_url,
                        "xfdVideoId": video_id,
                        "participationIndices": [],  # 不適用
                        "tracks": fetch_youtube_playlist_tracks(yt_url) if yt_url else []
                    }
                
                discography[current_category]["albums"].append(album)

    return discography
    
def save_to_json(data, file_path):
    with open(file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    discography = parse_disc_file()
    save_to_json(discography, CACHE_FILE_PATH)
