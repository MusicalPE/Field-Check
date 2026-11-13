# 체험첵! 전체 시험 (2단계) — 기능 수정(새 기능·화면 배치·저장 방식)일 때 돌려요
#   python3 tests/full_test.py
# 코드 검사(tests/check.py)를 먼저 돌리고, 통과하면 화면을 실제로 띄워 선생님·학생 흐름을 한 번씩 밟아 봐요.
# 필요한 것: python3, node, playwright(크로미움). 체험 모드(파이어베이스 없이 이 컴퓨터 저장소)로 돌아가서 진짜 자료는 건드리지 않아요.
# 카카오 검색·날씨·유튜브·구글 로그인·AI 는 가짜 응답으로 바꿔서 시험해요.
import asyncio, datetime, json, os, sys, re, subprocess, threading, functools, http.server, socketserver
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if subprocess.run([sys.executable, os.path.join(ROOT, 'tests', 'check.py')]).returncode:
    print('코드 검사에서 걸려서 전체 시험은 하지 않았어요.'); sys.exit(1)
try:
    from playwright.async_api import async_playwright
except ImportError:
    print('playwright 가 없어요: pip install playwright && playwright install chromium'); sys.exit(2)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_address[1]}/'
KST = datetime.timezone(datetime.timedelta(hours=9))
GEO = {'results': [{'name': '경주시', 'latitude': 35.85, 'longitude': 129.22, 'admin1': '경상북도', 'country': '대한민국'}]}
# 유튜브 대신: 영상 길이 20초, 재생 시간이 저절로 올라가는 가짜 플레이어
FAKE_YT = r"""(function(){var n=0;window.YT={Player:function(id,o){var el=document.getElementById(id);var d=document.createElement('div');d.id=id;
d.style.cssText='width:100%;height:100%;position:absolute;inset:0;background:linear-gradient(135deg,#2b4a3a,#7aa37a 60%,#e8c46a);display:grid;place-items:center;color:#fff;font:800 18px "Nanum Gothic",sans-serif';
var k=n++;d.innerHTML='<div style="text-align:center"><div style="width:64px;height:44px;border-radius:12px;background:#e53935;display:grid;place-items:center;margin:0 auto 8px"><div style="width:0;height:0;border-left:16px solid #fff;border-top:10px solid transparent;border-bottom:10px solid transparent;margin-left:4px"></div></div>'+(k?'숙소 화재 대피 요령':'버스 안전벨트, 꼭 매요')+'</div>';
el.replaceWith(d);var t=0,max=20,me=this;this.getDuration=function(){return 20};this.getPlayerState=function(){return t<max?1:2};
this.getCurrentTime=function(){if(t<max)t++;return t};this.getPlaybackRate=function(){return 1};
setTimeout(function(){o.events&&o.events.onReady&&o.events.onReady()},50);}};
setTimeout(function(){window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady()},30);})();
"""
FAKE_QR = "window.QRCode=function(el,o){var c=document.createElement('canvas');c.width=c.height=8;el.appendChild(c)};QRCode.CorrectLevel={L:1,M:0,Q:3,H:2};"
OK = []; FAIL = []; ERR = []
def check(name, cond, info=''):
    (OK if cond else FAIL).append(name + ('' if cond else f'  <- {str(info)[:200]}'))
async def route(r):
    u = r.request.url
    if 'iframe_api' in u: return await r.fulfill(body=FAKE_YT, content_type='application/javascript')
    if 'qrcode' in u and 'cdnjs' in u: return await r.fulfill(body=FAKE_QR, content_type='application/javascript')
    if 'geocoding-api' in u: return await r.fulfill(json=GEO)
    if 'api.open-meteo.com' in u:
        t = datetime.date(2026, 11, 12); n = 30
        return await r.fulfill(json={'daily': {'time': [(t + datetime.timedelta(i)).isoformat() for i in range(n)], 'temperature_2m_max': [15]*n, 'temperature_2m_min': [5]*n, 'weather_code': [0]*n, 'precipitation_probability_max': [10]*n, 'precipitation_sum': [0]*n, 'wind_speed_10m_max': [3]*n, 'wind_gusts_10m_max': [5]*n}})
    if not u.startswith(B): return await r.abort()   # 바깥 주소(파이어베이스·카카오·글꼴 등)는 막고 체험 모드로
    await r.continue_()
async def pg(ctx):
    p=await ctx.new_page(); p.on('pageerror', lambda e: ERR.append(f'{p.url[-40:]}: {e}')); p.on('dialog', lambda d: asyncio.ensure_future(d.accept())); return p
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        ctx=await b.new_context(viewport={'width':1280,'height':900}, locale='ko-KR', timezone_id='Asia/Seoul')
        await ctx.clock.install(time=datetime.datetime(2026,11,12,10,0,tzinfo=KST))
        await ctx.route('**/*', route)
        A=await pg(ctx)
        # 1. 만들기
        await A.goto(B+'index.html'); await A.wait_for_timeout(700)
        await A.click('[data-act=new-event]'); await A.fill('#f-title','시험 수학여행'); await A.fill('#f-date','2026-11-20'); await A.fill('#f-end','2026-11-21')
        await A.click('[data-act=cf-add]'); await A.fill('#f-place','경주'); await A.wait_for_timeout(500)
        await A.click('[data-act=save-event]'); await A.wait_for_timeout(1500)
        check('체험학습 만들기', await A.evaluate("!!cur && cur.title==='시험 수학여행' && Object.keys(cur.classes).length===2"))
        check('업무 일정 15개 자동', await A.evaluate("cur.tasks.length")==15)
        check('장소→날씨 지역 자동', await A.evaluate("!!(pub && pub.place)"))
        check('머리에 날씨 표', await A.locator('[data-wx=pc] .wx-table').count()==1)
        await A.locator('.task input[type=checkbox], [data-act=task-toggle]').first.click(); await A.wait_for_timeout(300)
        check('업무 체크', await A.evaluate("cur.tasks.some(t=>t.done)"))
        eid=await A.evaluate("cur.id")
        # 일정
        await A.evaluate("savePub({plans:[{id:S.newId(),day:1,time:'08:30',title:'학교 출발',memo:''},{id:S.newId(),day:1,time:'11:00',title:'불국사',memo:''}]})"); await A.wait_for_timeout(300)
        # 준비물
        await A.click('[data-act=pack-start-s]'); await A.wait_for_timeout(500)
        check('학생 준비물 만들기', await A.evaluate("!!plist && plist.items.length>5"))
        await A.click('[data-act=pack-kind][data-id=teacher]'); await A.click('[data-act=pack-start-t]'); await A.wait_for_timeout(400)
        check('교사 준비물 만들기', await A.evaluate("(cur.teacherItems||[]).length>5"))
        # 안전 교육
        await A.click('[data-act=sf-new]'); await A.wait_for_timeout(200)
        await A.fill('#sf-title','안전 교육'); await A.fill('#sf-videos','https://www.youtube.com/watch?v=aaaaaaaaaaa'); await A.click('[data-act=sf-save]'); await A.wait_for_timeout(500)
        check('안전 교육 만들기', await A.evaluate("safeties.length")==1)
        # 설문 (사전), 활동지 (사전·현장), 사후 설문
        await A.click('[data-act=new-survey][data-id=pre]'); await A.wait_for_timeout(200); await A.click('[data-act=save-survey]'); await A.wait_for_timeout(400)
        await A.click('[data-act=sh-new][data-id=pre]'); await A.wait_for_timeout(200); await A.click('[data-act=sh-save]'); await A.wait_for_timeout(400)
        await A.click('[data-tab=day]'); await A.wait_for_timeout(200)
        await A.click('[data-act=roll-start]'); await A.wait_for_timeout(500)
        check('인원 점검 만들기', await A.evaluate("!!roll && Object.keys(roll.slots).length>0"))
        await A.click('[data-tab=post]'); await A.wait_for_timeout(200)
        await A.click('[data-act=new-survey][data-id=post]'); await A.wait_for_timeout(200); await A.click('[data-act=save-survey]'); await A.wait_for_timeout(400)
        ids=json.loads(await A.evaluate("JSON.stringify({sf:safeties[0].id, sv:surveys.map(s=>[s.phase||'post',s.id]), sh:sheets.map(h=>[h.phase,h.id,groupsOf(h)[0].id]), c:classesOf(cur).map(c=>c.id), slots:sortedSlots().map(s=>[s.id,s.date,s.time])})"))
        check('설문 2개·활동지 1개', len(ids['sv'])==2 and len(ids['sh'])==1, ids)
        # 2. 학생: 준비물
        P=await pg(ctx); await P.goto(B+f'packing.html?e={eid}'); await P.wait_for_timeout(800)
        n=await P.locator('.it').count()
        for i in range(n): await P.locator('.it').nth(i).click()
        await P.click('#send'); await P.wait_for_timeout(500)
        check('학생 준비물 다 챙겼어요', await A.evaluate(f"S.countChecks('{eid}','student')")>=1)
        # 학생: 사전 설문
        pre=[x for x in ids['sv'] if x[0]=='pre'][0][1]
        V=await pg(ctx); await V.goto(B+f'survey.html?e={eid}&s={pre}'); await V.wait_for_timeout(800)
        for q in await V.evaluate("[...new Set([...document.querySelectorAll('[data-q]')].map(x=>x.dataset.q))]"):
            el=V.locator(f'[data-q="{q}"]').first; tag=await el.evaluate("e=>e.tagName")
            if tag=='TEXTAREA': await el.fill('기대돼요')
            else: await el.click()
        await V.click('#submit'); await V.wait_for_timeout(700)
        check('학생 사전 설문 제출', len(await A.evaluate(f"S.listResponses('{eid}','{pre}')"))==1, await V.inner_text('#app'))
        # 학생: 활동지
        sh=ids['sh'][0]
        H=await pg(ctx); await H.goto(B+f'sheet.html?e={eid}&h={sh[1]}&g={sh[2]}'); await H.wait_for_timeout(800)
        for t in await H.locator('textarea').all(): await t.fill('조사했어요')
        for q in await H.evaluate("[...new Set([...document.querySelectorAll('.choice[data-q]')].map(x=>x.dataset.q))]"): await H.locator(f'.choice[data-q="{q}"]').first.click()
        await H.click('#submit'); await H.wait_for_timeout(700)
        check('모둠 활동지 제출', len(await A.evaluate(f"S.listSheetAnswers('{eid}','{sh[1]}')"))==1, (await H.inner_text('#app'))[:120])
        # 학생: 안전 교육 (영상 끝까지)
        F=await pg(ctx); await F.goto(B+f'safety.html?e={eid}&s={ids["sf"]}'); await F.wait_for_timeout(13000)
        await F.click('[data-p=home]'); await F.click(f'[data-c="{ids["c"][1]}"]'); await F.click('[data-n="3"]'); await F.wait_for_timeout(200)
        dis=await F.get_attribute('#submit','disabled')
        await F.click('#submit'); await F.wait_for_timeout(700)
        check('안전 교육 시청 체크', len(await A.evaluate(f"S.listViews('{eid}','{ids['sf']}')"))==1, f'disabled={dis}')
        # 학생: 일정표
        Q=await pg(ctx); await Q.goto(B+f'schedule.html?e={eid}'); await Q.wait_for_timeout(1000)
        check('학생 일정표', '불국사' in await Q.inner_text('body'))
        # 3. 당일: 인원 점검 (점검 시간 안)
        s0=ids['slots'][0]; hh,mm=map(int,s0[2].split(':')); y,m,d=map(int,s0[1].split('-'))
        await ctx.clock.set_system_time(datetime.datetime(y,m,d,hh,mm,tzinfo=KST)-datetime.timedelta(minutes=2))
        R=await pg(ctx); await R.goto(B+f'rollcall.html?e={eid}'); await R.wait_for_timeout(900)
        await R.click(f'[data-c="{ids["c"][0]}"]'); await R.wait_for_timeout(200); await R.click('[data-n="5"]'); await R.wait_for_timeout(200)
        if await R.locator('#here').count(): await R.click('#here')
        await R.wait_for_timeout(700)
        marks=await A.evaluate(f"S.listMarks('{eid}')")
        check('학생 인원 점검 체크', any(x.get('n')==5 for x in marks), (await R.inner_text('#app'))[:150])
        await A.reload(); await A.wait_for_timeout(1500)
        check('당일 탭 자동', await A.evaluate("tab")=='day')
        await A.click('[data-act=roll-board] >> nth=0'); await A.wait_for_timeout(500)
        check('인원 점검 번호판 열림', await A.locator('#md').count()==1); await A.click('#md [data-act=close]')
        # 4. 사후 설문 제출 + 결과
        await ctx.clock.set_system_time(datetime.datetime(2026,11,23,15,0,tzinfo=KST))
        post=[x for x in ids['sv'] if x[0]=='post'][0][1]
        V2=await pg(ctx); await V2.goto(B+f'survey.html?e={eid}&s={post}'); await V2.wait_for_timeout(800)
        for q in await V2.evaluate("[...new Set([...document.querySelectorAll('[data-q]')].map(x=>x.dataset.q))]"):
            el=V2.locator(f'[data-q="{q}"]').first; tag=await el.evaluate("e=>e.tagName")
            if tag=='TEXTAREA': await el.fill('친구들과 숙소에서 이야기한 밤이 좋았어요')
            else: await el.click()
        await V2.click('#submit'); await V2.wait_for_timeout(700)
        check('학생 사후 설문 제출', len(await A.evaluate(f"S.listResponses('{eid}','{post}')"))==1)
        Rp=await pg(ctx); await Rp.goto(B+f'report.html?e={eid}&s={post}'); await Rp.wait_for_timeout(1200)
        check('설문 결과 정리 화면', '응답' in await Rp.inner_text('body'))
        D1=await pg(ctx); await D1.goto(B+f'docs.html?e={eid}&k=guide'); await D1.wait_for_timeout(1500)
        check('사전 안내 자료', '준비물' in await D1.inner_text('body') and await D1.locator('.qr').count()>=2)
        D2=await pg(ctx); await D2.goto(B+f'docs.html?e={eid}&k=report'); await D2.wait_for_timeout(1500)
        txt=await D2.inner_text('body')
        check('결과 보고서', '추진 경과' in txt and '사후 평가' in txt and '안전 관리' in txt)
        await D2.click('[data-draft=good]'); await D2.wait_for_timeout(1200)
        check('자료로 초안 넣기·저장', 'docNotes' in json.dumps(await A.evaluate(f"S.listEvents('demo-teacher').then(l=>l.find(e=>e.id==='{eid}'))")))
        await D2.click('[data-ai=outcome]'); await D2.wait_for_timeout(600)
        check('AI 버튼(체험 모드) 안내만', await D2.locator('.toast.show').count()==1)
        # 5. 설정 팝업 + 공유
        await A.reload(); await A.wait_for_timeout(1200)
        await A.click('[data-act=set-modal]'); await A.wait_for_timeout(300)
        check('설정 팝업', await A.locator('#md .setcard').count()==1)
        check('설정 AI 도우미 줄', 'AI 도우미' in await A.inner_text('#md'))
        await A.click('#md [data-act=share]'); await A.click('#md [data-act=share-make]'); await A.wait_for_timeout(600)
        url=await A.get_attribute('#md [data-act=copy]','data-url'); await A.click('#md [data-act=close]')
        check('공유 주소 만들기', bool(url and 'share=' in url), url)
        I=await pg(ctx); await I.goto(url); await I.wait_for_timeout(1200)
        await I.fill('#i-date','2026-12-10'); await I.click('[data-act=import-go]'); await I.wait_for_timeout(1500)
        check('공유 불러오기 → 새 체험학습', await I.evaluate("events.length")==2 and await I.evaluate("safeties.length")==1)
        # 6. 모바일 접기
        M=await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, storage_state=await ctx.storage_state())
        await M.route('**/*', route); Mp=await pg(M); await Mp.goto(B+'index.html#e='+eid); await Mp.wait_for_timeout(1200)
        await Mp.click('[data-act=bn][data-tab=pre]'); await Mp.wait_for_timeout(300)
        await Mp.click('h3:has-text("업무 일정표")'); await Mp.wait_for_timeout(200)
        check('모바일 섹션 접기', await Mp.locator('.sec.fold').count()>=1)
        check('모바일 머리 설정 버튼 숨김', not await Mp.locator('.evhead .setbtn').is_visible())
        # 7. 미리보기
        Pv=await pg(ctx); await Pv.goto(B+'index.html?demo'); await Pv.wait_for_timeout(2500)
        await Pv.click('[data-act=home]'); await Pv.wait_for_timeout(500)
        cnt=await Pv.locator('.evc').count()
        check('미리보기 체험학습 2개', cnt==2, (await Pv.inner_text('body'))[:300])
        for i in range(cnt):
            await Pv.click(f'.evc >> nth={i}'); await Pv.wait_for_timeout(1200)
            for t in ['pre','day','post']:
                await Pv.click(f'[data-tab={t}]'); await Pv.wait_for_timeout(300)
            await Pv.click('[data-act=home]'); await Pv.wait_for_timeout(400)
        check('미리보기 탭 오류 없음', not [e for e in ERR if 'demo' in e])
        await b.close()
    for e in ERR: FAIL.append('페이지 오류: ' + e)
    print(f'전체 시험: 통과 {len(OK)}건' + (f', 걸림 {len(FAIL)}건' if FAIL else ''))
    for x in OK: print('  ok', x)
    for x in FAIL: print('  !!', x)
asyncio.run(main())
srv.shutdown()
sys.exit(1 if FAIL else 0)
