import content from '../content/package-guidance.json' with {type:'json'};

/** @typedef {{packageId:string,audienceCodes?:string[],toolCodes?:string[],edition?:number}} GuidanceContext */

// Six substantive points per package yield twenty unordered groups of three.
// Order is fixed within each group; reversing identical advice never creates a new edition.
export const guidanceCombinations=[];
for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)for(let c=b+1;c<6;c++)guidanceCombinations.push([a,b,c]);
export const packageGuidanceVersion=content.version;
export const packageGuidanceProfiles=content.packages;

/** @param {GuidanceContext} context
 * @returns {{cautions:string[],benefits:string[]}|null}
 */
export function guidanceForContext({packageId,audienceCodes=[],toolCodes=[],edition=1}){
  if(!Object.hasOwn(content.packages,packageId))return null;
  const profile=content.packages[packageId];
  const id=Number.isInteger(edition)&&edition>=1&&edition<=20?edition:1;
  const points=guidanceCombinations[id-1].map(i=>profile.points[i]);
  const required=[...profile.requiredCautions];
  if(packageId==='PK-FAM-GROUP'&&toolCodes.includes('MAIN-13'))required[1]=profile.fatherCaution;
  if(audienceCodes.includes('university')&&profile.universityCaution)required.push(profile.universityCaution);
  if(toolCodes.includes('MAIN-07'))required.push('รายงานและภาพสรุปชาติพันธุ์ใช้ประกอบการเรียนรู้ ไม่ใช่แบบประเมินรายบุคคล');
  return {
    cautions:[...new Set([...required,...points.map(p=>p.caution)])],
    benefits:points.map(p=>p.benefit),
  };
}

/** @param {Omit<GuidanceContext,'edition'>} context
 * @returns {{id:number,cautions:string[],benefits:string[]}[]}
 */
export function guidanceEditionsFor(context){
  if(!Object.hasOwn(content.packages,context.packageId))return [];
  return guidanceCombinations.map((_,index)=>({id:index+1,...guidanceForContext({...context,edition:index+1})}));
}
