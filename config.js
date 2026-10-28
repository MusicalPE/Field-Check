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
