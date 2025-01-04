import json
import re
import os
from datetime import datetime

def parse_time(time_str):
    """將時間字符串轉換為秒數"""
    # 確保用半角字符 ':'
    time_str = time_str.replace('：', ':')
    parts = list(map(int, time_str.split(':')))
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def create_link(video_id, time_str):
    """根據影片ID和時間創建超連結"""
    time_in_seconds = parse_time(time_str)
    return f"https://www.youtube.com/watch?v={video_id}&t={time_in_seconds}s"

def process_timeline(file_path, date_str):
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
        # 第一行是影片ID
        video_id = lines[0].strip().split('=')[1].strip()
        
        # 解析每行時間軸信息
        for line in lines[1:]:
            parts = line.strip().split(' | ')
            if len(parts) == 4:
                time_str, song_name, artist, source = parts
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
    timeline_dir = 'timeline'
    all_data = []
    
    # 遍歷timeline資料夾中的所有文件
    for filename in os.listdir(timeline_dir):
        file_path = os.path.join(timeline_dir, filename)
        date_str = filename.split('.')[0]  # 假設文件名是日期格式
        try:
            data = process_timeline(file_path, date_str)
            all_data.extend(data)
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
    
    # 將數據保存到data.json文件中
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
