const roles={role_teacher:'บุคลากรทางการศึกษา',role_health_agent:'ทีมสุขภาพในพื้นที่',role_community_leader:'ผู้นำชุมชน',role_parent:'ผู้ดูแลในครอบครัว',role_youth_leader:'แกนนำเยาวชน'};
const settings={setting_school:'สถานศึกษา',setting_community:'ชุมชน',setting_family:'ครอบครัว',setting_workplace:'สถานประกอบการ',setting_health:'ระบบบริการสุขภาพ'};
const audiences={youth_early:'เด็กปฐมวัย',youth_primary:'เด็กประถม',youth_secondary:'เยาวชนมัธยมและอาชีวศึกษา',youth_university:'นักศึกษา',youth_vulnerable:'เยาวชนกลุ่มเสี่ยง ชาติพันธุ์ หรือนอกระบบการศึกษา'};
const purposes={goal_c1:'วางนโยบายและจัดระบบดูแลเรื่องบุหรี่ไฟฟ้า',goal_c2:'จัดการเรียนรู้เรื่องบุหรี่ไฟฟ้า',goal_c3:'สร้างพื้นที่ปลอดบุหรี่ไฟฟ้า',goal_c4:'เปิดโอกาสให้เยาวชนร่วมคิดและทำกิจกรรม',goal_c5:'ประสานการดูแลช่วยเหลือให้ลดหรือเลิกบุหรี่และบุหรี่ไฟฟ้า'};

/** Three concise sentences from actual choices and the selected component only. */
export function buildContextNarrative(context,pkg,component){
  return [
    `คุณจะใช้เครื่องมือในฐานะ${roles[context.role]} เพื่อ${purposes[context.goalC]}ให้${audiences[context.targetYouth]}ใน${settings[context.setting]}`,
    `เป็นการขับเคลื่อนองค์ประกอบที่ ${component.number}: ${component.name}`,
    `จึงแนะนำ “${pkg.title}”`
  ];
}
