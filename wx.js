// 날씨 예보 (Open-Meteo, 키 없이 무료) — 선생님 화면과 학생 일정표가 함께 씀
(function () {
  const WK = '일월화수목금토';
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 체험학습으로 자주 가는 곳 (바로 고르기)
  const PLACES = [
    ['경주', 35.8562, 129.2247], ['서울', 37.5665, 126.978], ['부산', 35.1796, 129.0756], ['제주', 33.4996, 126.5312],
    ['서귀포', 33.2541, 126.56], ['전주', 35.8242, 127.148], ['공주', 36.4466, 127.119], ['부여', 36.2757, 126.9097],
    ['강릉', 37.7519, 128.8761], ['속초', 38.207, 128.5918], ['평창', 37.3705, 128.3903], ['춘천', 37.8813, 127.7298],
    ['여수', 34.7604, 127.6622], ['순천', 34.9507, 127.4872], ['목포', 34.8118, 126.3922], ['통영', 34.8544, 128.4331],
    ['안동', 36.5684, 128.7294], ['대구', 35.8714, 128.6014], ['광주', 35.1595, 126.8526], ['대전', 36.3504, 127.3845],
    ['인천', 37.4563, 126.7052], ['수원', 37.2636, 127.0286], ['용인', 37.2411, 127.1776], ['군산', 35.9676, 126.7368],
    ['익산', 35.9483, 126.9577], ['남원', 35.4164, 127.3905],
  ].map(([name, lat, lon]) => ({ name, lat, lon }));
  const NAME = c => c == null ? '' : c === 0 ? '맑음' : c <= 2 ? '구름 조금' : c === 3 ? '흐림' : c <= 48 ? '안개' : c <= 57 ? '이슬비' : c <= 67 ? '비' : c <= 77 ? '눈' : c <= 82 ? '소나기' : c <= 86 ? '눈 소나기' : '뇌우';
  const ICON = c => {
    const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>';
    const cloud = '<path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 7 18z"/>';
    const c15 = '<path d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 7 15z"/>';
    const rain = c15 + '<path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>';
    const snow = c15 + '<path d="M9 19h.01M13 20h.01M17 19h.01"/>';
    const body = c == null ? cloud : c === 0 ? sun : c <= 48 ? cloud : (c >= 71 && c <= 77) || c === 85 || c === 86 ? snow : rain;
    return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  };
  const cache = {};
  async function forecast(place) {
    const key = `${place.lat},${place.lon}`;
    if (cache[key] && Date.now() - cache[key].t < 30 * 60000) return cache[key].d;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${(+place.lat).toFixed(4)}&longitude=${(+place.lon).toFixed(4)}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=16`;
    const r = await fetch(url); if (!r.ok) throw new Error(r.status);
    const j = await r.json(), D = j.daily || {}, nz = (a, i) => a && a[i] != null ? a[i] : null;
    const d = (D.time || []).map((date, i) => ({ date, code: nz(D.weather_code, i), lo: nz(D.temperature_2m_min, i), hi: nz(D.temperature_2m_max, i),
      pop: nz(D.precipitation_probability_max, i), rain: nz(D.precipitation_sum, i), wind: nz(D.wind_speed_10m_max, i), gust: nz(D.wind_gusts_10m_max, i) }));
    cache[key] = { t: Date.now(), d };
    return d;
  }
  async function search(q) {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=ko&format=json`);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    return (j.results || []).map(x => ({ name: x.name, lat: x.latitude, lon: x.longitude, sub: [x.admin1, x.country].filter(Boolean).join(' · ') }));
  }
  // dates: 'YYYY-MM-DD' 목록
  function table(dates, wx) {
    const today = ymd(new Date());
    const cells = dates.map(key => {
      const [y, m, dd] = key.split('-').map(Number), dt = new Date(y, m - 1, dd), d = wx.find(x => x.date === key), isToday = key === today;
      const head = `${isToday ? '<em class="wx-today">오늘</em>' : ''}<b>${m}/${dd}<i>(${WK[dt.getDay()]})</i></b>`;
      if (!d) return { warn: [], today: isToday, top: `${head}<span class="wx-none">${key < today ? '지난 날' : '아직 예보 전'}</span>`, bot: '<span class="wx-none">- / -</span>', day: `${m}/${dd}` };
      const windy = (d.wind != null && d.wind >= 10) || (d.gust != null && d.gust >= 17);
      const wet = (d.pop != null && d.pop >= 60) || (d.rain != null && d.rain >= 5);
      const cold = d.lo != null && d.lo <= 0, hot = d.hi != null && d.hi >= 33;
      const warn = [wet ? '비' : '', windy ? '바람' : '', cold ? '영하' : '', hot ? '폭염' : ''].filter(Boolean);
      return { warn, today: isToday, day: `${m}/${dd}`,
        top: `${head}<span class="wx-sky ${wet ? 'hot' : ''}">${ICON(d.code)}${esc(NAME(d.code))}${d.pop != null && d.pop >= 30 ? ` ${d.pop}%` : ''}</span><span class="${windy ? 'hot' : ''}">바람 ${d.wind != null ? Math.round(d.wind) : '-'}m/s</span>`,
        bot: `<span class="${cold ? 'hot' : ''}">${d.lo != null ? Math.round(d.lo) : '-'}°</span> / <span class="${hot ? 'hot' : ''}">${d.hi != null ? Math.round(d.hi) : '-'}°</span>` };
    });
    const none = cells.every(c => c.bot.includes('wx-none'));
    const notes = cells.filter(c => c.warn.length).map(c => `${c.day} ${c.warn.join('·')}`);
    const wide = cells.length > 4;
    return `<div class="wx-scroll"><table class="wx-table${none ? ' wx-only' : ''}"${wide ? ` style="min-width:${cells.length * 92}px"` : ''}><tbody>
      <tr>${cells.map(c => `<td class="${c.warn.length ? 'warn' : ''}${c.today ? ' today' : ''}">${c.top}</td>`).join('')}</tr>
      ${none ? '' : `<tr class="wx-temp">${cells.map(c => `<td class="${c.warn.length ? 'warn' : ''}${c.today ? ' today' : ''}">${c.bot}</td>`).join('')}</tr>`}
      </tbody></table></div>${none ? '<p class="wx-wait">예보는 날마다 2주 앞까지 나와요. 가까워지면 저절로 채워져요.</p>' : ''}${wide ? `<p class="wx-hint">옆으로 밀면 ${cells.length}일 모두 보여요 ›</p>` : ''}
      ${notes.length ? `<p class="wx-w">주의 ${esc(notes.join(' · '))}${cells.some(c => c.warn.includes('비')) ? ' — 우산·우비 챙기기' : ''}${cells.some(c => c.warn.includes('영하')) ? ' — 따뜻한 옷' : ''}${cells.some(c => c.warn.includes('폭염')) ? ' — 물과 모자' : ''}</p>` : ''}`;
  }
  const css = `.wx-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.wx-table{width:100%;border-collapse:separate;border-spacing:6px 0;table-layout:fixed}
.wx-table td{background:var(--soft);border:1px solid var(--line);text-align:center;vertical-align:top;padding:8px 4px;font-size:12.5px;color:var(--sub)}
.wx-table tr:first-child td{border-radius:14px 14px 0 0;border-bottom:0}
.wx-table tr.wx-temp td{border-radius:0 0 14px 14px;border-top:0;font-family:var(--f-mono,monospace);font-size:15px;color:var(--ink);padding-bottom:10px}
.wx-table td b{display:block;color:var(--ink);font-size:14px}.wx-table td b i{font-style:normal;font-weight:400;color:var(--sub);font-size:12px}
.wx-table .wx-sky{display:flex;flex-direction:column;align-items:center;gap:2px;margin:4px 0;color:var(--ink);font-weight:700}
.wx-table .wx-sky svg{color:var(--acc,#D9A23A)}
.wx-table span{display:block}
.wx-table tr.wx-temp span{display:inline}
.wx-table .hot{color:var(--warn)!important;font-weight:800}
.wx-table td.warn{background:var(--warn-soft)}
.wx-table td.today{border-color:var(--pri);box-shadow:inset 0 0 0 1px var(--pri)}
.wx-today{display:inline-block;font-style:normal;font-size:11px;font-weight:800;color:var(--on-pri,#fff);background:var(--pri);border-radius:99px;padding:0 7px;margin-bottom:2px}
.wx-none{color:var(--sub);opacity:.7;font-size:12px;margin-top:6px}
.wx-table.wx-only tr:first-child td{border-radius:14px;border-bottom:1px solid var(--line);padding-bottom:10px}
.wx-wait{font-size:12.5px;color:var(--sub);margin:8px 0 0 6px}
.wx-empty{font-family:var(--f-body,sans-serif)!important;font-size:13px!important;color:var(--sub)!important}
.wx-hint{font-size:12px;color:var(--sub);margin:6px 0 0;text-align:right}
.wx-w{font-size:13px;font-weight:800;color:var(--warn);margin:8px 0 0}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  window.WX = { PLACES, forecast, search, table, ymd };
})();
