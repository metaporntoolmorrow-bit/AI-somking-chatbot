export type DashboardPeriod=7|14|30;
export type DashboardDimension='setting'|'role'|'youth'|'goal';
export type DashboardBar={label:string;count:number;percent:number;index:number};
export type DashboardContext={setting:number;role:number;youth:number;goal:number;count:number;matched:number;unmatched:number;labels:Record<DashboardDimension,string>};
export type DashboardReport={days:DashboardPeriod;startDay:number;started:number;completed:number;matched:number;unmatched:number;completionRate:number;matchRate:number;distributions:Record<DashboardDimension,DashboardBar[]>;contexts:DashboardContext[];totalContexts:number};
