// 체험첵! AI 도우미 (Gemini) — 문서 초안·활동지 질문 만들 때만 씀
// 앱의 AI: Firebase AI Logic(App Check로 보호) / 내 AI 키: Google AI Studio 키로 바로 부름 (aikey.js)
// 앱의 나머지는 예전 방식(compat) 파이어베이스를 쓰고, AI만 새 방식으로 따로 불러와요.
const V = '12.18.0', G = `https://www.gstatic.com/firebasejs/${V}/`;
const FCAI = window.FCAI = { state: 'loading', why: '', lastNote: '' };
const QUOTA_RE = /quota|\b429\b|exhausted|rate.?limit|too many requests/i;
const BUSY_RE = /high demand|overloaded|unavailable|try again later|\b50[034]\b|deadline/i;
const NO_MODEL_RE = /not found|\b404\b|not supported|unsupported|is not available|invalid model/i;
const BADKEY_RE = /api.?key.*(not valid|invalid|expired)|API_KEY_INVALID|API_KEY_EXPIRED/i;
const THINK_RE = /think|budget|invalid.?argument|\b400\b/i;
const mode = () => (window.AIK ? window.AIK.mode() : 'builtin');
FCAI.errorText = e => {
  const m = String(e && e.message || e);
  const raw = ' (' + m.replace(/^\[[^\]]*\]\s*/, '').replace(/Error fetching from \S+\s*/i, '').replace(/^[:\s]+/, '').slice(0, 100) + ')';
  if (m === 'NEED_KEY') return '무료 체험을 다 썼어요. 내 AI 키를 넣어 주세요';
  if (m === 'BUILTIN_OFF') return FCAI.why || '앱의 AI를 쓸 수 없어요';
  if (BADKEY_RE.test(m)) { setTimeout(() => window.AIK && window.AIK.openKey('넣어 둔 AI 키가 맞지 않아요'), 50); return 'AI 키가 맞지 않아요. 다시 넣어 주세요'; }
  if (mode() === 'key' && QUOTA_RE.test(m)) return '내 AI 키의 무료 사용량이 잠깐 찼어요. 1~2분 뒤(하루 한도면 내일) 다시 해 보세요';
  if (/^timeout/i.test(m)) return 'AI가 답을 주지 않아 멈췄어요. 잠시 뒤 다시 해 보세요';
  if (/app.?check|attestation|recaptcha/i.test(m)) return 'App Check 설정을 확인해 주세요' + raw;
  if (BUSY_RE.test(m)) return 'AI 서버가 지금 붐벼서 모든 모델이 답하지 못했어요. 몇 분 뒤 다시 해 보세요';
  if (QUOTA_RE.test(m)) return 'AI 사용량이 잠깐 넘쳤어요. 1~2분 뒤 다시 해 보세요' + raw;
  if (/api.*not.*enabled|\b403\b|permission|billing/i.test(m)) return 'AI Logic이 켜져 있는지 확인해 주세요' + raw;
  if (/fetch|network|Failed to/i.test(m)) return '인터넷 연결을 확인해 주세요';
  return 'AI가 답하지 못했어요' + raw;
};
// 지금 AI를 쓸 수 있는지 (쓸 수 없으면 이유)
FCAI.check = () => {
  const m = mode();
  if (m === 'need') return { ok: false, need: true, why: '무료 체험을 다 썼어요' };
  if (m === 'key') return { ok: true };
  if (FCAI.state === 'loading') return { ok: false, why: 'AI를 준비하는 중이에요. 잠시 뒤 다시 눌러 주세요' };
  if (FCAI.state !== 'ready') return { ok: false, why: FCAI.why || '앱의 AI를 쓸 수 없어요' };
  return { ok: true };
};
function parseJSON(text) {
  const t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (_) {
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error('AI 답을 읽지 못했어요');
  }
}
const MODELS = window.AI_MODELS && window.AI_MODELS.length ? window.AI_MODELS : ['gemini-2.5-flash'];
const TIMEOUT = 70000;
let builtinModel = null;           // (name, cfg) => model  (앱의 AI가 준비되면 채워짐)
const noThink = new Set();
// 내 키로 Gemini 부르기
async function callKey(name, prompt, cfg) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent`, {
      method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': window.AIK.key() },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: cfg }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`[${r.status}] ${(j.error && j.error.status) || ''} ${(j.error && j.error.message) || r.statusText}`);
    return (((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).filter(x => !x.thought).map(x => x.text || '').join(''));
  } catch (e) { if (e && e.name === 'AbortError') throw new Error('timeout: ' + name); throw e; }
  finally { clearTimeout(timer); }
}
async function callOne(name, prompt, cfg, useKey) {
  if (useKey) return callKey(name, prompt, cfg);
  let timer;
  const res = await Promise.race([builtinModel(name, cfg).generateContent(prompt),
    new Promise((_, no) => { timer = setTimeout(() => no(new Error('timeout: ' + name)), TIMEOUT); })]).finally(() => clearTimeout(timer));
  return res.response.text();
}
FCAI.ask = async (prompt, temperature = 0.3) => {
  const m = mode(); FCAI.lastNote = '';
  if (m === 'need') throw new Error('NEED_KEY');
  const useKey = m === 'key';
  if (!useKey && !builtinModel) throw new Error('BUILTIN_OFF');
  let last;
  for (const name of MODELS) {
    try {
      const base = { responseMimeType: 'application/json', temperature };
      let text;
      if (!noThink.has(name)) {
        // 문서 초안은 깊이 생각할 필요가 적어서 '생각 시간'을 0으로. 모르는 모델이면 빼고 다시
        try { text = await callOne(name, prompt, { ...base, thinkingConfig: { thinkingBudget: 0 } }, useKey); }
        catch (e) { const s = String(e && e.message || e); if (!THINK_RE.test(s) || BADKEY_RE.test(s)) throw e; noThink.add(name); }
      }
      if (text === undefined) text = await callOne(name, prompt, base, useKey);
      const out = parseJSON(text);
      if (window.AIK) FCAI.lastNote = await window.AIK.used();
      return out;
    } catch (e) {
      last = e; const s = String(e && e.message || e);
      if (BADKEY_RE.test(s)) throw e;
      // 모델이 없거나, 무료 사용량이 찼거나, 붐비거나, 너무 오래 걸리면 다음 모델로
      if (NO_MODEL_RE.test(s) || QUOTA_RE.test(s) || BUSY_RE.test(s) || /^timeout|abort/i.test(s)) { console.warn('AI 모델 건너뜀:', name, s); continue; }
      throw e;
    }
  }
  throw last;
};
// 앱의 AI 준비
(async () => {
  const C = window.FIREBASE_CONFIG || {}, KEY = (window.RECAPTCHA_SITE_KEY || '').trim();
  if (!C.apiKey) { FCAI.state = 'off'; FCAI.why = '체험 모드에서는 앱의 AI를 쓸 수 없어요. 내 AI 키를 넣으면 써 볼 수 있어요.'; return; }
  if (!KEY) { FCAI.state = 'off'; FCAI.why = 'AI 설정이 아직 안 됐어요. 설정_안내.txt의 AI 단계를 해 주세요.'; return; }
  try {
    const [{ initializeApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, GoogleAIBackend }] = await Promise.all([
      import(G + 'firebase-app.js'), import(G + 'firebase-app-check.js'), import(G + 'firebase-ai.js')]);
    const app = initializeApp(C, 'fc-ai');
    if (['localhost', '127.0.0.1'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(KEY), isTokenAutoRefreshEnabled: true });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    builtinModel = (name, generationConfig) => getGenerativeModel(ai, { model: name, generationConfig }, { timeout: TIMEOUT });
    FCAI.state = 'ready';
  } catch (e) { console.error(e); FCAI.state = 'off'; FCAI.why = '앱의 AI를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; }
})();

// 학생 글에서 이름처럼 보이는 부분 가리기 (최선을 다해 가리지만 완벽하지는 않아요)
const SUR = '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부';
const NAME = new RegExp(`(^|[^가-힣])([${SUR}][가-힣]{1,2})(이랑|랑|이한테|한테|이가|이와|이네|이도|이는|이를|에게|이에게|아|야)(?=[^가-힣]|$)`, 'g');
const KEEP = new Set(['선생님', '선생', '친구', '동생', '부모님', '모두', '우리', '정말', '진짜', '사람', '기사님', '가족', '반장', '모둠', '조원', '누구', '자기', '이번', '이것', '그것', '선배', '후배', '언니', '오빠', '누나', '형', '엄마', '아빠', '할머니', '할아버지', '삼촌', '이모', '고모', '경주', '부산', '서울', '제주']);
FCAI.mask = s => String(s || '').replace(NAME, (m, a, n, p) => KEEP.has(n) ? m : a + '○'.repeat(n.length) + p)
  .replace(/\d{2,3}-\d{3,4}-\d{4}/g, '(번호)');
