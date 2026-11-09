// 파이어베이스 설정 (체험첵! 전용 프로젝트: field--check)
// 이 값은 비밀번호가 아니라 프로젝트 주소 같은 것이라 공개되어도 괜찮습니다. 데이터는 파이어베이스 규칙이 지킵니다.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCoGSxQXrxYzdxBKbk9TNba8kGLlm5QbTI",
  authDomain: "field--check.firebaseapp.com",
  projectId: "field--check",
  storageBucket: "field--check.firebasestorage.app",
  messagingSenderId: "344369756170",
  appId: "1:344369756170:web:00eb1c7fbf2208228987f3"
};

// AI 도우미 (문서 초안) — 설정_안내.txt의 AI 단계를 마친 뒤 채워 주세요
// App Check(reCAPTCHA Enterprise) 사이트 키. 비어 있으면 AI 버튼은 안내만 보여 줘요.
window.RECAPTCHA_SITE_KEY = "6Lc8-wQuAAAAAJkB2WtZ6NXwFAOEqyLM5nRlQIPg";
// 쓸 AI 모델 이름 (앞에서부터 차례로 시도)
window.AI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-2.5-flash"];

// 다른 선생님이 앱의 AI를 무료로 체험할 수 있는 횟수 (AI 버튼을 누른 횟수, 선생님 한 분당)
//   다 쓰면 [설정] > [AI 도우미]에서 자기 Gemini API 키를 넣어 계속 써요. 0 이면 모두 앱의 AI를 써요.
window.AI_TRIAL = 10;
// 횟수 제한 없이 앱의 AI를 쓰는 사람(만든 사람)의 이메일을 SHA-256 으로 바꾼 값
//   이 사람이 만든 체험학습에 초대받은 선생님도 그 체험학습에서는 키 없이 써요.
window.FREE_OWNERS = ["c8c382c89009b5a22547b0b08fe70e4e7793616baabe579e606048d94304ef2f"];
