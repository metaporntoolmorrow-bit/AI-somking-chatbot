// The new documents are implementation guides, not extra clinical protocols.
// Guide 3 explicitly covers schools, families, and communities. The others are education-specific.
export const componentGuides = [
  {number:1,code:'GUIDE-01',componentCode:'C1',shortTitle:'แนวทางจัดนโยบายและทีมงาน',title:'แนวทางกำหนดนโยบายและระบบบริหารงานควบคุมบุหรี่ไฟฟ้าในสถานศึกษา',scope:{EDU:['C1']},pages:44,sourcePages:[6,7,8,9,10,11,12,13,14,22,23,24,28]},
  {number:2,code:'GUIDE-02',componentCode:'C2',shortTitle:'แนวทางออกแบบการเรียนรู้',title:'แนวทางบูรณาการเรื่องบุหรี่ไฟฟ้าในวิชาสอนและกิจกรรมนอกหลักสูตร',scope:{EDU:['C2']},pages:44,sourcePages:[6,7,8,9,10,11,13,17,20,29,30,31]},
  {number:3,code:'GUIDE-03',componentCode:'C3',shortTitle:'แนวทางเชื่อมพื้นที่ บ้าน และชุมชน',title:'แนวทางสร้างสภาพแวดล้อมที่ช่วยปกป้องเด็กและเยาวชนในสถานศึกษา ครอบครัว และชุมชน',scope:{EDU:['C3'],FAM:['C3'],COM:['C3']},pages:17,sourcePages:[2,3,4,5,6,7,8,9,10,11,12,13]},
  {number:4,code:'GUIDE-04',componentCode:'C4',shortTitle:'แนวทางเสริมพลังแกนนำเยาวชน',title:'แนวทางเสริมพลังและสร้างการมีส่วนร่วมของเยาวชน',scope:{EDU:['C4']},pages:20,sourcePages:[2,3,4,5,6,7,8,9,10,11,12,13]},
].map(guide=>({...guide,sourceNumber:null,category:'component_guidance',kind:'แนวทางการขับเคลื่อน',source:'เอกสารองค์ประกอบที่ผู้ว่าจ้างส่งเพิ่มเติม',trackerStatus:'เอกสารแนวทางประกอบการดำเนินงาน',availableContent:'source_files',editorialNote:guide.number===3?'เลือกเฉพาะส่วนที่ตรงกับพื้นที่และทำร่วมกับผู้รับผิดชอบ ไม่มอบหมายให้เด็กเผชิญหน้าหรือตรวจค้นผู้อื่น':'สังเคราะห์จากงานสถานศึกษา ใช้ร่วมกับทีมผู้รับผิดชอบและปรับตามวัยของผู้เรียน'}));

export const frameworkEvidence = {
  conceptPages:[9,10,11,12,13,14,15,16,17,18,19,20,25],
  trackerPages:[2,3,4],
  mappingMethod:'Match by tool title and supplied file, never by the slide number: the concept lists 19 main + 20 supplementary while the tracker lists 18 + 21.',
  missingDocuments:['ยังไม่มีเอกสารองค์ประกอบที่ 5 แยกต่างหาก ใช้โครงร่าง คอนเซปต์ และคู่มือที่มีอยู่สำหรับการประสานดูแลและส่งต่อ','ยังไม่มีไฟล์คู่มืออุดมศึกษาเฉพาะ จึงต้องปรับแนวทางร่วมกับทีมอุดมศึกษา','เครื่องมือเสริม 21 ชิ้นยังไม่เปิดการจับคู่หากไม่มีไฟล์จริง'],
};
