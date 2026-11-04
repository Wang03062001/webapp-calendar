// JSON keeps the existing numeric format. All ledger arithmetic uses integer
// thousandths, preserving legacy fractional records without rounding them away.
export function moneyUnits(value){
  const text=String(value??0).replace(/,/g,'').trim(),match=/^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(text);
  if(!match)throw Error('Số tiền không hợp lệ hoặc vượt độ chính xác được hỗ trợ.');
  return (match[1]?-1n:1n)*(BigInt(match[2])*1000n+BigInt((match[3]||'').padEnd(3,'0')));
}
export function unitsMoney(units){
  const magnitude=units<0n?-units:units;
  const result=Number(`${units<0n?'-':''}${magnitude/1000n}.${String(magnitude%1000n).padStart(3,'0')}`);
  if(!Number.isFinite(result)||Math.abs(result)>Number.MAX_SAFE_INTEGER||moneyUnits(result)!==units)throw Error('Tổng số tiền vượt giới hạn tính toán an toàn.');
  return result;
}
export const sumMoney=values=>unitsMoney(Array.from(values).reduce((sum,value)=>sum+moneyUnits(value),0n));
export const addMoney=(...values)=>sumMoney(values);
export const subtractMoney=(value,...others)=>unitsMoney(others.reduce((sum,other)=>sum-moneyUnits(other),moneyUnits(value)));
export function wholeCurrencyMoney(value,currency='JPY',legacyValue){
  const units=moneyUnits(value);
  if(['JPY','VND'].includes(currency)&&units%1000n!==0n&&value!==legacyValue)throw Error('JPY và VND phải nhập số nguyên; số lẻ lịch sử được giữ nguyên.');
  return unitsMoney(units);
}
