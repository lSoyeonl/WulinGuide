#!/usr/bin/env python3
"""Apply images from this update package to a local checkout of the guide site."""
from pathlib import Path
import re,shutil,sys,json,hashlib

HERE=Path(__file__).resolve().parent
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()
HTML=ROOT/'meridians.html'
MANIFEST=json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
if not HTML.is_file():
    sys.exit('Ошибка: нет meridians.html. Запустите: python install.py ПУТЬ_К_РЕПОЗИТОРИЮ')
html=HTML.read_text(encoding='utf-8')
updates=[]
for item in MANIFEST:
    alt, filename = item['card_alt'], item['target_filename']
    source=HERE/'images'/filename
    if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest()!=item['sha256']:
        sys.exit('Ошибка: отсутствует или повреждён файл '+str(source))
    pattern=re.compile(r'(<img\b[^>]*\bsrc=")[^"]+("[^>]*\balt="'+re.escape(alt)+r'"[^>]*>)')
    matches=list(pattern.finditer(html))
    if len(matches)!=1:sys.exit(f'Ошибка: карточка {alt} найдена {len(matches)} раз(а); изменения не применены.')
    html=pattern.sub(lambda m: m.group(1)+'images/'+filename+m.group(2),html,count=1)
    updates.append((alt,filename))
# First validate everything, then write. Backup original markup.
backup=ROOT/'meridians.html.before-image-update.bak'
if backup.exists():sys.exit('Ошибка: резервная копия уже существует: '+str(backup))
shutil.copy2(HTML,backup)
assets=ROOT/'images';assets.mkdir(exist_ok=True)
for _,filename in updates:
    shutil.copyfile(HERE/'images'/filename,assets/filename)
HTML.write_text(html,encoding='utf-8')
for alt,filename in updates:
    assert f'images/{filename}' in html
print('Готово. Обновлено карточек:',len(updates))
print('Резервная копия:',backup)
print('Теперь можно проверить локальный сайт и загрузить изменённые файлы в GitHub.')
