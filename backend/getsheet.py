import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

def get_sheet_service():
    # 從環境變量獲取Google Sheets憑證信息
    credentials_info = json.loads(os.getenv('GOOGLE_SHEETS_CREDENTIALS'))

    # 使用憑證信息創建憑證
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
    )

    # 構建Google Sheets服務
    service = build('sheets', 'v4', credentials=credentials)
    return service

def get_sheet_data(service, sheet_id, range_name):
    sheet = service.spreadsheets()
    result = sheet.get(spreadsheetId=sheet_id, ranges=range_name, includeGridData=True).execute()
    values = result.get('sheets', [])[0].get('data', [])[0].get('rowData', [])
    return values

def is_light_blue(cell_data):
    # 檢查儲存格背景顏色是否為淺藍色
    if 'effectiveFormat' in cell_data and 'backgroundColor' in cell_data['effectiveFormat']:
        bg_color = cell_data['effectiveFormat']['backgroundColor']
        # 淺藍色的RGB值
        if (bg_color.get('red', 0) == 0.8 and
            bg_color.get('green', 0.9 and
            bg_color.get('blue', 0) == 1.0)):
            return True
    return False

def update_data_json(data, sheet_data, sheet_name):
    for record in data:
        song_name = record['song_name']
        artist = record['artist'].replace(' ', '').replace('-', '').replace('_', '')

        for row in sheet_data:
            if len(row.get('values', [])) > 2:
                sheet_song_name = row['values'][1].get('formattedValue', '')
                sheet_artist = row['values'][2].get('formattedValue', '').replace(' ', '').replace('-', '').replace('_', '')

                if song_name == sheet_song_name and artist == sheet_artist:
                    for i, cell in enumerate(row['values']):
                        if is_light_blue(cell):
                            record[f'label_{sheet_name}_{i}'] = '清唱'

def main():
    service = get_sheet_service()
    sheet_id = '1uKBjtCfLZKnyVZK04NH6k6BQmkq7_K2m2qP9OVezT0A'
    
    # 獲取A-Z工作表的數據
    sheet_data_az = get_sheet_data(service, sheet_id, 'A-Z!A:Z')
    
    # 獲取五十音順工作表的數據
    sheet_data_50音順 = get_sheet_data(service, sheet_id, '五十音順!A:Z')
    
    # 讀取data.json文件
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 更新data.json中的數據
    update_data_json(data, sheet_data_az, 'A-Z')
    update_data_json(data, sheet_data_50音順, '五十音順')
    
    # 將更新後的數據保存到data.json文件中
    with open('data_updated.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
