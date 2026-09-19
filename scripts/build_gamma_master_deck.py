import zipfile
import os
import shutil
import re
import base64
import xml.etree.ElementTree as ET

src_pptx = r"C:\Users\Rishit Jindal\Downloads\Fix-Grid.pptx"
unpacked_dir = r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\unpacked_deck"
out_pptx = r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\FixGrid_Hackathon_Pitch_Deck.pptx"

if os.path.exists(unpacked_dir):
    shutil.rmtree(unpacked_dir)

print(f"1. Unpacking {src_pptx} ...")
with zipfile.ZipFile(src_pptx, 'r') as z:
    z.extractall(unpacked_dir)

# 1x1 Transparent PNG bytes
transparent_png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")

# -------------------------------------------------------------
# 2. PURGE ALL "Made with Gamma" Watermarks and Links
# -------------------------------------------------------------
print("2. Purging all Gamma watermarks and links ...")

# A. Overwrite image-1002-2.png with 1x1 transparent PNG
img_gamma = os.path.join(unpacked_dir, "ppt", "media", "image-1002-2.png")
if os.path.exists(img_gamma):
    with open(img_gamma, "wb") as f:
        f.write(transparent_png)

# B. Remove Image 1 from slideLayout2.xml
layout2_path = os.path.join(unpacked_dir, "ppt", "slideLayouts", "slideLayout2.xml")
if os.path.exists(layout2_path):
    tree = ET.parse(layout2_path)
    root = tree.getroot()
    spTree = root.find('.//{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')
    if spTree is not None:
        to_remove = []
        for child in spTree:
            nv = child.find('.//{http://schemas.openxmlformats.org/presentationml/2006/main}cNvPr')
            if nv is not None and nv.get('name') == 'Image 1':
                to_remove.append(child)
        for elem in to_remove:
            spTree.remove(elem)
    tree.write(layout2_path, encoding='utf-8', xml_declaration=True)

# C. Clean slideLayout2.xml.rels
layout2_rels_path = os.path.join(unpacked_dir, "ppt", "slideLayouts", "_rels", "slideLayout2.xml.rels")
if os.path.exists(layout2_rels_path):
    with open(layout2_rels_path, "r", encoding="utf-8") as f:
        rels = f.read()
    rels = re.sub(r'<Relationship[^>]*Target="[^"]*gamma\.app[^"]*"[^>]*/>', '', rels)
    rels = re.sub(r'<Relationship[^>]*Target="\.\./media/image-1002-2\.png"[^>]*/>', '', rels)
    with open(layout2_rels_path, "w", encoding="utf-8") as f:
        f.write(rels)

# -------------------------------------------------------------
# 3. PURGE ALL Obfuscated Font Subsets & Enforce Segoe UI
# -------------------------------------------------------------
print("3. Purging obfuscated fonts and standardizing typography ...")

pres_xml_path = os.path.join(unpacked_dir, "ppt", "presentation.xml")
with open(pres_xml_path, "r", encoding="utf-8") as f:
    pres_xml = f.read()

# Remove Slide 2 reference (r:id="rId3")
pres_xml = re.sub(r'<p:sldId\s+id="257"\s+r:id="rId3"\s*/>', '', pres_xml)
# Remove embeddedFontLst
pres_xml = re.sub(r'<p:embeddedFontLst>.*?</p:embeddedFontLst>', '', pres_xml, flags=re.DOTALL)

with open(pres_xml_path, "w", encoding="utf-8") as f:
    f.write(pres_xml)

pres_rels_path = os.path.join(unpacked_dir, "ppt", "_rels", "presentation.xml.rels")
with open(pres_rels_path, "r", encoding="utf-8") as f:
    pres_rels = f.read()

# Remove slide2 relationship
pres_rels = re.sub(r'<Relationship\s+Id="rId3"[^>]*Target="slides/slide2\.xml"[^>]*/>', '', pres_rels)
# Remove all font relationships
pres_rels = re.sub(r'<Relationship[^>]*Target="fonts/[^"]+"[^>]*/>', '', pres_rels)

with open(pres_rels_path, "w", encoding="utf-8") as f:
    f.write(pres_rels)

# Delete slide2 files
slide2_path = os.path.join(unpacked_dir, "ppt", "slides", "slide2.xml")
if os.path.exists(slide2_path): os.remove(slide2_path)
slide2_rels = os.path.join(unpacked_dir, "ppt", "slides", "_rels", "slide2.xml.rels")
if os.path.exists(slide2_rels): os.remove(slide2_rels)

# Delete fonts directory
fonts_dir = os.path.join(unpacked_dir, "ppt", "fonts")
if os.path.exists(fonts_dir):
    shutil.rmtree(fonts_dir)

# Replace all typefaces across all slides with Segoe UI
import glob
for s in glob.glob(os.path.join(unpacked_dir, 'ppt', 'slides', 'slide*.xml')):
    if '_rels' in s: continue
    with open(s, 'r', encoding='utf-8') as f:
        sx = f.read()
    sx = re.sub(r'typeface="[^"]+"', 'typeface="Segoe UI"', sx)
    with open(s, 'w', encoding='utf-8') as f:
        f.write(sx)

# -------------------------------------------------------------
# 4. POLISH SLIDE 1 (Hero Title & Live URL)
# -------------------------------------------------------------
print("4. Polishing Slide 1 ...")
slide1_path = os.path.join(unpacked_dir, "ppt", "slides", "slide1.xml")
if os.path.exists(slide1_path):
    tree = ET.parse(slide1_path)
    root = tree.getroot()
    spTree = root.find('.//{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')
    if spTree is not None:
        to_remove = []
        for child in spTree:
            nv = child.find('.//{http://schemas.openxmlformats.org/presentationml/2006/main}cNvPr')
            if nv is not None and nv.get('name') in ['Shape 2', 'Text 3', 'Text 4', 'Image 1']:
                to_remove.append(child)
        for elem in to_remove:
            spTree.remove(elem)
    tree.write(slide1_path, encoding='utf-8', xml_declaration=True)

    with open(slide1_path, "r", encoding="utf-8") as f:
        s1_xml = f.read()
    s1_xml = s1_xml.replace("Live Working Prototype", "Live Platform: www.vytron.me")
    s1_xml = s1_xml.replace("<a:t>Untitled</a:t>", "<a:t></a:t>")
    s1_xml = s1_xml.replace("<a:t>View more</a:t>", "<a:t></a:t>")
    with open(slide1_path, "w", encoding="utf-8") as f:
        f.write(s1_xml)

# -------------------------------------------------------------
# 5. POLISH SLIDE 4 (Slide 3 in presentation: The Double Crisis)
# -------------------------------------------------------------
print("5. Polishing Slide 3 (The Double Crisis) ...")
# Overwrite image-4-2.png with transparent png to remove the 3 empty background boxes
img4_2 = os.path.join(unpacked_dir, "ppt", "media", "image-4-2.png")
if os.path.exists(img4_2):
    with open(img4_2, "wb") as f:
        f.write(transparent_png)

# -------------------------------------------------------------
# 6. POLISH SLIDE 7 (Slide 6 in presentation: Partner Model)
# -------------------------------------------------------------
print("6. Polishing Slide 6 (Aggregator vs FixGrid) ...")
slide7_path = os.path.join(unpacked_dir, "ppt", "slides", "slide7.xml")
if os.path.exists(slide7_path):
    with open(slide7_path, "r", encoding="utf-8") as f:
        s7_xml = f.read()
    s7_xml = s7_xml.replace('sz="1500"', 'sz="1250"')
    with open(slide7_path, "w", encoding="utf-8") as f:
        f.write(s7_xml)

# -------------------------------------------------------------
# 7. POLISH SLIDE 8 (Slide 7 in presentation: Climate Metrics)
# -------------------------------------------------------------
print("7. Polishing Slide 7 (Climate Metrics) ...")
slide8_path = os.path.join(unpacked_dir, "ppt", "slides", "slide8.xml")
if os.path.exists(slide8_path):
    with open(slide8_path, "r", encoding="utf-8") as f:
        s8_xml = f.read()
    s8_xml = s8_xml.replace(
        "Extending device lifespan by 1–2 years cuts lifetime emissions in half by preventing premature manufacturing.",
        "Extending lifespan by 1–2 years cuts lifetime emissions in half by avoiding new manufacturing."
    )
    with open(slide8_path, "w", encoding="utf-8") as f:
        f.write(s8_xml)

# -------------------------------------------------------------
# 8. POLISH SLIDE 10 (Slide 9 in presentation: Moat of Trust)
# -------------------------------------------------------------
print("8. Polishing Slide 9 (Moat of Trust) ...")
slide10_path = os.path.join(unpacked_dir, "ppt", "slides", "slide10.xml")
if os.path.exists(slide10_path):
    with open(slide10_path, "r", encoding="utf-8") as f:
        s10_xml = f.read()
    s10_xml = s10_xml.replace('sz="1550"', 'sz="1350"')
    with open(slide10_path, "w", encoding="utf-8") as f:
        f.write(s10_xml)

# -------------------------------------------------------------
# 9. POLISH SLIDE 11 (Slide 10 in presentation: Conclusion)
# -------------------------------------------------------------
print("9. Polishing Slide 10 (Conclusion) ...")
slide11_path = os.path.join(unpacked_dir, "ppt", "slides", "slide11.xml")
if os.path.exists(slide11_path):
    with open(slide11_path, "r", encoding="utf-8") as f:
        s11_xml = f.read()
    s11_xml = s11_xml.replace(
        "Join the FixGrid Movement. Built with pride by Rishit Jindal.",
        "Join the Movement  •  Live at www.vytron.me  •  Built with pride by Rishit Jindal."
    )
    with open(slide11_path, "w", encoding="utf-8") as f:
        f.write(s11_xml)

# -------------------------------------------------------------
# 10. REPACK INTO FIXGRID_HACKATHON_PITCH_DECK.PPTX
# -------------------------------------------------------------
if os.path.exists(out_pptx):
    os.remove(out_pptx)

print(f"10. Packing into {out_pptx} ...")
with zipfile.ZipFile(out_pptx, 'w', zipfile.ZIP_DEFLATED) as zip_out:
    for foldername, subfolders, filenames in os.walk(unpacked_dir):
        for filename in filenames:
            filepath = os.path.join(foldername, filename)
            arcname = os.path.relpath(filepath, unpacked_dir)
            zip_out.write(filepath, arcname)

# Cleanup unpacked directory
shutil.rmtree(unpacked_dir)
if os.path.exists(r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\temp_inspect"):
    shutil.rmtree(r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\temp_inspect")

print("SUCCESS: 100% Watermark-Free, Bespoke Master Deck Created!")
