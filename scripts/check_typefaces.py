import glob
import re

typefaces = set()
for s in glob.glob('unpacked_deck/ppt/slides/slide*.xml'):
    if '_rels' in s:
        continue
    with open(s, 'r', encoding='utf-8') as f:
        c = f.read()
    for m in re.finditer(r'typeface="([^"]+)"', c):
        typefaces.add(m.group(1))

print('All typefaces found:', typefaces)
