# 체험첵! 코드 검사 (1단계) — 단순 수정(글귀·색·여백·그림)일 때 이것만 돌려요
#   python3 tests/check.py
# 검사: ① 문법 오류(따옴표·괄호 짝 포함)  ② 단추(data-act 등)가 가리키는 처리가 실제로 있는지
#       ③ 판 번호가 파일마다 같은지 (같은 파일의 ?v= 번호, 앱 판 번호 = 서비스 워커 캐시 이름)
import os, re, subprocess, sys, tempfile, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
problems = []
def bad(msg): problems.append(msg)
def read(p): return open(p, encoding='utf-8').read()

# ① 문법: 독립 .js 파일과 HTML 안의 <script>
def node_check(code, label, module=False):
    with tempfile.NamedTemporaryFile('w', suffix='.mjs' if module else '.js', delete=False, encoding='utf-8') as f:
        f.write(code); name = f.name
    r = subprocess.run(['node', '--check', name], capture_output=True, text=True)
    os.unlink(name)
    if r.returncode:
        msg = (r.stderr.strip().splitlines() or ['?'])
        line = next((l for l in msg if 'SyntaxError' in l), msg[-1])
        where = next((l for l in msg if l.startswith(name)), '')
        bad(f'문법 오류: {label} {where.replace(name, "")} {line}')
for js in sorted(glob.glob('*.js')):
    node_check(read(js), js, module=('import ' in read(js) and 'export ' in read(js)))
HTML = sorted(glob.glob('*.html'))
for h in HTML:
    src = read(h)
    for i, m in enumerate(re.finditer(r'<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)</script>', src)):
        attrs, code = m.group(1), m.group(2)
        if not code.strip() or 'application/ld+json' in attrs: continue
        line = src[:m.start()].count('\n') + 1
        node_check(code, f'{h} ({line}번째 줄 스크립트)', module='module' in attrs)

# ② 단추 → 처리
def all_text(files): return '\n'.join(read(f) for f in files)
for h in HTML:
    src = read(h)
    scripts = src
    # data-act="이름" (주소 붙은 ${} 은 빼고)
    acts = set(re.findall(r'data-act="([a-z0-9-]+)"', src)) | set(re.findall(r"data-act='([a-z0-9-]+)'", src))
    if acts:
        handled = set(re.findall(r"case '([a-z0-9-]+)'", scripts)) | set(re.findall(r"act === '([a-z0-9-]+)'", scripts)) \
            | set(re.findall(r"dataset\.act === '([a-z0-9-]+)'", scripts)) | set(re.findall(r"\[data-act=\"?([a-z0-9-]+)\"?\]", scripts))
        for a in sorted(acts - handled): bad(f'{h}: data-act="{a}" 단추를 처리하는 곳이 없어요')
    # docs.html 의 AI 단추 → AIJOBS
    ai = set(re.findall(r"aiBtn\('([a-z]+)'", src))
    if ai:
        jobs = set(re.findall(r"^\s+async ([a-z]+)\(A\)", src, re.M))
        for a in sorted(ai - jobs): bad(f'{h}: AI 단추 "{a}" 를 처리하는 AIJOBS 가 없어요')
    drafts = set(re.findall(r'data-draft="([a-z]+)"', src))
    if drafts:
        for d in sorted(drafts):
            if f"{d}:" not in src: bad(f'{h}: 초안 단추 "{d}" 의 내용(DRAFTS.{d})이 없어요')
    # onclick="함수(" → 함수가 있는지
    for fn in set(re.findall(r'onclick="([A-Za-z_]\w*)\(', src)):
        if not re.search(rf'(function {fn}\b|const {fn}\b|let {fn}\b|{fn}\s*=)', all_text([h] + glob.glob('*.js'))):
            bad(f'{h}: onclick 의 {fn}() 함수가 없어요')

# ③ 판 번호
ver = {}
for h in HTML:
    for f, v in re.findall(r'(?:src|href)="([\w-]+\.(?:js|css))\?v=([\d.]+)"', read(h)):
        ver.setdefault(f, {}).setdefault(v, []).append(h)
for f, vs in sorted(ver.items()):
    if len(vs) > 1: bad(f'판 번호가 달라요: {f} → ' + ', '.join(f'{v}({len(p)}곳: {", ".join(p)})' for v, p in vs.items()))
app = re.search(r"const APP_VERSION = '([\d.]+)'", read('index.html'))
cache = re.search(r'const CACHE = "fieldcheck-v([\d.]+)"', read('sw.js'))
if not app or not cache: bad('앱 판 번호(APP_VERSION) 또는 서비스 워커 캐시 이름을 찾지 못했어요')
elif app.group(1) != cache.group(1): bad(f'앱 판 번호 {app.group(1)} 와 서비스 워커 캐시 fieldcheck-v{cache.group(1)} 가 달라요')
for f in re.findall(r'"\./([^"]+)"', read('sw.js')):
    if f and not os.path.exists(f): bad(f'sw.js 가 미리 저장하는 {f} 파일이 없어요')

print('코드 검사:', '통과' if not problems else f'{len(problems)}건 걸림')
for p in problems: print('  -', p)
sys.exit(1 if problems else 0)
