import os
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build

def get_sheet_data():
    # 設定 Google Sheets API
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    SERVICE_ACCOUNT_FILE = 'path/to/your/service-account-file.json'
    
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    # 設定 Google Sheets ID 和工作表名稱
    SHEET_ID = '1uKBjtCfLZKnyVZK04NH6k6BQmkq7_K2m2qP9OVezT0A'
    RANGE_NAME = 'A-Z!A:Z'

    # 建立 API 服務
    service = build('sheets', 'v4', credentials=credentials)

    # 讀取 Google Sheets 資料
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=SHEET_ID, range=RANGE_NAME).execute()
    values = result.get('values', [])

    # 將資料轉換為 DataFrame
    df = pd.DataFrame(values[1:], columns=values[0])

    # 保留 A:E 列
    columns_to_keep = df.columns[:5]

    # 倒序排列 F:Z 列
    columns_to_reverse = df.columns[5:][::-1]

    # 組合資料
    df = df[columns_to_keep.to_list() + columns_to_reverse.to_list()]

    # 顯示最近 3 次直播日期
    df = pd.concat([df[columns_to_keep], df[columns_to_reverse[:3]]], axis=1)
    
    return df.to_dict(orient='records')
