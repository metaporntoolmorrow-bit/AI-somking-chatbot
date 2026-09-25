import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Leaf } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI นักขับเคลื่อนพื้นที่ปลอดบุหรี่ไฟฟ้า',
  description: 'เปลี่ยนชุดเครื่องมือเป็นแผนขับเคลื่อนที่เหมาะกับพื้นที่ของคุณ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>
    <header className="site-header"><div className="container header-inner">
      <Link href="/" className="brand" aria-label="กลับหน้าแรก"><span className="brand-mark"><Leaf size={22} strokeWidth={2.5}/></span><span>พื้นที่ปลอด<br/><strong>บุหรี่ไฟฟ้า</strong></span></Link>
      <nav className="site-nav" aria-label="เมนูหลัก"><Link href="/">หน้าแรก</Link><Link href="/#how">วิธีใช้งาน</Link><Link href="/tools">คลังเครื่องมือ</Link><Link href="/#faq">คำถามที่พบบ่อย</Link></nav>
      <Link href="/plan" className="button button-dark nav-cta">เริ่มสร้างแผน <ArrowUpRight size={17}/></Link>
    </div></header>
    <main>{children}</main>
    <footer className="site-footer"><div className="container footer-inner"><div><div className="footer-brand"><Leaf size={20}/> AI นักขับเคลื่อนพื้นที่ปลอดบุหรี่ไฟฟ้า</div><p>ดูชุดแผนและเครื่องมือตามสถานะของข้อมูลที่เผยแพร่</p></div><div className="footer-links"><Link href="/tools">คลังเครื่องมือ</Link><Link href="/admin">หน้าผู้ดูแล</Link><Link href="/plan">สร้างแผน</Link></div></div></footer>
  </body></html>;
}
