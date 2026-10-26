// Content authoring rules. Source scope is transcribed from the supplied tracker.
// Roles, audience routing and package outlines are editorial draft mappings.
export const release = { code: 'real-tools-2026-10-26-v1', schemaVersion: 1, reviewStatus: 'working_draft', thresholdBytes: 6_000_000 };
export const settings = [
  ['EDU', 'สถานศึกษา'], ['FAM', 'ครอบครัว'], ['COM', 'ชุมชน'], ['HEA', 'ระบบบริการสุขภาพ'], ['WRK', 'สถานประกอบการ'],
].map(([code, label]) => ({ code, label }));
export const questions = [
  { order: 1, key: 'settingCode', text: 'คุณอยากเริ่มสร้างพื้นที่ปลอดบุหรี่ไฟฟ้าที่ไหน?', hint: 'เลือกพื้นที่ที่คุณอยากนำแผนไปใช้', selection: 'single', autoAdvance: true, askWhen: 'always' },
  { order: 2, key: 'roleCode', text: 'คุณจะช่วยดูแลพื้นที่นี้ในบทบาทไหน?', hint: 'เลือกบทบาทที่ใกล้กับสิ่งที่คุณจะทำมากที่สุด', selection: 'single', autoAdvance: true, askWhen: 'always' },
  { order: 3, key: 'packageId', text: 'ในบทบาทนี้ คุณอยากเริ่มทำเรื่องไหน?', hint: 'เลือกเรื่องที่อยากลงมือทำก่อน', selection: 'single', autoAdvance: true, askWhen: 'always' },
  { order: 4, key: 'level', text: 'แผนนี้ควรเน้นป้องกัน หรือดูแลคนที่ใช้อยู่แล้ว?', hint: 'เลือกเป้าหมายที่ตรงกับคนที่คุณอยากดูแล', selection: 'single', autoAdvance: true, askWhen: 'multiple_options', singleOptionBehavior: 'derive_without_prompt' },
  { order: 5, key: 'audienceCodes', text: 'คุณอยากให้แผนนี้ช่วยดูแลใครบ้าง?', hint: 'เลือกได้มากกว่าหนึ่งกลุ่ม แล้วกดยืนยันคำตอบ', selection: 'multiple', autoAdvance: false, confirmationRequired: true, askWhen: 'always' },
];
export const conversationPolicy = {
  version: 'conversational-copy-1',
  requiredQuestionKeys: ['settingCode','roleCode','packageId','audienceCodes'],
  conditionalQuestionKey: 'level',
  conditionalRule: 'Ask only when more than one valid level remains after the preceding answers; otherwise derive the sole valid value.',
  questionNumbering: 'Count displayed questions only; never show a fixed total of five.',
  packageOptionLabel: 'choiceLabel',
  packageResultLabel: 'title',
};
export const levels = [{ code: 'prevention', label: 'ป้องกันการเริ่มใช้บุหรี่และบุหรี่ไฟฟ้า' }, { code: 'cessation', label: 'ดูแลและช่วยเหลือคนที่ใช้บุหรี่หรือบุหรี่ไฟฟ้าอยู่แล้ว' }];
export const components = [
  ['C1', 'กำหนดนโยบายและระบบบริหารงาน'], ['C2', 'บูรณาการในวิชาสอนและกิจกรรมนอกหลักสูตร'],
  ['C3', 'สร้างสภาพแวดล้อมที่ช่วยปกป้องดูแล'], ['C4', 'สร้างการมีส่วนร่วมของเยาวชน'], ['C5', 'ดูแลช่วยเหลือให้ลด ละ เลิก'],
].map(([code, label]) => ({ code, label }));
export const roles = [
  ['school_admin', 'ผู้บริหารสถานศึกษา'], ['teacher', 'ครู / อาจารย์ / ครู ศพด.'],
  ['school_staff', 'บุคลากรในสถานศึกษา'], ['school_team', 'ทีมผู้บริหารและครู'],
  ['student_leader', 'แกนนำนักเรียน'], ['university_leader', 'แกนนำนักศึกษา'],
  ['parent', 'ผู้ปกครอง'], ['family_member', 'สมาชิกในครอบครัว'], ['father', 'พ่อ / ผู้ดูแลที่เป็นพ่อ'],
  ['family_team', 'คณะทำงานครอบครัวปลอดบุหรี่'], ['community_leader', 'แกนนำชุมชน'],
  ['local_authority', 'ผู้รับผิดชอบงานของ อปท.'], ['muslim_leader', 'แกนนำชุมชนมุสลิม'], ['mosque_team', 'คณะกรรมการมัสยิด'],
  ['public_health', 'เจ้าหน้าที่สาธารณสุข'], ['volunteer', 'อสม.'], ['pharmacist', 'เภสัชกร'],
  ['doctor', 'แพทย์'], ['nurse', 'พยาบาล'],
  ['employer', 'ผู้บริหาร / เจ้าของสถานประกอบการ'], ['hr', 'ฝ่ายบุคคล / คณะทำงาน'],
  ['work_leader', 'แกนนำในสถานประกอบการ'], ['employee', 'บุคลากรในสถานประกอบการ'],
].map(([code, label]) => ({ code, label }));
export const audiences = [
  ['early_childhood', 'เด็กปฐมวัย อายุประมาณ 3–6 ปี'], ['primary_lower', 'นักเรียนประถมต้น อายุประมาณ 7–9 ปี'],
  ['primary_upper', 'นักเรียนประถมปลาย อายุประมาณ 10–12 ปี'], ['secondary', 'นักเรียนมัธยม'],
  ['vocational', 'นักเรียนอาชีวศึกษา'], ['university', 'นักศึกษาอุดมศึกษา'], ['ethnic_youth', 'เด็กและเยาวชนกลุ่มชาติพันธุ์ในสถานศึกษา'],
  ['family_all', 'สมาชิกทุกคนในครอบครัว'], ['caregivers', 'พ่อแม่และผู้ดูแลเด็ก'], ['fathers', 'พ่อและแกนนำพ่อในพื้นที่'],
  ['family_who_use', 'คนในครอบครัวที่ใช้บุหรี่หรือบุหรี่ไฟฟ้า'],
  ['community_all', 'ประชาชนในชุมชน'], ['community_youth', 'เด็กและเยาวชนในชุมชน'], ['community_workers', 'คนวัยทำงานในชุมชน'],
  ['workers', 'พนักงาน / คนวัยทำงานในสถานประกอบการ'],
  ['adult_service_users', 'ผู้รับบริการวัยผู้ใหญ่ที่ใช้บุหรี่หรือบุหรี่ไฟฟ้า'],
  ['adolescent_service_users', 'ผู้รับบริการวัยรุ่นที่ใช้บุหรี่หรือบุหรี่ไฟฟ้า'],
].map(([code, label]) => ({ code, label }));

const rawTools = [
  [1, '7 มาตรการโรงเรียนปลอดบุหรี่ และ 7 องค์ประกอบสำหรับอุดมศึกษา', 'คู่มือ / แนวปฏิบัติ', { EDU: ['C1','C2','C3','C4','C5'], COM: ['C3'], FAM: ['C3'] }, 'สน.1'],
  [2, 'คู่มือสื่อและกิจกรรมเพื่อเสริมสร้างภูมิคุ้มกันสุขภาวะต่อการใช้บุหรี่ไฟฟ้าในเด็กและเยาวชน', 'คู่มือ / แนวปฏิบัติ', { EDU: ['C2'] }, 'สน.1'],
  [3, 'แบบทดสอบความรอบรู้ทางสุขภาพด้านการควบคุมยาสูบ (ประถม)', 'แบบสำรวจ / แบบประเมิน', { EDU: ['C2'] }, 'สน.1'],
  [4, 'ชุดสื่อกิจกรรมการเรียนรู้พัฒนาจิตสำนึกเด็กปฐมวัยรู้เท่าทันบุหรี่ไฟฟ้า', 'สื่อการเรียนรู้ / เกม', { EDU: ['C2'], FAM: ['C3'] }, 'สน.1'],
  [5, 'Survival Kit 7+1: เครื่องมือพร้อมใช้ที่สอดคล้องกับธรรมชาติการเรียนรู้', 'สื่อการเรียนรู้ / เกม', { EDU: ['C2'] }, 'สน.4'],
  [6, 'แบบสำรวจความรอบรู้ด้านสุขภาพในประเด็นบุหรี่ไฟฟ้า (มัธยม)', 'แบบสำรวจ / แบบประเมิน', { EDU: ['C2'] }, 'สน.6'],
  [7, 'แบบประเมินความรู้ด้านสุขภาวะที่เกี่ยวข้องกับบุหรี่ไฟฟ้าสำหรับเยาวชนกลุ่มชาติพันธุ์', 'แบบสำรวจ / แบบประเมิน', { EDU: ['C2'] }, 'สน.9'],
  [8, 'แผนการจัดการเรียนรู้เตือนภัยบุหรี่ไฟฟ้า สำหรับครู ศพด.', 'หลักสูตร', { EDU: ['C2'] }, 'สน.11'],
  [9, 'หนังสือนิทาน เด็กปลอดพอต', 'สื่อการเรียนรู้ / เกม', { EDU: ['C2'], FAM: ['C3'] }, 'สน.11'],
  [10, '8 วิธีขับเคลื่อน อปท.ปลอดบุหรี่ บุหรี่ไฟฟ้า ยาเส้น ตามเกณฑ์ LPA', 'คู่มือ / แนวปฏิบัติ', { COM: ['C3','C5'] }, 'สน.1'],
  [11, 'คู่มืออบรมเชิงปฏิบัติการคณะทำงานและห้องเรียนครอบครัวปลอดบุหรี่', 'คู่มือ / แนวปฏิบัติ', { FAM: ['C3'] }, 'สน.1'],
  [12, 'คู่มือสร้างความสัมพันธ์ในครอบครัวและสื่อสารเชิงบวก', 'คู่มือ / แนวปฏิบัติ', { FAM: ['C3'] }, 'สน.1'],
  [13, 'คู่มือการจัดอบรมหลักสูตรพ่อแกนนำไร้ควันบุหรี่ / บุหรี่ไฟฟ้า', 'คู่มือ / แนวปฏิบัติ', { FAM: ['C3'] }, 'สน.1'],
  [14, 'Smoke-Free Organization องค์กรปลอดบุหรี่', 'คู่มือ / แนวปฏิบัติ', { WRK: ['C3'] }, 'สน.8'],
  [15, 'ถอดรหัสสถานประกอบการปลอดบุหรี่: คู่มือคณะทำงาน', 'คู่มือ / แนวปฏิบัติ', { WRK: ['C3'] }, 'สน.1 + สน.8'],
  [16, 'ถอดรหัสสถานประกอบการปลอดบุหรี่: คู่มือผู้บริหาร', 'คู่มือ / แนวปฏิบัติ', { WRK: ['C3'] }, 'สน.1 + สน.8'],
  [17, 'แนวทางการเฝ้าระวัง สอบสวน วินิจฉัย และรักษาภาวะปอดอักเสบเฉียบพลันจากการสูบบุหรี่ไฟฟ้า', 'คู่มือ / แนวปฏิบัติ', { HEA: ['C5'] }, 'สน.1'],
  [18, 'แนวทางเวชปฏิบัติ สำหรับการบำบัดภาวะติดนิโคติน', 'คู่มือ / แนวปฏิบัติ', { HEA: ['C5'] }, 'สน.1'],
];
export const toolCode = number => `MAIN-${String(number).padStart(2, '0')}`;
export const tools = rawTools.map(([number, title, kind, scope, source]) => ({
  code: toolCode(number), sourceNumber: number, title, kind, scope, source, category: 'main',
  trackerStatus: 'ผ่านการทดลองใช้ / พร้อมขยายผล (ตามเอกสารรายการ)',
  availableContent: number === 4 ? 'link_document' : number === 7 ? 'research_and_infographics' : 'source_files',
  editorialNote: number === 1 ? 'ไฟล์ที่แนบเป็นคู่มือโรงเรียน; ยังไม่พบไฟล์ 7 องค์ประกอบอุดมศึกษาแยกต่างหาก'
    : number === 4 ? 'ไฟล์ DOCX มีลิงก์ไปยังชุดสื่อภายนอก จัดส่ง DOCX เดิมพร้อมลิงก์ใน TXT'
    : number === 7 ? 'ใช้รายงานวิจัยและภาพสรุปที่มีอยู่เป็นข้อมูลอ้างอิง; ไม่อ้างว่ามีแบบประเมินเปล่าพร้อมใช้'
    : number === 8 ? 'มีทั้งแผน PDF รายงานผล และ PPTX สรุปโครงการ จัดแยกประเภทให้เห็นตามไฟล์จริง'
    : [14,15,16].includes(number) ? 'เนื้อหาบางส่วนกล่าวถึงบุหรี่โดยรวม ให้ใช้ตามบริบทสถานประกอบการ'
    : [17,18].includes(number) ? 'จัดเส้นทางสำหรับบุคลากรวิชาชีพตามขอบเขตงาน; ไม่มีการสร้างคำแนะนำรักษาหรือขนาดยาเพิ่ม'
    : '',
}));
export const supplementaryTools = [
  'Application TUM', 'แบบสำรวจพฤติกรรมบุหรี่และบุหรี่ไฟฟ้า', 'G-RDU ระบบเฝ้าระวังสินค้าไม่ปลอดภัย', 'คู่มือ CIB เรื่องบุหรี่ไฟฟ้า',
  '7 ชุดกิจกรรม ควบคุมการบริโภคบุหรี่และบุหรี่ไฟฟ้า', 'Child Impact Platform', 'สื่อรณรงค์และช่องทางเลิกบุหรี่ไฟฟ้า',
  'Uni-Health Platform', 'SOP Harmony มหาวิทยาลัยปลอดควัน', 'ชุดเครื่องมือความรู้เพื่อเครือข่ายสถานประกอบการ',
  'เลิกบุหรี่เริ่มที่บ้าน / เลิกบุหรี่บ้านละคน', 'มัสยิดปลอดบุหรี่', 'Youth Club เด็กมีภูมิ', 'ชุดสื่อสร้างความตระหนักรู้',
  'นิทรรศการรู้ทันกลลวงบุหรี่ไฟฟ้า', 'คู่มือกิจกรรมสำหรับครูและผู้ปกครอง', 'Report Card Tobacco Control',
  'บทความ E-Cigarettes จาก INHPF', 'บอร์ดเกม Just Say No', 'สติ๊กเกอร์ Quit UP!', 'Vape Truth Mirror',
].map((title, index) => ({ code: `SUP-${String(index + 1).padStart(2, '0')}`, sourceNumber: index + 1, title, assetStatus: 'not_supplied', routingEnabled: false, sourceStatus: 'อยู่ระหว่างจัดทำ / ยังไม่ประเมิน (ตามเอกสารรายการ)' }));

const packageChoiceLabels = {
  'PK-EDU-C1': 'อยากวางนโยบายและจัดทีมดูแลเรื่องบุหรี่ไฟฟ้า',
  'PK-EDU-C2': 'อยากจัดการเรียนรู้เรื่องบุหรี่ไฟฟ้า',
  'PK-EDU-C3': 'อยากดูแลพื้นที่และสร้างข้อตกลงร่วมกัน',
  'PK-EDU-C4': 'อยากชวนเยาวชนมาร่วมขับเคลื่อน',
  'PK-EDU-C5': 'อยากจัดระบบดูแลและส่งต่อผู้เรียนที่ใช้อยู่แล้ว',
  'PK-FAM-HOME': 'อยากดูแลบ้านและคนในครอบครัวให้ปลอดควัน',
  'PK-FAM-TEAM': 'อยากจัดกิจกรรมให้พ่อแม่และแกนนำครอบครัว',
  'PK-FAM-SUPPORT': 'อยากพูดคุยและให้กำลังใจคนในบ้านที่อยากเลิก',
  'PK-COM-C3': 'อยากชวนชุมชนและท้องถิ่นมาดูแลพื้นที่ร่วมกัน',
  'PK-COM-C5': 'อยากช่วยให้คนในชุมชนเข้าถึงบริการช่วยเลิก',
  'PK-WRK-SYSTEM': 'อยากจัดระบบให้ที่ทำงานปลอดบุหรี่',
  'PK-WRK-SUPPORT': 'อยากช่วยให้พนักงานที่อยากเลิกได้รับการดูแล',
  'PK-HEA-QUIT': 'อยากจัดบริการช่วยเลิกบุหรี่และนิโคติน',
  'PK-HEA-SURVEILLANCE': 'อยากเฝ้าระวังและส่งต่อผู้ได้รับผลกระทบจากบุหรี่ไฟฟ้า',
};
export const packages = [
  ['PK-EDU-C1','EDU','C1','วางนโยบายและจัดระบบสถานศึกษาปลอดบุหรี่ไฟฟ้า','สถานศึกษามีนโยบายและผู้รับผิดชอบที่ชัดเจน'],
  ['PK-EDU-C2','EDU','C2','จัดการเรียนรู้และกิจกรรมรู้เท่าทันบุหรี่ไฟฟ้า','เลือกสื่อและกิจกรรมให้เหมาะกับวัยของผู้เรียน'],
  ['PK-EDU-C3','EDU','C3','สร้างสภาพแวดล้อมสถานศึกษาปลอดบุหรี่ไฟฟ้า','ร่วมกันดูแลพื้นที่และสร้างกติกาที่ปกป้องผู้เรียน'],
  ['PK-EDU-C4','EDU','C4','ชวนเยาวชนร่วมขับเคลื่อนพื้นที่ปลอดบุหรี่ไฟฟ้า','เยาวชนมีส่วนร่วมออกแบบและทำกิจกรรมกับทีมสถานศึกษา'],
  ['PK-EDU-C5','EDU','C5','จัดระบบดูแลและส่งต่อผู้เรียนที่ใช้บุหรี่ไฟฟ้า','สถานศึกษามีผู้ดูแลและทางส่งต่อผู้ที่ต้องการความช่วยเหลือ'],
  ['PK-FAM-HOME','FAM','C3','สร้างบ้านและความสัมพันธ์ที่ปลอดควัน','ใช้การสื่อสารเชิงบวกและสื่อที่เหมาะกับวัยในครอบครัว'],
  ['PK-FAM-TEAM','FAM','C3','สร้างแกนนำและห้องเรียนครอบครัวปลอดบุหรี่','คณะทำงานจัดการเรียนรู้ร่วมกับพ่อแม่และผู้ดูแลได้'],
  ['PK-FAM-SUPPORT','FAM','C3','สื่อสารและให้กำลังใจคนในบ้านที่อยากเลิก','ครอบครัวพูดคุยและสนับสนุนการเข้าถึงบริการช่วยเลิก'],
  ['PK-COM-C3','COM','C3','ขับเคลื่อนชุมชนและท้องถิ่นปลอดบุหรี่ไฟฟ้า','ชุมชนและ อปท. มีทีมทำงานและพื้นที่ดูแลร่วมกัน'],
  ['PK-COM-C5','COM','C5','เชื่อมคนในชุมชนกับบริการช่วยเลิก','ทีมชุมชนและ อปท. มีแนวทางประสานบริการสุขภาพ'],
  ['PK-WRK-SYSTEM','WRK','C3','จัดระบบสถานประกอบการปลอดบุหรี่','ผู้บริหาร คณะทำงาน และพนักงานร่วมกันดูแลที่ทำงาน'],
  ['PK-WRK-SUPPORT','WRK','C3','จัดระบบสนับสนุนพนักงานที่อยากเลิก','สถานประกอบการมีผู้ประสานและติดตามการช่วยเหลือพนักงาน'],
  ['PK-HEA-QUIT','HEA','C5','จัดบริการช่วยเลิกบุหรี่และนิโคติน','บุคลากรวิชาชีพวางระบบบริการตามแนวทางที่มีอยู่'],
  ['PK-HEA-SURVEILLANCE','HEA','C5','เฝ้าระวังและส่งต่อผลกระทบจากบุหรี่ไฟฟ้า','ทีมวิชาชีพประสานการเฝ้าระวัง สอบสวน และดูแลตามหน้าที่'],
].map(([code, settingCode, componentCode, title, goal]) => ({ code, settingCode, componentCode, title, choiceLabel: packageChoiceLabels[code], goal, mappingBasis: ['tracker_scope','editorial_routing'] }));

const schoolAdults = ['school_admin','teacher','school_staff','school_team'];
const schoolDelivery = ['teacher','school_staff','school_team'];
const olderLearners = ['primary_upper','secondary','vocational'];
const familyMembers = ['parent','family_member','father'];
const familyFacilitators = ['family_team','community_leader','public_health','volunteer'];
const communityRoles = ['local_authority','community_leader','public_health','volunteer','muslim_leader','mosque_team'];
const rule = (id, packageId, roleCodes, audienceCodes, level, primary, supporting = [], measurement = [], reference = [], note = '', status = 'primary_available') => ({
  id, packageId, roleCodes, audienceCodes, level, primary: primary.map(toolCode), supporting: supporting.map(toolCode), measurement: measurement.map(toolCode), reference: reference.map(toolCode), note, status,
  mappingBasis: { scope: 'tracker_explicit', roleAndAudience: 'editorial_inference_from_tool_context', packageOutline: 'editorial_draft' },
});
const universityNote = 'ตารางต้นฉบับระบุอุดมศึกษา แต่ไฟล์ที่แนบเป็นคู่มือโรงเรียน จึงให้เฉพาะกรอบอ้างอิงและให้ทีมอุดมศึกษาปรับใช้; ยังไม่อ้างว่ามีคู่มืออุดมศึกษาครบชุด';
const peerNote = 'แกนนำทำงานร่วมกับครูหรือทีมสถานศึกษา ไม่ทำหน้าที่วินิจฉัยหรือรักษา';
export const rules = [
  rule('EDU-POLICY-SCHOOL','PK-EDU-C1',schoolAdults,olderLearners,'prevention',[1]),
  rule('EDU-POLICY-UNI','PK-EDU-C1',schoolAdults,['university'],'prevention',[],[1],[],[],universityNote,'support_only'),
  rule('EDU-LEARN-EARLY','PK-EDU-C2',schoolDelivery,['early_childhood'],'prevention',[8,9],[4,5],[],[],'Survival Kit ใช้เฉพาะกิจกรรมวัย 3–6 ปี; ไฟล์ข้อ 4 เป็นลิงก์เข้าถึงชุดสื่อ'),
  rule('EDU-LEARN-LOWER','PK-EDU-C2',[...schoolDelivery,'student_leader'],['primary_lower'],'prevention',[2,5],[],[3],[],'Survival Kit ใช้ช่วงวัย 7–9 ปี; แบบสำรวจข้อ 3 ใช้ส่วนประถม; แกนนำทำร่วมกับครู'),
  rule('EDU-LEARN-UPPER','PK-EDU-C2',[...schoolDelivery,'student_leader'],['primary_upper'],'prevention',[2,5],[],[3],[],'Survival Kit ใช้ช่วงวัย 10–12 ปี; แบบสำรวจข้อ 3 ใช้ส่วนประถม; แกนนำทำร่วมกับครู'),
  rule('EDU-LEARN-SECONDARY','PK-EDU-C2',[...schoolDelivery,'student_leader'],['secondary'],'prevention',[2],[],[6]),
  rule('EDU-LEARN-VOCATIONAL','PK-EDU-C2',[...schoolDelivery,'student_leader'],['vocational'],'prevention',[2],[],[],[],'ปรับกิจกรรมจากคู่มือเด็กและเยาวชนตามบริบทอาชีวศึกษา; ไม่สวมแบบสำรวจมัธยมให้เป็นแบบเฉพาะอาชีวะ'),
  rule('EDU-LEARN-ETHNIC','PK-EDU-C2',[...schoolDelivery,'student_leader'],['ethnic_youth'],'prevention',[2],[],[],[7],'ข้อ 7 จัดส่งรายงานวิจัยและภาพสรุปที่มีอยู่เป็นข้อมูลประกอบ; ไม่มีแบบประเมินเปล่าแยกต่างหาก'),
  rule('EDU-LEARN-UNI','PK-EDU-C2',[...schoolDelivery,'university_leader'],['university'],'prevention',[],[1],[],[],universityNote,'support_only'),
  rule('EDU-ENV-SCHOOL','PK-EDU-C3',schoolAdults,olderLearners,'prevention',[1]),
  rule('EDU-ENV-UNI','PK-EDU-C3',schoolAdults,['university'],'prevention',[],[1],[],[],universityNote,'support_only'),
  rule('EDU-YOUTH-SCHOOL','PK-EDU-C4',[...schoolDelivery,'student_leader'],olderLearners,'prevention',[1],[],[],[],'ใช้หัวข้อการมีส่วนร่วมของนักเรียนในคู่มือ 7 มาตรการ; ไม่ใช่คู่มือตั้งชมรมฉบับเฉพาะ'),
  rule('EDU-YOUTH-UNI','PK-EDU-C4',[...schoolDelivery,'university_leader'],['university'],'prevention',[],[1],[],[],universityNote,'support_only'),
  rule('EDU-CARE-SCHOOL','PK-EDU-C5',[...schoolDelivery,'student_leader'],olderLearners,'cessation',[1],[],[],[],peerNote),
  rule('EDU-CARE-UNI','PK-EDU-C5',[...schoolDelivery,'university_leader'],['university'],'cessation',[],[1],[],[],`${universityNote}; ${peerNote}`,'support_only'),
  rule('FAM-HOME-EARLY','PK-FAM-HOME',familyMembers,['early_childhood'],'prevention',[12,9],[4]),
  rule('FAM-HOME-CHILD','PK-FAM-HOME',familyMembers,['primary_lower'],'prevention',[12]),
  rule('FAM-HOME-OLDER','PK-FAM-HOME',familyMembers,['primary_upper','secondary'],'prevention',[12],[],[],[1],'คู่มือโรงเรียนใช้เฉพาะส่วนความร่วมมือระหว่างครอบครัวกับสถานศึกษา'),
  rule('FAM-HOME-ALL','PK-FAM-HOME',familyMembers,['family_all'],'prevention',[12]),
  rule('FAM-TEAM-CARE','PK-FAM-TEAM',familyFacilitators,['caregivers'],'prevention',[11],[12]),
  rule('FAM-TEAM-FATHER','PK-FAM-TEAM',familyFacilitators,['fathers'],'prevention',[13],[11,12]),
  rule('FAM-SUPPORT-MEMBER','PK-FAM-SUPPORT',familyMembers,['family_who_use'],'cessation',[12],[],[],[],'ใช้การสื่อสารเชิงบวกเพื่อสนับสนุนและเชื่อมบริการช่วยเลิก; ไม่ใช่แนวทางบำบัดทดแทนวิชาชีพ'),
  rule('FAM-SUPPORT-TEAM','PK-FAM-SUPPORT',familyFacilitators,['family_who_use'],'cessation',[11,12],[],[],[],'คณะทำงานจัดวงพูดคุยกับครอบครัวและประสานบริการสุขภาพตามความยินยอม'),
  rule('COM-ENV-ALL','PK-COM-C3',communityRoles,['community_all','community_workers'],'prevention',[10]),
  rule('COM-ENV-YOUTH','PK-COM-C3',communityRoles,['community_youth'],'prevention',[10],[],[],[1],'ข้อ 1 ใช้ส่วนความร่วมมือชุมชน–สถานศึกษา; บทบาทศาสนสถานได้คู่มือชุมชนทั่วไป ไม่อ้างว่ามีคู่มือมัสยิดเฉพาะ'),
  rule('COM-CARE','PK-COM-C5',communityRoles,['community_all','community_youth','community_workers'],'cessation',[10],[],[],[],'ใช้ส่วนสนับสนุนการลด ละ เลิกและประสานหน่วยบริการของ อปท.; ไม่เพิ่มแนวทางรักษา'),
  rule('WRK-SYSTEM-ADMIN','PK-WRK-SYSTEM',['employer'],['workers'],'prevention',[16],[14]),
  rule('WRK-SYSTEM-TEAM','PK-WRK-SYSTEM',['hr','work_leader'],['workers'],'prevention',[15],[14,16]),
  rule('WRK-SYSTEM-EMPLOYEE','PK-WRK-SYSTEM',['employee'],['workers'],'prevention',[14],[15],[],[],'ผู้ร่วมดำเนินงานควรชวนฝ่ายบุคคลหรือคณะทำงานมารับผิดชอบร่วม'),
  rule('WRK-CARE-ADMIN','PK-WRK-SUPPORT',['employer'],['workers'],'cessation',[16],[15],[],[],'เน้นจัดระบบสนับสนุนและประสานบริการช่วยเลิกตามคู่มือสถานประกอบการ'),
  rule('WRK-CARE-TEAM','PK-WRK-SUPPORT',['hr','work_leader'],['workers'],'cessation',[15],[16],[],[],'ใช้กระบวนการสนับสนุนพนักงานในคู่มือ ไม่สร้างแนวทางรักษาขึ้นใหม่'),
  rule('WRK-CARE-EMPLOYEE','PK-WRK-SUPPORT',['employee'],['workers'],'cessation',[],[15,16],[],[],'เป็นผู้ร่วมและผู้ประสาน ต้องมีฝ่ายบุคคลหรือคณะทำงานร่วมดำเนินการ','support_only'),
  rule('HEA-QUIT','PK-HEA-QUIT',['doctor','nurse','public_health','pharmacist'],['adult_service_users','adolescent_service_users'],'cessation',[18],[],[],[],'บุคลากรใช้ตามขอบเขตวิชาชีพ; กลุ่มวัยรุ่นอ้างอิงหัวข้อเฉพาะในแนวทาง ไม่ย่อเป็นคำสั่งรักษาอัตโนมัติ'),
  rule('HEA-SURVEILLANCE','PK-HEA-SURVEILLANCE',['doctor','nurse','public_health'],['adult_service_users','adolescent_service_users'],'cessation',[17],[],[],[],'แพทย์และทีมวิชาชีพใช้ตามบทบาท; เจ้าหน้าที่สาธารณสุขเน้นเฝ้าระวัง สอบสวน และส่งต่อ ไม่วินิจฉัยแทนแพทย์'),
];
export const hostFor = (setting, role) => setting === 'EDU' ? (role.includes('leader') ? 'ครูหรือทีมดูแลผู้เรียนร่วมกับแกนนำ' : 'ผู้บริหาร ครู และทีมดูแลผู้เรียน')
  : setting === 'FAM' ? 'สมาชิกครอบครัวและผู้รับผิดชอบกิจกรรมครอบครัว' : setting === 'COM' ? 'อปท. ทีมชุมชน และหน่วยบริการสุขภาพในพื้นที่'
  : setting === 'WRK' ? 'ผู้บริหาร ฝ่ายบุคคล และคณะทำงานสถานประกอบการ' : 'ทีมบุคลากรวิชาชีพของหน่วยบริการ';
export const phasesFor = (pkg, roleLabel, audienceLabel) => {
  const first = `ชวน${roleLabel}และทีมที่เกี่ยวข้องทบทวนบริบทของ${audienceLabel} และเลือกส่วนของคู่มือที่จะใช้`;
  if (pkg.settingCode === 'HEA') return [first, 'ทบทวนแนวทางต้นฉบับและกำหนดผู้รับผิดชอบตามขอบเขตวิชาชีพ', 'ใช้แนวทางในระบบบริการและการประสานส่งต่อตามบริบทของหน่วยงาน', 'ทบทวนความครบถ้วนของการประสานงานและปรับขั้นตอนร่วมกับทีมบริการ'];
  if (pkg.componentCode === 'C2') return [first, 'เตรียมสื่อ กิจกรรม และแบบสำรวจที่ตรงกับวัยและมีไฟล์อยู่จริง', 'จัดกิจกรรมตามคู่มือ โดยให้ผู้รับผิดชอบปรับเวลาและภาษาให้เหมาะกับกลุ่ม', 'เก็บข้อเสนอแนะและทบทวนผลจากกิจกรรมหรือแบบสำรวจที่เลือกใช้'];
  if (pkg.componentCode === 'C5' || pkg.code.endsWith('SUPPORT')) return [first, 'ตกลงบทบาทของผู้ดูแลและช่องทางประสานบริการสุขภาพ', 'พูดคุย สนับสนุน และประสานผู้รับผิดชอบตามคู่มือและความยินยอม', 'ติดตามการเข้าถึงความช่วยเหลือและปรับการประสานงานร่วมกับทีม'];
  return [first, 'เตรียมทีม แบ่งหน้าที่ และเลือกกิจกรรมจากคู่มือต้นฉบับ', 'เริ่มดำเนินงานกับกลุ่มเป้าหมายตามบทบาทและข้อตกลงร่วมกัน', 'ทบทวนสิ่งที่ทำได้ ปัญหาที่พบ และปรับแผนรอบถัดไป'];
};
