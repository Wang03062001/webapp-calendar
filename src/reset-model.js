import {normalizeData} from './model.js';
import {newRegionalBook,readBook,countryOf,COUNTRIES} from './region-model.js';
import {cardDate} from './card-model.js';
import {tokyoToday} from './finance-date.js';

export const DEFAULT_TRACKING_START='2026-11-01';
// Explicit replacement only. Loading a release must never erase an account.
export function resetFinancialDocument(document,start=DEFAULT_TRACKING_START,today=tokyoToday()){
 if(!cardDate(today)||!cardDate(start)||start<'1900-01-01'||start>today)throw Error('Ngày bắt đầu theo dõi không hợp lệ.');
 const fresh=(old,country)=>{
  const next=newRegionalBook(country);
  next.trackingStart=start;
  next.years=Array.from({length:Math.min(8,10000-Number(start.slice(0,4)))},(_,i)=>Number(start.slice(0,4))+i);
  if(old.currencies)next.currencies=structuredClone(old.currencies);
  if(old.bookSettings)next.bookSettings=structuredClone(old.bookSettings);
  else if(old.currencies&&old.currencies.cash!==COUNTRIES[country].currency)delete next.bookSettings;
  if(next.bookSettings)next.bookSettings.modules.cards=false;
  // No zero balance is invented: sources stay unknown until explicitly entered.
  return next;
 };
 const old=readBook(document,'foreign'),foreign=fresh(old,countryOf(old));
 foreign.regional={vietnam:fresh(readBook(document,'vietnam'),'VN')};
 return normalizeData(foreign);
}
