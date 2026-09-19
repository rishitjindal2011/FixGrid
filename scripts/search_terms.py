import re
import json

with open('canva_page_new.html', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Search for slide text or mentions
terms = ['PROBLEM', 'BUSINESS MODEL', 'ROADMAP', '2010', '2026', 'Phase', 'FINANCIAL']
for t in terms:
    count = text.count(t)
    print(f"'{t}': {count} occurrences")
