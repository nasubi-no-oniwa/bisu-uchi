// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb';
async function ticket(uid){const r=await req('PUT','bisu/runs/'+uid,uid,{t:TS});const g=await req('GET','bisu/runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
// s 本、iv ミリ秒間隔
const rec=(st,s,iv=500,n='テスト')=>({n,s,st,iv,v:1,t:TS});
const dk=()=>Math.floor((Date.now()+32400000)/86400000);

ex('ログインなしで打ちはじめる',await req('PUT','bisu/runs/'+U,null,{t:TS}),false);
let tk=await ticket(U);ex('打ちはじめた時刻を書く',tk.r,true);
ex('ほかの人の場所に書く',await req('PUT','bisu/runs/'+U,U2,{t:TS}),false);
ex('すぐにもう一度書く',await req('PUT','bisu/runs/'+U,U,{t:TS}),false);
ex('まだ打っている途中に40本の記録を送る',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,40)),false);
await sleep(5200);
ex('打ちはじめた時刻がちがう記録',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st-5000,10)),false);
ex('実際の時間より多い本数（30本×0.5秒）',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,30)),false);
ex('2本の記録',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,2)),false);
ex('間隔が短すぎる記録（0.3秒）',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,5,300)),false);
ex('間隔が長すぎる記録（3.5秒）',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,3,3500)),false);
ex('本数が小数',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,8.5)),false);
ex('ほかの人の場所に書く',await req('PUT','bisu/all/scores/'+U2,U,rec(tk.st,10)),false);
ex('ふつうの記録（10本×0.5秒）',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,10)),true);
ex('今日のランキングに書く',await req('PUT','bisu/d/scores/'+U,U,{...rec(tk.st,10),dk:dk()}),true);
ex('今日のランキングに、ちがう日で書く',await req('PUT','bisu/d/scores/'+U2,U2,{...rec(tk.st,10),dk:dk()-1}),false);
ex('同じ回でもう一度送る（本数を増やす）',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,11)),false);
ex('名前だけ変える',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,10,500,'なまえ')),true);
ex('今日のほうも名前だけ変える',await req('PUT','bisu/d/scores/'+U,U,{...rec(tk.st,10,500,'なまえ'),dk:dk()}),true);
ex('名前を変えるふりで本数を変える',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,12,500,'なまえ2')),false);
ex('名前を変えるふりで間隔を変える',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,10,450,'なまえ2')),false);
ex('13文字の名前',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,10,500,'あいうえおかきくけこさしす')),false);
await sleep(2100);
tk=await ticket(U);await sleep(3200);
ex('前より悪い記録は全期間に載らない',await req('PUT','bisu/all/scores/'+U,U,rec(tk.st,5)),false);
ex('今日のほうも前より悪い記録は載らない',await req('PUT','bisu/d/scores/'+U,U,{...rec(tk.st,5),dk:dk()}),false);
ex('定規を使った',await req('PUT','bisu/ruler/'+U,U,{t:TS}),true);
ex('すぐにもう一度定規を使った',await req('PUT','bisu/ruler/'+U,U,{t:TS}),false);
ex('ほかの人に定規を使わせる',await req('PUT','bisu/ruler/'+U2,U,{t:TS}),false);
ex('だれでもランキングを読める',await req('GET','bisu/all/scores',null),true);
ex('だれでも今日のランキングを読める',await req('GET','bisu/d/scores',null),true);
ex('定規を使った人の数を読める',await req('GET','bisu/ruler',null),true);
ex('ほかの人の打ちはじめの時刻は読めない',await req('GET','bisu/runs/'+U,U2),false);
ex('hidden に書く',await req('PUT','bisu/hidden/'+U,U,true),false);
ex('ほかのゲームの場所に書く',await req('PUT','sumo/quit/'+U,U,{t:TS}),false);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
if(fail)process.exit(1);
