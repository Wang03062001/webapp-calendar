export const COUNTRIES={JP:{name:'Nhật Bản',currency:'JPY'},GB:{name:'Anh',currency:'GBP'},KR:{name:'Hàn Quốc',currency:'KRW'},CN:{name:'Trung Quốc',currency:'CNY'},VN:{name:'Việt Nam',currency:'VND'}};
export const MODULES={salary:'Lương & thưởng',receipts:'Tiền vào khác',savings:'Tiết kiệm',debts:'Khoản vay',receivables:'Khoản phải thu',cards:'Thẻ & sao kê',safety:'Nền tảng an toàn'};
export const REGIONS=['foreign','vietnam'];
export function normalizeRegionVisibility(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!REGIONS.includes(k))||REGIONS.some(k=>typeof raw[k]!=='boolean'))throw Error('Danh sách khu vực không hợp lệ.');
 if(!REGIONS.some(k=>raw[k]))throw Error('Cần giữ ít nhất một khu vực đang sử dụng.');
 return {foreign:raw.foreign,vietnam:raw.vietnam};
}
export const availableRegions=document=>REGIONS.filter(k=>document.regionVisibility?.[k]!==false);
export function setRegionVisible(document,region,visible){
 if(!REGIONS.includes(region)||typeof visible!=='boolean')throw Error('Khu vực không hợp lệ.');
 const next=structuredClone(document);
 next.regionVisibility=normalizeRegionVisibility({...Object.fromEntries(REGIONS.map(k=>[k,document.regionVisibility?.[k]!==false])),[region]:visible});
 return next;
}
export const regionLabel=(document,region)=>{
 const book=readBook(document,region),country=countryOf(book);
 return `${region==='vietnam'?'Việt Nam':country==='VN'?'Sổ cũ (Việt Nam)':COUNTRIES[country].name} · ${book.currencies?.cash||'JPY'}`;
};
export const defaultModules=country=>Object.fromEntries(Object.keys(MODULES).map(key=>[key,key!=='salary'||country!=='VN']));
export const countryOf=book=>book.bookSettings?.country||({JPY:'JP',GBP:'GB',KRW:'KR',CNY:'CN',VND:'VN'}[book.currencies?.cash]||'JP');
export const moduleEnabled=(book,key)=>book.bookSettings?.modules?.[key]??defaultModules(countryOf(book))[key];
export const simpleCards=book=>Boolean(book.bookSettings)&&countryOf(book)!=='JP';
export function normalizeBookSettings(raw){
 if(!raw||!Object.hasOwn(COUNTRIES,raw.country))throw Error('Khu vực không hợp lệ.');
 const modules=defaultModules(raw.country);
 if(raw.modules!==undefined){if(!raw.modules||typeof raw.modules!=='object'||Array.isArray(raw.modules))throw Error('Chức năng không hợp lệ.');for(const key of Object.keys(MODULES))if(raw.modules[key]!==undefined){if(typeof raw.modules[key]!=='boolean')throw Error('Chức năng không hợp lệ.');modules[key]=raw.modules[key];}}
 return {country:raw.country,modules};
}
export const bookHasRecords=book=>Object.values(book.days).some(d=>d.items.length||d.note)||Object.keys(book.incomes).length||Object.keys(book.savings).length||Object.keys(book.goals).length||book.debts.length||book.accounts||book.cards||book.receipts?.length||book.receivables?.length||book.safety;
export function newRegionalBook(country){const currency=COUNTRIES[country].currency;return {version:2,years:Array.from({length:8},(_,i)=>2026+i),days:{},incomes:{},savings:{},goals:{},debts:[],currencies:{cash:currency,savings:currency},bookSettings:{country,modules:defaultModules(country)}};}
export function readBook(document,region){
 if(region==='vietnam')return structuredClone(document.regional?.vietnam||newRegionalBook('VN'));
 const {regional,regionVisibility,...book}=document;return structuredClone(book);
}
export function writeBook(document,region,book){
 if(book.regional||book.regionVisibility)throw Error('Sổ khu vực không hợp lệ.');
 if(region==='vietnam')return {...document,regional:{vietnam:structuredClone(book)}};
 return {...structuredClone(book),...(document.regional?{regional:structuredClone(document.regional)}:{}),...(document.regionVisibility?{regionVisibility:structuredClone(document.regionVisibility)}:{})};
}
export function configureBook(book,country,modules){
 if(!Object.hasOwn(COUNTRIES,country))throw Error('Khu vực không hợp lệ.');
 const expected=COUNTRIES[country].currency;
 if(bookHasRecords(book)&&(countryOf(book)!==country||(book.currencies?.cash||'JPY')!==expected))throw Error('Không thể đổi quốc gia khi sổ đã có dữ liệu. Dữ liệu cũ được giữ nguyên.');
 const next=structuredClone(book);next.bookSettings=normalizeBookSettings({country,modules});
 if(!bookHasRecords(book))next.currencies={cash:expected,savings:expected};
 return next;
}
