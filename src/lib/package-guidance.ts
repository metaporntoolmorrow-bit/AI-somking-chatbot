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
  const contextual: Record<string, string> = {
    'PK-EDU-LEARN': 'เลือกสื่อตามวัย แล้วนำข้อค้นพบจากกิจกรรมกลับมาปรับงานดูแลพื้นที่ร่วมกับทีม',
    'PK-EDU-CARE': 'เชื่อมทีมดูแลผู้เรียน วงคุยผู้ปกครอง และผู้ประสานบริการให้ทำงานต่อกัน',
    'PK-FAM-HOME': 'เริ่มจากการฟังคนในบ้าน แล้วเลือกข้อตกลงที่ทุกคนพร้อมลองร่วมกัน',
    'PK-FAM-GROUP': 'ใช้วงเรียนรู้ให้แต่ละครอบครัวเลือกสิ่งที่จะนำกลับไปลองด้วยตนเอง',
    'PK-COM-TOGETHER': 'เชื่อมงานท้องถิ่นกับกิจกรรมครอบครัว และช่องทางประสานบริการในชุมชน',
    'PK-WRK-TOGETHER': 'เชื่อมการสนับสนุนของผู้บริหารกับหน้าที่คณะทำงานและงานประจำของพนักงาน',
    'PK-HEA-SERVICE': 'ใช้เครื่องมือเชื่อมการเฝ้าระวัง การส่งต่อ และความต่อเนื่องของบริการตามบทบาททีม',
  };
  return { cautions: [...required, ...selected.cautions], benefits: [contextual[first.packageId] || 'ใช้เครื่องมือตามลำดับและปรับวิธีทำงานร่วมกับผู้เกี่ยวข้อง', ...selected.benefits] };
}
