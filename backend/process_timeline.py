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
    private_dates = set()  # 新增：存儲私人影片日期
    copyright_songs = set()  # 存儲帶有版權標記的歌曲

    with open(exceptions_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines:
            parts = line.strip().split('|')
            if parts[0] == 'member_exclusive_dates':
                dates = parts[1].split(',')
                member_exclusive_dates.update(dates)
            elif parts[0] == 'private':  # 新增：處理私人影片標籤
                dates = parts[1].split(',')
                private_dates.update(dates)
            elif parts[0] == 'copyright':
                if len(parts) == 3:
                    song_name, artist = parts[1], parts[2]
                    copyright_songs.add((song_name, artist))
                elif len(parts) == 2:
                    song_name = parts[1]
                    copyright_songs.add((song_name, None))

    return member_exclusive_dates, private_dates, copyright_songs  # 返回新增的 private_dates
    
def load_acapella(acapella_file):
    """從acapella.txt文件讀取清唱標籤"""
    acapella_songs = {}  # 按日期存儲清唱標籤
    global_acapella_songs = set()  # 存儲沒有日期的清唱曲名
    acapella_songs_with_artist = {}  # 存儲有日期和歌手的清唱歌曲

    with open(acapella_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines:
            parts = line.strip().split('|')
            if len(parts) == 1:
                global_acapella_songs.add(parts[0])  # 只有歌名的曲名
            elif len(parts) == 2:
                song_name, artist = parts[0], parts[1]
                if artist not in acapella_songs_with_artist:
                    acapella_songs_with_artist[artist] = set()
                acapella_songs_with_artist[artist].add(song_name)
            elif len(parts) == 3:
                song_name, artist, date = parts[0], parts[1], parts[2]
                if date not in acapella_songs:
                    acapella_songs[date] = {}
                if artist not in acapella_songs[date]:
                    acapella_songs[date][artist] = set()
                acapella_songs[date][artist].add(song_name)

    return acapella_songs, global_acapella_songs, acapella_songs_with_artist

def load_headers(headers_file):
    """從headers.txt讀取首字對應表"""
    headers_dict = {}
    try:
        with open(headers_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    parts = line.split('|')
                    if len(parts) == 2:
                        kana = parts[0]
                        words = parts[1].split(',')
                        # 處理引號包圍的例外情況
                        processed_words = []
                        for word in words:
                            if word.startswith("'") and word.endswith("'"):
                                processed_words.append(word[1:-1])
                            else:
                                processed_words.append(word)
                        headers_dict[kana] = processed_words
    except FileNotFoundError:
        print(f"Warning: {headers_file} not found.")
    return headers_dict

def get_song_header(song_name, headers_dict):
    """判斷歌曲名稱的首字屬於哪個假名分類"""
    if not song_name:
        return None
        
    first_char = song_name[0]
    
    # 先檢查完整歌名是否在例外清單中
    for kana, words in headers_dict.items():
        if song_name in words:
            return kana
            
    # 再檢查首字是否在分類清單中
    for kana, words in headers_dict.items():
        if first_char in words:
            return kana
            
    return None

def normalize_string(str):
    if not str:
        return ''
    str = str.lower()
    str = re.sub(r'\s+', '', str)
    return str

def process_timeline(file_path, date_str, member_exclusive_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs, headers_dict):
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
                    song_name = ""
                    artist = ""
                    source = ""
                    
                    # 檢查是否有『』，如果有則視為source
                    if '『' in song_info and '』' in song_info:
                        song_name = song_info.split('『')[0].split(' / ')[0].strip()
                        source_artist = song_info.split('『')[1].split('』')
                        source = source_artist[0].strip()
                        artist = source_artist[1].strip() if len(source_artist) > 1 else ''
                    else:
                        # 沒有『』，視為曲名 / 歌手
                        song_parts = song_info.split(' / ')
                        song_name = song_parts[0].strip()
                        artist = song_parts[1].strip() if len(song_parts) > 1 else ''
                
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
                is_private = date_str in private_dates
                
                # 將資料存入字典
                # 在建立資料時加入az分類
                if normalized_key not in data:
                    data[normalized_key] = {
                        'song_name': song_name,
                        'artist': artist,
                        'source': source,
                        'is_copyright': is_copyright,
                        'az': get_song_header(song_name, headers_dict),  # 加入這行
                        'dates': []
                    }

                # 確保不重複添加日期資訊
                date_info = {
                    'date': date_str,
                    'time': time_str,
                    'link': link,
                    'is_member_exclusive': is_member_exclusive,
                    'is_acapella': is_acapella,
                    'is_private': is_private,  # 新增：存儲私人影片標記
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
    acapella_file = os.path.join(timeline_dir, 'acapella.txt')
    headers_file = os.path.join(timeline_dir, 'headers.txt')
    all_data = {}  # 改用字典來合併所有資料

    # 讀取headers檔案
    headers_dict = load_headers(headers_file)
    
    # 讀取例外規則
    member_exclusive_dates, private_dates, copyright_songs = load_exceptions(exceptions_file)

    # 讀取acapella文件
    acapella_songs, global_acapella_songs, acapella_songs_with_artist = load_acapella(acapella_file)
    
    for filename in os.listdir(timeline_dir):
        if filename in ['exceptions.txt', 'headers.txt', 'acapella.txt']:
            continue
            
        file_path = os.path.join(timeline_dir, filename)
        match = re.match(r'(\d{8})(?:_\d+)?\.txt', filename)
        if match:
            date_str = match.group(1)
            try:
                data = process_timeline(file_path, date_str, member_exclusive_dates, private_dates, acapella_songs, global_acapella_songs, acapella_songs_with_artist, copyright_songs, headers_dict)
                # 加入headers_dict參數
                
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
    
    # 輸出最終資料
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(list(all_data.values()), f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
