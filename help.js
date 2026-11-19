// 체험첵! 사용 안내 (휘슬!·리더스와 같은 방식) — index.html, docs.html 이 함께 씀
(function () {
  const HELP = [
    ['체험학습 만들기 (선생님)', [
      '"+ 새 체험학습"에 이름, 출발일, 돌아오는 날, 반과 인원을 넣어요.',
      '장소를 치고 목록에서 고르면 날씨 예보가 그곳으로 저절로 맞춰져요.',
      '출발일을 기준으로 업무 15개가 날짜별로 들어가요. 바꿀 때는 "정보 고치기".']],
    ['함께하는 선생님 (선생님)', [
      '"선생님 초대·관리"의 QR이나 링크로 동학년 선생님을 불러요.',
      '들어온 선생님도 똑같이 보고 고칠 수 있고, 누가 고쳐도 모두의 화면에 바로 보여요.',
      '"보기"에서 반을 고르면 우리 반 번호만 볼 수 있어요.']],
    ['사전 준비 (선생님)', [
      '"사전" 탭의 "업무 일정표"를 하나씩 체크해요. 업무는 고치고 더해도 막지 않아요.',
      '"일정표"에 시간과 할 일을 넣고 "학생용 일정 QR"로 나눠 줘요.',
      '준비물은 "기본 목록으로 시작하기"로 만들고, 꼭 챙길 것은 "꼭!"으로 표시해요.']],
    ['안전 교육 (선생님 · 학생)', [
      '"+ 안전 교육"에 유튜브 주소를 넣고 "QR·인쇄"로 나눠 줘요.',
      '학생은 영상을 90% 넘게 본 뒤 반과 번호를 눌러요. 앞으로 넘긴 시간은 세지 않아요.',
      '"번호 현황"에서 안 본 번호를 보고, "기록 복사"로 실시 기록을 붙여 넣어요.']],
    ['설문과 모둠 활동지 (학생)', [
      '학생은 QR만 찍으면 로그인 없이 참여해요. 이름은 묻지 않아요.',
      '"+ 새 설문", "+ 새 활동지"로 만들고 "QR·인쇄", "모둠 QR·인쇄"로 나눠 줘요.',
      '활동지는 글과 고르기만 받아요. 사진은 따로 메신저로 받아 주세요.']],
    ['당일 인원 점검 (학생)', [
      '출발하는 날에는 "당일" 탭이 저절로 열려요.',
      '"기본 점검 시간으로 시작하기"로 만들고, 시간은 "점검 시간 고치기"에서 바꿔요.',
      '학생은 점검 10분 전부터 30분 뒤까지 반과 번호를 고르고 "저 여기 있어요!"를 눌러요. 휴대폰이 없는 학생은 선생님이 번호표를 눌러 대신 체크해요.']],
    ['사후 정리와 문서 (선생님)', [
      '"사후" 탭에서 "+ 새 설문"으로 사후 설문을 받고 "결과 정리·인쇄"로 그래프를 봐요. "엑셀로 내려받기"도 돼요.',
      '"사전 안내 자료"와 "결과 보고서"는 "만들기"를 누르면 앱 자료로 채워지고, 인쇄나 PDF로 저장해요.',
      'AI 단추는 초안만 만들어요. 꼭 읽어 보고 고쳐서 써요.']],
    ['자주 묻는 것', [
      '학생이 번호를 잘못 눌렀으면 선생님이 번호표나 "번호 현황"에서 그 번호를 눌러 지워요.',
      '다른 학교 선생님께 틀을 보내려면 "설정"의 "자료 공유하기". 학생 기록은 넘어가지 않아요.',
      'AI 무료 체험을 다 썼으면 "설정"의 "AI 키 넣기". 다 끝난 체험학습은 "이 체험학습 지우기"로 정리해요.']],
  ];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `.fchelp{display:inline-flex;align-items:center;gap:6px;min-height:44px;border:0;background:none;padding:0 6px;font:inherit;font-size:14px;font-weight:800;color:var(--ink);cursor:pointer;text-decoration:none;white-space:nowrap}
.fchelp:hover{text-decoration:underline}
.fchelp .fchq{width:20px;height:20px;border-radius:50%;background:var(--ink);color:var(--card,#fff);font-size:13px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;flex:none;text-decoration:none}
.fch-back{position:fixed;inset:0;background:rgba(20,30,20,.45);z-index:300;display:grid;place-items:center;padding:16px}
.fch{background:var(--card,#fff);color:var(--ink);border-radius:22px;width:100%;max-width:620px;max-height:90vh;overflow-y:auto;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:var(--f-body,"Nanum Gothic",sans-serif);display:flex;flex-direction:column;gap:12px}
.fch-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.fch h2{margin:0;font-family:var(--f-display,"Do Hyeon",sans-serif);font-weight:400;font-size:24px;color:var(--pri,var(--ink))}
.fch section{border-top:1px solid var(--line);padding-top:10px}
.fch h3{margin:0 0 6px;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px}
.fch h3 .fchn{width:24px;height:24px;border-radius:6px;background:var(--ink);color:var(--card,#fff);font-size:14px;display:inline-flex;align-items:center;justify-content:center;flex:none}
.fch ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.fch li{font-size:14px;line-height:1.55;color:var(--sub);word-break:keep-all}
.fch .fch-btn{font:inherit;font-weight:800;border-radius:999px;min-height:44px;padding:0 18px;border:1.5px solid var(--line);background:var(--card,#fff);color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.fch .fch-ok{background:var(--pri,var(--ink));border-color:var(--pri,var(--ink));color:var(--on-pri,#fff);font-size:16px;min-height:50px}
.fch .fch-demo{align-self:flex-start}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const isPreview = () => !!(window.Store && window.Store.preview);
  function open() {
    if (document.querySelector('.fch-back')) return;
    const back = document.createElement('div'); back.className = 'fch-back';
    const demo = isPreview() ? '' : `<a class="fch-btn fch-demo" href="${new URL('index.html?demo', location.href).toString()}" target="_blank" rel="noopener">지어낸 학급으로 미리 눌러 보기</a>`;
    back.innerHTML = `<div class="fch" role="dialog" aria-modal="true" aria-label="사용 안내">
      <div class="fch-top"><h2>체험첵! 간략 사용법</h2><button class="fch-btn" data-fch-close>닫기</button></div>
      ${HELP.map(([t, lines], i) => `<section><h3><span class="fchn">${i + 1}</span>${esc(t)}</h3><ul>${lines.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}
      ${demo}<button class="fch-btn fch-ok" data-fch-close>확인</button></div>`;
    const prev = document.activeElement;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); if (prev && prev.focus) prev.focus(); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-fch-close]')) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(back);
    back.querySelector('[data-fch-close]').focus();
  }
  window.FCHelp = {
    items: HELP.length, open,
    btn: (cls = '') => `<button type="button" class="fchelp ${cls}" data-help><span class="fchq" aria-hidden="true">?</span>사용 안내</button>`,
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-help]'); if (b) { e.preventDefault(); open(); } });
})();
