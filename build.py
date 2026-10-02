#!/usr/bin/env python3
"""Prague Shortcuts (anglická verze Pražských zkratek) — sestaví statický web ze šablon (src/)
a dat (_data/*.json) do site/. Texty, průvodci, čtvrti, e-shop a sezónní tipy jsou v _data/*.json.
Ukázkový článek: _data/article_*.json → site/guides/<slug>.html."""
import datetime, hashlib, json, pathlib, shutil
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).parent
SRC, CONTENT, OUT = ROOT / 'src', ROOT / '_data', ROOT / 'site'

if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(ROOT / 'assets', OUT / 'assets')
for f in ('style.css', 'main.js'):
    shutil.copy(SRC / f, OUT / 'assets' / f)

h = lambda p: hashlib.md5((OUT / p).read_bytes()).hexdigest()[:8]
data = {p.stem: json.loads(p.read_text()) for p in CONTENT.glob('*.json')}
v = {'css': h('assets/style.css'), 'js': h('assets/main.js'), 'fav': h('assets/favicon.svg')}


def make_img(root):
    def img(p, w=None):
        """název obrázku z dat → cesta; w=900 → menší varianta, pokud existuje"""
        p = 'assets/img/' + str(p).rsplit('/', 1)[-1]
        if w:
            small = p.rsplit('.', 1)[0] + f'-{w}.jpg'
            if (OUT / small).exists():
                p = small
        return root + p
    return img


env = Environment(loader=FileSystemLoader(str(SRC)), autoescape=False)
year = datetime.date.today().year


def render(tpl, out, root, **extra):
    env.filters['img'] = make_img(root)
    html = env.get_template(tpl).render(data, site=data['site'], v=v, year=year, root=root, **extra)
    html = html.replace('<html lang="en">', '<html lang="en" class="no-js">', 1)
    (OUT / out).parent.mkdir(parents=True, exist_ok=True)
    (OUT / out).write_text(html)
    print('✓', out)


render('index.html', 'index.html', '')
for p in CONTENT.glob('article_*.json'):
    a = json.loads(p.read_text())
    render('guide.html', f"guides/{a['slug']}.html", '../', a=a)
(OUT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(OUT / '.nojekyll').touch()
