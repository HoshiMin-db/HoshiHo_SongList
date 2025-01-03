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
    RANGE_NAME_AZ = 'A-Z!A:Z'
    RANGE_NAME_50音順 = '五十音順!A:Z'

    # 構建Google Sheets服務
    service = build('sheets', 'v4', credentials=credentials)
    sheet = service.spreadsheets()
    
    # 獲取“A-Z”頁的數據
    result_az = sheet.values().get(spreadsheetId=SHEET_ID, range=RANGE_NAME_AZ).execute()
    values_az = result_az.get('values', [])
    
    # 獲取“五十音順”頁的數據
    result_50音順 = sheet.values().get(spreadsheetId=SHEET_ID, range=RANGE_NAME_50音順).execute()
    values_50音順 = result_50音順.get('values', [])

    # 檢查數據是否存在
    if not values_az or not values_50音順:
        raise ValueError("表單數據為空")

    # 創建DataFrame，不使用列名
    df_az = pd.DataFrame(values_az[1:])
    df_50音順 = pd.DataFrame(values_50音順[1:])
    
    # 保留前五列
    df_az_columns_to_keep = df_az.iloc[:, :5]
    df_50音順_columns_to_keep = df_50音順.iloc[:, :5]
    
    # 獲取其餘列並反轉順序
    df_az_columns_to_reverse = df_az.iloc[:, 5:][::-1]
    df_50音順_columns_to_reverse = df_50音順.iloc[:, 5:][::-1]
    
    # 創建新的DataFrame，保留前五列和前三個日期列
    df_az_final = pd.concat([df_az_columns_to_keep, df_az_columns_to_reverse.iloc[:, :3]], axis=1)
    df_50音順_final = pd.concat([df_50音順_columns_to_keep, df_50音順_columns_to_reverse.iloc[:, :3]], axis=1)
    
    # 合併兩個DataFrame
    df_final = pd.concat([df_az_final, df_50音順_final], ignore_index=True)

    return df_final.to_dict(orient='records')

if __name__ == '__main__':
    # 獲取表單數據並存儲到data.json文件中
    data = get_sheet_data()
    with open('data.json', 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
