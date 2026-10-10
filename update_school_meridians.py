from pathlib import Path
p=Path('meridians.html')
s=p.read_text(encoding='utf-8')
replacements = {'images/meridian-blissful.webp': 'images/meridian-blissful.png', 'images/meridian-beggars.webp': 'images/meridian-beggars.png', 'images/meridian-wudang.webp': 'images/meridian-wudang.png', 'images/meridian-tang.webp': 'images/meridian-tang.png', 'images/meridian-imperial-guard.webp': 'images/meridian-imperial-guard.png', 'images/meridian-shaolin.webp': 'images/meridian-shaolin.png', 'images/meridian-ming-cult.webp': 'images/meridian-ming-cult.png', 'images/meridian-tianshan.webp': 'images/meridian-tianshan.png', 'images/meridian-shaman-sanctuary.webp': 'images/meridian-shaman-sanctuary.png'}
for old,new in replacements.items():
    if old not in s:
        raise SystemExit(f'Не найдена ссылка: {old}; файл не изменён')
for old,new in replacements.items():
    s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('Обновлены ссылки на изображения школьных меридианов.')
