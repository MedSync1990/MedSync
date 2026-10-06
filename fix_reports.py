import glob
import os

files = glob.glob(r'd:\My ACA\3rd sem\database\project\MedSync\frontend\src\pages\reports\*.tsx')

replacements = {
    'bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs h-[400px]': 'bg-surface-container-lowest rounded-xl p-space-lg shadow-sm h-[400px] flex flex-col justify-center',
    'bg-surface-card rounded-xl border border-border-subtle shadow-xs': 'rounded-xl bg-surface-container-lowest shadow-sm',
    'bg-surface-subtle border-b border-border-subtle': 'bg-canvas-bg font-label-sm text-label-sm text-secondary uppercase tracking-wider',
    'divide-border-subtle': 'divide-surface-container',
    'hover:bg-surface-subtle/50': 'hover:bg-canvas-bg',
    'border-t-2 border-border-subtle': 'border-t-2 border-surface-container',
    'text-brand-navy-deep': 'text-on-surface',
    'text-on-surface-variant': 'text-secondary'
}

for filepath in files:
    if "InsuranceVsOutOfPocket.tsx" in filepath:
        continue # Already processed
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print('Done replacing in reports.')
