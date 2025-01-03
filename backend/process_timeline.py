import json
import re
import requests
from datetime import datetime

def parse_time(time_str):
    """將時間字符串轉換為秒數"""
    parts = list(map(int, time_str.split(':')))
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def create_link(video_id, time_str):
    """根據影片ID和時間創建超連結"""
    time_in_seconds = parse_time(time_str)
    return f"https://www.youtube.com/watch?v={video_id}&t={time_in_seconds}s"

def process_timeline(file_content, date_str):
    data = []
    lines = file_content.strip().split('\n')
    
    # 第一行是影片ID
    video_id = lines[0].strip().split('=')[1].strip()
    
    # 解析每行時間軸信息
    for line in lines[1:]:
        match = re.match(r'(\d{2}:\d{2}:\d{2}) - (.*?) - (.*?) - (.*)', line)
        if match:
            time_str, song_name, artist, source = match.groups()
            link = create_link(video_id, time_str)
            data.append({
                'date': date_str,
                'time': time_str,
                'song_name': song_name,
                'artist': artist,
                'source': source,
                'link': link
            })
    return data

def main():
    # 設定時間軸檔案的GitHub URL和日期
    github_url = 'https://raw.githubusercontent.com/HoshiMin-db/HoshiHo_SongList/main/timeline/281023.txt'
    date_str = '2023-10-28'
    
    # 從GitHub獲取時間軸檔案內容
    response = requests.get(github_url)
    if response.status_code == 200:
        file_content = response.text
    else:
        print(f"Failed to fetch file from GitHub. Status code: {response.status_code}")
        return
    
    # 處理時間軸檔案並獲取數據
    data = process_timeline(file_content, date_str)
    
    # 將數據保存到data.json文件中
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
