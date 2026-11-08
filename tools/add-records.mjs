// tools/manual-records.json に書いた記録を、管理者としてランキングに入れる（GitHub の上でだけ動く。鍵は FT_GREEN_SERVICE_ACCOUNT）
// id ごとに1つ。すでに同じかそれより多い本数が入っていれば何もしない
import fs from 'fs';
import { token, api } from './fb.mjs';
const list = JSON.parse(fs.readFileSync('tools/manual-records.json', 'utf8'));
const tk = await token();
const today = Math.floor((Date.now() + 32400000) / 86400000);
const get = async p => JSON.parse(await api('GET', p, undefined, tk));
for (const r of list) {
  if (!r.id || !r.n || !(r.s >= 3) || !(r.iv >= 400 && r.iv <= 3000)) { console.log('とばす（中身がおかしい）', JSON.stringify(r)); continue; }
  const [y, m, d] = r.date.split('-').map(Number);
  const dk = Date.UTC(y, m - 1, d) / 86400000;
  const rec = { n: String(r.n).slice(0, 12), s: r.s, st: Date.now() - (r.s - 1) * r.iv - 2000, iv: r.iv, v: 1, t: { '.sv': 'timestamp' } };
  const cur = await get('/bisu/all/scores/' + r.id + '.json');
  if (!cur || cur.s < r.s) { await api('PUT', '/bisu/all/scores/' + r.id + '.json', rec, tk); console.log('全期間に入れました', r.id, r.n, r.s + '本'); }
  else console.log('全期間にはもう入っています', r.id, cur.s + '本');
  if (dk === today) {
    const curD = await get('/bisu/d/scores/' + r.id + '.json');
    if (!curD || curD.dk !== dk || curD.s < r.s) { await api('PUT', '/bisu/d/scores/' + r.id + '.json', { ...rec, dk, ds: dk * 1000000 + r.s }, tk); console.log('今日のランキングに入れました', r.id); }
    else console.log('今日のランキングにはもう入っています', r.id);
  } else console.log('今日ではないので、今日のランキングには入れません', r.id, r.date);
}
// 確認：全期間と今日の上位5人
const top = o => Object.values(o || {}).sort((a, b) => b.s - a.s).slice(0, 5).map(x => x.n + ' ' + x.s + '本').join(' / ');
console.log('全期間の上位：', top(await get('/bisu/all/scores.json?orderBy=%22s%22&limitToLast=5')));
console.log('今日の上位：', top(await get('/bisu/d/scores.json?orderBy=%22ds%22&startAt=' + today * 1000000 + '&endAt=' + (today * 1000000 + 999999) + '&limitToLast=5')));
