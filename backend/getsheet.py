import os
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
import json

def get_sheet_data():
    print("Fetching Google Sheets data...")  # 添加這行以打印日誌信息
    credentials_info = json.loads(os.getenv('GOOGLE_SHEETS_CREDENTIALS'))

    credentials = service_account.Credentials.from_service_account_info(
        credentials_info, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
    )

    SHEET_ID = '1uKBjtCfLZKnyVZK04NH6k6BQmkq7_K2m2qP9OVezT0A'
    RANGE_NAME = 'A-Z!A:Z'

    service = build('sheets', 'v4', credentials=credentials)
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=SHEET_ID, range=RANGE_NAME).execute()
    values = result.get('values', [])

    print("Data fetched:", values)  # 添加這行以打印日誌信息

    df = pd.DataFrame(values[1:], columns=values[0])
    columns_to_keep = df.columns[:5]
    columns_to_reverse = df.columns[5:][::-1]
    df = df[columns_to_keep.to_list() + columns_to_reverse.to_list()]
    df = pd.concat([df[columns_to_keep], df[columns_to_reverse[:3]]], axis=1)

    return df.to_dict(orient='records')
