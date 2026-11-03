// All authentication/finance APIs are mocked. Downloads contain synthetic data.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {excelFixture,exportAsOf} from './fixtures/excel.mjs';
import {newRegionalBook} from '../src/region-model.js';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(10000);
let data=excelFixture(),revision=1,admin=true,roleError=false,holdRole=null,user='excel-fixture',saves=0,downloads=0;
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('download',()=>downloads++);
await page.route('https://**/*',async route=>{
 const url=route.request().url();let body;
 if(url.includes('/auth/v1/logout'))body={};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('/auth/v1/user'))body={id:user,email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('calendar_is_admin')){if(holdRole)await holdRole;if(roleError){await route.fulfill({status:503,json:{code:'NETWORK'}});return;}body=admin;}
 else if(url.includes('calendar_profiles'))body=[{username:'fixture'}];
 else if(url.includes('calendar_documents'))body=[{data,revision}];
 else if(url.includes('save_calendar_document')){saves++;throw Error('Export must not write finances');}
 else throw Error('Unexpected remote: '+url);
 await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
async function date(){await page.locator('#day-select').fill(exportAsOf);await page.locator('#day-select').dispatchEvent('change');}
async function open(){await page.locator('.topbar [data-action=export]').click();await page.locator('#export-dialog').waitFor();}
async function download(json=false){
 const waiting=page.waitForEvent('download');if(json)await page.locator('#export-dialog details').evaluate(el=>el.open=true);await page.locator(json?'[data-download-json]':'[data-download-excel]').click();const result=await waiting;const bytes=await readFile(await result.path());await page.locator('#export-dialog').waitFor({state:'detached'});return {name:result.suggestedFilename(),bytes,text:bytes.toString()};
}
try{
 await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5175');await page.locator('nav [data-view=credit]').waitFor();await date();const original=structuredClone(data);
 await open();await page.screenshot({path:'/tmp/calendar-excel-desktop.png'});const adminFile=await download();assert.equal(adminFile.name,`lich-cua-toi-${exportAsOf}.xlsx`);assert.equal(adminFile.bytes.readUInt32LE(0),0x04034b50);assert.match(adminFile.text,/PRIVATE CARD PURCHASE/);assert.match(adminFile.text,/Sổ Việt Nam/);assert.match(adminFile.text,/123456.789/);assert.match(adminFile.text,/Archived cost/);assert(!/<f[\s>]/.test(adminFile.text));await import('node:fs/promises').then(fs=>fs.writeFile('/tmp/calendar-browser-export.xlsx',adminFile.bytes));
 await open();const backup=await download(true);assert(backup.name.endsWith('.json'));assert.deepEqual(JSON.parse(backup.text),original);assert.deepEqual(data,original);assert.equal(saves,0);
 console.log('PASS genuine XLSX download, full owner JSON backup, archived years, two books and no writes');
 // New typing is included as an explicitly marked draft without being submitted.
 await page.locator('[data-action=quick-expense]').click();await page.locator('.day-panel .expense-entry [data-field=title]').fill('Unsaved Excel draft');await page.locator('.day-panel .expense-entry [data-field=amount]').fill('1.234');await open();const draft=await download();assert.match(draft.text,/Unsaved Excel draft/);assert.match(draft.text,/Gồm bản nháp/);assert.equal(saves,0);assert.deepEqual(data,original);
 // Permissions are freshly checked: revocation/error must not export credit rows.
 admin=false;await open();const ordinary=await download();for(const secret of ['PRIVATE CARD PURCHASE','PRIVATE CREDIT LOAN','PRIVATE CARD NAME','PRIVATE STATEMENT NOTE'])assert(!ordinary.text.includes(secret));assert(!ordinary.text.includes('name="Sao kê thẻ"'));
 roleError=true;await open();const failedRole=await download();assert(!failedRole.text.includes('PRIVATE CARD PURCHASE'));roleError=false;
 console.log('PASS unsaved draft export, fresh role revocation and fail-closed role lookup');
 // Export from Vietnam still contains both independent books.
 await page.locator('[data-region=vietnam]').click();await date();await open();const fromVietnam=await download();assert.match(fromVietnam.text,/Sổ nước ngoài/);assert.match(fromVietnam.text,/Sổ Việt Nam/);assert.match(fromVietnam.text,/Vietnam cost/);
 // Canceling while verification is in progress never produces a late download.
 await open();let releaseCancel;holdRole=new Promise(r=>releaseCancel=r);await page.locator('[data-download-excel]').click();const beforeCancel=downloads;await page.locator('#export-dialog .dialog-close').click();releaseCancel();holdRole=null;await page.locator('#export-dialog').waitFor({state:'detached'});assert.equal(downloads,beforeCancel);
 // A popup waiting for verification cannot download after a region switch.
 await open();let release;holdRole=new Promise(r=>release=r);await page.locator('[data-download-excel]').click();const beforeSwitch=downloads;await page.locator('[data-region=foreign]').evaluate(button=>button.click());release();holdRole=null;await page.locator('#export-dialog').waitFor({state:'detached'});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(downloads,beforeSwitch);
 // Account change invalidates a retained old download button as well.
 await open();await page.locator('[data-download-excel]').evaluate(button=>window.oldExportButton=button);await page.locator('[data-action=account]').first().evaluate(button=>button.click());page.once('dialog',dialog=>dialog.accept());await page.locator('#sign-out').click();await page.locator('#export-dialog').waitFor({state:'detached'});const beforeLogout=downloads;await page.evaluate(()=>window.oldExportButton.click());assert.equal(downloads,beforeLogout);assert(await page.locator('.topbar [data-action=export]').isDisabled());
 user='other-excel-fixture';data=newRegionalBook('JP');revision=1;await page.locator('[data-action=account]').first().click();await page.locator('#auth-form [name=email]').fill('other@example.test');await page.locator('#auth-form [name=password]').fill('mock-password');await page.locator('#auth-form .account-submit').click();await page.locator('#account-dialog').waitFor({state:'hidden'});await open();const other=await download();assert(!other.text.includes('Unsaved Excel draft'));assert(!other.text.includes('Vietnam cost'));
 console.log('PASS export from either region, stale region/account checks and account isolation');
 await page.setViewportSize({width:390,height:844});await open();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#export-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:'/tmp/calendar-excel-mobile.png'});await page.locator('#export-dialog .dialog-close').click();await page.locator('[data-action=theme]').click();await open();await page.screenshot({path:'/tmp/calendar-excel-mobile-dark.png'});await download();assert.equal(saves,0);assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile light/dark and no browser errors');
}finally{await browser.close();}
