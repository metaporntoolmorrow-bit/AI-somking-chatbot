import { toolShortTitles } from './package-playbooks.mjs';
import { componentGuides } from './component-framework.mjs';
// Content authoring rules. Source scope is transcribed from the supplied tracker.
// Roles, audience routing and package outlines are editorial draft mappings.
export const release = { code: 'real-tools-2026-10-27-v4', scenarioPrefix:'REAL3', schemaVersion: 2, reviewStatus: 'package_specific_guidance', thresholdBytes: 6_000_000 };
export const settings = [
  ['EDU', 'สถานศึกษา'], ['FAM', 'ครอบครัว'], ['COM', 'ชุมชน'], ['HEA', 'ระบบบริการสุขภาพ'], ['WRK', 'สถานประกอบการ'],
].map(([code, label]) => ({ code, label }));
export const questions = [
  { order: 1, key: 'settingCode', text: 'คุณอยากเริ่มดูแลปัญหาบุหรี่ไฟฟ้าในพื้นที่ไหน?', hint: 'เลือกพื้นที่ที่จะนำแผนไปใช้จริง', selection: 'single', autoAdvance: true, askWhen: 'always' },
  { order: 2, key: 'roleCode', text: 'คุณจะร่วมดูแลพื้นที่นี้ในบทบาทไหน?', hint: 'เลือกบทบาทที่ใกล้กับงานที่คุณจะทำ', selection: 'single', autoAdvance: true, askWhen: 'always' },
  { order: 3, key: 'packageId', text: 'เรื่องไหนที่คุณอยากเริ่มทำให้เป็นระบบ?', hint: 'เลือกจุดเริ่มต้น แล้วเราจะเรียงเครื่องมือให้ใช้ต่อกัน', selection: 'single', autoAdvance: true, askWhen: 'always' },
  { order: 4, key: 'level', text: 'อยากเน้นป้องกันการเริ่มใช้ หรือช่วยคนที่เริ่มใช้แล้ว?', hint: 'เลือกสถานการณ์ที่ต้องการดูแล', selection: 'single', autoAdvance: true, askWhen: 'multiple_options', singleOptionBehavior: 'derive_without_prompt' },
  { order: 5, key: 'audienceCodes', text: 'คุณอยากเริ่มทำงานกับกลุ่มไหนบ้าง?', hint: 'เลือกกลุ่มที่จะทำงานด้วยจริง เลือกได้หลายข้อแล้วกดยืนยัน', selection: 'multiple', autoAdvance: false, confirmationRequired: true, askWhen: 'always' },
];
export const conversationPolicy = {
  version: 'source-informed-five-components-3',
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
  code: toolCode(number), sourceNumber: number, title:[1,7].includes(number)?toolShortTitles[number]:title, trackerTitle:title, shortTitle: toolShortTitles[number], kind:number===7?'รายงานและภาพสรุป':kind, scope, source, category: 'main',
  trackerStatus: 'ผ่านการทดลองใช้ / พร้อมขยายผล (ตามเอกสารรายการ)',
  availableContent: number === 4 ? 'link_document' : number === 7 ? 'research_and_infographics' : 'source_files',
  editorialNote: number === 1 ? 'ไฟล์ที่แนบเป็นคู่มือโรงเรียน; ยังไม่พบไฟล์ 7 องค์ประกอบอุดมศึกษาแยกต่างหาก'
    : number === 4 ? 'ไฟล์ DOCX มีลิงก์ไปยังชุดสื่อภายนอก จัดส่ง DOCX เดิมพร้อมลิงก์ใน TXT'
    : number === 7 ? 'ใช้รายงานวิจัยและภาพสรุปที่มีอยู่เป็นข้อมูลอ้างอิง; ไม่อ้างว่ามีแบบประเมินเปล่าพร้อมใช้'
    : number === 8 ? 'มีทั้งแผน PDF รายงานผล และ PPTX สรุปโครงการ จัดแยกประเภทให้เห็นตามไฟล์จริง'
    : [14,15,16].includes(number) ? 'เนื้อหาบางส่วนกล่าวถึงบุหรี่โดยรวม ให้ใช้ตามบริบทสถานประกอบการ'
    : [17,18].includes(number) ? 'จัดเส้นทางสำหรับบุคลากรวิชาชีพตามขอบเขตงาน; ไม่มีการสร้างคำแนะนำรักษาหรือขนาดยาเพิ่ม'
    : '',
})).concat(componentGuides);
export const supplementaryTools = [
  'Application TUM', 'แบบสำรวจพฤติกรรมบุหรี่และบุหรี่ไฟฟ้า', 'G-RDU ระบบเฝ้าระวังสินค้าไม่ปลอดภัย', 'คู่มือ CIB เรื่องบุหรี่ไฟฟ้า',
  '7 ชุดกิจกรรม ควบคุมการบริโภคบุหรี่และบุหรี่ไฟฟ้า', 'Child Impact Platform', 'สื่อรณรงค์และช่องทางเลิกบุหรี่ไฟฟ้า',
  'Uni-Health Platform', 'SOP Harmony มหาวิทยาลัยปลอดควัน', 'ชุดเครื่องมือความรู้เพื่อเครือข่ายสถานประกอบการ',
  'เลิกบุหรี่เริ่มที่บ้าน / เลิกบุหรี่บ้านละคน', 'มัสยิดปลอดบุหรี่', 'Youth Club เด็กมีภูมิ', 'ชุดสื่อสร้างความตระหนักรู้',
  'นิทรรศการรู้ทันกลลวงบุหรี่ไฟฟ้า', 'คู่มือกิจกรรมสำหรับครูและผู้ปกครอง', 'Report Card Tobacco Control',
  'บทความ E-Cigarettes จาก INHPF', 'บอร์ดเกม Just Say No', 'สติ๊กเกอร์ Quit UP!', 'Vape Truth Mirror',
].map((title, index) => ({ code: `SUP-${String(index + 1).padStart(2, '0')}`, sourceNumber: index + 1, title, assetStatus: 'not_supplied', routingEnabled: false, sourceStatus: 'อยู่ระหว่างจัดทำ / ยังไม่ประเมิน (ตามเอกสารรายการ)' }));

export const hostFor = (setting, role) => setting === 'EDU' ? (role.includes('leader') ? 'ครูหรือทีมดูแลผู้เรียนร่วมกับแกนนำ' : 'ผู้บริหาร ครู และทีมดูแลผู้เรียน')
  : setting === 'FAM' ? 'สมาชิกครอบครัวและผู้รับผิดชอบกิจกรรมครอบครัว' : setting === 'COM' ? 'อปท. ทีมชุมชน และหน่วยบริการสุขภาพในพื้นที่'
  : setting === 'WRK' ? 'ผู้บริหาร ฝ่ายบุคคล และคณะทำงานสถานประกอบการ' : 'ทีมบุคลากรวิชาชีพของหน่วยบริการ';

export { packages, rules, usagePlanFor } from './package-playbooks.mjs';
