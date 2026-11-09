// 체험첵! AI 키와 무료 체험 (주또싫과 같은 방식)
// 만든 사람(FREE_OWNERS)과 그 체험학습에 초대받은 선생님: 앱의 AI
// 내 AI 키를 넣은 선생님: 그 키 / 나머지: AI 버튼 AI_TRIAL 번 체험 뒤 키 필요
(function () {
  const S = window.Store;
  const TRIAL = +window.AI_TRIAL || 0, OWNERS = Array.isArray(window.FREE_OWNERS) ? window.FREE_OWNERS : [];
  const st = { uid: '', ev: null, t: null };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function sha256(t) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const AIK = window.AIK = {
    async init(user, ev) {
      st.ev = ev || null;
      if (!user) return;
      if (st.uid !== user.uid || !st.t) { st.uid = user.uid; try { st.t = await S.getTeacher(user.uid); } catch (e) { st.t = {}; } }
      // 만든 사람이 연 자기 체험학습은 "앱의 AI 그대로" (초대받은 선생님도 같이)
      if (TRIAL && OWNERS.length && ev && ev.owner === user.uid && !ev.freeAI) {
        try { if (OWNERS.includes(await sha256(String(user.email || '').trim().toLowerCase()))) { await S.updateEvent(ev.id, { freeAI: true }); ev.freeAI = true; } } catch (e) {}
      }
    },
    key: () => (st.t && st.t.aiKey) || '',
    left: () => Math.max(0, TRIAL - ((st.t && st.t.aiUsed) || 0)),
    mode() {
      if (!TRIAL) return 'builtin';
      if (AIK.key()) return 'key';
      if (st.ev && st.ev.freeAI) return 'builtin';
      return AIK.left() > 0 ? 'trial' : 'need';
    },
    // AI 버튼 하나를 다 썼을 때 (체험 중이면 1번 차감)
    async used() {
      if (AIK.mode() !== 'trial') return '';
      const n = ((st.t && st.t.aiUsed) || 0) + 1; st.t = { ...(st.t || {}), aiUsed: n };
      try { await S.saveTeacher(st.uid, { aiUsed: n }); } catch (e) {}
      const left = AIK.left();
      return left ? `무료 체험이 ${left}번 남았어요` : '무료 체험을 다 썼어요. 다음부터는 내 AI 키를 넣어 주세요';
    },
    status() {
      const m = AIK.mode();
      if (m === 'builtin') return st.ev && st.ev.freeAI && TRIAL ? '이 체험학습에서는 앱의 AI를 그대로 써요.' : '앱의 AI를 써요.';
      if (m === 'key') return '내 AI 키로 쓰는 중이에요.';
      if (m === 'trial') return `앱의 AI를 ${AIK.left()}번 더 무료로 체험할 수 있어요. 그 뒤에는 내 AI 키를 넣으면 계속 써요.`;
      return '무료 체험을 다 썼어요. 내 AI 키를 넣으면 계속 쓸 수 있어요.';
    },
    showKey: () => TRIAL > 0,
    openKey(reason) { openKeyModal(reason || ''); },
  };
  // ---------- 키 넣기 창 (페이지마다 따로 만들지 않도록 스스로 그림) ----------
  const css = `.aik-back{position:fixed;inset:0;background:rgba(20,30,20,.45);z-index:200;display:grid;place-items:center;padding:16px}
.aik{background:var(--card,#fff);color:var(--ink,#232C22);border-radius:22px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:var(--f-body,"Nanum Gothic",sans-serif);font-size:14.5px;line-height:1.6}
.aik h3{margin:0 0 6px;font-family:var(--f-display,"Do Hyeon",sans-serif);font-weight:400;font-size:24px;color:var(--pri,#3D6B35)}
.aik .why{font-weight:800;margin:0 0 6px}
.aik .sub{color:var(--sub,#5F6E5B);font-size:13px}
.aik ol{padding-left:20px;margin:8px 0}.aik li{margin:4px 0;word-break:keep-all}
.aik input{width:100%;font:inherit;padding:11px 14px;border-radius:12px;border:1.5px solid var(--line,#DCE6D4);background:var(--soft,#F6F8F2);color:inherit;margin:6px 0}
.aik .row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
.aik button{font:inherit;font-weight:800;border-radius:999px;padding:9px 18px;border:1.5px solid var(--line,#DCE6D4);background:var(--card,#fff);color:inherit;cursor:pointer}
.aik button.pri{background:var(--pri,#3D6B35);border-color:var(--pri,#3D6B35);color:var(--on-pri,#fff)}
.aik button.ghost{color:var(--warn,#C94A35)}
.aik .msg{min-height:20px;font-size:13px;color:var(--warn,#C94A35);margin-top:4px}`;
  const stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl);
  function openKeyModal(reason) {
    const has = !!AIK.key();
    const back = document.createElement('div'); back.className = 'aik-back';
    back.innerHTML = `<div class="aik" role="dialog" aria-modal="true" aria-label="AI 키">
      <h3>AI 키 ${has ? '바꾸기' : '넣기'}</h3>
      ${reason ? `<p class="why">${esc(reason)}</p>` : ''}
      <p class="sub">문서 초안, 활동지 질문 만들기는 구글 Gemini(AI)로 해요. 내 구글 계정으로 키를 받아 넣으면 계속 쓸 수 있어요. 돈은 들지 않아요(카드 등록 없음).</p>
      <ol>
        <li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener"><b>aistudio.google.com/apikey</b></a> 열기 → 구글 계정으로 로그인</li>
        <li>처음이면 약관에 동의하고 <b>[API 키 만들기]</b>(Create API key) 누르기</li>
        <li>만들어진 키(AIza로 시작하는 긴 글자) 옆 <b>복사</b> 누르기</li>
        <li>아래 칸에 붙여 넣고 <b>[저장]</b></li>
      </ol>
      <input id="aik-in" placeholder="AIza…" autocomplete="off" spellcheck="false">
      <div class="msg" id="aik-msg"></div>
      <p class="sub">키는 선생님 계정에만 저장되고, 함께하는 선생님을 포함해 다른 사람에게는 보이지 않아요.<br>
      무료 키는 하루에 쓸 수 있는 양이 정해져 있고, 구글 약관상 보낸 내용을 구글이 서비스를 좋게 하는 데 쓸 수 있어요. 걱정되면 결제를 연결한 키를 쓰면 그렇지 않아요.</p>
      <div class="row">${has ? '<button class="ghost" id="aik-del">키 지우기</button>' : ''}<button id="aik-close">닫기</button><button class="pri" id="aik-save">저장</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove(), msg = t => { back.querySelector('#aik-msg').textContent = t; };
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#aik-close').onclick = close;
    const del = back.querySelector('#aik-del');
    if (del) del.onclick = async () => {
      if (!confirm('넣어 둔 AI 키를 지울까요?')) return;
      try { await S.saveTeacher(st.uid, { aiKey: '' }); st.t = { ...(st.t || {}), aiKey: '' }; close(); document.dispatchEvent(new CustomEvent('aik-change')); }
      catch (e) { msg('지우지 못했어요: ' + (e.code || e.message)); }
    };
    const save = back.querySelector('#aik-save');
    save.onclick = async () => {
      const k = back.querySelector('#aik-in').value.trim().replace(/\s+/g, '');
      if (!/^AIza[\w-]{30,}$/.test(k)) { msg('키 모양이 아니에요. AIza 로 시작하는 글자를 통째로 붙여 넣어 주세요'); return; }
      save.disabled = true; save.textContent = '확인하는 중…';
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': k } });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j.error && j.error.message) || ('HTTP ' + r.status)); }
        await S.saveTeacher(st.uid, { aiKey: k }); st.t = { ...(st.t || {}), aiKey: k };
        close(); document.dispatchEvent(new CustomEvent('aik-change', { detail: '키를 넣었어요. 이제 내 키로 AI를 써요' }));
      } catch (e) { save.disabled = false; save.textContent = '저장'; msg('키를 쓸 수 없어요: ' + String(e.message || e).slice(0, 90)); }
    };
    back.querySelector('#aik-in').focus();
  }
})();
