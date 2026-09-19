import re
import json

with open('canva_page.html', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Look for embedded JSON or image links
print("Checking for bootstrap / initialState data...")
scripts = re.findall(r'<script[^>]*>(.*?)</script>', text, re.DOTALL)
print(f"Total script tags: {len(scripts)}")

img_urls = re.findall(r'https://[^"\'\s<>]+?\.(?:png|jpg|jpeg|webp)(?:\?[^"\'\s<>]*)?', text)
print(f"Total image-like URLs: {len(img_urls)}")

# Filter for slide previews / thumbnails
slide_candidates = [u for u in set(img_urls) if 'thumbnail' in u or 'screen' in u or 'page' in u or 'view' in u or 'media' in u]
print(f"Candidate slide images: {len(slide_candidates)}")
for c in list(slide_candidates)[:10]:
    print(" -", c)
