import os, glob, re
from collections import defaultdict

files = glob.glob('d:/My ACA/3rd sem/database/project/MedSync/docs/stitch_enterprise_healthcare_ui_generator/**/*.html', recursive=True)

button_classes = defaultdict(set)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        name = os.path.relpath(f, 'd:/My ACA/3rd sem/database/project/MedSync/docs/stitch_enterprise_healthcare_ui_generator/')
        
        # Extract button classes
        btns = re.findall(r'<button[^>]*class="([^"]+)"', content)
        for cls_str in btns:
            # We want to find the combination of classes used for buttons to see inconsistencies
            # Ignore some dynamic classes or group them
            cls = ' '.join(sorted(cls_str.split()))
            button_classes[cls].add(name)

print('Button Styles Used:')
for c, fs in sorted(button_classes.items(), key=lambda item: len(item[1]), reverse=True)[:10]:
    print(f'\n{c}\n  -> Found in {len(fs)} files (e.g., {list(fs)[0]})')
