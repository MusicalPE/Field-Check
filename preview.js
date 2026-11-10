// 미리보기(?demo): 지어낸 체험학습 두 개를 채워 둠. 학교·학생 이름은 모두 지어낸 것
// store.js 가 index.html?demo 로 들어올 때 한 번 부름 (index.html 의 기본 목록·도우미 함수를 그대로 씀)
window.FC_PREVIEW_SEED = async function (S, me) {
  const T = new Date(); T.setHours(0, 0, 0, 0);
  const day = n => ymd(addDays(T, n));
  const at = (n, h, m) => { const d = addDays(T, n); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const qs = list => list.map(q => ({ ...q, id: S.newId() }));

  async function make(o) {
    const id = o.id, classes = classMap(o.classes);
    const members = { [me.uid]: me.displayName };
    o.classes.slice(1).forEach((c, i) => { members['pv-t' + (i + 2)] = c.name + ' 담임 (예시)'; });
    const ev = {
      id, owner: me.uid, members: Object.keys(members), memberNames: members, title: o.title, date: o.date, endDate: o.endDate || '',
      kind: o.kind, target: o.target, place: o.place, pinfo: o.pinfo, classes, inviteCode: 'preview',
      tasks: DEFAULT_TASKS.map(([d, t]) => ({ id: S.newId(), t, d, done: addDays(parseD(o.date), d) < T && !(o.leaveOpen || []).includes(t) })),
      createdAt: at(-60, 9), updatedAt: Date.now()
    };
    // 인솔 교사 준비물
    const night = !!o.endDate;
    const tgroups = night ? [...PACK_TEACHER.slice(0, 3), PACK_TEACHER_NIGHT, PACK_TEACHER[3]] : PACK_TEACHER;
    ev.teacherItems = packItems(tgroups, true).map(i => ({ ...i, done: rnd() < o.teacherDone }));
    await S.saveEvent(ev);

    // 학생 준비물 (QR로 체크)
    const sgroups = night ? [PACK_STUDENT_DAY[0], ...PACK_STUDENT_NIGHT, ...PACK_STUDENT_DAY.slice(1)] : PACK_STUDENT_DAY;
    await S.saveList(id, 'student', { owner: me.uid, eventTitle: o.title, date: o.date, endDate: o.endDate || '', note: o.packNote || '',
      items: packItems(sgroups, false), createdAt: at(-20, 10), updatedAt: at(-20, 10) });
    for (let i = 0; i < o.packChecks; i++) await S.submitCheck(id, 'student', 'pv-s' + i);

    // 일정표 · 날씨 지역
    await S.savePub(id, { owner: me.uid, plans: o.plans.map(p => ({ ...p, id: S.newId() })),
      place: { name: o.place, lat: o.pinfo.lat, lon: o.pinfo.lon }, eventTitle: o.title, date: o.date, endDate: o.endDate || '', updatedAt: Date.now() });

    // 안전 교육과 시청 확인
    const sid = S.newId();
    await S.saveSafety(id, { id: sid, title: '체험학습 안전 교육', videos: ['https://www.youtube.com/results?search_query=%ED%98%84%EC%9E%A5%EC%B2%B4%ED%97%98%ED%95%99%EC%8A%B5+%EC%95%88%EC%A0%84%EA%B5%90%EC%9C%A1'],
      classes, memo: '버스 안전, 길 잃었을 때, 모둠 행동 약속', classDate: o.safetyDate, classPeriod: '3', planText: '', requireWatch: true, open: true,
      owner: me.uid, eventTitle: o.title, createdAt: at(-20, 9), updatedAt: at(-20, 9) });
    o.classes.forEach(c => { for (let n = 1; n <= c.total; n++) if (rnd() < o.watched) S.addView(id, sid, c.id, n, rnd() < 0.8 ? 'class' : 'home', 'pv-s'); });

    // 설문
    for (const sv of o.surveys) {
      const svid = S.newId(), questions = qs(sv.base.questions);
      await S.saveSurvey(id, { id: svid, title: sv.base.title, phase: sv.phase, questions, open: true, owner: me.uid, eventTitle: o.title, createdAt: at(-15, 9), updatedAt: at(-15, 9) });
      for (let i = 0; i < sv.n; i++) {
        const a = {};
        questions.forEach((q, k) => {
          if (q.type === 'star') a[q.id] = rnd() < 0.55 ? 5 : rnd() < 0.7 ? 4 : 3;
          else if (q.type === 'choice') a[q.id] = pick(q.options);
          else { const pool = sv.texts[k] || []; if (pool.length && rnd() < 0.7) a[q.id] = pick(pool); }
        });
        await S.submitResponse(id, svid, 'pv-r' + i, a);
      }
    }

    // 모둠 활동지
    for (const sh of o.sheets) {
      const hid = S.newId(), groups = {};
      const names = o.classes.length === 1 ? Array.from({ length: 6 }, (_, i) => `${i + 1}모둠`) : o.classes.flatMap(c => Array.from({ length: 5 }, (_, i) => `${c.name} ${i + 1}모둠`));
      const gids = names.map((n, i) => { const g = 'g' + S.newId(); groups[g] = { name: n, order: i }; return g; });
      const questions = qs(sh.base.questions);
      await S.saveSheet(id, { id: hid, title: sh.base.title, intro: sh.base.intro, phase: sh.phase, groups, questions, open: true, owner: me.uid, eventTitle: o.title, createdAt: at(-14, 9), updatedAt: at(-14, 9) });
      for (let g = 0; g < sh.done; g++) {
        const a = {};
        questions.forEach((q, k) => { a[q.id] = q.type === 'choice' ? pick(q.options) : (sh.answers[k] ? sh.answers[k][g % sh.answers[k].length] : ''); });
        await S.saveSheetAnswer(id, hid, gids[g], a, 'pv-s');
      }
    }

    // 당일 인원 점검
    const days = [], a = parseD(o.date), b = parseD(o.endDate || o.date);
    for (let d = new Date(a); d <= b; d = addDays(d, 1)) days.push(ymd(d));
    const plan = days.length === 1 ? [[days[0], '08:30', '출발 전 (버스 탑승)'], [days[0], '12:30', '점심 후'], [days[0], '15:00', '학교 도착']]
      : days.flatMap((d, i) => (i === 0 ? [['08:30', '출발 전 (버스 탑승)'], ['12:30', '점심 후'], ['17:00', '숙소 도착'], ['21:30', '숙소 점호']]
        : i === days.length - 1 ? [['08:00', '아침 모임'], ['12:30', '점심 후'], ['15:30', '학교 도착']]
        : [['08:00', '아침 모임'], ['12:30', '점심 후'], ['17:00', '숙소 도착'], ['21:30', '숙소 점호']]).map(([t, l]) => [d, t, l]));
    const slots = {};
    plan.forEach(([date, time, label]) => { const sl = slotTimes({ id: S.newId(), date, time, label }, 10, 30); slots[sl.id] = sl; });
    await S.saveRoll(id, { owner: me.uid, eventTitle: o.title, classes, before: 10, after: 30, slots, createdAt: at(-10, 9), updatedAt: at(-10, 9) });
    if (o.past) {
      // 학생이 그 시간에 스스로 누른 것처럼 시계를 잠깐 그 시각으로 맞춰 둠
      const realNow = Date.now;
      try {
        for (const sl of Object.values(slots)) {
          Date.now = () => sl.openAt + 12 * 60000;
          for (const c of o.classes) for (let n = 1; n <= c.total; n++) {
            if (rnd() < 0.97) await S.addMark(id, sl.id, c.id, n, rnd() < 0.88 ? 'student' : 'teacher', 'pv-s');
          }
        }
      } finally { Date.now = realNow; }
    }
  }

  const KID_MEMORY = ['친구들이랑 버스에서 노래 부른 것', '로봇 팔을 직접 움직여 본 것', '천체 투영관에서 별자리 본 것', '점심에 먹은 돈가스', '모둠 미션을 다 해낸 것', '공룡 화석이 진짜 컸던 것'];
  const KID_TO_T = ['데려가 주셔서 감사합니다', '다음에도 또 가고 싶어요', '선생님 최고!', '사진 많이 찍어 주셔서 좋았어요'];
  const KID_WORRY = ['버스 멀미가 걱정돼요', '방 배정이 궁금해요', '없어요', '용돈은 얼마까지 가져가나요?', '밤에 잠을 잘 못 자요'];
  const KID_WANT = ['석굴암이 어떻게 만들어졌는지', '첨성대에서 정말 별을 봤는지', '신라 왕들의 무덤 이야기', '불국사 다보탑과 석가탑의 차이'];

  // 1) 다가오는 수학여행 (준비 중)
  await make({
    id: 'pvtrip', title: '6학년 경주 수학여행 (예시)', kind: '수학여행', date: day(16), endDate: day(18), target: '6학년 3개 반 72명',
    place: '경주 불국사 일대', pinfo: { name: '경주 불국사 일대', addr: '경북 경주시 (예시)', url: '', lat: 35.79, lon: 129.33 },
    classes: [{ id: 'c1', name: '6-1', total: 24 }, { id: 'c2', name: '6-2', total: 25 }, { id: 'c3', name: '6-3', total: 23 }],
    teacherDone: 0.3, packChecks: 0, safetyDate: day(3), watched: 0, past: false,
    plans: [
      { day: 1, time: '08:30', title: '학교 출발', memo: '운동장 집합, 반별 버스' }, { day: 1, time: '12:00', title: '점심 (휴게소)', memo: '' },
      { day: 1, time: '14:00', title: '불국사', memo: '모둠별 미션 1' }, { day: 1, time: '17:00', title: '숙소 도착 · 방 배정', memo: '' },
      { day: 2, time: '09:00', title: '석굴암', memo: '' }, { day: 2, time: '13:30', title: '국립경주박물관', memo: '모둠별 미션 2' },
      { day: 2, time: '19:30', title: '레크리에이션', memo: '반 장기자랑' }, { day: 3, time: '09:30', title: '대릉원 · 첨성대', memo: '' },
      { day: 3, time: '15:30', title: '학교 도착', memo: '' }],
    surveys: [{ base: DEFAULT_PRE_SURVEY, phase: 'pre', n: 58, texts: { 3: KID_WORRY, 4: KID_WANT } }],
    sheets: [{ base: SHEET_DEFAULTS.pre, phase: 'pre', done: 9, answers: {
      0: ['불국사', '석굴암', '첨성대', '대릉원', '국립경주박물관'],
      1: ['신라 시대에 지은 절로 다보탑과 석가탑이 있어요.', '돌을 쌓아 만든 인공 석굴이에요.', '동양에서 가장 오래된 천문대예요.'],
      2: ['청운교 백운교 계단 수, 다보탑 돌사자, 석가탑 높이', '본존불 표정, 석굴 안 온도, 입구 모양', '창문 위치, 돌의 개수, 별 관측 방법'],
      4: ['경주시 문화관광 누리집, 교과서', '어린이 백과, 박물관 누리집'] } }]
  });

  // 2) 다녀온 현장체험학습 (결과 정리 중)
  await make({
    id: 'pvsci', title: '5학년 과학관 현장체험학습 (예시)', kind: '현장체험학습', date: day(-12), endDate: '', target: '5학년 2개 반 48명',
    place: '국립 과학관 (예시)', pinfo: { name: '국립 과학관 (예시)', addr: '대전 유성구 (예시)', url: '', lat: 36.37, lon: 127.38 },
    classes: [{ id: 'c1', name: '5-1', total: 24 }, { id: 'c2', name: '5-2', total: 24 }],
    teacherDone: 1, packChecks: 44, safetyDate: day(-16), watched: 0.98, past: true, leaveOpen: ['결과 보고서·정산 정리'],
    plans: [
      { day: 1, time: '08:40', title: '학교 출발', memo: '' }, { day: 1, time: '10:00', title: '자연사관 · 공룡 화석', memo: '모둠 미션' },
      { day: 1, time: '12:00', title: '점심 (도시락)', memo: '' }, { day: 1, time: '13:00', title: '천체 투영관', memo: '' },
      { day: 1, time: '15:00', title: '학교 도착', memo: '' }],
    surveys: [{ base: DEFAULT_SURVEY, phase: 'post', n: 45, texts: { 4: KID_MEMORY, 5: KID_TO_T } }],
    sheets: [{ base: SHEET_DEFAULTS.day, phase: 'day', done: 10, answers: {
      0: ['공룡 뼈 화석은 진짜 뼈가 아니라 돌로 바뀐 것이에요.', '별자리는 계절마다 보이는 것이 달라요.', '로봇은 센서로 장애물을 알아채요.'],
      1: ['네, 티라노사우루스 이빨은 바나나만 해요.', '네, 지구가 기울어져서 계절이 생겨요.', '반쯤 찾았어요.'],
      3: ['다 같이 해서 더 재미있었다!', '천체 투영관이 최고였다', '다음엔 더 오래 보고 싶다'] } }]
  });

  location.hash = '#e=pvtrip';
};

// 미리보기 안내 줄
(function () {
  if (!window.Store || !Store.preview) return;
  const put = () => {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'note');
    bar.style.cssText = 'background:#FFF4D6;color:#5C4510;font-size:13px;line-height:1.55;text-align:center;' +
      'padding:9px max(16px,env(safe-area-inset-right,0px)) 9px max(16px,env(safe-area-inset-left,0px))';
    bar.innerHTML = '<b style="color:#3F2F08">미리보기</b> · 지어낸 학교의 체험학습 두 개(준비 중인 수학여행, 다녀온 현장체험학습)가 들어 있어요. ' +
      '눌러 봐도 이 기기에만 남고, 주소 끝에 ?demo 를 붙여 다시 들어오면 처음으로 돌아가요. ' +
      '<a href="./" id="pv-real" style="color:#2E5A3B;font-weight:700;white-space:nowrap">내 체험첵 시작하기</a>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.getElementById('pv-real').addEventListener('click', () => Store.endPreview());
  };
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);
})();
