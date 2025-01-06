import json
import os
import re
from datetime import datetime

def parse_time(time_str):
    """將時間字符串轉換為秒數"""
    time_str = time_str.replace('：', ':')
    parts = list(map(int, time_str.split(':')))
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def create_link(video_id, time_str):
    """根據影片ID和時間創建超連結"""
    time_in_seconds = parse_time(time_str)
    return f"https://www.youtube.com/watch?v={video_id}&t={time_in_seconds}s"

def load_exceptions(exceptions_file):
    """從指定文件讀取例外規則"""
    member_exclusive_dates = set()
    acapella_songs = {}  # 按日期存儲清唱標籤
    global_acapella_songs = set()  # 存儲沒有日期的清唱曲名
    acapella_songs_with_artist = {}  # 存儲有日期和歌手的清唱歌曲

    with open(exceptions_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines:
            parts = line.strip().split('|')
            if parts[0] == 'member_exclusive_dates':
                dates = parts[1].split(',')
                member_exclusive_dates.update(dates)
            elif parts[0] == 'acapella_songs':
                if len(parts) == 2:
                    global_acapella_songs.add(parts[1])  # 沒有日期和歌手的曲名
                elif len(parts) == 3:
                    song_name, artist = parts[1], parts[2]
                    if artist not in acapella_songs_with_artist:
                        acapella_songs_with_artist[artist] = set()
                    acapella_songs_with_artist[artist].add(song_name)
                elif len(parts) == 4:
                    song_name, artist, date = parts[1], parts[2], parts[3]
                    if date not in acapella_songs:
                        acapella_songs[date] = {}
                    if artist not in acapella_songs[date]:
                        acapella_songs[date][artist] = set()
                    acapella_songs[date][artist].add(song_name)

    return member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist

def process_timeline(file_path, date_str, member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist):
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

        # 第一行是影片ID
        video_id = lines[0].strip().split('=')[1].strip()
        
        # 根據日期選擇解析規則
        date = datetime.strptime(date_str, "%Y%m%d")
        old_rule_date = datetime.strptime("20240120", "%Y%m%d")
        new_rule_date = datetime.strptime("20240127", "%Y%m%d")

        if date <= old_rule_date:
            # 舊規則解析
            for line in lines[1:]:
                parts = line.strip().split(' | ')
                if len(parts) == 4:
                    time_str, song_name, artist, source = parts
                    link = create_link(video_id, time_str)
                    is_member_exclusive = date_str in member_exclusive_dates
                    is_acapella = (
                        (date_str in acapella_songs and artist in acapella_songs[date_str] and song_name in acapella_songs[date_str][artist]) or 
                        (song_name in global_acapella_songs) or
                        (artist in acapella_songs_with_artist and song_name in acapella_songs_with_artist[artist])
                    )
                    data.append({
                        'date': date_str,
                        'time': time_str,
                        'song_name': song_name,
                        'artist': artist,
                        'source': source,
                        'link': link,
                        'is_member_exclusive': is_member_exclusive,
                        'is_acapella': is_acapella
                    })

        elif date >= new_rule_date:
            # 新規則解析
            for line in lines[1:]:
                try:
                    # 忽略前導的編號和標籤
                    line = re.sub(r'^\d+\.\s+', '', line)
                    parts = line.strip().split('\u3000', 1)
                    if len(parts) == 2:
                        time_str, song_info = parts
                        song_parts = song_info.split(' / ')
                        song_name = song_parts[0].strip()
                        artist = ""
                        source = ""
                        if len(song_parts) > 1:
                            source_artist = song_parts[1].split('』')
                            if len(source_artist) == 2:
                                source = source_artist[0].replace('『', '').strip()
                                artist = source_artist[1].strip()
                            else:
                                artist = source_artist[0].strip()
                        
                        link = create_link(video_id, time_str)
                        is_member_exclusive = date_str in member_exclusive_dates
                        is_acapella = (
                            (date_str in acapella_songs and artist in acapella_songs[date_str] and song_name in acapella_songs[date_str][artist]) or 
                            (song_name in global_acapella_songs) or
                            (artist in acapella_songs_with_artist and song_name in acapella_songs_with_artist[artist])
                        )
                        data.append({
                            'date': date_str,
                            'time': time_str,
                            'song_name': song_name,
                            'artist': artist,
                            'source': source,
                            'link': link,
                            'is_member_exclusive': is_member_exclusive,
                            'is_acapella': is_acapella
                        })
                except Exception as e:
                    print(f"Error processing line '{line.strip()}': {e}")

    return data

def main():
    timeline_dir = 'timeline'
    exceptions_file = os.path.join(timeline_dir, 'exceptions.txt')
    all_data = []

    # 讀取例外規則
    member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist = load_exceptions(exceptions_file)

    # 遍歷timeline資料夾中的所有文件
    for filename in os.listdir(timeline_dir):
        if filename == 'exceptions.txt':
            continue
        file_path = os.path.join(timeline_dir, filename)
        date_str = filename.split('.')[0]  # 假設文件名是日期格式

        try:
            data = process_timeline(file_path, date_str, member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist)
            all_data.extend(data)
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")

    # 將數據保存到data.json文件中
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
