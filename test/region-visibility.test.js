import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeData} from '../src/model.js';
import {readBook,writeBook,availableRegions,setRegionVisible,normalizeRegionVisibility} from '../src/region-model.js';
import {resetFinancialDocument} from '../src/reset-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {creditSnapshot} from '../src/credit-access.js';
import {reportSheets} from '../src/excel-report.js';
import {excelFixture} from '../scripts/fixtures/excel.mjs';

test('region removal is reversible metadata only; both complete books and acknowledged financial totals survive',()=>{
 const original=normalizeData(excelFixture());
 for(const region of ['foreign','vietnam']){
  const removed=normalizeData(setRegionVisible(original,region,false));
  assert.deepEqual(availableRegions(removed),[region==='foreign'?'vietnam':'foreign']);
  for(const key of ['foreign','vietnam']){
   const before=readBook(original,key),after=readBook(removed,key);
   assert.deepEqual(after,before);assert.deepEqual(creditSnapshot(after),creditSnapshot(before));
   assert.deepEqual(cashPeriodDetails(after,{year:2026,month:10,asOf:'2026-11-30',creditAllowed:true}),cashPeriodDetails(before,{year:2026,month:10,asOf:'2026-11-30',creditAllowed:true}));
  }
  assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(removed))),removed);
  const restored=setRegionVisible(removed,region,true);assert.deepEqual(availableRegions(restored),['foreign','vietnam']);
  assert.deepEqual(readBook(restored,region),readBook(original,region));
 }
});
test('ordinary book writes, country/module changes and full reset retain the chosen single-region preference',()=>{
 for(const region of ['foreign','vietnam']){
  let doc=setRegionVisible(normalizeData(excelFixture()),region,false);
  for(const key of ['foreign','vietnam']){
   const before=readBook(doc,key==='foreign'?'vietnam':'foreign'),book=readBook(doc,key);
   book.days['2026-11-05']||={note:'',items:[]};book.days['2026-11-05'].note='Synthetic draft note';
   doc=normalizeData(writeBook(doc,key,book));assert.deepEqual(readBook(doc,key==='foreign'?'vietnam':'foreign'),before);
   assert.equal(doc.regionVisibility[region],false);
  }
  assert.deepEqual(resetFinancialDocument(doc,'2026-11-01','2026-11-05').regionVisibility,doc.regionVisibility);
 }
});
test('legacy books remain visible and invalid/zero-region metadata is rejected without mutation',()=>{
 const original=normalizeData(excelFixture());assert.deepEqual(availableRegions(original),['foreign','vietnam']);assert.equal(original.regionVisibility,undefined);
 for(const raw of [null,[],false,{foreign:false,vietnam:false},{foreign:true},{foreign:'false',vietnam:true},{foreign:true,vietnam:true,other:true}])assert.throws(()=>normalizeRegionVisibility(raw));
 const single=setRegionVisible(original,'foreign',false),before=structuredClone(single);
 assert.throws(()=>setRegionVisible(single,'vietnam',false));assert.throws(()=>setRegionVisible(single,'unknown',false));assert.throws(()=>setRegionVisible(single,'vietnam',0));assert.deepEqual(single,before);
 const nested=structuredClone(original);nested.regional.vietnam.regionVisibility={foreign:false,vietnam:true};assert.throws(()=>normalizeData(nested));
});
test('Excel keeps both books with identical financial rows and unchanged credit filtering after removal',()=>{
 const original=normalizeData(excelFixture());
 for(const creditAllowed of [true,false])for(const region of ['foreign','vietnam']){
  const options={asOf:'2026-11-30',creditAllowed};
  assert.deepEqual(reportSheets(setRegionVisible(original,region,false),options),reportSheets(original,options));
 }
});
