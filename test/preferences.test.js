import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,monthSummary,formatAmount} from '../src/model.js';
import {normalizeCurrencies,setCurrencies,currencyLabel,groupMoneyInput,finishMoneyInput} from '../src/preferences.js';
import {translations} from '../src/translations.js';
import {t,setLanguage} from '../src/i18n.js';
test('currency groups survive normalization without converting monetary records',()=>{
 const data=emptyData();data.incomes['2026-01']={salary:1234.5,bonus:0,note:''};data.savings['2026-01']=100;data.goals['2026']=1200;data.currencies={cash:'USD',savings:'TWD'};
 const copy=normalizeData(data);assert.deepEqual(copy.currencies,data.currencies);assert.deepEqual(monthSummary(copy,2026,0),monthSummary(data,2026,0));assert.equal(copy.goals['2026'],1200);assert.deepEqual(normalizeCurrencies(),{cash:'JPY',savings:'VND'});assert.throws(()=>normalizeCurrencies({cash:'BAD',savings:'USD'}));
 setCurrencies({cash:'VND',savings:'USD'});assert.equal(currencyLabel(),'VNĐ');assert.equal(currencyLabel('savings'),'USD');setCurrencies();
});
test('money grouping keeps the logical caret and optional precision',()=>{
 const input={value:'1234567',selectionStart:4,selectionEnd:4,setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
 groupMoneyInput(input);assert.equal(input.value,'1,234,567');assert.equal(input.selectionStart,5);
 input.value='12345.';input.selectionStart=input.selectionEnd=6;groupMoneyInput(input);assert.equal(input.value,'12,345.');assert.equal(input.selectionStart,7);
 input.value='1234.005';input.selectionStart=input.selectionEnd=8;groupMoneyInput(input);assert.equal(input.value,'1,234.005');assert.equal(formatAmount(1000000),'1,000,000');assert.equal(formatAmount(12.5),'12.5');assert.equal(formatAmount(12.005),'12.005');
});
test('all catalog strings have complete English Japanese Korean and Traditional Chinese entries',()=>{
 for(const [key,values] of Object.entries(translations)){assert.equal(values.length,4,key);assert.ok(values.every(Boolean),key);}
 for(const language of ['en','ja','ko','zh-TW']){setLanguage(language);assert.notEqual(t('Thu chi & kỳ lương'),'Thu chi & kỳ lương');assert.notEqual(t('Đổi email'),'Đổi email');}
 setLanguage('vi');setCurrencies({cash:'USD',savings:'TWD'});assert.equal(t('Thu nhập __CASH__ / Tiết kiệm __SAVINGS__'),'Thu nhập USD / Tiết kiệm TWD');setCurrencies();
});

test('all money dialogs strip trailing zero decimals without changing fractional values',()=>{
 const input={value:'1,234.000',validity:{valid:true}};finishMoneyInput(input);assert.equal(input.value,'1,234');
 input.value='1,234.050';finishMoneyInput(input);assert.equal(input.value,'1,234.05');
 input.value='wrong';input.validity.valid=false;finishMoneyInput(input);assert.equal(input.value,'wrong');
});
