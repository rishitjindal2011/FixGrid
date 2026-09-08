import win32com.client
import os

try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    print("Word Application successfully launched. Version:", word.Version)
    word.Quit()
except Exception as e:
    print("Error:", e)
