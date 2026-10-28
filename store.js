// 저장 계층: 파이어베이스 설정이 있으면 파이어베이스, 없으면 체험 모드(localStorage)
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const useFb = !!(cfg.apiKey && typeof firebase !== 'undefined');
  const S = { mode: useFb ? 'firebase' : 'demo' };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  S.newId = newId;

  if (useFb) {
    firebase.initializeApp(cfg);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const evRef = id => db.collection('events').doc(id);
    const svCol = eid => evRef(eid).collection('surveys');
    const rsCol = (eid, sid) => svCol(eid).doc(sid).collection('responses');
    const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

    S.onUser = cb => auth.onAuthStateChanged(u => cb(u && !u.isAnonymous ? u : null));
    S.signInGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    S.signOut = () => auth.signOut();
    S.studentLogin = () => new Promise((res, rej) => {
      const off = auth.onAuthStateChanged(async u => {
        off();
        try {
          if (u) return res(u.uid);
          const c = await auth.signInAnonymously();
          res(c.user.uid);
        } catch (e) { rej(e); }
      });
    });

    S.listEvents = async uid => docs(await db.collection('events').where('owner', '==', uid).get());
    S.saveEvent = async e => { const { id, ...rest } = e; await evRef(id).set(rest); };
    S.deleteEvent = async id => {
      const svs = await svCol(id).get();
      for (const s of svs.docs) {
        const rs = await rsCol(id, s.id).get();
        for (const r of rs.docs) await r.ref.delete();
        await s.ref.delete();
      }
      await evRef(id).delete();
    };
    S.listSurveys = async eid => docs(await svCol(eid).get());
    S.getSurvey = async (eid, sid) => {
      const d = await svCol(eid).doc(sid).get();
      return d.exists ? { id: d.id, ...d.data() } : null;
    };
    S.saveSurvey = async (eid, s) => { const { id, ...rest } = s; await svCol(eid).doc(id).set(rest); };
    S.deleteSurvey = async (eid, sid) => {
      const rs = await rsCol(eid, sid).get();
      for (const r of rs.docs) await r.ref.delete();
      await svCol(eid).doc(sid).delete();
    };
    S.listResponses = async (eid, sid) => docs(await rsCol(eid, sid).get());
    S.hasResponded = async (eid, sid, uid) => (await rsCol(eid, sid).doc(uid).get()).exists;
    S.submitResponse = async (eid, sid, uid, answers) =>
      rsCol(eid, sid).doc(uid).set({ answers, at: firebase.firestore.FieldValue.serverTimestamp() });
  } else {
    // ---- 체험 모드 ----
    const KEY = 'fieldtrip-demo-v1';
    const load = () => {
      let d = {};
      try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
      d.events = d.events || {}; d.surveys = d.surveys || {}; d.responses = d.responses || {};
      return d;
    };
    const save = d => localStorage.setItem(KEY, JSON.stringify(d));
    const clone = o => JSON.parse(JSON.stringify(o));
    const demoUser = { uid: 'demo-teacher', displayName: '체험 사용자' };

    S.onUser = cb => setTimeout(() => cb(demoUser), 0);
    S.signInGoogle = async () => {};
    S.signOut = async () => {};
    S.studentLogin = async () => {
      let u = sessionStorage.getItem('fieldtrip-demo-student');
      if (!u) { u = 'stu-' + newId(); sessionStorage.setItem('fieldtrip-demo-student', u); }
      return u;
    };
    S.listEvents = async uid => Object.entries(load().events)
      .filter(([, e]) => e.owner === uid).map(([id, e]) => ({ id, ...clone(e) }));
    S.saveEvent = async e => { const d = load(); const { id, ...rest } = e; d.events[id] = rest; save(d); };
    S.deleteEvent = async id => {
      const d = load(); delete d.events[id]; delete d.surveys[id];
      Object.keys(d.responses).forEach(k => { if (k.startsWith(id + '|')) delete d.responses[k]; });
      save(d);
    };
    S.listSurveys = async eid => Object.entries(load().surveys[eid] || {}).map(([id, s]) => ({ id, ...clone(s) }));
    S.getSurvey = async (eid, sid) => {
      const s = (load().surveys[eid] || {})[sid];
      return s ? { id: sid, ...clone(s) } : null;
    };
    S.saveSurvey = async (eid, s) => {
      const d = load(); const { id, ...rest } = s;
      d.surveys[eid] = d.surveys[eid] || {}; d.surveys[eid][id] = rest; save(d);
    };
    S.deleteSurvey = async (eid, sid) => {
      const d = load(); if (d.surveys[eid]) delete d.surveys[eid][sid];
      delete d.responses[eid + '|' + sid]; save(d);
    };
    S.listResponses = async (eid, sid) => Object.entries(load().responses[eid + '|' + sid] || {})
      .map(([id, r]) => ({ id, ...clone(r) }));
    S.hasResponded = async (eid, sid, uid) => !!(load().responses[eid + '|' + sid] || {})[uid];
    S.submitResponse = async (eid, sid, uid, answers) => {
      const d = load();
      const s = (d.surveys[eid] || {})[sid];
      if (!s || !s.open) throw new Error('closed');
      const k = eid + '|' + sid;
      d.responses[k] = d.responses[k] || {};
      if (d.responses[k][uid]) throw new Error('already');
      d.responses[k][uid] = { answers, at: Date.now() };
      save(d);
    };
  }
  window.Store = S;
})();
