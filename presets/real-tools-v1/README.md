# ใช้งาน preset ชุดเครื่องมือจริง

อ่านภาพรวมที่ [preset-new-tools.md](../../preset-new-tools.md) และแก้กฎที่ source-rules.mjs แล้วสร้างข้อมูลซ้ำด้วย node scripts/build-real-tool-presets.mjs

```js
import { readFile } from 'node:fs/promises';
import { resolvePreset, buildDownloadManifest, optionsFor } from './presets/real-tools-v1/resolver.mjs';
const preset = JSON.parse(await readFile('./presets/real-tools-v1/presets.json','utf8'));
const answers = { settingCode:'EDU', packageId:'PK-EDU-C2', roleCode:'teacher', level:'prevention', audienceCodes:['primary_lower','primary_upper'] };
const result = resolvePreset(preset,answers); // แผนแยกสองกลุ่ม
const files = buildDownloadManifest(preset,answers); // ไฟล์เดียวกันรวมครั้งเดียว
const next = optionsFor(preset,{settingCode:'FAM'});
```

คำตอบไม่ครบหรือชุดคำตอบที่ไม่รองรับจะได้ error โดยไม่แอบเลือกเส้นทางใกล้เคียงแทน

สร้าง ZIP ตัวอย่าง: node scripts/build-real-tool-bundle.mjs --scenario REAL-0001

สถานะ working_draft หมายถึงกฎบทบาทและการประกอบแผนจัดทำใหม่จากบริบท ไม่ได้เปลี่ยนสถานะรับรองเนื้อหาใน production อัตโนมัติ

## บทสนทนาที่ปรับแล้ว

ดู questions.csv และ chat-preview.md สำหรับข้อความที่ผู้ใช้เห็น โครงจับคู่ยังเก็บคำตอบ 5 ด้าน แต่ question level มี askWhen=multiple_options จึงไม่ต้องให้ผู้ใช้กดซ้ำเมื่อมีเป้าหมายแบบเดียว

```js
import { conversationState, resolveConversationPreset } from './presets/real-tools-v1/conversation.mjs';
const input = { settingCode:'EDU', packageId:'PK-EDU-C2', roleCode:'teacher', audienceCodes:['primary_lower','primary_upper'] };
const state = conversationState(preset,input); // เติม level ให้จากทางเลือกที่มีจริง
const result = resolveConversationPreset(preset,input); // ผลลัพธ์เดิมสองกลุ่ม
const next = conversationState(preset,{settingCode:'FAM'}).nextQuestion;
```

หน้าเว็บที่เชื่อมภายหลังควรอ่าน choiceLabel เป็นตัวเลือกเรื่องที่อยากทำ และ title เป็นชื่อแพ็กเกจผลลัพธ์ อย่านำหัวคอลัมน์ CSV ไปแสดงเป็นคำถามโดยตรง และให้นับเฉพาะคำถามที่แสดงจริง
