import {readFeedbackToken} from '@/lib/feedback-token';
import {createServiceClient} from '@/lib/supabase/service';

export const runtime='nodejs';
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'ส่งผลประเมินจากหน้าเว็บไซต์นี้เท่านั้น'},{status:403});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'รูปแบบข้อมูลไม่ถูกต้อง'},{status:415});
  const body=await request.text();
  if(Buffer.byteLength(body)>5000)return Response.json({error:'ข้อความยาวเกินไป'},{status:413});
  let input;
  try{input=JSON.parse(body);}catch{return Response.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});}
  if(!input||typeof input!=='object'||!Number.isInteger(input.rating)||input.rating<1||input.rating>5||typeof input.comment!=='string'||input.comment.length>1000||typeof input.token!=='string')return Response.json({error:'เลือกคะแนน 1–5 และเขียนข้อเสนอแนะไม่เกิน 1,000 ตัวอักษร'},{status:400});
  const claims=readFeedbackToken(input.token);
  if(!claims)return Response.json({error:'แบบประเมินหมดอายุแล้ว กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง'},{status:400});
  try{
    const record={version:1,releaseId:claims.releaseId,scenarioId:claims.scenarioId,rating:input.rating,comment:input.comment.trim(),createdAt:new Date().toISOString()};
    const result=await createServiceClient().storage.from('plan-feedback').upload(`${claims.releaseId}/${claims.id}.json`,Buffer.from(JSON.stringify(record)),{contentType:'application/json',upsert:false});
    if(result.error&&result.error.message!=='The resource already exists'&&String((result.error as {statusCode?:string}).statusCode)!=='409')return Response.json({error:'ยังบันทึกไม่ได้ ลองส่งอีกครั้งได้โดยไม่เสียข้อความเดิม'},{status:503});
    return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'ยังบันทึกไม่ได้ กรุณาลองอีกครั้ง'},{status:503});}
}
