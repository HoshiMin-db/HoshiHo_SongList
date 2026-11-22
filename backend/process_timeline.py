import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
TIMELINE_DIR = ROOT_DIR / "timeline"
DATA_FILE = ROOT_DIR / "data.json"
TEMP_DATA_FILE = ROOT_DIR / "data.json.tmp"


def parse_time(time_str):
    """將 HH:MM:SS 或 HH：MM：SS 時間轉換成秒數。"""
    parts = time_str.replace("：", ":").split(":")
    if len(parts) != 3:
        raise ValueError(f"無效的時間格式：{time_str}")

    try:
        hours, minutes, seconds = map(int, parts)
    except ValueError as exc:
        raise ValueError(f"無效的時間格式：{time_str}") from exc

    if hours < 0 or not 0 <= minutes < 60 or not 0 <= seconds < 60:
        raise ValueError(f"超出範圍的時間：{time_str}")

    return hours * 3600 + minutes * 60 + seconds


def create_link(video_id, time_str):
    """根據影片 ID 和時間建立 YouTube 時間連結。"""
    time_in_seconds = parse_time(time_str)
    return f"https://www.youtube.com/watch?v={video_id}&t={time_in_seconds}s"


def load_exceptions(exceptions_file):
    """讀取會限、私人影片及版權例外設定。"""
    member_exclusive_dates = set()
    private_dates = set()
    private_ids = set()
    copyright_songs = set()

    with open(exceptions_file, "r", encoding="utf-8") as file:
        for line_number, raw_line in enumerate(file, start=1):
            line = raw_line.strip()
            if not line or "|" not in line:
                continue

            parts = [part.strip() for part in line.split("|")]
            rule = parts[0]

            if rule == "member_exclusive_dates" and len(parts) >= 2:
                member_exclusive_dates.update(
                    value.strip()
                    for value in parts[1].split(",")
                    if value.strip()
                )
            elif rule == "private" and len(parts) >= 2:
                private_dates.update(
                    value.strip()
                    for value in parts[1].split(",")
                    if value.strip()
                )
            elif rule == "private_id" and len(parts) >= 2:
                private_ids.update(
                    value.strip()
                    for value in parts[1].split(",")
                    if value.strip()
                )
            elif rule == "copyright":
                if len(parts) >= 3:
                    copyright_songs.add((parts[1], parts[2]))
                elif len(parts) == 2:
                    copyright_songs.add((parts[1], None))
                else:
                    print(
                        f"Warning: exceptions.txt 第 {line_number} 行格式不完整"
                    )

    return (
        member_exclusive_dates,
        private_dates,
        private_ids,
        copyright_songs,
    )


def load_acapella(acapella_file):
    """讀取清唱歌曲設定。"""
    acapella_songs = {}
    global_acapella_songs = set()
    acapella_songs_with_artist = {}

    with open(acapella_file, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue

            parts = [part.strip() for part in line.split("|")]

            if len(parts) == 1:
                if parts[0]:
                    global_acapella_songs.add(parts[0])
            elif len(parts) == 2:
                song_name, artist = parts
                if song_name and artist:
                    acapella_songs_with_artist.setdefault(artist, set()).add(
                        song_name
                    )
            elif len(parts) >= 3:
                song_name, artist, dates = parts[:3]
                if not song_name or not artist:
                    continue

                for date_str in dates.split(","):
                    date_str = date_str.strip()
                    if not date_str:
                        continue

                    acapella_songs.setdefault(date_str, {})
                    acapella_songs[date_str].setdefault(artist, set()).add(
                        song_name
                    )

    return (
        acapella_songs,
        global_acapella_songs,
        acapella_songs_with_artist,
    )


def load_headers(headers_file):
    """讀取歌曲首字假名對照表。"""
    headers_dict = {}

    try:
        with open(headers_file, "r", encoding="utf-8") as file:
            for line in file:
                line = line.strip()
                if not line or "|" not in line:
                    continue

                kana, words_text = line.split("|", 1)
                words = []

                for word in words_text.split(","):
                    word = word.strip()
                    if word.startswith("'") and word.endswith("'"):
                        word = word[1:-1]
                    if word:
                        words.append(word)

                headers_dict[kana.strip()] = words
    except FileNotFoundError:
        print(f"Warning: 找不到設定檔 {headers_file}")

    return headers_dict


def normalize_key(text):
    """正規化歌曲或歌手字串，以便合併及對應 tags。"""
    if not text:
        return ""

    normalized = unicodedata.normalize("NFKC", text)
    normalized = re.sub(r"[〜\u301c\u223c]", "~", normalized)
    normalized = re.sub(r"[－—–−]", "-", normalized)
    normalized = normalized.casefold()
    normalized = re.sub(r"\s+", "", normalized)
    return normalized


def load_tags(tags_file):
    """讀取歌曲 tags，使用正規化後的歌名和歌手作為鍵。"""
    tags_map = {}

    try:
        with open(tags_file, "r", encoding="utf-8") as file:
            for line_number, raw_line in enumerate(file, start=1):
                line = raw_line.strip()
                if not line or "|" not in line:
                    continue

                parts = line.split("|", 2)
                if len(parts) != 3:
                    print(f"Warning: tags.txt 第 {line_number} 行格式不正確")
                    continue

                song_name, artist, tags_text = (
                    part.strip() for part in parts
                )
                key = (normalize_key(song_name), normalize_key(artist))
                tags_map[key] = [
                    tag.strip()
                    for tag in tags_text.split(",")
                    if tag.strip()
                ]
    except FileNotFoundError:
        print(f"Warning: 找不到設定檔 {tags_file}")

    return tags_map


def get_song_header(song_name, headers_dict):
    """判斷歌曲名稱屬於哪個假名分類。"""
    if not song_name:
        return None

    for kana, words in headers_dict.items():
        if song_name in words:
            return kana

    first_char = song_name[0]
    for kana, words in headers_dict.items():
        if first_char in words:
            return kana

    return None


def source_score(source):
    """來源排序分數：優先選含日文文字的來源，再選較長的來源。"""
    score = 0
    if re.search(r"[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]", source):
        score += 1000
    return score + len(source)


def select_best_source(sources):
    """選出主要出典；同分時用固定文字排序打破平手。"""
    valid_sources = sorted(
        {
            source.strip()
            for source in sources
            if source and source.strip()
        },
        key=lambda source: (source.casefold(), source),
    )

    if not valid_sources:
        return ""

    return min(
        valid_sources,
        key=lambda source: (
            -source_score(source),
            source.casefold(),
            source,
        ),
    )


def select_english_source(sources):
    """選出最長的純 ASCII 出典；同長度時固定排序。"""
    english_sources = [
        source.strip()
        for source in sources
        if source
        and source.strip()
        and not re.search(r"[^\x00-\x7F]", source)
    ]

    if not english_sources:
        return ""

    return min(
        set(english_sources),
        key=lambda source: (-len(source), source.casefold(), source),
    )


def extract_video_id(lines, file_path):
    """從時間軸檔案中尋找 ID = VIDEO_ID。"""
    id_pattern = re.compile(r"^\s*ID\s*=\s*([A-Za-z0-9_-]+)\s*$")

    for line in lines:
        match = id_pattern.fullmatch(line.strip())
        if match:
            return match.group(1)

    raise ValueError(f"找不到有效的影片 ID：{file_path}")


def parse_timeline_line(line):
    """
    解析一行時間軸。

    支援舊格式：
        00:12:34 | 歌名 | 歌手 | 出典

    支援新格式：
        01.  00:12:34  歌名 / 『出典』歌手
        00:12:34　歌名 / 歌手
    """
    raw_line = line.strip()
    if not raw_line:
        return None

    # 移除「01.」這類曲目編號。
    line_without_number = re.sub(
        r"^\s*\d+[.．]\s*",
        "",
        raw_line,
    )

    timestamp_match = re.match(
        r"^\s*(\d{1,3}[:：]\d{2}[:：]\d{2})(.*)$",
        line_without_number,
    )

    # 非時間戳行，例如留言標題或說明文字。
    if not timestamp_match:
        return None

    time_str = timestamp_match.group(1).replace("：", ":")
    remainder = timestamp_match.group(2).strip()

    if not remainder:
        raise ValueError(f"時間戳後沒有歌曲內容：{raw_line}")

    # 舊格式：時間 | 歌名 | 歌手 | 出典
    if "|" in remainder:
        fields = [field.strip() for field in remainder.split("|")]

        # 時間戳與第一個 | 之間可能有分隔符，
        # 移除它造成的開頭空欄。
        while fields and not fields[0]:
            fields.pop(0)

        if not fields or not fields[0]:
            raise ValueError(f"舊格式缺少歌曲名稱：{raw_line}")

        song_name = fields[0]
        artist = fields[1] if len(fields) > 1 else ""
        source = fields[2] if len(fields) > 2 else ""

        return {
            "time": time_str,
            "song_name": song_name,
            "artist": artist,
            "source": source,
        }

    # 新格式可能在時間和歌曲之間使用全形空格或一般空格。
    song_info = remainder.strip(" \t\u3000")
    if not song_info:
        raise ValueError(f"時間戳後沒有歌曲內容：{raw_line}")

    source = ""
    artist = ""

    # 格式：歌名 / 『出典』歌手
    source_match = re.match(
        r"^(.*?)\s*/\s*『(.*?)』\s*(.*)$",
        song_info,
    )
    if source_match:
        song_name = source_match.group(1).strip()
        source = source_match.group(2).strip()
        artist = source_match.group(3).strip()
    else:
        # 格式：歌名 / 歌手；限定分隔符兩側有空格，
        # 避免拆開 EXEC_PHANTASMAGORIA/. 之類歌曲名稱。
        parts = re.split(r"\s+/\s+", song_info, maxsplit=1)
        song_name = parts[0].strip()
        artist = parts[1].strip() if len(parts) > 1 else ""

    if not song_name:
        raise ValueError(f"新格式缺少歌曲名稱：{raw_line}")

    return {
        "time": time_str,
        "song_name": song_name,
        "artist": artist,
        "source": source,
    }


def process_timeline(
    file_path,
    date_str,
    member_exclusive_dates,
    private_dates,
    private_ids,
    acapella_songs,
    global_acapella_songs,
    acapella_songs_with_artist,
    copyright_songs,
    headers_dict,
):
    """解析單一直播時間軸檔案。"""
    with open(file_path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    if not lines:
        raise ValueError(f"檔案是空的：{file_path}")

    video_id = extract_video_id(lines, file_path)
    is_deleted = video_id in private_ids

    # 檢查日期格式，避免錯誤檔名悄悄產生錯誤資料。
    datetime.strptime(date_str, "%Y%m%d")

    songs = {}

    for line_number, line in enumerate(lines, start=1):
        try:
            parsed = parse_timeline_line(line)
            if parsed is None:
                continue

            time_str = parsed["time"]
            song_name = parsed["song_name"]
            artist = parsed["artist"]
            source = parsed["source"]

            link = create_link(video_id, time_str)
            normalized_key = (
                normalize_key(song_name),
                normalize_key(artist),
            )

            is_acapella = (
                (
                    date_str in acapella_songs
                    and artist in acapella_songs[date_str]
                    and song_name in acapella_songs[date_str][artist]
                )
                or song_name in global_acapella_songs
                or (
                    artist in acapella_songs_with_artist
                    and song_name in acapella_songs_with_artist[artist]
                )
            )

            song_data = songs.setdefault(
                normalized_key,
                {
                    "song_name": song_name,
                    "artist": artist,
                    "source": source,
                    "is_copyright": (
                        (song_name, artist) in copyright_songs
                        or (song_name, None) in copyright_songs
                    ),
                    "az": get_song_header(song_name, headers_dict),
                    "dates": [],
                    "tags": [],
                },
            )

            date_info = {
                "date": date_str,
                "time": time_str,
                "link": link,
                "is_member_exclusive": date_str in member_exclusive_dates,
                "is_acapella": is_acapella,
                "is_private": date_str in private_dates or is_deleted,
            }

            if date_info not in song_data["dates"]:
                song_data["dates"].append(date_info)

            # 同一場直播內，同一首歌若出現不同出典也要保留。
            if source:
                song_data.setdefault("_all_sources", set()).add(source)

        except Exception as exc:
            raise ValueError(
                f"{file_path} 第 {line_number} 行解析失敗：{exc}"
            ) from exc

    if not songs:
        raise ValueError(f"沒有解析到任何歌曲：{file_path}")

    return list(songs.values())


def find_timeline_files(timeline_dir):
    """遞迴尋找根目錄及年份資料夾中的日期檔案，並固定處理順序。"""
    timeline_files = []
    filename_pattern = re.compile(r"(\d{8})(?:_(\d+))?\.txt")

    for current_dir, dirnames, filenames in os.walk(timeline_dir):
        dirnames.sort()

        for filename in sorted(filenames):
            match = filename_pattern.fullmatch(filename)
            if not match:
                continue

            date_str = match.group(1)
            suffix = int(match.group(2)) if match.group(2) else 0

            # 檢查日期是否真實有效。
            datetime.strptime(date_str, "%Y%m%d")

            file_path = Path(current_dir) / filename
            timeline_files.append(
                (date_str, suffix, str(file_path), filename)
            )

    timeline_files.sort(key=lambda item: (item[0], item[1], item[2]))
    return timeline_files


def main():
    if not TIMELINE_DIR.is_dir():
        raise FileNotFoundError(f"找不到時間軸資料夾：{TIMELINE_DIR}")

    exceptions_file = TIMELINE_DIR / "exceptions.txt"
    acapella_file = TIMELINE_DIR / "acapella.txt"
    headers_file = TIMELINE_DIR / "headers.txt"
    tags_file = TIMELINE_DIR / "tags.txt"

    # 必要設定檔缺失時停止，避免產生不完整輸出。
    for required_file in (exceptions_file, acapella_file):
        if not required_file.is_file():
            raise FileNotFoundError(f"找不到必要設定檔：{required_file}")

    headers_dict = load_headers(headers_file)
    tags_map = load_tags(tags_file)
    (
        member_exclusive_dates,
        private_dates,
        private_ids,
        copyright_songs,
    ) = load_exceptions(exceptions_file)
    (
        acapella_songs,
        global_acapella_songs,
        acapella_songs_with_artist,
    ) = load_acapella(acapella_file)

    print(f"Loaded headers: {len(headers_dict)}")
    print(f"Loaded tags: {len(tags_map)}")
    print(
        "Loaded exceptions: "
        f"{len(private_ids)} private IDs, "
        f"{len(private_dates)} private dates"
    )

    timeline_files = find_timeline_files(TIMELINE_DIR)
    if not timeline_files:
        raise RuntimeError(f"找不到日期格式的時間軸檔案：{TIMELINE_DIR}")

    all_data = {}
    processed_file_count = 0

    for date_str, _, file_path, filename in timeline_files:
        print(f"Processing file: {file_path}")

        # 有任何檔案解析失敗就停止，不覆蓋既有 data.json。
        data = process_timeline(
            file_path,
            date_str,
            member_exclusive_dates,
            private_dates,
            private_ids,
            acapella_songs,
            global_acapella_songs,
            acapella_songs_with_artist,
            copyright_songs,
            headers_dict,
        )

        processed_file_count += 1
        print(f"Processed {len(data)} songs from {filename}")

        for song_data in data:
            key = (
                normalize_key(song_data["song_name"]),
                normalize_key(song_data["artist"]),
            )

            if key not in all_data:
                all_data[key] = song_data
                all_data[key]["_all_sources"] = set()
            else:
                existing_dates = all_data[key]["dates"]
                for date_info in song_data["dates"]:
                    if date_info not in existing_dates:
                        existing_dates.append(date_info)

            if song_data["source"]:
                all_data[key]["_all_sources"].add(song_data["source"])

            # 同一首歌的不同直播資料都可能提供出典。
            all_data[key]["_all_sources"].update(
                song_data.get("_all_sources", set())
            )

    print(f"Processed {processed_file_count} timeline files")
    print(f"Total unique songs: {len(all_data)}")

    # 固定 tags、來源與日期輸出順序，確保重跑時 JSON 不會無故變動。
    for key, song_data in all_data.items():
        song_data["tags"] = tags_map.get(key, [])

        sources = sorted(
            song_data.pop("_all_sources", set()),
            key=lambda source: (source.casefold(), source),
        )

        if sources:
            song_data["source"] = select_best_source(sources)
            song_data["source_en"] = select_english_source(sources)
            song_data["_searchableSources"] = "|".join(sources)
        else:
            song_data["source"] = ""
            song_data["source_en"] = ""
            song_data["_searchableSources"] = ""

        song_data["dates"].sort(
            key=lambda item: (
                item["date"],
                item["time"],
                item["link"],
            )
        )

    output_data = list(all_data.values())

    # 先寫暫存檔，成功後再取代正式 JSON。
    try:
        with open(TEMP_DATA_FILE, "w", encoding="utf-8", newline="\n") as file:
            json.dump(
                output_data,
                file,
                ensure_ascii=False,
                indent=4,
            )
            file.write("\n")

        os.replace(TEMP_DATA_FILE, DATA_FILE)
        print(f"Successfully wrote {len(output_data)} songs to {DATA_FILE}")

    except Exception:
        if TEMP_DATA_FILE.exists():
            TEMP_DATA_FILE.unlink()
        raise


if __name__ == "__main__":
    main()
