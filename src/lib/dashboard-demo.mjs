import dimensions from '../data/dashboard-dimensions.json' with {type:'json'};

// The user selected the supplied prototype dataset, not production telemetry.
// Keep its seed and random draw order so all filters match the supplied mockup.
export function createDashboardDemoSessions(){
  let seed=290669;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const choose=weights=>{let x=rand()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){x-=weights[i];if(x<0)return i;}return weights.length-1;};
  return Array.from({length:1248},(_,i)=>{
    const stage=i<984?4:i<1032?3:i<1106?2:i<1184?1:0;
    let setting=choose([57,22,10,6,5]);
    let role=choose([[76,3,3,4,14],[8,35,40,10,7],[8,5,8,76,3],[15,48,13,14,10],[5,80,6,6,3]][setting]);
    let youth=choose(setting===0?[3,20,65,10,2]:[10,20,40,8,22]);
    let goal=choose(setting===0?[22,38,17,18,5]:[20,24,22,19,15]);
    const matched=stage===4&&i<912;
    if(stage===4&&!matched){setting=choose([0,32,6,12,50]);role=setting===4?1:setting===1?2:setting===2?3:1;youth=choose([5,0,15,0,80]);goal=choose([0,5,8,20,67]);}
    const day=1+Math.floor(rand()*30);
    rand();rand(); // Prototype hour/minute draws; they affect the next session's seed.
    return {day,stage,setting:stage>=1?setting:null,role:stage>=2?role:null,youth:stage>=3?youth:null,goal:stage>=4?goal:null,matched};
  });
}

const percent=(n,d)=>d?Number((n/d*100).toFixed(1)):0;
export function aggregateDashboard(sessions,days){
  if(![7,14,30].includes(days))throw new Error('Invalid dashboard period');
  const startDay=31-days,filtered=sessions.filter(s=>s.day>=startDay&&s.day<=30);
  const complete=filtered.filter(s=>s.stage===4&&Object.keys(dimensions).every(key=>Number.isInteger(s[key])&&s[key]>=0&&s[key]<5));
  const matched=complete.filter(s=>s.matched).length;
  const distributions=Object.fromEntries(Object.entries(dimensions).map(([key,dimension])=>[key,dimension.labels.map((label,index)=>{const count=complete.filter(s=>s[key]===index).length;return {label,count,percent:percent(count,complete.length),index};}).sort((a,b)=>b.count-a.count||a.index-b.index)]));
  const map=new Map();
  for(const session of complete){const key=[session.setting,session.role,session.youth,session.goal].join('|');if(!map.has(key))map.set(key,{setting:session.setting,role:session.role,youth:session.youth,goal:session.goal,count:0,matched:0});const row=map.get(key);row.count++;row.matched+=Number(session.matched);}
  const contexts=[...map.values()].sort((a,b)=>b.count-a.count||a.setting-b.setting||a.role-b.role||a.youth-b.youth||a.goal-b.goal).map(row=>({...row,labels:Object.fromEntries(Object.entries(dimensions).map(([key,dim])=>[key,dim.labels[row[key]]])),unmatched:row.count-row.matched}));
  return {days,startDay,started:filtered.length,completed:complete.length,matched,unmatched:complete.length-matched,completionRate:percent(complete.length,filtered.length),matchRate:percent(matched,complete.length),distributions,contexts,totalContexts:contexts.length};
}

const sessions=createDashboardDemoSessions();
export function dashboardDemoReport(days){return aggregateDashboard(sessions,days);}
export function dashboardDemoPreview(days){const report=dashboardDemoReport(days);return {...report,contexts:report.contexts.slice(0,5)};}
export function dashboardCsv(days){
  const report=dashboardDemoReport(days);
  const rows=[['ประเภทข้อมูล','พื้นที่','บทบาทผู้ใช้','กลุ่มเยาวชน','เป้าหมาย','จำนวนครั้ง','จับคู่ได้','ยังจับคู่ไม่ได้'],...report.contexts.map(row=>['ข้อมูลตัวอย่าง',row.labels.setting,row.labels.role,row.labels.youth,row.labels.goal,row.count,row.matched,row.unmatched])];
  return '\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
}
