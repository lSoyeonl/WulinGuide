from pathlib import Path
import re
import shutil
import sys

root = Path(__file__).resolve().parent
html = root / "meridians.html"
img = root / "images" / "meridian-scholars.png"

if not html.is_file():
    sys.exit("Ошибка: распакуйте архив в корень сайта, рядом с meridians.html.")
if not img.is_file():
    sys.exit("Ошибка: не найден images/meridian-scholars.png.")

original = html.read_text(encoding="utf-8")
pattern = r'(<img\b[^>]*\bsrc=")([^"]+)("[^>]*\balt="Уч[её]ные"[^>]*>)'
updated, count = re.subn(
    pattern, lambda m: m.group(1) + "images/meridian-scholars.png" + m.group(3),
    original
)
if count != 1:
    sys.exit(f"Ошибка: найдено {count} иконок «Учёные» вместо одной. Файл не изменён.")
if updated != original:
    backup = root / "meridians.html.bak"
    shutil.copy2(html, backup)
    html.write_text(updated, encoding="utf-8")
    print("Готово: исправлена ссылка «Учёные». Резервная копия — meridians.html.bak")
else:
    print("Ссылка «Учёные» уже правильная. Изображение готово к загрузке.")
