import os
import re

def main():
    script_path = r"C:\GitHub\Hectar\script.js"
    with open(script_path, 'r', encoding='utf-8') as f:
        js = f.read()
    
    # We want to replace the corrupted lines:
    # label.textContent = `${fmtKm(totalKm)} (${lang === \'ru\' ? \'<corrupted>\' : \'seg\'}: ${fmtKm(segKm)})`;
    
    js = re.sub(
        r'label\.textContent\s*=\s*`\$\{fmtKm\(totalKm\)\}\s*\(\$\{lang\s*===\s*\\?\'ru\\?\'\s*\?\s*\\?\'.*?\\?\'\s*:\s*\\?\'seg\\?\'\}\s*:\s*\$\{fmtKm\(segKm\)\}\)`;',
        r"label.textContent = `${fmtKm(totalKm)} (${lang === 'ru' ? 'последний' : 'seg'}: ${fmtKm(segKm)})`;",
        js
    )
    
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(js)
    
    print("Fixed syntax errors.")

if __name__ == "__main__":
    main()
