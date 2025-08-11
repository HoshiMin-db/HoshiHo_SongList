import os
import json
from googleapiclient.discovery import build
from google.oauth2 import service_account
from googleapiclient.errors import HttpError

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

def check_video_status(video_id):
    """檢查影片狀態"""
    try:
        response = youtube.videos().list(
            part='status',
            id=video_id
        ).execute()
        
        # 如果沒有找到影片，表示影片已被刪除
        if not response.get('items'):
            return True
        return False
    except HttpError as e:
        if e.resp.status == 404:  # 影片不存在
            return True
        print(f"檢查影片 {video_id} 時發生錯誤: {e}")
        return False

def get_all_video_ids():
    """從 data.json 中獲取所有影片 ID"""
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        video_ids = set()
        for entry in data:
            for date_info in entry.get('dates', []):
                if 'link' in date_info:
                    # 從 YouTube URL 中提取影片 ID
                    video_id = date_info['link'].split('v=')[-1].split('&')[0]
                    video_ids.add(video_id)
        return video_ids
    except Exception as e:
        print(f"讀取 data.json 時發生錯誤: {e}")
        return set()

def update_exceptions_file(deleted_video_ids):
    """更新 exceptions.txt 文件"""
    try:
        # 讀取現有的 exceptions.txt
        existing_content = {}
        if os.path.exists('timeline/exceptions.txt'):
            with open('timeline/exceptions.txt', 'r', encoding='utf-8') as f:
                for line in f:
                    if '|' in line:
                        key, value = line.strip().split('|', 1)
                        existing_content[key] = value

        # 更新或添加已刪除影片的 ID
        deleted_ids_str = ','.join(sorted(deleted_video_ids))
        existing_content['private_id'] = deleted_ids_str

        # 寫回文件，保持原有順序並確保換行正確
        with open('timeline/exceptions.txt', 'w', encoding='utf-8') as f:
            for key, value in existing_content.items():
                f.write(f"{key}|{value}\n")
                
        print(f"已更新 exceptions.txt，新增 {len(deleted_video_ids)} 個已刪除影片ID")
    except Exception as e:
        print(f"更新 exceptions.txt 時發生錯誤: {e}")

def main():
    # 獲取所有影片 ID
    video_ids = get_all_video_ids()
    print(f"找到 {len(video_ids)} 個影片需要檢查")

    # 檢查每個影片的狀態
    deleted_video_ids = set()
    for video_id in video_ids:
        if check_video_status(video_id):
            print(f"影片已刪除: {video_id}")
            deleted_video_ids.add(video_id)

    # 更新 exceptions.txt
    if deleted_video_ids:
        update_exceptions_file(deleted_video_ids)
    else:
        print("未發現已刪除的影片")

if __name__ == '__main__':
    main()
