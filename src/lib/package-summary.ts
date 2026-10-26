import type { Catalog, Scenario, UseStep } from './catalog';
import { scenarioToolIds } from './plan-flow';

const audienceNames: Record<string,string>={early_childhood:'ปฐมวัย',primary_lower:'ประถมต้น',primary_upper:'ประถมปลาย',secondary:'มัธยม',vocational:'อาชีวศึกษา',university:'อุดมศึกษา',ethnic_youth:'เยาวชนชาติพันธุ์',family_all:'ทุกคนในครอบครัว',caregivers:'พ่อแม่และผู้ดูแล',fathers:'พ่อและแกนนำพ่อ',family_who_use:'คนในบ้านที่ใช้บุหรี่',community_all:'ประชาชนในชุมชน',community_youth:'เยาวชนในชุมชน',community_workers:'คนวัยทำงานในชุมชน',workers:'พนักงาน',adult_service_users:'ผู้รับบริการผู้ใหญ่',adolescent_service_users:'ผู้รับบริการวัยรุ่น'};
export function packageSummary(catalog:Catalog,scenarios:Scenario[]){
  const allSteps=scenarios.flatMap(s=>s.useSequence.length?s.useSequence:scenarioToolIds(s).map((id,index):UseStep=>({order:index+1,rank:index*10,toolCode:id,shortTitle:catalog.tools.find(t=>t.id===id)?.shortName||catalog.tools.find(t=>t.id===id)?.name||'',stage:'ใช้ร่วมกับทีม',action:'เปิดคู่มือต้นฉบับ เลือกส่วนที่ตรงกับบริบท และตกลงวิธีใช้ร่วมกับผู้รับผิดชอบ',outcome:'แนวทางที่ทีมเลือกใช้'})));
  allSteps.sort((a,b)=>a.rank-b.rank||a.toolCode.localeCompare(b.toolCode));
  const steps=[...new Map(allSteps.map(s=>[`${s.rank}:${s.toolCode}`,s])).values()].map((s,index)=>({...s,order:index+1}));
  const toolIds=[...new Set(steps.map(s=>s.toolCode))];
  return {steps,toolIds,audiences:[...new Set(scenarios.map(s=>audienceNames[s.audienceCode]||s.audience))],cautions:[...new Set(scenarios.flatMap(s=>s.cautions))],benefits:[...new Set(scenarios.flatMap(s=>s.benefits))],notes:[...new Set(scenarios.map(s=>s.intro).filter(Boolean))],guidanceNote:scenarios.find(s=>s.guidanceNote)?.guidanceNote||''};
}
