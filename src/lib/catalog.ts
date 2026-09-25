import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseConfig } from '@/lib/supabase/config';
import { createServiceClient } from '@/lib/supabase/service';

export type Package = { id:string; name:string; goal:string; setting:string; level:string; measures:string; roles:string; note:string };
export type Tool = { id:string; name:string; kind:string; description:string; activity:string; audiences:string; roles:string; setting:string; steps:string; preparation:string; risks:string; success:string; indicators:string; packageIds:string[]; hasSamplePdf:boolean };
export type PlanStep = { order:number; when:string; action:string; owner:string; tool:string; setting:string };
export type Scenario = { id:string; packageId:string; settingCode:string; roleCode:string; role:string; audienceCode:string; audience:string; level:string; activity:string; primaryIds:string[]; supportIds:string[]; measureIds:string[]; referenceIds:string[]; status:'primary_available'|'support_only'|'no_tool'; summary:string; intro:string; host:string; phases:string[]; referral:string; steps:PlanStep[] };
export type Catalog = { status:'ready'|'empty'|'unavailable'; releaseId?:string; simulated?:boolean; packages:Package[]; tools:Tool[]; scenarios:Scenario[] };

const empty = (status:Catalog['status']):Catalog => ({status,packages:[],tools:[],scenarios:[]});
const value = (item:unknown) => typeof item === 'string' ? item : '';
const object = (item:unknown):Record<string,unknown> => item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string,unknown> : {};
const strings = (item:unknown):string[] => Array.isArray(item) ? item.filter((part):part is string=>typeof part==='string') : [];

export async function getPublishedCatalog():Promise<Catalog> {
  if (!isSupabaseConfigured()) return empty('unavailable');
  const {url,key}=supabaseConfig();
  let client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data:active,error:activeError}=await client.from('active_content_release').select('release_id').eq('singleton_id',1).maybeSingle();
    if(activeError) return empty('unavailable');
    let releaseId=active?.release_id as string|undefined;
    let simulated=false;
    if(!releaseId){
      const service=createServiceClient();
      const preview=await service.from('content_releases').select('id').eq('workflow_status','draft').eq('trust_status','simulated').eq('change_note','public-preview:simulated').order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(preview.error) return empty('unavailable');
      if(!preview.data) return empty('empty');
      releaseId=preview.data.id;
      simulated=true;
      client=service;
    }
    const [packageResult,toolResult,scenarioResult,linkResult]=await Promise.all([
      client.from('packages').select('code,title_th,goal_th,setting_label_th,level_label_th,measures_label_th,roles_label_th,limitations_th').eq('release_id',releaseId).order('code'),
      client.from('tools').select('code,title_th,description_th,tool_kind,source_payload').eq('release_id',releaseId).order('code'),
      client.from('scenarios').select('code,package_code,setting_code,operator_role_code,target_group_code,intervention_level,catalogue_status,summary_th,source_payload').eq('release_id',releaseId).order('code'),
      client.from('scenario_tools').select('scenario_code,tool_code,slot,display_order').eq('release_id',releaseId).order('display_order'),
    ]);
    if(packageResult.error||toolResult.error||scenarioResult.error||linkResult.error) return empty('unavailable');
    const packages:Package[]=(packageResult.data??[]).map(row=>({id:row.code,name:row.title_th,goal:row.goal_th,setting:row.setting_label_th??'',level:row.level_label_th??'',measures:row.measures_label_th??'',roles:row.roles_label_th??'',note:row.limitations_th??''}));
    const tools:Tool[]=(toolResult.data??[]).map(row=>{
      const details=object(row.source_payload);
      return {id:row.code,name:row.title_th,kind:row.tool_kind??'',description:row.description_th??'',activity:value(details.activity),audiences:value(details.audiences),roles:value(details.roles),setting:value(details.setting),steps:value(details.steps),preparation:value(details.preparation),risks:value(details.risks),success:value(details.success),indicators:value(details.indicators),packageIds:strings(details.packageIds),hasSamplePdf:simulated&&typeof details.previewAssetPath==='string'};
    });
    const links=linkResult.data??[];
    const scenarios:Scenario[]=(scenarioResult.data??[]).map(row=>{
      const details=object(row.source_payload);
      const ids=(slot:string)=>links.filter(link=>link.scenario_code===row.code&&link.slot===slot).map(link=>link.tool_code);
      const rawSteps=Array.isArray(details.steps)?details.steps:[];
      return {id:row.code,packageId:row.package_code,settingCode:row.setting_code,roleCode:row.operator_role_code,role:value(details.role),audienceCode:row.target_group_code,audience:value(details.audience),level:value(details.level)||row.intervention_level,activity:value(details.activity),primaryIds:ids('primary'),supportIds:ids('supporting'),measureIds:ids('measurement'),referenceIds:ids('reference'),status:row.catalogue_status as Scenario['status'],summary:row.summary_th??'',intro:value(details.intro),host:value(details.host),phases:strings(details.phases),referral:value(details.referral),steps:rawSteps.map((raw,index)=>{const step=object(raw);return {order:typeof step.order==='number'?step.order:index+1,when:value(step.when),action:value(step.action),owner:value(step.owner),tool:value(step.tool),setting:value(step.setting)};}).filter(step=>step.action)};
    });
    return {status:'ready',releaseId,simulated,packages,tools,scenarios};
  } catch { return empty('unavailable'); }
}

export const getPackage = (catalog:Catalog,id:string) => catalog.packages.find(item=>item.id===id);
export const getTool = (catalog:Catalog,id:string) => catalog.tools.find(item=>item.id===id);
export const getScenario = (catalog:Catalog,id:string) => catalog.scenarios.find(item=>item.id===id);
export const settingNames:Record<string,string>={S1:'สถานศึกษา',S2:'ครอบครัว / ชุมชน / สุขภาพ',S3:'สถานประกอบการ'};
export const unique = <T,>(items:T[]):T[]=>[...new Set(items)];
