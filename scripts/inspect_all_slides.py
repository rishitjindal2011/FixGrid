import xml.etree.ElementTree as ET
import glob
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

for f in sorted(glob.glob('unpacked_deck/ppt/slides/slide*.xml'), key=lambda x: int(os.path.basename(x).replace('slide','').replace('.xml',''))):
    if '_rels' in f: continue
    tree = ET.parse(f)
    root = tree.getroot()
    print(f'=== {os.path.basename(f)} ===')
    for sp in root.iter('{http://schemas.openxmlformats.org/presentationml/2006/main}sp'):
        txt = ' '.join(''.join(sp.itertext()).split())
        if txt:
            print('  TXT:', txt[:90])
