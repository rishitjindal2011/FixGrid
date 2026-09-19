import re
import glob
import os
import shutil

# 1. presentation.xml: Remove embeddedFontLst
with open('unpacked_deck/ppt/presentation.xml', 'r', encoding='utf-8') as f:
    xml = f.read()
xml = re.sub(r'<p:embeddedFontLst>.*?</p:embeddedFontLst>', '', xml, flags=re.DOTALL)
with open('unpacked_deck/ppt/presentation.xml', 'w', encoding='utf-8') as f:
    f.write(xml)

# 2. presentation.xml.rels: Remove font relationships
rels_path = 'unpacked_deck/ppt/_rels/presentation.xml.rels'
if os.path.exists(rels_path):
    with open(rels_path, 'r', encoding='utf-8') as f:
        rels = f.read()
    rels = re.sub(r'<Relationship[^>]*Target="fonts/[^"]+"[^>]*/>', '', rels)
    with open(rels_path, 'w', encoding='utf-8') as f:
        f.write(rels)

# 3. Remove fonts folder if exists
fonts_dir = 'unpacked_deck/ppt/fonts'
if os.path.exists(fonts_dir):
    shutil.rmtree(fonts_dir)

# 4. Across all slides, replace all font typefaces with Segoe UI
for s in glob.glob('unpacked_deck/ppt/slides/slide*.xml'):
    if '_rels' in s:
        continue
    with open(s, 'r', encoding='utf-8') as f:
        sx = f.read()
    # Replace any font typeface with Segoe UI
    sx = re.sub(r'typeface="[^"]+"', 'typeface="Segoe UI"', sx)
    with open(s, 'w', encoding='utf-8') as f:
        f.write(sx)

print('All embedded fonts purged and replaced with Segoe UI!')
