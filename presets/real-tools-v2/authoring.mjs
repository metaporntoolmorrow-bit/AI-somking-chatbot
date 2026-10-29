// Versioned editorial rules, never generated at request time.
// Tool files remain restricted to the approved tool database.
export {COMPONENT_SOURCE as source} from './component-content.mjs';
const code = n => `MAIN-${String(n).padStart(2, '0')}`;
export const oldSettings = { setting_school:'EDU', setting_community:'COM', setting_family:'FAM', setting_workplace:'WRK', setting_health:'HEA' };

export function toolsFor({setting, role, targetYouth:youth, goalC:goal}) {
  let numbers = [];
  if (setting === 'setting_school') {
    if (goal === 'goal_c1') numbers = [1];
    if (goal === 'goal_c2') numbers = youth === 'youth_early' ? [8,4,9] : youth === 'youth_primary' ? [3,2,5]
      : youth === 'youth_secondary' ? [6,2,5] : youth === 'youth_vulnerable' ? [2,5,7] : [2,5];
    if (goal === 'goal_c3') numbers = [1,11,12];
    if (goal === 'goal_c4' && youth !== 'youth_early') numbers = [1,2,5];
    if (goal === 'goal_c5' && !['youth_early','youth_primary'].includes(youth) && role !== 'role_youth_leader') numbers = [1,12];
  }
  if (setting === 'setting_family' && goal === 'goal_c3') numbers = youth === 'youth_early' ? [12,11,4,9] : [12,11,13];
  if (setting === 'setting_community' && goal === 'goal_c3') numbers = [10,1,11,12];
  if (setting === 'setting_community' && goal === 'goal_c5' && role !== 'role_youth_leader' && !['youth_early','youth_primary'].includes(youth)) numbers = [10];
  // Supplied workplace manuals target adult workers, not primary/secondary pupils.
  if (setting === 'setting_workplace' && goal === 'goal_c3' && youth === 'youth_university') numbers = [16,15,14];
  // This composite role includes volunteers. The plan explicitly delegates clinical use
  // to licensed professionals and never includes screening thresholds or treatment advice.
  if (setting === 'setting_health' && goal === 'goal_c5' && role === 'role_health_agent' && ['youth_secondary','youth_university'].includes(youth)) numbers = [17,18];
  return numbers.map(code);
}

export function gapReason(context) {
  if (context.setting === 'setting_health') return 'คลังปัจจุบันมีคู่มือบริการสำหรับทีมวิชาชีพ แต่ยังไม่มีชุดเครื่องมือที่ยืนยันได้สำหรับบทบาท กลุ่มเยาวชน และเป้าหมายนี้';
  if (context.setting === 'setting_workplace') return 'คู่มือสถานประกอบการที่มีเป็นแนวทางสำหรับคนวัยทำงาน ยังไม่มีไฟล์ที่ตรงกับกลุ่มเยาวชนและเป้าหมายที่คุณเลือก';
  if (context.goalC === 'goal_c4' && context.targetYouth === 'youth_early') return 'ยังไม่มีชุดกิจกรรมแกนนำเยาวชนที่ระบุว่าเหมาะกับเด็กปฐมวัยในคลังปัจจุบัน';
  return 'ยังไม่มีไฟล์เครื่องมือครบตามพื้นที่ กลุ่มเยาวชน บทบาท และเป้าหมายที่คุณเลือก ลองดูเป้าหมายอื่นที่คลังรองรับด้านล่าง';
}

export {buildComponentUsePlan as buildUsePlan,buildComponentGuidance as implementationGuidance} from './component-plan.mjs';
