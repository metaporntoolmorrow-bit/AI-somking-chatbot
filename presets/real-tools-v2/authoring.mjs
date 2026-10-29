// Versioned editorial rules, never generated at request time.
// Tool files remain restricted to the approved tool database.
export const source = 'user_master_brief_2026_10_29';
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

const sequenceByGoal = {
  goal_c1: [
    ['เตรียมทีมและทบทวนบริบท','ใช้ส่วนการกำหนดนโยบายในคู่มือ ชวนผู้เกี่ยวข้องทบทวนงานเดิมและกำหนดผู้รับผิดชอบ','ทีมและผู้รับผิดชอบที่ชัดเจน'],
    ['ร่วมกำหนดและสื่อสารข้อตกลง','ให้ทีมและผู้เรียนร่วมเสนอแนวทาง แล้วเลือกวิธีสื่อสารนโยบายที่ทุกฝ่ายเข้าใจ','ข้อตกลงและวิธีสื่อสารร่วมกัน'],
    ['ทบทวนการทำงานร่วมกัน','กลับมาใช้ส่วนระบบบริหารในคู่มือ ทบทวนหน้าที่และสิ่งที่ต้องปรับร่วมกับทีม','ประเด็นปรับปรุงงานรอบถัดไป']
  ],
  goal_c2: [
    ['เตรียมกิจกรรมและประเมินการเรียนรู้','ทบทวนเครื่องมือที่เหมาะกับวัยและวิธีใช้ตามต้นฉบับก่อนเลือกกิจกรรมร่วมกับผู้ดูแล','เครื่องมือและกิจกรรมที่ทีมเลือก'],
    ['สร้างการเรียนรู้ผ่านกิจกรรม','ใช้สื่อหรือกิจกรรมในชุดเครื่องมือ เปิดโอกาสให้ผู้เรียนตั้งคำถามและแลกเปลี่ยนสิ่งที่เข้าใจ','ประเด็นที่ผู้เรียนได้แลกเปลี่ยน'],
    ['ทบทวนผลและปรับกิจกรรม','ใช้คำถามหรือแบบประเมินตามวิธีในต้นฉบับ แล้วนำผลภาพรวมมาปรับการเรียนรู้ครั้งต่อไป','สิ่งที่จะปรับในกิจกรรมครั้งต่อไป']
  ],
  goal_c3: [
    ['เตรียมผู้รับผิดชอบและเลือกงานพื้นที่','ใช้คู่มือทบทวนพื้นที่และเลือกประเด็นที่จะดูแล พร้อมตกลงผู้รับผิดชอบร่วมกัน','ประเด็นพื้นที่และผู้รับผิดชอบ'],
    ['สร้างข้อตกลงและลงมือร่วมกัน','เลือกกิจกรรมหรือแนวทางในคู่มือให้เหมาะกับพื้นที่ แล้วชวนผู้เกี่ยวข้องร่วมลงมือ','ข้อตกลงและกิจกรรมที่ทำร่วมกัน'],
    ['ติดตามและปรับข้อตกลง','พูดคุยสิ่งที่ลองทำและแรงสนับสนุนที่ต้องการ แล้วกลับมาปรับงานตามแนวทางในคู่มือ','ข้อตกลงที่นำไปทำต่อได้']
  ],
  goal_c4: [
    ['ชวนเยาวชนร่วมวางแผน','ใช้ส่วนการมีส่วนร่วมในคู่มือ ให้แกนนำเสนอสิ่งที่อยากปรับร่วมกับผู้ดูแลกิจกรรม','ประเด็นที่เยาวชนร่วมตัดสินใจ'],
    ['ร่วมออกแบบสื่อและกิจกรรม','ให้เยาวชนเลือกกิจกรรมจากชุดสื่อ ฝึกตรวจข้อมูล และออกแบบวิธีสื่อสารร่วมกัน','สื่อหรือกิจกรรมที่กลุ่มออกแบบเอง'],
    ['แลกเปลี่ยนผลและส่งต่องาน','ให้กลุ่มทบทวนสิ่งที่เรียนรู้ สรุปสิ่งที่จะปรับ และตกลงผู้รับช่วงกิจกรรมต่อ','ข้อเรียนรู้และผู้รับช่วงงาน']
  ],
  goal_c5: [
    ['จัดทีมและช่องทางรับฟัง','ทบทวนส่วนระบบช่วยเหลือในคู่มือ กำหนดผู้รับเรื่องและช่องทางพูดคุยเป็นส่วนตัว','ผู้รับเรื่องและช่องทางช่วยเหลือ'],
    ['ประสานผู้ดูแลและบริการ','ใช้แนวทางสื่อสารและส่งต่อตามขอบเขตของคู่มือ ประสานผู้รับผิดชอบที่เหมาะกับความช่วยเหลือที่ต้องการ','ผู้รับช่วงดูแลที่ตกลงร่วมกัน'],
    ['ติดตามความต่อเนื่อง','ตกลงวิธีติดตามกับผู้เกี่ยวข้อง โดยรักษาความลับและแยกข้อมูลรายบุคคลจากรายงานภาพรวม','วิธีประสานและติดตามที่ชัดเจน']
  ]
};
export function buildUsePlan(context, codes, tools) {
  const rows = structuredClone(sequenceByGoal[context.goalC]);
  if (context.setting === 'setting_health') {
    rows[0] = ['เตรียมทีมวิชาชีพและช่องทางส่งต่อ','ให้บุคลากรวิชาชีพทบทวนแนวทางเฝ้าระวังต้นฉบับ ส่วน อสม. ประสานช่องทางรับเรื่องและส่งต่อ','บทบาทและช่องทางส่งต่อของทีม'];
    rows[1] = ['ประสานบริการช่วยเลิก','ให้ผู้ประกอบวิชาชีพใช้แนวทางบำบัดภาวะติดนิโคตินตามขอบเขตงาน อสม. และผู้ประสานไม่วินิจฉัยหรือแนะนำยาเอง','ผู้รับผิดชอบบริการตามขอบเขตวิชาชีพ'];
  }
  if (context.setting === 'setting_family') rows[0] = ['เริ่มจากการรับฟัง','ใช้แนวทางสื่อสารเชิงบวก คุยสิ่งที่แต่ละคนห่วงและพร้อมทำ ก่อนเลือกกิจกรรมในครอบครัว','เรื่องที่คนในบ้านตกลงจะดูแลร่วมกัน'];
  if (context.targetYouth === 'youth_early') rows[0][1] = 'ให้ครูหรือผู้ดูแลทบทวนช่วงวัยในต้นฉบับ เลือกกิจกรรมสำหรับวัยที่เอกสารรองรับ และไม่ใช้สื่อชุดนี้กับเด็ก 0–2 ปีโดยอัตโนมัติ';
  if (context.targetYouth === 'youth_vulnerable' && context.goalC === 'goal_c2') rows[0][1] = 'ทบทวนช่วงวัย ภาษา และบริบทกับผู้ดูแลก่อนเลือกสื่อ รายงานเยาวชนชาติพันธุ์ใช้เป็นข้อมูลประกอบ ไม่ใช่แบบประเมินสำหรับทุกกลุ่ม';
  const stepCodes = codes.length === 1 ? [[codes[0]],[codes[0]],[codes[0]]]
    : [codes.slice(0,1),codes.slice(1),[codes.includes('MAIN-03')?'MAIN-03':codes.includes('MAIN-06')?'MAIN-06':codes[0]]];
  return rows.map(([stage,action,outcome],index) => ({order:index+1,rank:(index+1)*10,toolCode:stepCodes[index][0],toolCodes:stepCodes[index],shortTitle:stepCodes[index].map(c=>tools.find(t=>t.code===c).shortTitle).join(' / '),stage,action,outcome,basis:source}));
}

export function implementationGuidance(context) {
  const school = context.setting === 'setting_school';
  return {
    source, version: 1,
    successFactors: school ? ['ผู้บริหารประกาศเจตนารมณ์ชัดเจน และสนับสนุนทรัพยากร','เปิดให้เยาวชนและแกนนำร่วมวางแผนและขับเคลื่อนกิจกรรม','ใช้การรับฟังและดูแลช่วยเหลือแทนการลงโทษ']
      : ['กำหนดผู้รับผิดชอบและการสนับสนุนให้ชัดเจน','ใช้กระบวนการมีส่วนร่วมของผู้เกี่ยวข้อง','ใช้การรับฟังและดูแลช่วยเหลือ'],
    cautions: ['รักษาความลับ ไม่ประจานหรือตีตราเด็กและเยาวชน','หลีกเลี่ยงการใช้ความกลัว เน้นความเข้าใจและเหตุผล',...(school?['ไม่ใช้การลงโทษรุนแรงหรือการให้ออกเป็นทางเลือกแรก']:[]),...(context.goalC==='goal_c5'?['การประเมินและรักษาเป็นหน้าที่ของบุคลากรวิชาชีพ ผู้ประสานใช้ช่องทางส่งต่อตามคู่มือ']:[])],
    keyStandards: context.goalC === 'goal_c5' ? ['มีผู้รับผิดชอบและช่องทางดูแลหรือส่งต่อที่ชัดเจน','ติดตามการช่วยเหลือโดยรักษาความลับของผู้รับบริการ']
      : context.goalC === 'goal_c2' ? ['มีกิจกรรมการเรียนรู้ที่เลือกให้ตรงกับวัย','มีการทบทวนผลเพื่อนำไปปรับกิจกรรม']
      : context.goalC === 'goal_c4' ? ['เยาวชนมีส่วนร่วมออกแบบและตัดสินใจในกิจกรรม','มีข้อเรียนรู้และผู้รับช่วงงานต่อ']
      : ['มีข้อตกลงและผู้รับผิดชอบงานที่ชัดเจน','มีการทบทวนการทำงานเพื่อดูแลพื้นที่ปลอดบุหรี่ไฟฟ้า']
  };
}
