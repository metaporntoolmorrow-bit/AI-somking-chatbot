import {componentFor,COMPONENT_SOURCE} from './component-content.mjs';

export function buildComponentUsePlan(context,codes,tools){
  const component=componentFor(context);
  const first=codes[0];
  const media=codes.filter(code=>!['MAIN-03','MAIN-06','MAIN-07'].includes(code));
  let assignments=component.steps.map(()=>[first]);
  if(context.goalC==='goal_c2')assignments=[[first],codes,media,[codes.find(c=>['MAIN-03','MAIN-06'].includes(c))||first],media];
  if(context.goalC==='goal_c3')assignments=[[first],codes.slice(1).length?codes.slice(1):[first],codes];
  if(context.goalC==='goal_c4')assignments=[[first],[first],codes.filter(c=>c!=='MAIN-01'),codes];
  if(context.goalC==='goal_c5')assignments=[[first],[codes.includes('MAIN-12')?'MAIN-12':first],codes,[codes.includes('MAIN-12')?'MAIN-12':codes.at(-1)],codes];
  const useSequence=component.steps.map((step,index)=>{
    const toolCodes=assignments[index].length?assignments[index]:[first];
    return {...step,order:index+1,rank:(index+1)*10,toolCode:toolCodes[0],toolCodes,shortTitle:toolCodes.map(code=>tools.find(t=>t.code===code).shortTitle).join(' / '),basis:COMPONENT_SOURCE};
  });
  // Scope is checked against the supplied tool files, not invented from a broad audience tag.
  if(context.targetYouth==='youth_early')useSequence[0].action+=' ตรวจช่วงวัยในต้นฉบับก่อนใช้กับเด็กเล็ก';
  if(context.targetYouth==='youth_vulnerable'&&context.goalC==='goal_c2')useSequence[1].action+=' รายงานชาติพันธุ์ใช้เป็นข้อมูลประกอบ';
  return useSequence;
}

export function buildComponentGuidance(context){
  const component=componentFor(context);
  const items=component.guidance.map(item=>({...item,tags:[context.goalC,context.setting,item.id],componentCode:component.code,sourceSection:item.category==='successFactors'?4:item.category==='cautions'?5:6}));
  return {source:COMPONENT_SOURCE,version:2,sourceTitle:component.sourceFile,sourcePages:[...new Set(items.flatMap(item=>item.sourcePages))].sort((a,b)=>a-b),items,
    successFactors:items.filter(item=>item.category==='successFactors').map(item=>item.text),cautions:items.filter(item=>item.category==='cautions').map(item=>item.text),keyStandards:items.filter(item=>item.category==='keyStandards').map(item=>item.text)};
}
