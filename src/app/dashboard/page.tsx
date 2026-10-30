import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import localFont from 'next/font/local';
import {getAdmin} from '@/lib/supabase/admin';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {dashboardDemoPreview} from '@/lib/dashboard-demo.mjs';
import type {DashboardPeriod,DashboardReport} from '@/lib/dashboard-types';
import {DashboardView} from './dashboard-view';
import './dashboard.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'แดชบอร์ดสำหรับ สสส. | พื้นที่ปลอดบุหรี่ไฟฟ้า',robots:{index:false,follow:false}};
const prompt=localFont({src:[{path:'../../../public/fonts/dashboard/Prompt-Medium.ttf',weight:'500'},{path:'../../../public/fonts/dashboard/Prompt-SemiBold.ttf',weight:'600'}],variable:'--font-dashboard-heading',display:'swap'});
const sarabun=localFont({src:[{path:'../../../public/fonts/dashboard/Sarabun-Regular.ttf',weight:'400'},{path:'../../../public/fonts/dashboard/Sarabun-SemiBold.ttf',weight:'600'}],variable:'--font-dashboard-body',display:'swap'});

export default async function DashboardPage(){
  if(!isSupabaseConfigured()||!await getAdmin())redirect('/login?next=%2Fdashboard');
  const reports=Object.fromEntries(([30,14,7] as const).map(days=>[days,dashboardDemoPreview(days)])) as Record<DashboardPeriod,DashboardReport>;
  return <div className={`ssdash-screen ${prompt.variable} ${sarabun.variable}`}><DashboardView reports={reports}/></div>;
}
