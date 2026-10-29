import type {Catalog,ToolFile} from './catalog';
import {scenarioToolIds} from './plan-flow';

// Public-facing tools always originate from the published Supabase catalog.
// Missing supplementary files are tracked separately and never become dummy links.
export interface InterventionTool {
  id:string;
  type:'main'|'supplementary';
  title:string;
  format:string;
  settings:string[];
  goals:string[];
  files:ToolFile[];
  downloadReady:boolean;
}
export function interventionTools(catalog:Catalog):InterventionTool[]{
  return catalog.tools.map(tool=>{
    const matches=catalog.scenarios.filter(s=>scenarioToolIds(s).includes(tool.id));
    return {id:tool.id,type:tool.id.startsWith('SUP-')?'supplementary':'main',title:tool.name,format:tool.kind,settings:[...new Set(matches.map(s=>s.settingCode))],goals:[...new Set(matches.map(s=>s.goalC).filter((goal):goal is string=>Boolean(goal)))],files:tool.files,downloadReady:tool.downloadReady};
  });
}
