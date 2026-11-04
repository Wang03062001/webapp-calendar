import {cardDate,shiftMonth} from './card-model.js';
export const tokyoToday=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function previousDate(date){if(!cardDate(date))throw Error('Ngày không hợp lệ.');return new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10);}
// An explicit holiday list is required to call a proposal fully verified.
// Weekend handling is deterministic; a missing holiday calendar is disclosed.
export function salaryDate(month,{holidays=null,receivedOn}={}){
  if(receivedOn){if(!cardDate(receivedOn))throw Error('Ngày nhận lương không hợp lệ.');return {date:receivedOn,verified:true,manual:true};}
  if(!cardDate(month+'-15')||holidays!==null&&(!Array.isArray(holidays)||holidays.some(d=>!cardDate(d))))throw Error('Lịch nghỉ không hợp lệ.');
  let date=month+'-15';
  while([0,6].includes(new Date(date+'T00:00:00Z').getUTCDay())||holidays?.includes(date))date=previousDate(date);
  return {date,verified:holidays!==null,manual:false};
}
export function plannedSalaryCycle(month,options={}){
  const start=salaryDate(month,options),nextMonth=shiftMonth(month,1);if(!nextMonth)return {start:start.date,end:'9999-12-31',nextPayday:null,verified:false};const next=salaryDate(nextMonth,{holidays:options.holidays??null,receivedOn:options.nextReceivedOn});
  return {start:start.date,end:previousDate(next.date),nextPayday:next.date,verified:start.verified&&next.verified};
}
