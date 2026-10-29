import 'server-only';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';

type FeedbackClaims={id:string;releaseId:string;scenarioId:string;expiresAt:number};
function signature(payload:string){
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!secret)throw new Error('Feedback service is not configured');
  return createHmac('sha256',secret).update(`plan-feedback-v1:${payload}`).digest('base64url');
}
export function createFeedbackToken(releaseId:string,scenarioId:string){
  const payload=Buffer.from(JSON.stringify({id:randomUUID(),releaseId,scenarioId,expiresAt:Date.now()+86400000} satisfies FeedbackClaims)).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function readFeedbackToken(token:string):FeedbackClaims|null{
  try{
    if(token.length>1500)return null;
    const [payload,mac,...extra]=token.split('.');
    if(!payload||!mac||extra.length)return null;
    const actual=Buffer.from(mac,'base64url'),expected=Buffer.from(signature(payload),'base64url');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
    const claims=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as FeedbackClaims;
    if(!/^[a-f0-9-]{36}$/.test(claims.id)||!/^[a-f0-9-]{36}$/.test(claims.releaseId)||!/^REAL4-\d{4}$/.test(claims.scenarioId)||!Number.isFinite(claims.expiresAt)||claims.expiresAt<Date.now())return null;
    return claims;
  }catch{return null;}
}
