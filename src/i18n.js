import { translations } from './translations.js';
import { currencyLabel } from './preferences.js';
let language = 'vi', observer;
const originals = new WeakMap(), attributes = new WeakMap();
const languages = ['en','ja','ko','zh-TW'];
const entries = Object.entries(translations).sort(([a],[b])=>b.length-a.length);
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern = new RegExp(entries.map(([key])=>escapeRegExp(key)).join('|'),'gu');
export function t(source) {
  const text = String(source ?? '');
  const index = languages.indexOf(language);
  const translated = index < 0 ? text : text.replace(pattern,(match,offset)=> {
    // Do not replace fragments inside a longer word.
    const letter = char => char && /[\p{L}]/u.test(char);
    if (letter(text[offset-1]) && letter(match[0]) || letter(text[offset+match.length]) && letter(match.at(-1))) return match;
    return translations[match]?.[index] || match;
  });
  return translated.replaceAll('__CASH__',currencyLabel()).replaceAll('__SAVINGS__',currencyLabel('savings'));
}
const ignored = node => node.parentElement?.closest('script,style,textarea,[translate="no"],.statement-note,.debt-title h3,.credit-hero h2,.credit-purchases button>span,.expense-result-title');
function translateNode(node) {
  if (ignored(node)) return;
  const previous = originals.get(node), value = node.nodeValue;
  const source = previous && previous.output === value ? previous.source : value;
  const output = t(source); originals.set(node,{source,output}); if(output!==value)node.nodeValue=output;
}
export function translatePage() {
  if (typeof document === 'undefined') return;
  observer?.disconnect();
  const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) translateNode(walker.currentNode);
  document.querySelectorAll('[aria-label],[title],[placeholder],[aria-valuetext]').forEach(element=>{
    if(element.closest('[translate="no"]'))return;
    const record=attributes.get(element)||{};
    for(const name of ['aria-label','title','placeholder','aria-valuetext']) {
      if(!element.hasAttribute(name))continue;
      const value=element.getAttribute(name), old=record[name], source=old?.output===value?old.source:value, output=t(source);
      record[name]={source,output}; if(output!==value)element.setAttribute(name,output);
    }
    attributes.set(element,record);
  });
  observer?.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','aria-valuetext']});
}
export function setLanguage(value) { language=['vi',...languages].includes(value)?value:'vi'; if(typeof document!=='undefined'){document.documentElement.lang=language;document.title=t('Lịch của tôi');translatePage();} }
export function startTranslations(value) { observer=new MutationObserver(translatePage); setLanguage(value); document.addEventListener('invalid',event=>{ if(event.target.validity?.customError)event.target.setCustomValidity(t(event.target.validationMessage)); },true); }
