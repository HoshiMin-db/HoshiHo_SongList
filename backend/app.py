import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import sqlite3
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# 從 GitHub Secrets 中讀取憑證信息
credentials_info = json.loads(os.getenv('GOOGLE_SHEETS_CREDENTIALS'))
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_dict(credentials_info, scope)
client = gspread.authorize(creds)

try:
    # 使用超連結打開 Google Sheets
    sheet = client.open_by_url('https://docs.google.com/spreadsheets/d/1uKBjtCfLZKnyVZK04NH6k6BQmkq7_K2m2qP9OVezT0A/edit?usp=sharing')
except gspread.exceptions.SpreadsheetNotFound:
    print("Google Sheets 找不到，請檢查超連結和共享設置")
    exit(1)

# 獲取 'A-Z' 頁面的資料
az_worksheet = sheet.worksheet('A-Z')
az_data = az_worksheet.get_all_values()

# 獲取 '五十音順' 頁面的資料
kana_worksheet = sheet.worksheet('五十音順')
kana_data = kana_worksheet.get_all_values()

# 初始化 Google Sheets API 客戶端
service = build('sheets', 'v4', credentials=creds)

# 獲取單元格格式
def get_cell_format(sheet_id, range):
    try:
        result = service.spreadsheets().get(spreadsheetId=sheet_id, ranges=range, includeGridData=True).execute()
        sheet = result['sheets'][0]
        rows = sheet['data'][0]['rowData']
        formats = {}
        for row_idx, row in enumerate(rows):
            for col_idx, cell in enumerate(row.get('values', [])):
                formats[(row_idx + 1, col_idx + 1)] = cell.get('effectiveFormat', {})
        return formats
    except HttpError as err:
        print(f"HTTP error: {err}")
        return {}

# 解析超連結和標記
def extract_hyperlink(cell):
    if isinstance(cell, dict) and 'hyperlink' in cell:
        return f'{cell["value"]} ({cell["hyperlink"]})'
    return cell

def get_tag_from_format(cell_format):
    tag = []
    if cell_format.get('textFormat', {}).get('bold'):
        tag.append('Member Only')
    bg_color = cell_format.get('backgroundColor', {})
    if bg_color == {'red': 1.0, 'green': 0.9, 'blue': 0.9}:
        tag.append('No Timestamp')
    elif bg_color == {'red': 0.9, 'green': 0.9, 'blue': 1.0}:
        tag.append('Acapella')
    text_color = cell_format.get('foregroundColor', {})
    if text_color == {'red': 1.0, 'green': 0.0, 'blue': 0.0}:
        tag.append('Blocked by Copyright')
    return ', '.join(tag)

def parse_data(data, formats):
    parsed_data = []
    for row_index, row in enumerate(data[1:], start=2):  # 跳過第一行表頭
        parsed_row = []
        for col_index, cell in enumerate(row, start=1):
            cell_value = extract_hyperlink(cell)
            cell_format = formats.get((row_index, col_index), {})
            tag = get_tag_from_format(cell_format)
            parsed_row.append((cell_value, tag))
        parsed_data.append(parsed_row)
    return parsed_data

# 獲取單元格格式
sheet_id = '1uKBjtCfLZKnyVZK04NH6k6BQmkq7_K2m2qP9OVezT0A'
az_formats = get_cell_format(sheet_id, 'A-Z')
kana_formats = get_cell_format(sheet_id, '五十音順')

parsed_az_data = parse_data(az_data, az_formats)
parsed_kana_data = parse_data(kana_data, kana_formats)

# 設置資料庫文件路徑
db_path = os.path.join(os.path.dirname(__file__), 'mydatabase.db')

# 連接到 SQLite 資料庫
conn = sqlite3.connect(db_path)
c = conn.cursor()

# 創建表格（如果還沒有）
c.execute('''CREATE TABLE IF NOT EXISTS Songs (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             song_name TEXT,
             singer TEXT,
             source TEXT,
             note TEXT,
             live_date TEXT,
             tag TEXT)''')

# 插入 'A-Z' 頁面的資料（忽略 alphabet 欄位）
for row in parsed_az_data:
    song_name, singer, source, note, live_date = row[1:][0], row[1:][1], row[1:][2], row[1:][3], row[1:][4]
    tag = ', '.join(filter(None, [row[1:][5], row[1:][6], row[1:][7], row[1:][8], row[1:][9]]))
    c.execute('INSERT INTO Songs (song_name, singer, source, note, live_date, tag) VALUES (?, ?, ?, ?, ?, ?)',
              (song_name[0], singer[0], source[0], note[0], live_date[0], tag))

# 插入 '五十音順' 頁面的資料（忽略 alphabet 欄位）
for row in parsed_kana_data:
    song_name, singer, source, note, live_date = row[1:][0], row[1:][1], row[1:][2], row[1:][3], row[1:][4]
    tag = ', '.join(filter(None, [row[1:][5], row[1:][6], row[1:][7], row[1:][8], row[1:][9]])) 
    c.execute('INSERT INTO Songs (song_name, singer, source, note, live_date, tag) VALUES (?, ?, ?, ?, ?, ?)',
              (song_name[0], singer[0], source[0], note[0], live_date[0], tag))
    
# 提交更改並關閉連接 
conn.commit() 
conn.close()

print("Google Sheets 的資料已經成功匯入 SQLite 資料庫，並加入了顏色和格式的 tag。")
