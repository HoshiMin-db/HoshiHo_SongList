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
    copyright_songs = set()  # 存儲帶有版權標記的歌曲

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
            elif parts[0] == 'copyright':
                if len(parts) == 3:
                    song_name, artist = parts[1], parts[2]
                    copyright_songs.add((song_name, artist))
                elif len(parts) == 2:
                    song_name = parts[1]
                    copyright_songs.add((song_name, None))

    return member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs

def normalize_string(str):
    if not str:
        return ''
    str = str.lower()
    str = re.sub(r'\s+', '', str)
    return str

def process_timeline(file_path, date_str, member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs):
    data = {}  # 改用字典來儲存資料
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        if not lines:
            print(f"Error: {file_path} is empty.")
            return []
        
        try:
            video_id = lines[0].strip().split('=')[1].strip()
        except IndexError:
            print(f"Error: Invalid video ID format in file {file_path}.")
            return []
        
        date = datetime.strptime(date_str, "%Y%m%d")
        old_rule_date = datetime.strptime("20240120", "%Y%m%d")
        new_rule_date = datetime.strptime("20240127", "%Y%m%d")
        
        for line in lines[1:]:
            try:
                if date <= old_rule_date:
                    # 舊規則解析
                    parts = line.strip().split(' | ', 3)
                    if len(parts) < 2:
                        print(f"Warning: Skipping line due to insufficient parts: '{line.strip()}'")
                        continue
                    time_str = parts[0]
                    song_name = parts[1]
                    artist = parts[2] if len(parts) > 2 else ''
                    source = parts[3] if len(parts) > 3 else ''
                elif date >= new_rule_date:
                    # 新規則解析
                    line = re.sub(r'^\d+\.\s+', '', line)
                    parts = line.strip().split('\u3000', 1)
                    if len(parts) != 2:
                        print(f"Warning: Skipping line due to incorrect format: '{line.strip()}'")
                        continue
                        
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
                
                # 建立唯一鍵（忽略大小寫和全半形）
                normalized_key = (normalize_string(song_name), normalize_string(artist))
                
                link = create_link(video_id, time_str)
                is_member_exclusive = date_str in member_exclusive_dates
                is_acapella = (
                    (date_str in acapella_songs and artist in acapella_songs[date_str] and song_name in acapella_songs[date_str][artist]) or
                    (song_name in global_acapella_songs) or
                    (artist in acapella_songs_with_artist and song_name in acapella_songs_with_artist[artist])
                )
                is_copyright = (song_name, artist) in copyright_songs or (song_name, None) in copyright_songs
                
                # 將資料存入字典
                if normalized_key not in data:
                    data[normalized_key] = {
                        'song_name': song_name,
                        'artist': artist,
                        'source': source,
                        'is_copyright': is_copyright,
                        'dates': []
                    }
                
                # 確保不重複添加日期資訊
                date_info = {
                    'date': date_str,
                    'time': time_str,
                    'link': link,
                    'is_member_exclusive': is_member_exclusive,
                    'is_acapella': is_acapella
                }
                if date_info not in data[normalized_key]['dates']:
                    data[normalized_key]['dates'].append(date_info)
                
            except Exception as e:
                print(f"Error processing line '{line.strip()}': {e}")
    
    # 轉換為列表格式
    return list(data.values())

def main():
    timeline_dir = 'timeline'
    exceptions_file = os.path.join(timeline_dir, 'exceptions.txt')
    all_data = {}  # 改用字典來合併所有資料
    
    # 讀取例外規則
    member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs = load_exceptions(exceptions_file)
    
    for filename in os.listdir(timeline_dir):
        if filename == 'exceptions.txt':
            continue
            
        file_path = os.path.join(timeline_dir, filename)
        match = re.match(r'(\d{8})(?:_\d+)?\.txt', filename)
        if match:
            date_str = match.group(1)
            try:
                data = process_timeline(file_path, date_str, member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs)
                print(f"Data processed for {date_str}: {data}")  # 調試輸出
                
                # 合併資料
                for song_data in data:
                    key = (normalize_string(song_data['song_name']), normalize_string(song_data['artist']))
                    if key not in all_data:
                        all_data[key] = song_data
                    else:
                        existing_dates = all_data[key]['dates']
                        new_dates = [d for d in song_data['dates'] if d not in existing_dates]
                        all_data[key]['dates'].extend(new_dates)
            
            except Exception as e:
                print(f"Error processing file {file_path}: {e}")
    
    # 確認 all_data 是否有數據
    print(f"All data collected: {all_data}")  # 調試輸出

    # 輸出最終資料
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(list(all_data.values()), f, ensure_ascii=False, indent=4)
        print(f"Data written to data.json")  # 調試輸出

if __name__ == '__main__':
    main()
