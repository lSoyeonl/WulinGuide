from pathlib import Path
import sys

page = Path(__file__).resolve().parent / "meridians.html"
if not page.exists():
    sys.exit("Не найден meridians.html. Разместите этот файл рядом с ним.")
original = page.read_text(encoding="utf-8")
wrong = 'src="images/Ученые.png"'
correct = 'src="images/meridian-scholars.png"'
if wrong not in original:
    if correct in original:
        print("Ссылка уже исправлена.")
        sys.exit(0)
    sys.exit("Не найдена ожидаемая ссылка — файл оставлен без изменений.")
if original.count(wrong) != 1:
    sys.exit("Найдено несколько совпадений — файл оставлен без изменений.")
backup = page.with_name("meridians.html.bak")
backup.write_text(original, encoding="utf-8")
page.write_text(original.replace(wrong, correct), encoding="utf-8")
print("Готово: ссылка исправлена. Исходный файл сохранён как meridians.html.bak")
