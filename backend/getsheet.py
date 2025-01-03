import os
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
import json

def get_sheet_data():
    # 從環境變量獲取Google Sheets憑證信息
    credentials_info = json.loads(os.getenv('GOOGLE_SHEETS_CREDENTIALS'))

    # 使用憑證信息創建憑證
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
    )

    # 定義Google Sheets的ID和範圍
    SHEET_ID = '1uKBjtCfLZKnyVZK04NH6k6BQmkq7_K2m2qP9OVezT0A'
    RANGE_NAME = 'A-Z!A:Z'

    # 構建Google Sheets服務
    service = build('sheets', 'v4', credentials=credentials)
    sheet = service.spreadsheets()
    
    # 獲取表單數據
    result = sheet.values().get(spreadsheetId=SHEET_ID, range=RANGE_NAME).execute()
    values = result.get('values', [])

    # 檢查數據是否存在
    if not values:
        raise ValueError("表單數據為空")

    # 創建DataFrame，不使用列名
    df = pd.DataFrame(values[1:])
    
    # 保留前五列
    df_columns_to_keep = df.iloc[:, :5]
    # 獲取其餘列並反轉順序
    df_columns_to_reverse = df.iloc[:, 5:][::-1]
    
    # 創建新的DataFrame，保留前五列和前三個日期列
    df_final = pd.concat([df_columns_to_keep, df_columns_to_reverse.iloc[:, :3]], axis=1)

    return df_final.to_dict(orient='records')

if __name__ == '__main__':
    # 獲取表單數據並存儲到data.json文件中
    data = get_sheet_data()
    with open('data.json', 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
