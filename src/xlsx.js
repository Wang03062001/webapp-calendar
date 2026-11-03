// Minimal OOXML writer for local reports: ZIP STORE, inline text and numeric
// cells only. No formulas, macros, external resources or runtime dependencies.
const encoder = new TextEncoder();
const xml = value => String(value).replace(/_x[0-9a-f]{4}_/gi, match => '_x005F_' + match.slice(1))
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, char => `_x${char.charCodeAt(0).toString(16).padStart(4,'0')}_`)
  .replace(/[&<>"'\r]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;','\r':'&#13;'}[char]));
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const crcTable = Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function concat(parts){const length=parts.reduce((sum,part)=>sum+part.length,0);if(length>0xffffffff)throw Error('File Excel vượt giới hạn kích thước.');const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;}
function header(length,fields){const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);for(const [offset,size,value]of fields)view[size===2?'setUint16':'setUint32'](offset,value,true);return bytes;}
function zip(files){
  const local=[],central=[];let offset=0;
  for(const [path,source]of files){
    const name=encoder.encode(path),body=encoder.encode(source),crc=crc32(body);
    local.push(header(30,[[0,4,0x04034b50],[4,2,20],[6,2,0x800],[10,2,0],[12,2,33],[14,4,crc],[18,4,body.length],[22,4,body.length],[26,2,name.length]]),name,body);
    central.push(header(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,0x800],[12,2,0],[14,2,33],[16,4,crc],[20,4,body.length],[24,4,body.length],[28,2,name.length],[42,4,offset]]),name);
    offset+=30+name.length+body.length;
  }
  const directory=concat(central);
  return concat([...local,directory,header(22,[[0,4,0x06054b50],[8,2,files.length],[10,2,files.length],[12,4,directory.length],[16,4,offset]])]);
}
const columnName = index => {let name='';for(index++;index;index=Math.floor((index-1)/26))name=String.fromCharCode(65+(index-1)%26)+name;return name;};
function worksheet(rows){
  if(!rows.length||rows.length>1048576||rows.some(row=>row.length>16384))throw Error('Dữ liệu vượt giới hạn dòng/cột của Excel.');
  const columns=rows.reduce((max,row)=>Math.max(max,row.length),1);
  const cells=rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>{
    const ref=columnName(c)+(r+1);if(value==null)return '';
    if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Số tiền xuất Excel không hợp lệ.');return `<c r="${ref}" s="${r===0?1:2}" t="n"><v>${value}</v></c>`;}
    const text=String(value);if(text.length>32767)throw Error('Nội dung ô vượt giới hạn của Excel. Hãy dùng bản sao lưu JSON.');
    return `<c r="${ref}" s="${r===0?1:0}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return declaration+`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(columns-1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${Array.from({length:columns},(_,c)=>`<col min="${c+1}" max="${c+1}" width="${Math.min(48,Math.max(16,String(rows[0][c]||'').length+4))}" customWidth="1"/>`).join('')}</cols><sheetData>${cells}</sheetData><autoFilter ref="A1:${columnName(columns-1)}${rows.length}"/></worksheet>`;
}
const styles=declaration+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.###"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF654496"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"><alignment wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
export function writeXlsx(sheets){
  const names=new Set();if(!sheets.length||sheets.length>1000)throw Error('Danh sách trang Excel không hợp lệ.');
  for(const sheet of sheets){const key=sheet.name.toLowerCase();if(!sheet.name||sheet.name.length>31||/[\\/?*\[\]:]/.test(sheet.name)||names.has(key))throw Error('Tên trang Excel không hợp lệ.');names.add(key);}
  const files=[['[Content_Types].xml',declaration+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels',declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml',declaration+`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet,i)=>`<sheet name="${xml(sheet.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',declaration+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],['xl/styles.xml',styles]];
  sheets.forEach((sheet,i)=>files.push([`xl/worksheets/sheet${i+1}.xml`,worksheet(sheet.rows)]));
  return zip(files);
}
