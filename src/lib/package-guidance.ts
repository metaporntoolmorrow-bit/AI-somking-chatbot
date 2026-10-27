import editions from '@/content/package-guidance.json';
import { parseGuidanceId } from './guidance-cycle';
import type { Scenario } from './catalog';

// Editorial facilitation advice. These sets do not change tool routing or clinical content.
export function packageGuidance(scenarios: Scenario[], edition: number) {
  if (!scenarios.length) return { cautions: [], benefits: [] };
  const selected = editions[parseGuidanceId(edition) - 1];
  const first = scenarios[0];
  const ids = new Set(scenarios.flatMap(s => [...s.primaryIds, ...s.supportIds, ...s.measureIds, ...s.referenceIds]));
  const required = first.settingCode === 'HEA'
    ? ['ใช้คู่มือต้นฉบับตามขอบเขตวิชาชีพและระบบบริการของหน่วยงาน',
      'ลำดับนี้เป็นกรอบจัดระบบบริการ ไม่ใช่คำสั่งวินิจฉัย รักษา หรือสั่งยา',
      'แยกข้อมูลผู้รับบริการออกจากเอกสารที่นำไปสรุปหรือเผยแพร่']
    : ['เข้าร่วมโดยสมัครใจ ไม่ตีตรา และประสานบริการเมื่อจำเป็น กิจกรรมไม่แทนการรักษา'];
  if (ids.has('MAIN-07')) required.push('รายงานและภาพสรุปเป็นข้อมูลประกอบ ไม่ใช่แบบประเมินรายบุคคล');
  if (scenarios.some(s => s.audienceCode === 'university')) required.push('ให้ทีมอุดมศึกษาช่วยปรับใช้ คู่มือโรงเรียนไม่ใช่แนวทางเฉพาะของมหาวิทยาลัย');
  if (ids.has('GUIDE-01')) required.push('ร่วมกำหนดนโยบายโดยคุ้มครองสิทธิผู้เรียน ไม่ใช้การลงโทษเป็นจุดเริ่ม');
  if (ids.has('GUIDE-02')) required.push('ใช้สื่อให้ตรงวัยและเป้าหมายการเรียนรู้ ไม่สาธิตวิธีใช้ผลิตภัณฑ์');
  if (ids.has('GUIDE-03')) required.push('ให้ผู้ใหญ่รับผิดชอบงานพื้นที่ ไม่ให้เด็กตรวจค้นหรือเผชิญหน้าผู้อื่น');
  if (ids.has('GUIDE-04')) required.push('มีครูพี่เลี้ยง ไม่มอบหมายให้แกนนำจับผิดเพื่อนหรือตรวจค้น และดูแลภาระงาน');
  if (first.packageId === 'PK-EDU-CARE') required.push('คุยเป็นส่วนตัวและส่งต่อเท่าที่จำเป็น ผู้ประสานไม่วินิจฉัยหรือแนะนำยาเอง');
  const contextual: Record<string, string> = {
    'PK-EDU-POLICY': 'ใช้เสียงของผู้เรียนและข้อมูลพื้นที่ร่วมกำหนดนโยบาย แบ่งหน้าที่ และทบทวนกับทีม',
    'PK-EDU-LEARN': 'เชื่อมสื่อตามวัยกับเป้าหมายบทเรียน แล้วใช้ผลจากกิจกรรมกลับมาปรับการสอน',
    'PK-EDU-ENV': 'เชื่อมงานดูแลพื้นที่กับข้อตกลงของบ้านและชุมชน โดยมีผู้รับผิดชอบแต่ละส่วน',
    'PK-EDU-YOUTH': 'ให้เยาวชนร่วมตัดสินใจ สร้างกิจกรรม และส่งต่องานรุ่นถัดไปโดยมีครูพี่เลี้ยง',
    'PK-EDU-CARE': 'เชื่อมทีมดูแลผู้เรียน วงคุยผู้ปกครอง และผู้ประสานบริการให้ทำงานต่อกัน',
    'PK-FAM-HOME': 'เริ่มจากการฟังคนในบ้าน แล้วเลือกข้อตกลงที่ทุกคนพร้อมลองร่วมกัน',
    'PK-FAM-GROUP': 'ใช้วงเรียนรู้ให้แต่ละครอบครัวเลือกสิ่งที่จะนำกลับไปลองด้วยตนเอง',
    'PK-COM-TOGETHER': 'เชื่อมงานท้องถิ่นกับกิจกรรมครอบครัว และช่องทางประสานบริการในชุมชน',
    'PK-WRK-TOGETHER': 'เชื่อมการสนับสนุนของผู้บริหารกับหน้าที่คณะทำงานและงานประจำของพนักงาน',
    'PK-HEA-SERVICE': 'ใช้เครื่องมือเชื่อมการเฝ้าระวัง การส่งต่อ และความต่อเนื่องของบริการตามบทบาททีม',
  };
  return { cautions: [...required, ...selected.cautions], benefits: [contextual[first.packageId] || 'ใช้เครื่องมือตามลำดับและปรับวิธีทำงานร่วมกับผู้เกี่ยวข้อง', ...selected.benefits] };
}
