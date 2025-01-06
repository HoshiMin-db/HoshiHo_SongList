import os
import json
import re
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime, timedelta
import subprocess
from googleapiclient.errors import HttpError

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

# 日本時區偏移
JST_OFFSET = timedelta(hours=9)

def get_video_date(video_id):
    """獲取影片的發布日期（日本時間）"""
    request = youtube.videos().list(
        part='snippet',
        id=video_id
    )
    response = request.execute()
    
    if not response['items']:
        return None
        
    video_date_str = response['items'][0]['snippet']['publishedAt']
    video_date_utc = datetime.strptime(video_date_str, '%Y-%m-%dT%H:%M:%SZ')
    video_date_jst = video_date_utc + JST_OFFSET
    
    return video_date_jst

def get_video_ids_from_playlist(playlist_id):
    """從播放清單獲取影片ID和日期"""
    video_info = []
    request = youtube.playlistItems().list(
        part='contentDetails',
        playlistId=playlist_id,
        maxResults=50
    )
    
    while request:
        response = request.execute()
        for item in response['items']:
            video_id = item['contentDetails']['videoId']
            video_date = get_video_date(video_id)
            
            if video_date:
                video_info.append((video_id, video_date))
                print(f"Found video: {video_id} from {video_date}")
                
        request = youtube.playlistItems().list_next(request, response)
    
    return video_info

def get_timestamp_comment(video_id):
    """獲取包含時間戳標記的留言"""
    try:
        request = youtube.commentThreads().list(
            part='snippet',
            videoId=video_id,
            maxResults=100
        )

        while request:
            response = request.execute()
            for item in response['items']:
                comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
                # 檢查是否包含特定標記
                if '💐🌟🎶タイムスタンプ💐🌟🎶' in comment:
                    return comment

            request = youtube.commentThreads().list_next(request, response)
    
    except HttpError as e:
        print(f"Error fetching comments for video {video_id}: {e}")
        return None

    return None

def clean_html(raw_html):
    """移除HTML標籤並處理換行"""
    clean_text = re.sub(r'<br\s*/?>', '\n', raw_html)  # 替換 <br> 為換行符
    clean_text = re.sub(r'<.*?>', '', clean_text)  # 移除其他HTML標籤
    return clean_text

def save_to_file(video_id, comment, date):
    """保存留言到文件"""
    if not comment:
        print(f"No timestamp comment found for video {video_id}")
        return
        
    output_dir = 'timeline'
    os.makedirs(output_dir, exist_ok=True)
    
    file_name = date.strftime('%Y%m%d') + '.txt'
    file_path = os.path.join(output_dir, file_name)
    
    # 移除HTML標籤並處理換行
    clean_comment = clean_html(comment)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(f'ID = {video_id}\n')
        f.write(clean_comment)
        
    print(f"Saved timestamp comment to {file_path}")

def main():
    playlist_id = 'PL7H5HbMMfm_lUoLIkPAZkhF_W0oDf5WEk'  # 你的播放清單ID
    
    # 獲取播放清單中的所有影片
    video_info = get_video_ids_from_playlist(playlist_id)
    
    for video_id, video_date in video_info:
        print(f"Processing video {video_id} from {video_date}")
        
        file_name = video_date.strftime('%Y%m%d') + '.txt'
        file_path = os.path.join('timeline', file_name)
        
        if not os.path.exists(file_path):
            # 獲取時間戳留言
            timestamp_comment = get_timestamp_comment(video_id)
            
            # 保存到檔案
            if timestamp_comment:
                save_to_file(video_id, timestamp_comment, video_date)
                
                # 推送到 GitHub
                subprocess.run(['git', 'add', file_path])
                subprocess.run(['git', 'commit', '-m', f'Add timestamp comment for video {video_id}'])
                subprocess.run(['git', 'push'])
        else:
            print(f"File {file_name} already exists, skipping...")

if __name__ == '__main__':
    main()
