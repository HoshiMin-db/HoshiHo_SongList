import os
import json
import re
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime, timedelta

# 從環境變量中讀取 Google API 憑證
google_sheets_credentials = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
google_api_key = os.getenv('GOOGLE_API_KEY')

if not google_sheets_credentials or not google_api_key:
    raise ValueError("Missing Google API credentials or API key")

try:
    credentials_info = json.loads(google_sheets_credentials)
    credentials = service_account.Credentials.from_service_account_info(credentials_info)
except Exception as e:
    raise ValueError("Invalid Google Sheets credentials") from e

# YouTube Data API 客戶端
youtube = build('youtube', 'v3', developerKey=google_api_key)

# 設定過濾日期 (日本標準時間)
FILTER_DATE = datetime.strptime('2024-01-25', '%Y-%m-%d')
JST_OFFSET = timedelta(hours=9)  # 日本標準時間與 UTC 的時差

def get_video_ids_from_playlist(playlist_id):
    video_ids = []
    request = youtube.playlistItems().list(
        part='contentDetails',
        playlistId=playlist_id,
        maxResults=50
    )
    while request:
        response = request.execute()
        print(f"Fetched {len(response['items'])} items from playlist")
        for item in response['items']:
            video_id = item['contentDetails']['videoId']
            video_date = get_video_date(video_id)
            # 將 UTC 時間轉換為 JST 時間
            video_date_jst = video_date + JST_OFFSET
            print(f"Video ID: {video_id}, Video Date (JST): {video_date_jst}")
            if video_date_jst > FILTER_DATE:
                video_ids.append((video_id, video_date_jst))
        request = youtube.playlistItems().list_next(request, response)
    return video_ids

def get_video_date(video_id):
    request = youtube.videos().list(part='snippet', id=video_id)
    response = request.execute()
    video_date_str = response['items'][0]['snippet']['publishedAt']
    video_date = datetime.strptime(video_date_str, '%Y-%m-%dT%H:%M:%SZ')
    return video_date

def get_comments(video_id):
    comments = []
    request = youtube.commentThreads().list(part='snippet', videoId=video_id, maxResults=100)
    while request:
        response = request.execute()
        print(f"Fetched {len(response['items'])} comments for video ID: {video_id}")
        for item in response['items']:
            comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
            comments.append(comment)
        request = youtube.commentThreads().list_next(request, response)
    return comments

def extract_timestamps(comments):
    timestamps = []
    # 更新正則表達式來匹配提供的時間軸留言格式
    pattern = re.compile(r'(\d{2}:\d{2}:\d{2})\s+(.+)\s+/\s+(.+)')
    for comment in comments:
        matches = pattern.findall(comment)
        for match in matches:
            timestamps.append(match)
    print(f"Extracted {len(timestamps)} timestamps from comments")
    return timestamps

def write_timestamps_to_file(video_id, video_date, timestamps):
    output_dir = 'timeline'
    os.makedirs(output_dir, exist_ok=True)
    
    file_name = video_date.strftime('%Y%m%d') + '.txt'
    file_path = os.path.join(output_dir, file_name)
    
    # 檢查文件是否已經存在
    if os.path.exists(file_path):
        print(f"File {file_name} already exists. Skipping.")
        return

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(f'ID = {video_id}\n')
        for time, song, artist in timestamps:
            f.write(f'{time} | {song} | {artist} | \n')
    
    print(f"File {file_name} has been created successfully.")

def main():
    playlist_id = 'PL7H5HbMMfm_lUoLIkPAZkhF_W0oDf5WEk'
    
    video_ids_dates = get_video_ids_from_playlist(playlist_id)
    print(f"Found {len(video_ids_dates)} videos after filtering by date")
    
    for video_id, video_date in video_ids_dates:
        comments = get_comments(video_id)
        timestamps = extract_timestamps(comments)
        if timestamps:
            write_timestamps_to_file(video_id, video_date, timestamps)
        else:
            print(f"No timestamps found for video ID: {video_id}")

if __name__ == '__main__':
    main()
