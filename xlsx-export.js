// 설문 결과를 엑셀(.xlsx)로 저장: [통계] 시트 + [응답] 시트
// 엑셀 도구(SheetJS)는 누를 때만 불러오고, 못 불러오면 CSV로 대신 저장해요.
(function () {
  const LIB = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  let loading = null;
  const loadLib = () => loading || (loading = new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement('script'); s.src = LIB;
    s.onload = () => res(window.XLSX); s.onerror = () => { loading = null; rej(new Error('lib')); };
    document.head.appendChild(s);
  }));
  const safeName = t => String(t).replace(/[\\/:*?"<>|]/g, '_');

  function tables(sv, rs) {
    const vals = q => rs.map(r => (r.answers || {})[q.id]).filter(v => v !== undefined && v !== '');
    const stat = [['설문', sv.title], ['응답 수', rs.length], []];
    const stars = sv.questions.filter(q => q.type === 'star');
    if (stars.length) {
      stat.push(['별점 문항 (5점 만점)', '평균', '응답', '5점', '4점', '3점', '2점', '1점', '4~5점', '1~2점']);
      stars.forEach(q => {
        const v = vals(q).map(Number), c = v.length, k = n => v.filter(x => x === n).length;
        stat.push([q.text, c ? Math.round(v.reduce((a, b) => a + b, 0) / c * 100) / 100 : '', c, k(5), k(4), k(3), k(2), k(1), k(5) + k(4), k(2) + k(1)]);
      });
      stat.push([]);
    }
    sv.questions.filter(q => q.type === 'choice').forEach(q => {
      const v = vals(q), opts = [...q.options, ...[...new Set(v)].filter(x => !q.options.includes(x))];
      stat.push([q.text, '인원', '비율(%)']);
      opts.map(o => [o, v.filter(x => x === o).length]).sort((a, b) => b[1] - a[1])
        .forEach(([o, c]) => stat.push(['  ' + o, c, v.length ? Math.round(c / v.length * 1000) / 10 : 0]));
      stat.push([]);
    });
    sv.questions.filter(q => q.type === 'text').forEach(q => {
      const v = vals(q);
      stat.push([q.text + ` (글 ${v.length}개)`]);
      v.forEach(x => stat.push(['  ' + x]));
      stat.push([]);
    });
    const resp = [['번호', ...sv.questions.map(q => q.text)]];
    rs.forEach((r, i) => resp.push([i + 1, ...sv.questions.map(q => { const a = (r.answers || {})[q.id]; return a === undefined ? '' : a; })]));
    return { stat, resp };
  }

  window.exportSurveyXlsx = async (eventTitle, sv, rs) => {
    const { stat, resp } = tables(sv, rs);
    const name = safeName(`${eventTitle}_${sv.title}_결과`);
    try {
      const X = await loadLib();
      const wb = X.utils.book_new();
      const ws1 = X.utils.aoa_to_sheet(stat); ws1['!cols'] = [{ wch: 44 }, { wch: 8 }, { wch: 8 }, ...Array(7).fill({ wch: 7 })];
      const ws2 = X.utils.aoa_to_sheet(resp); ws2['!cols'] = [{ wch: 6 }, ...sv.questions.map(q => ({ wch: q.type === 'text' ? 40 : 18 }))];
      X.utils.book_append_sheet(wb, ws1, '통계');
      X.utils.book_append_sheet(wb, ws2, '응답');
      X.writeFile(wb, name + '.xlsx');
      return 'xlsx';
    } catch (e) {
      const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [...stat, [], ['[응답]'], ...resp].map(r => r.map(cell).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = name + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return 'csv';
    }
  };
})();
