// 체험첵! AI 도우미 (Firebase AI Logic · Gemini) — 문서 초안 만들 때만 씀
// 앱의 나머지는 예전 방식(compat) 파이어베이스를 쓰고, AI만 새 방식으로 따로 불러와요.
const V = '12.18.0', G = `https://www.gstatic.com/firebasejs/${V}/`;
const FCAI = window.FCAI = { state: 'loading', why: '', ask: null, errorText: null };
const ERR = e => {
  const m = String(e && e.message || e);
  if (/app.?check|attestation|recaptcha/i.test(m)) return 'App Check 설정을 확인해 주세요 (설정_안내.txt의 AI 단계)';
  if (/quota|429|exhausted|rate/i.test(m)) return 'AI 사용량이 잠깐 넘쳤어요. 1~2분 뒤 다시 해 보세요';
  if (/api.*not.*enabled|403|permission|billing/i.test(m)) return 'AI Logic이 켜져 있는지 확인해 주세요 (설정_안내.txt의 AI 단계)';
  if (/fetch|network|Failed to/i.test(m)) return '인터넷 연결을 확인해 주세요';
  return 'AI가 답하지 못했어요: ' + m.slice(0, 120);
};
FCAI.errorText = ERR;
function parseJSON(text) {
  const t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (_) {
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error('AI 답을 읽지 못했어요');
  }
}
(async () => {
  const C = window.FIREBASE_CONFIG || {}, KEY = (window.RECAPTCHA_SITE_KEY || '').trim();
  const MODELS = window.AI_MODELS && window.AI_MODELS.length ? window.AI_MODELS : ['gemini-2.5-flash'];
  if (!C.apiKey) { FCAI.state = 'off'; FCAI.why = '체험 모드에서는 AI를 쓸 수 없어요.'; return; }
  if (!KEY) { FCAI.state = 'off'; FCAI.why = 'AI 설정이 아직 안 됐어요. 설정_안내.txt의 AI 단계(AI Logic 켜기, App Check 사이트 키)를 해 주세요.'; return; }
  try {
    const [{ initializeApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, GoogleAIBackend }] = await Promise.all([
      import(G + 'firebase-app.js'), import(G + 'firebase-app-check.js'), import(G + 'firebase-ai.js')]);
    const app = initializeApp(C, 'fc-ai');
    if (['localhost', '127.0.0.1'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(KEY), isTokenAutoRefreshEnabled: true });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    // 문서 초안은 깊이 생각할 필요가 적어서 '생각하는 시간'을 줄여 빠르게 받아요. 안 되는 모델이면 기본값으로 다시 시도.
    let think = true;
    FCAI.ask = async (prompt, temperature = 0.3) => {
      let last;
      for (const name of MODELS) {
        for (const useThink of think ? [true, false] : [false]) {
          try {
            const generationConfig = { responseMimeType: 'application/json', temperature, ...(useThink ? { thinkingConfig: { thinkingBudget: 0 } } : {}) };
            const res = await getGenerativeModel(ai, { model: name, generationConfig }).generateContent(prompt);
            return parseJSON(res.response.text());
          } catch (e) {
            last = e; const m = String(e && e.message || e);
            if (useThink && /think|budget|invalid argument|400/i.test(m)) { think = false; continue; }
            if (!/not found|404|not supported|unsupported|is not available|invalid model/i.test(m)) throw e;
            break;
          }
        }
      }
      throw last;
    };
    FCAI.state = 'ready';
  } catch (e) { console.error(e); FCAI.state = 'off'; FCAI.why = 'AI 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; }
})();

// 학생 글에서 이름처럼 보이는 부분 가리기 (최선을 다해 가리지만 완벽하지는 않아요)
const SUR = '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부';
const NAME = new RegExp(`(^|[^가-힣])([${SUR}][가-힣]{1,2})(이랑|랑|이한테|한테|이가|이와|이네|이도|이는|이를|에게|이에게|아|야)(?=[^가-힣]|$)`, 'g');
const KEEP = new Set(['선생님', '선생', '친구', '동생', '부모님', '모두', '우리', '정말', '진짜', '사람', '기사님', '가족', '반장', '모둠', '조원', '누구', '자기', '이번', '이것', '그것', '선배', '후배', '언니', '오빠', '누나', '형', '엄마', '아빠', '할머니', '할아버지', '삼촌', '이모', '고모', '경주', '부산', '서울', '제주']);
FCAI.mask = s => String(s || '').replace(NAME, (m, a, n, p) => KEEP.has(n) ? m : a + '○'.repeat(n.length) + p)
  .replace(/\d{2,3}-\d{3,4}-\d{4}/g, '(번호)');
