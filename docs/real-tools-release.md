# การเผยแพร่ชุดเครื่องมือจริง

ชุดข้อมูล: `real-tools-2026-10-26-v1` — 5 พื้นที่, 14 ชุดแผน, 18 เครื่องมือ, 179 เส้นทางคำตอบ

เก็บคำตอบที่ใช้จับคู่ครบ 5 ด้าน โดยแสดง 4 คำถามหลักตามลำดับ พื้นที่ → บทบาท → เรื่องที่อยากเริ่มทำ → กลุ่มเป้าหมาย ส่วนคำถามป้องกัน/ดูแลคนที่ใช้อยู่แล้วแสดงเฉพาะเมื่อมีหลายตัวเลือก ทุกเส้นทางปัจจุบันอนุมานค่านี้จากเรื่องที่เลือกได้ กลุ่มเป้าหมายเลือกได้หลายข้อและมีปุ่มยืนยัน ข้ออื่นเลือกแล้วไปต่อทันที

## แหล่งข้อมูลและไฟล์

- กฎต้นทาง: `presets/real-tools-v1/source-rules.mjs`
- ข้อมูลที่ตรวจสอบแล้ว: `presets/real-tools-v1/presets.json`
- ไฟล์ขนาดไม่เกิน 6,000,000 ไบต์ 10 ไฟล์: Supabase Storage ถังส่วนตัว `real-tool-assets`
- ไฟล์ขนาดใหญ่: Google Drive 25 ลิงก์ที่ตรวจสิทธิ์ `anyone:reader` แล้ว รวมสำเนาคู่มือขนาดใหญ่ที่แบ่งครบ 224 หน้า
- ZIP สร้างล่วงหน้า 49 ชุดที่ไม่ซ้ำ ครอบคลุมการเลือกกลุ่มเป้าหมาย 864 แบบ รวมไฟล์เดิมและ `ลิงก์เครื่องมือ.txt` เมื่อหลายกลุ่มใช้เครื่องมือเดียวกันจะรวมเพียงครั้งเดียว
- เครื่องมือเสริม 21 รายการที่ยังไม่มีไฟล์ไม่ถูกนำมาอ้างว่าดาวน์โหลดได้

ไฟล์ต้นฉบับและไฟล์ทดสอบไม่ขึ้น Git/Vercel ใช้ Storage และ Drive สำหรับไฟล์จริง API ตรวจแผนและกลุ่มที่เลือกก่อนออกลิงก์ Storage อายุ 5 นาที แล้วเปลี่ยนทางให้ดาวน์โหลดจาก Storage โดยตรง

## ขั้นตอนนำเข้าและตรวจสอบ

ต้องตั้ง `.env.local` ให้มี URL, public key และ server secret ของ Supabase ห้ามส่ง server secret ไปเบราว์เซอร์

```powershell
node scripts/build-real-tool-presets.mjs --require-drive --require-public
node --env-file=.env.local scripts/release-real-tools.mjs --stage
$env:CONTENT_PREVIEW_VERSION='real-tools-2026-10-26-v1'
npm.cmd run dev
# อีก terminal
node scripts/test-real-tools.mjs
node --env-file=.env.local scripts/release-real-tools.mjs --verify
npm.cmd run lint
npm.cmd run build
```

`CONTENT_PREVIEW_VERSION` ใช้เฉพาะเครื่องทดสอบฝั่งเซิร์ฟเวอร์เพื่อดูฉบับร่าง ห้ามตั้งใน Production การดูเว็บปกติอ่านชุดข้อมูลที่เผยแพร่และ active ผ่านสิทธิ์สาธารณะเดิม

เผยแพร่โค้ดที่รองรับชุดใหม่ก่อน แล้วจึงสลับข้อมูล:

```powershell
node --env-file=.env.local scripts/release-real-tools.mjs --publish
$env:TEST_BASE_URL='https://ai-somking-chatbot.vercel.app'
node scripts/test-real-tools.mjs --smoke
```

การเผยแพร่เก็บผู้อนุมัติ เวลา และบันทึกการเปลี่ยนแปลงในฐานข้อมูล การอนุมัติหมายถึงเจ้าของโครงการอนุมัติให้นำขึ้นเว็บ ไม่ใช่การรับรองทางการแพทย์ แหล่งที่มาและส่วนของกฎที่จัดทำเพิ่มเติมยังเก็บอยู่ใน `source_payload`

## การย้อนกลับ

ตัวนำเข้าจะไม่เขียนทับ release หรือไฟล์รุ่นเก่า และไม่อนุญาต stage ทับรุ่นที่เผยแพร่แล้ว เก็บค่า active ก่อนเปลี่ยนไว้ใน `.prd-analysis/real-tools-release.json` ซึ่งไม่ขึ้น Git

```powershell
node --env-file=.env.local scripts/release-real-tools.mjs --rollback
```

คำสั่งนี้คืนค่า active เดิม โดยเก็บข้อมูลและไฟล์รุ่นใหม่ไว้ตรวจสอบ หากแก้เนื้อหาในอนาคตให้ใช้ version label ใหม่ นำเข้าและทดสอบก่อนสลับอีกครั้ง ส่วนระบบสมาชิกและการเข้าสู่ระบบไม่เกี่ยวกับกระบวนการนี้
