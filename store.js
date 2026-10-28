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

    S.listEvents = async uid => {
      const [a, b] = await Promise.all([
        db.collection('events').where('members', 'array-contains', uid).get(),
        db.collection('events').where('owner', '==', uid).get(),
      ]);
      const map = {};
      [...docs(a), ...docs(b)].forEach(e => { map[e.id] = e; });
      return Object.values(map);
    };
    S.saveEvent = async e => { const { id, ...rest } = e; await evRef(id).set(rest); };
    S.updateEvent = async (id, fields) => evRef(id).update(fields);
    S.watchEvent = (id, cb, onErr) => evRef(id).onSnapshot(d => { if (d.exists) cb({ id: d.id, ...d.data() }); else cb(null); }, e => onErr && onErr(e));
    S.joinEvent = async (eid, code, uid, name) => evRef(eid).update({
      members: firebase.firestore.FieldValue.arrayUnion(uid),
      ['memberNames.' + uid]: name, lastJoin: code,
    });
    S.removeMember = async (eid, uid) => evRef(eid).update({
      members: firebase.firestore.FieldValue.arrayRemove(uid),
      ['memberNames.' + uid]: firebase.firestore.FieldValue.delete(),
    });
    S.deleteEvent = async id => {
      const svs = await svCol(id).get();
      for (const s of svs.docs) {
        const rs = await rsCol(id, s.id).get();
        for (const r of rs.docs) await r.ref.delete();
        await s.ref.delete();
      }
      const ls = await evRef(id).collection('lists').get();
      for (const l of ls.docs) {
        const cs = await l.ref.collection('checks').get();
        for (const c of cs.docs) await c.ref.delete();
        await l.ref.delete();
      }
      const rl = await evRef(id).collection('roll').get();
      for (const r of rl.docs) {
        const ms = await r.ref.collection('marks').get();
        for (const m of ms.docs) await m.ref.delete();
        await r.ref.delete();
      }
      const sf = await evRef(id).collection('safety').get();
      for (const s of sf.docs) {
        const vs = await s.ref.collection('views').get();
        for (const v of vs.docs) await v.ref.delete();
        await s.ref.delete();
      }
      await evRef(id).delete();
    };
    // 준비물 목록 (학생용, QR로 공유)
    const lsDoc = (eid, lid) => evRef(eid).collection('lists').doc(lid);
    S.getList = async (eid, lid) => { const d = await lsDoc(eid, lid).get(); return d.exists ? d.data() : null; };
    S.saveList = async (eid, lid, data) => lsDoc(eid, lid).set(data);
    S.countChecks = async (eid, lid) => (await lsDoc(eid, lid).collection('checks').get()).size;
    S.hasChecked = async (eid, lid, uid) => (await lsDoc(eid, lid).collection('checks').doc(uid).get()).exists;
    S.submitCheck = async (eid, lid, uid) =>
      lsDoc(eid, lid).collection('checks').doc(uid).set({ at: firebase.firestore.FieldValue.serverTimestamp() });
    // 안전 교육 (영상 시청 + 번호 체크)
    const sfCol = eid => evRef(eid).collection('safety');
    const vwCol = (eid, sid) => sfCol(eid).doc(sid).collection('views');
    S.listSafety = async eid => docs(await sfCol(eid).get());
    S.getSafety = async (eid, sid) => { const d = await sfCol(eid).doc(sid).get(); return d.exists ? { id: d.id, ...d.data() } : null; };
    S.saveSafety = async (eid, s) => { const { id, ...rest } = s; await sfCol(eid).doc(id).set(rest); };
    S.deleteSafety = async (eid, sid) => {
      const vs = await vwCol(eid, sid).get();
      for (const v of vs.docs) await v.ref.delete();
      await sfCol(eid).doc(sid).delete();
    };
    S.listViews = async (eid, sid) => docs(await vwCol(eid, sid).get());
    S.addView = async (eid, sid, c, n, place, by) => {
      const ref = vwCol(eid, sid).doc(c + '_' + n);
      try {
        await ref.set({ c, n, place, by, at: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (e) {
        if (e.code === 'permission-denied') {
          const ex = await ref.get().catch(() => null);
          if (ex && ex.exists) throw new Error('already');
        }
        throw e;
      }
    };
    S.removeView = async (eid, sid, c, n) => vwCol(eid, sid).doc(c + '_' + n).delete();
    S.removeViewLegacy = async (eid, sid, docId) => vwCol(eid, sid).doc(docId).delete();
    // 당일 인원 점검
    const rlDoc = eid => evRef(eid).collection('roll').doc('main');
    const mkCol = eid => rlDoc(eid).collection('marks');
    S.getRoll = async eid => { const d = await rlDoc(eid).get(); return d.exists ? d.data() : null; };
    S.saveRoll = async (eid, data) => rlDoc(eid).set(data);
    S.listMarks = async eid => docs(await mkCol(eid).get());
    S.watchMarks = (eid, cb, onErr) => mkCol(eid).onSnapshot(snap => cb(docs(snap)), e => onErr && onErr(e));
    S.addMark = async (eid, slot, c, n, src, by) => {
      const ref = mkCol(eid).doc(slot + '_' + c + '_' + n);
      try {
        await ref.set({ slot, c, n, src, by, at: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (e) {
        if (e.code === 'permission-denied') {
          const ex = await ref.get().catch(() => null);
          if (ex && ex.exists) throw new Error('already');
          throw new Error('closed');
        }
        throw e;
      }
    };
    S.removeMark = async (eid, slot, c, n) => mkCol(eid).doc(slot + '_' + c + '_' + n).delete();
    S.removeMarkLegacy = async (eid, docId) => mkCol(eid).doc(docId).delete();
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
      d.lists = d.lists || {}; d.checks = d.checks || {};
      d.safety = d.safety || {}; d.views = d.views || {};
      d.roll = d.roll || {}; d.marks = d.marks || {};
      return d;
    };
    const save = d => localStorage.setItem(KEY, JSON.stringify(d));
    const clone = o => JSON.parse(JSON.stringify(o));
    // 체험 모드에서 두 선생님을 시험할 때: 주소 끝에 ?demo=b 를 붙이면 다른 선생님으로 들어와요
    const dParam = new URLSearchParams(location.search).get('demo');
    const demoUser = dParam ? { uid: 'demo-' + dParam, displayName: '체험 선생님 ' + dParam.toUpperCase() } : { uid: 'demo-teacher', displayName: '체험 사용자' };

    S.onUser = cb => setTimeout(() => cb(demoUser), 0);
    S.signInGoogle = async () => {};
    S.signOut = async () => {};
    S.studentLogin = async () => {
      let u = sessionStorage.getItem('fieldtrip-demo-student');
      if (!u) { u = 'stu-' + newId(); sessionStorage.setItem('fieldtrip-demo-student', u); }
      return u;
    };
    S.listEvents = async uid => Object.entries(load().events)
      .filter(([, e]) => e.owner === uid || (e.members || []).includes(uid)).map(([id, e]) => ({ id, ...clone(e) }));
    S.saveEvent = async e => { const d = load(); const { id, ...rest } = e; d.events[id] = rest; save(d); };
    S.updateEvent = async (id, fields) => {
      const d = load(); if (!d.events[id]) throw new Error('nodoc');
      Object.assign(d.events[id], clone(fields)); save(d);
    };
    S.watchEvent = (id, cb) => {
      let last = '';
      const run = () => { const e = load().events[id]; const k = JSON.stringify(e || null); if (k !== last) { last = k; cb(e ? { id, ...clone(e) } : null); } };
      run(); const t = setInterval(run, 1500); return () => clearInterval(t);
    };
    S.joinEvent = async (eid, code, uid, name) => {
      const d = load(); const e = d.events[eid];
      if (!e || !e.inviteCode || e.inviteCode !== code) { const er = new Error('badcode'); er.code = 'permission-denied'; throw er; }
      e.members = [...new Set([...(e.members || []), uid])];
      e.memberNames = { ...(e.memberNames || {}), [uid]: name }; save(d);
    };
    S.removeMember = async (eid, uid) => {
      const d = load(); const e = d.events[eid]; if (!e) return;
      e.members = (e.members || []).filter(x => x !== uid);
      if (e.memberNames) delete e.memberNames[uid]; save(d);
    };
    S.deleteEvent = async id => {
      const d = load(); delete d.events[id]; delete d.surveys[id]; delete d.lists[id]; delete d.safety[id]; delete d.roll[id]; delete d.marks[id];
      Object.keys(d.views).forEach(k => { if (k.startsWith(id + '|')) delete d.views[k]; });
      Object.keys(d.responses).forEach(k => { if (k.startsWith(id + '|')) delete d.responses[k]; });
      Object.keys(d.checks).forEach(k => { if (k.startsWith(id + '|')) delete d.checks[k]; });
      save(d);
    };
    S.getList = async (eid, lid) => { const l = (load().lists[eid] || {})[lid]; return l ? clone(l) : null; };
    S.saveList = async (eid, lid, data) => {
      const d = load(); d.lists[eid] = d.lists[eid] || {}; d.lists[eid][lid] = data; save(d);
    };
    S.countChecks = async (eid, lid) => Object.keys(load().checks[eid + '|' + lid] || {}).length;
    S.hasChecked = async (eid, lid, uid) => !!(load().checks[eid + '|' + lid] || {})[uid];
    S.submitCheck = async (eid, lid, uid) => {
      const d = load(); const k = eid + '|' + lid;
      if (!(d.lists[eid] || {})[lid]) throw new Error('nolist');
      d.checks[k] = d.checks[k] || {}; d.checks[k][uid] = { at: Date.now() }; save(d);
    };
    S.listSafety = async eid => Object.entries(load().safety[eid] || {}).map(([id, s]) => ({ id, ...clone(s) }));
    S.getSafety = async (eid, sid) => { const s = (load().safety[eid] || {})[sid]; return s ? { id: sid, ...clone(s) } : null; };
    S.saveSafety = async (eid, s) => {
      const d = load(); const { id, ...rest } = s;
      d.safety[eid] = d.safety[eid] || {}; d.safety[eid][id] = rest; save(d);
    };
    S.deleteSafety = async (eid, sid) => {
      const d = load(); if (d.safety[eid]) delete d.safety[eid][sid]; delete d.views[eid + '|' + sid]; save(d);
    };
    S.listViews = async (eid, sid) => Object.entries(load().views[eid + '|' + sid] || {}).map(([id, v]) => ({ id, ...clone(v) }));
    S.addView = async (eid, sid, c, n, place, by) => {
      const d = load(); const k = eid + '|' + sid, id = c + '_' + n;
      d.views[k] = d.views[k] || {};
      if (d.views[k][id]) throw new Error('already');
      d.views[k][id] = { c, n, place, by, at: Date.now() }; save(d);
    };
    S.removeView = async (eid, sid, c, n) => {
      const d = load(); const k = eid + '|' + sid; if (d.views[k]) delete d.views[k][c + '_' + n]; save(d);
    };
    S.removeViewLegacy = async (eid, sid, docId) => { const d = load(); const k = eid + '|' + sid; if (d.views[k]) delete d.views[k][docId]; save(d); };
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
    S.getRoll = async eid => { const r = load().roll[eid]; return r ? clone(r) : null; };
    S.saveRoll = async (eid, data) => { const d = load(); d.roll[eid] = data; save(d); };
    S.listMarks = async eid => Object.entries(load().marks[eid] || {}).map(([id, m]) => ({ id, ...clone(m) }));
    S.watchMarks = (eid, cb) => {
      let last = '';
      const run = async () => { const m = await S.listMarks(eid); const k = JSON.stringify(m); if (k !== last) { last = k; cb(m); } };
      run(); const t = setInterval(run, 1500); return () => clearInterval(t);
    };
    S.addMark = async (eid, slot, c, n, src, by) => {
      const d = load(); const r = d.roll[eid]; const id = slot + '_' + c + '_' + n;
      d.marks[eid] = d.marks[eid] || {};
      if (d.marks[eid][id]) throw new Error('already');
      const sl = r && r.slots[slot];
      if (src === 'student' && (!sl || Date.now() < sl.openAt || Date.now() > sl.closeAt)) throw new Error('closed');
      d.marks[eid][id] = { slot, c, n, src, by, at: Date.now() }; save(d);
    };
    S.removeMark = async (eid, slot, c, n) => { const d = load(); if (d.marks[eid]) delete d.marks[eid][slot + '_' + c + '_' + n]; save(d); };
    S.removeMarkLegacy = async (eid, docId) => { const d = load(); if (d.marks[eid]) delete d.marks[eid][docId]; save(d); };
  }
  window.Store = S;
})();
