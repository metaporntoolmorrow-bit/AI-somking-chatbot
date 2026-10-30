import {getAdmin} from '@/lib/supabase/admin';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {dashboardCsv} from '@/lib/dashboard-demo.mjs';

export const runtime='nodejs';
export async function GET(request:Request){
  if(!isSupabaseConfigured())return Response.json({error:'ยังเชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่ภายหลัง'},{status:503});
  if(!await getAdmin())return Response.json({error:'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  const params=new URL(request.url).searchParams;
  const period=params.get('period')||'30';
  if(params.getAll('period').length>1||!['7','14','30'].includes(period))return Response.json({error:'เลือกช่วงเวลา 7, 14 หรือ 30 วัน'},{status:400});
  const filename=`สรุปการใช้งาน-ข้อมูลตัวอย่าง-${period}วัน.csv`;
  return new Response(dashboardCsv(Number(period)),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="SSS-dashboard-example-${period}days.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
