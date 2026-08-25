import os
import re

def main():
    base_dir = r"C:\GitHub\Hectar"
    index_path = os.path.join(base_dir, "index.html")
    script_path = os.path.join(base_dir, "script.js")
    style_path = os.path.join(base_dir, "style.css")

    # 1. Update version to 3.0 in index.html
    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()
    html = html.replace("2.9", "3.0")
    html = html.replace("v2.9", "v3.0")
    
    # 2. Fix iPhone PWA layout in index.html (safe-area-inset-bottom)
    # The user asked: "Решить проблему с версткой , на айфоне когда устаналиваешь сайт на рабочий стол, то нижняя верстка не меняется и поэтому внизу остается много пространство"
    # We can add a style patch in the head or update the style.css
    # But let's first update versions in script.js and style.css
    with open(script_path, 'r', encoding='utf-8') as f:
        js = f.read()
    js = js.replace("2.9", "3.0")
    js = js.replace("v2.9", "v3.0")
    
    with open(style_path, 'r', encoding='utf-8') as f:
        css = f.read()
    css = css.replace("2.9", "3.0")
    css = css.replace("v2.9", "v3.0")
    
    # 3. Remove calculator from script.js
    # We find the renderCalcSection function and remove its implementation or make it return empty string
    js = re.sub(r'function renderCalcSection\([^)]*\)\s*\{.*?\n\}', 'function renderCalcSection(field) { return ""; }', js, flags=re.DOTALL)
    
    # We also remove the Калькулятор расхода block from index/script where it's injected
    # In script.js:
    js = re.sub(r'<!-- Калькулятор норм расхода -->.*?</details>', '', js, flags=re.DOTALL)
    
    # 4. Modify distance measurement (points removal, area rounding)
    # In script.js we have: label.textContent = `${fmtKm(totalKm)} (${lang === 'ru' ? 'последний' : 'seg'}: ${fmtKm(segKm)}, ${n} ${lang === 'ru' ? 'точек' : 'pts'})`;
    js = re.sub(r'label\.textContent = `\$\{fmtKm\(totalKm\)\} \(\$\{lang === \'ru\' \? \'.*?\' : \'seg\'\}: \$\{fmtKm\(segKm\)\}, \$\{n\} \$\{lang === \'ru\' \? \'точек\' : \'pts\'\}\)`;', 
                r'label.textContent = `${fmtKm(totalKm)} (${lang === \'ru\' ? \'последний\' : \'seg\'}: ${fmtKm(segKm)})`;', js)
    js = re.sub(r'label\.textContent = `\$\{fmtKm\(totalKm\)\} \(\$\{lang === \'ru\' \? \'.*?\' : \'seg\'\}: \$\{fmtKm\(segKm\)\}, \$\{n\} \$\{lang === \'ru\' \? \'точки\' : \'pts\'\}\)`;', 
                r'label.textContent = `${fmtKm(totalKm)} (${lang === \'ru\' ? \'последний\' : \'seg\'}: ${fmtKm(segKm)})`;', js)

    # Make sure we catch any variations of it:
    js = re.sub(r'\$\{n\}\s*\$\{lang === \'ru\' \? \'точе?к[а-я]*\' : \'pts\'\}', '', js)
    js = re.sub(r', \s*\)', ')', js) # fix trailing comma if any

    # Round area to tenths (1 decimal place)
    # The format function usually looks like `(area).toFixed(2)`
    js = js.replace('area.toFixed(2)', 'area.toFixed(1)')
    js = js.replace('area).toFixed(2)', 'area).toFixed(1)')
    js = js.replace('toFixed(2) + " га"', 'toFixed(1) + " га"')
    js = js.replace('toFixed(2) + " ha"', 'toFixed(1) + " ha"')

    # 5. Fix iPhone PWA issue. Often caused by missing safe-area-inset-bottom in bottom navigation or app container.
    # We'll append a CSS rule to style.css to ensure body/app padding
    css_patch = """
/* Phase 1: PWA iPhone Layout Fix */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  body, #app-wrapper, .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom) !important;
  }
}
"""
    if "PWA iPhone Layout Fix" not in css:
        css += css_patch

    # Write files back
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(js)
    with open(style_path, 'w', encoding='utf-8') as f:
        f.write(css)

    print("Phase 1 applied successfully.")

if __name__ == "__main__":
    main()
