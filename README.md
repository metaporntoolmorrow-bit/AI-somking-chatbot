# AI นักขับเคลื่อนพื้นที่ปลอดบุหรี่ไฟฟ้า

เว็บ Next.js 16 + TypeScript + Tailwind ที่อ่านข้อมูลจริงจาก Supabase ตาม [database.md](./database.md)

## ตั้งค่าและรัน

1. ติดตั้งแพ็กเกจ: `npm install`
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ URL, publishable/anon key และ secret/service-role key ของ Supabase. เก็บ secret เฉพาะฝั่ง Server; `.env.local` ถูก ignore
3. รัน [migration แรก](./supabase/migrations/202609240001_initial_content.sql) ใน Supabase SQL Editor หากยังไม่เคยรัน
4. รัน `npm run dev` และเปิด `http://localhost:3000`

หน้า `/admin` ต้องล็อกอินจริงและอ่านสิทธิ์จาก `profiles`. บัญชี Admin1 คนแรกสร้างได้ด้วย `npm run admin:create -- email@example.com` หลังมี migration. หากสร้างบัญชี Auth แล้ว ใช้ `npm run admin:bootstrap -- email@example.com` แทน. คำสั่งเหล่านี้ใช้ได้เฉพาะก่อนมี Admin1

## แหล่งข้อมูลของแต่ละหน้า

- หน้าแรกและ `/tools`: อ่านรุ่น `published + approved` หรือรุ่นที่เจ้าของโครงการเปิดให้ใช้งานโดยเฉพาะ
- `/plan`: ตัวเลือก 5 มิติมาจากสถานการณ์ในรุ่นที่เปิดให้เข้าถึงจาก Supabase
- `/result`: แสดงสถานการณ์และเครื่องมือจากรุ่นเดียวกัน; ปุ่ม PDF แสดงเมื่อข้อมูลแผนครบ และปุ่ม ZIP แสดงเมื่อ PDF เครื่องมือของแผนนั้นครบทุกชิ้น
- `/admin`: จำนวนและสถานะรุ่นล่าสุดจาก Supabase
- `/admin/presets`: อ่านและบันทึก packages ฉบับร่างจริง พร้อม audit และการตรวจแก้ชนกัน
- `/admin/source`: ตรวจข้อมูลที่นำเข้าจาก Excel และเปิด PDF เครื่องมือจาก Storage ส่วนตัว (ผู้ดูแลเท่านั้น)
- `/admin/members`: แสดงบัญชีและสิทธิ์จริงสำหรับ Admin1

นำเข้าไฟล์ต้นทางทั้งสองเล่มและ PDF 25 ไฟล์เป็นข้อมูลฉบับร่างใน Supabase แล้ว ด้วย `node --env-file=.env.local scripts/import-source-content.mjs --write` (ตรวจไฟล์โดยไม่เขียนด้วย `node scripts/import-source-content.mjs`). คำสั่งป้องกันการนำเข้าซ้ำด้วยค่า hash ของไฟล์ต้นทาง. PDF อยู่ใน bucket ส่วนตัว `source-tool-cards`. ตามคำขอของเจ้าของโครงการ หน้าเว็บและไฟล์ส่งออกที่ระบบสร้างไม่แสดงข้อความเตือนเรื่องสถานะจำลองแล้ว แต่สถานะในฐานข้อมูลยังเป็น `draft + simulated` และ PDF ต้นฉบับยังคงข้อความภายในไฟล์ตามที่ได้รับมา

หากยังไม่มีรุ่นที่เผยแพร่หรือเปิดทดลอง หน้าสาธารณะจะแสดงสถานะว่างตามจริง ไม่มีการใช้ข้อมูลตัวอย่างในโค้ดเป็น fallback. ไฟล์ `src/data/catalog.json` และ PDF ตัวอย่างใน `public/tools/` ถูกถอดออกแล้ว

เส้นทาง `/api/tool-bundle/[scenario]` สร้าง ZIP ขณะดาวน์โหลดจาก PDF ใน private Storage เฉพาะเครื่องมือที่จับคู่กับสถานการณ์นั้น และใส่ `รายการไฟล์.txt`. แผนที่ไม่มีเครื่องมือหรือไฟล์ไม่ครบจะไม่แสดงปุ่ม ZIP และ API ไม่ส่งไฟล์ว่าง

**ยังไม่เปิดใช้:** การอนุมัติและเผยแพร่ release จาก UI, การเชิญหรือแก้บทบาทสมาชิกจาก UI, การบันทึก Guest session/แผน/Feedback, งาน export ถาวรพร้อมประวัติ และไฟล์คู่มือที่รับรองแล้ว. ส่วนเหล่านี้ต้องมี schema และ workflow ตาม `database.md` ก่อน

## ตรวจโค้ด

```bash
npm run typecheck
npm run lint
npm run build
```
