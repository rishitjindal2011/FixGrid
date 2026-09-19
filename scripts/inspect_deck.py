import zipfile
import re
import xml.etree.ElementTree as ET

path = r'C:\Users\Rishit Jindal\Downloads\Fix-Grid.pptx'
with zipfile.ZipFile(path, 'r') as z:
    for i in range(1, 12):
        s_name = f'ppt/slides/slide{i}.xml'
        if s_name in z.namelist():
            raw = z.read(s_name).decode('utf-8', errors='ignore')
            colors = set(re.findall(r'val="([0-9A-Fa-f]{6})"', raw))
            # get slide title
            titles = re.findall(r'<a:t>(.*?)</a:t>', raw)
            title_text = ' '.join(titles[:3]) if titles else 'No text'
            # check background
            bg_match = re.findall(r'<p:bg>.*?</p:bg>', raw)
            print(f"Slide {i}: Title: {title_text[:60]}")
            print(f"   Colors: {list(colors)[:6]}")
