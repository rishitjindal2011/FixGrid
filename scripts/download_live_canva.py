import re
import os
import urllib.request

output_dir = r"C:\Users\Rishit Jindal\.gemini\antigravity-ide\brain\bc194417-f73a-4e14-9f73-4cbc3eb5a251\scratch\canva_live_slides"
os.makedirs(output_dir, exist_ok=True)

with open('canva_page.html', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Look for document-image links
urls = re.findall(r'https://media\.canva\.com/v2/document-image/[^"\'\s<>]+', text)
print(f"Found {len(urls)} document image URLs")

slides = {}
for u in urls:
    m = re.search(r'thumbnail%2F(\d+)\.png|preview%2F(\d+)\.png', u)
    if m:
        num = m.group(1) or m.group(2)
        slides[int(num)] = u

print(f"Mapped {len(slides)} slide thumbnails: {sorted(slides.keys())}")

for num, u in sorted(slides.items()):
    clean_u = u.replace('&amp;', '&')
    target_path = os.path.join(output_dir, f"slide_{num:02d}.png")
    try:
        req = urllib.request.Request(clean_u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(target_path, 'wb') as out:
            out.write(resp.read())
        print(f"Downloaded slide_{num:02d}.png ({os.path.getsize(target_path)} bytes)")
    except Exception as e:
        print(f"Failed to download slide {num}: {e}")
