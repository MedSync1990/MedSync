import os
import re
from collections import defaultdict
import glob

files = glob.glob('d:/My ACA/3rd sem/database/project/MedSync/docs/stitch_enterprise_healthcare_ui_generator/**/*.html', recursive=True)

color_counts = defaultdict(set)
font_counts = defaultdict(set)
frameworks = defaultdict(set)
layout_classes = defaultdict(set)
inline_styles_counts = defaultdict(int)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
        # Check frameworks
        if 'tailwind' in content.lower():
            frameworks['Tailwind'].add(f)
        if 'bootstrap' in content.lower():
            frameworks['Bootstrap'].add(f)
            
        # Extract colors (hex)
        colors = re.findall(r'#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b', content)
        for c in colors:
            color_counts['#'+c.lower()].add(f)
            
        # Extract fonts
        fonts = re.findall(r'font-family:\s*([^;>\"\']+)', content)
        for font in fonts:
            font_counts[font.strip()].add(f)
            
        # Classes that might indicate layout structure
        classes = re.findall(r'class="([^"]+)"', content)
        for cls_str in classes:
            for cls in cls_str.split():
                if any(x in cls.lower() for x in ['sidebar', 'nav', 'header', 'main', 'container']):
                    layout_classes[cls].add(f)
                    
        inline_styles_counts[f] = len(re.findall(r'style="[^"]+"', content))

print('Frameworks used:')
for fw, fs in frameworks.items():
    print(f'  {fw}: {len(fs)} files')
    
print('\nTop Colors used in different files:')
for c, fs in sorted(color_counts.items(), key=lambda item: len(item[1]), reverse=True)[:15]:
    print(f'  {c}: {len(fs)} files')
    
print('\nFonts used:')
for f_font, fs in font_counts.items():
    print(f'  {f_font}: {len(fs)} files')

print('\nCommon Layout Classes:')
for c, fs in sorted(layout_classes.items(), key=lambda item: len(item[1]), reverse=True)[:20]:
    print(f'  {c}: {len(fs)} files')

print('\nInline Styles Count (top 5):')
for f, count in sorted(inline_styles_counts.items(), key=lambda item: item[1], reverse=True)[:5]:
    print(f'  {os.path.basename(f)}: {count}')
