// ============================================================================
// PZE V7 - ZIM Antrag Extraktor (XFA-Extraktion + Parser)
// ============================================================================
// Reines TypeScript/Node auf Basis von zlib + crypto (keine Fremd-Lib).
// - Loest Cross-Reference- und Object-Streams selbst auf.
// - Implementiert den PDF-Standard-Sicherheitshandler (AES-128 V4/R4,
//   AES-256 V5/R6).
// - Parst die XFA-datasets zeilenweise in eine Schnittstellen-Spezifikation
//   (Projekt + Mitarbeiter + Arbeitsplan) inkl. Kontrollsummen-Selbstcheck.
//
// ASCII-only Quelldatei. Umlaute im Ergebnis (Namen, Titel) sind Laufzeitdaten.
// ============================================================================

import zlib from 'node:zlib';
import crypto from 'node:crypto';

const PAD = Buffer.from([0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,
                         0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);
const ws = (c: number) => c===32||c===10||c===13||c===9||c===12||c===0;

// ---------------------------------------------------------------------------
// PDF-String lesen (literal (..) oder hex <..>)
// ---------------------------------------------------------------------------
function readString(buf: Buffer, i: number): { bytes: Buffer; end: number } {
  if (buf[i]===0x28){
    i++; let depth=1; const out: number[]=[];
    while (depth>0 && i<buf.length){
      let c=buf[i++];
      if (c===0x5c){
        let n=buf[i++];
        if (n>=0x30 && n<=0x37){
          let oct=String.fromCharCode(n);
          for (let k=0;k<2 && buf[i]>=0x30 && buf[i]<=0x37;k++) oct+=String.fromCharCode(buf[i++]);
          out.push(parseInt(oct,8)&0xff);
        } else if (n===0x6e) out.push(10);
        else if (n===0x72) out.push(13);
        else if (n===0x74) out.push(9);
        else if (n===0x62) out.push(8);
        else if (n===0x66) out.push(12);
        else if (n===0x0d){ if (buf[i]===0x0a) i++; }
        else if (n===0x0a){}
        else out.push(n);
      } else if (c===0x28){ depth++; out.push(c); }
      else if (c===0x29){ depth--; if (depth>0) out.push(c); }
      else out.push(c);
    }
    return { bytes: Buffer.from(out), end: i };
  } else if (buf[i]===0x3c){
    i++; let hex='';
    while (buf[i]!==0x3e && i<buf.length){ const ch=String.fromCharCode(buf[i]); if (/[0-9a-fA-F]/.test(ch)) hex+=ch; i++; }
    i++;
    if (hex.length%2) hex+='0';
    return { bytes: Buffer.from(hex,'hex'), end: i };
  }
  return { bytes: Buffer.alloc(0), end: i };
}

function readIntAt(buf: Buffer, i: number): number {
  while (i<buf.length && ws(buf[i])) i++;
  let s=''; if (buf[i]===0x2d){ s='-'; i++; }
  while (i<buf.length && buf[i]>=0x30 && buf[i]<=0x39){ s+=String.fromCharCode(buf[i]); i++; }
  return parseInt(s,10);
}

// ---------------------------------------------------------------------------
// Encrypt-Parameter aus rohem Objektbereich lesen
// ---------------------------------------------------------------------------
function parseEncrypt(buf: Buffer, off: number): any {
  const start = buf.indexOf(Buffer.from('<<'), off, 'latin1');
  const end = buf.indexOf(Buffer.from('endobj'), start, 'latin1');
  const findKey = (key: string) => buf.indexOf(Buffer.from(key,'latin1'), start, 'latin1');
  const strAt = (key: string) => { let p=findKey(key); if (p<0||p>=end) return null; p+=key.length; while (ws(buf[p])) p++; return readString(buf,p).bytes; };
  const intAt = (key: string) => { let p=findKey(key); if (p<0||p>=end) return null; return readIntAt(buf,p+key.length); };
  const has = (sub: string) => { const q=buf.indexOf(Buffer.from(sub,'latin1'), start,'latin1'); return q>=0 && q<end; };
  const lengthMax = (() => { let best: number|null=null,pos=start; while(true){ const q=buf.indexOf(Buffer.from('/Length','latin1'),pos,'latin1'); if(q<0||q>=end)break; const v=readIntAt(buf,q+7); if(v!=null&&(best==null||v>best))best=v; pos=q+7; } return best; })();
  return {
    O: strAt('/O'), U: strAt('/U'), OE: strAt('/OE'), UE: strAt('/UE'),
    P: intAt('/P'), R: intAt('/R'), V: intAt('/V'), Length: lengthMax,
    aesv2: has('AESV2'), aesv3: has('AESV3'),
    encryptMetadata: !has('/EncryptMetadata false'),
  };
}

// ---------------------------------------------------------------------------
// Schluesselableitung
// ---------------------------------------------------------------------------
function fileKeyR4(enc: any, id0: Buffer): Buffer {
  const n = (enc.Length||128)/8;
  const pbuf = Buffer.alloc(4); pbuf.writeInt32LE(enc.P|0, 0);
  const md = crypto.createHash('md5');
  md.update(PAD); md.update(enc.O.subarray(0,32)); md.update(pbuf); md.update(id0);
  if (enc.R>=4 && !enc.encryptMetadata) md.update(Buffer.from([0xff,0xff,0xff,0xff]));
  let key = md.digest();
  if (enc.R>=3){ for (let k=0;k<50;k++) key = crypto.createHash('md5').update(key.subarray(0,n)).digest(); }
  return key.subarray(0,n);
}

function hash2B(pwd: Buffer, salt: Buffer, udata: Buffer): Buffer {
  let K = crypto.createHash('sha256').update(Buffer.concat([pwd,salt,udata])).digest();
  let round=0;
  while (true){
    const block = Buffer.concat([pwd, K, udata]);
    const K1 = Buffer.concat(Array(64).fill(block));
    const cipher = crypto.createCipheriv('aes-128-cbc', K.subarray(0,16), K.subarray(16,32));
    cipher.setAutoPadding(false);
    const E = Buffer.concat([cipher.update(K1), cipher.final()]);
    let sum=0; for (let k=0;k<16;k++) sum+=E[k];
    const m = sum % 3;
    K = crypto.createHash(m===0?'sha256':m===1?'sha384':'sha512').update(E).digest();
    round++;
    if (round>=64 && E[E.length-1] <= round-32) break;
  }
  return K.subarray(0,32);
}

function fileKeyR6(enc: any): Buffer {
  const keySalt = enc.U.subarray(40,48);
  const ik = hash2B(Buffer.alloc(0), keySalt, Buffer.alloc(0));
  const dec = crypto.createDecipheriv('aes-256-cbc', ik, Buffer.alloc(16));
  dec.setAutoPadding(false);
  return Buffer.concat([dec.update(enc.UE.subarray(0,32)), dec.final()]);
}

function makeCrypto(enc: any, id0: Buffer): any {
  if (enc.aesv3 || enc.V===5){
    const fk = fileKeyR6(enc);
    return { decrypt: (data: Buffer) => {
      const iv=data.subarray(0,16), ct=data.subarray(16);
      try { const d=crypto.createDecipheriv('aes-256-cbc', fk, iv); d.setAutoPadding(true); return Buffer.concat([d.update(ct), d.final()]); }
      catch { const d=crypto.createDecipheriv('aes-256-cbc', fk, iv); d.setAutoPadding(false); return Buffer.concat([d.update(ct), d.final()]); }
    }};
  }
  const fk = fileKeyR4(enc, id0);
  return { decrypt: (data: Buffer, objNum: number, gen: number) => {
    const salt = Buffer.from([0x73,0x41,0x6c,0x54]);
    const on = Buffer.from([objNum&0xff,(objNum>>8)&0xff,(objNum>>16)&0xff]);
    const gn = Buffer.from([gen&0xff,(gen>>8)&0xff]);
    const okey = crypto.createHash('md5').update(Buffer.concat([fk,on,gn,salt])).digest().subarray(0, Math.min(fk.length+5,16));
    const iv=data.subarray(0,16), ct=data.subarray(16);
    try { const d=crypto.createDecipheriv('aes-128-cbc', okey, iv); d.setAutoPadding(true); return Buffer.concat([d.update(ct), d.final()]); }
    catch { const d=crypto.createDecipheriv('aes-128-cbc', okey, iv); d.setAutoPadding(false); return Buffer.concat([d.update(ct), d.final()]); }
  }};
}

// ---------------------------------------------------------------------------
// Dict-Parser, XRef, ObjStm
// ---------------------------------------------------------------------------
function parseDict(buf: Buffer, start: number): { dict: any; end: number } {
  let i=start+2; const dict: any={};
  while (i<buf.length){
    while (i<buf.length && ws(buf[i])) i++;
    if (buf[i]===0x3e && buf[i+1]===0x3e){ i+=2; break; }
    if (buf[i]!==0x2f){ i++; continue; }
    let j=i+1, key='';
    while (j<buf.length && !ws(buf[j]) && !'/<>[]()'.includes(String.fromCharCode(buf[j]))){ key+=String.fromCharCode(buf[j]); j++; }
    i=j; while (i<buf.length && ws(buf[i])) i++;
    let val='';
    if (buf[i]===0x3c && buf[i+1]===0x3c){ let depth=0,k=i; do{ if(buf[k]===0x3c&&buf[k+1]===0x3c){depth++;k+=2;} else if(buf[k]===0x3e&&buf[k+1]===0x3e){depth--;k+=2;} else k++; }while(k<buf.length&&depth>0); val=buf.toString('latin1',i,k); i=k; }
    else if (buf[i]===0x5b){ let depth=0,k=i; do{ if(buf[k]===0x5b){depth++;k++;} else if(buf[k]===0x5d){depth--;k++;} else k++; }while(k<buf.length&&depth>0); val=buf.toString('latin1',i,k); i=k; }
    else if (buf[i]===0x28){ const r=readString(buf,i); val=buf.toString('latin1',i,r.end); i=r.end; }
    else if (buf[i]===0x2f){ let k=i+1; while (k<buf.length && !ws(buf[k]) && !'/<>[]()'.includes(String.fromCharCode(buf[k]))) k++; val=buf.toString('latin1',i,k); i=k; }
    else { let k=i; while (k<buf.length && !'/<>[\r\n'.includes(String.fromCharCode(buf[k]))) k++; val=buf.toString('latin1',i,k).trim(); i=k; }
    dict[key]=val;
  }
  return { dict, end: i };
}
const toInt = (s: any): number|null => { const m=String(s).match(/-?\d+/); return m?parseInt(m[0],10):null; };

function applyPredictor(data: Buffer, parms: string): Buffer {
  const g=(re: RegExp)=>{ const m=parms.match(re); return m?parseInt(m[1],10):null; };
  const pred=g(/Predictor\s+(\d+)/)||1, colors=g(/Colors\s+(\d+)/)||1, bpc=g(/BitsPerComponent\s+(\d+)/)||8, columns=g(/Columns\s+(\d+)/)||1;
  if (pred<10) return data;
  const bpp=Math.ceil(colors*bpc/8), rowLen=Math.ceil(colors*bpc*columns/8);
  const out=Buffer.alloc(Math.floor(data.length/(rowLen+1))*rowLen); let prev=Buffer.alloc(rowLen); let ip=0,op=0;
  while (ip+1+rowLen<=data.length){ const ft=data[ip++]; const row=Buffer.from(data.subarray(ip,ip+rowLen)); ip+=rowLen;
    for (let k=0;k<rowLen;k++){ const a=k>=bpp?row[k-bpp]:0,b=prev[k],c=k>=bpp?prev[k-bpp]:0; let v=row[k];
      if(ft===1)v=(v+a)&0xff; else if(ft===2)v=(v+b)&0xff; else if(ft===3)v=(v+Math.floor((a+b)/2))&0xff;
      else if(ft===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); v=(v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&0xff;} row[k]=v; }
    row.copy(out,op); op+=rowLen; prev=row; }
  return out;
}

function rawStreamBytes(buf: Buffer, dictEnd: number, dict: any): Buffer {
  let i=buf.indexOf(Buffer.from('stream'),dictEnd,'latin1')+6;
  if (buf[i]===0x0d) i++; if (buf[i]===0x0a) i++;
  const lenStr=String(dict['Length']||'').trim();
  if (/^\d+$/.test(lenStr)) return buf.subarray(i, i+parseInt(lenStr,10)) as Buffer;
  const e=buf.indexOf(Buffer.from('endstream'),i,'latin1'); let e2=e; while(ws(buf[e2-1]))e2--; return buf.subarray(i,e2) as Buffer;
}
function decodeAfter(raw: Buffer, dict: any): Buffer {
  if ((dict['Filter']||'').includes('FlateDecode')){
    let out=zlib.inflateSync(Buffer.from(raw));
    if ((dict['DecodeParms']||'').includes('Predictor')) out=applyPredictor(out, dict['DecodeParms']);
    return out;
  }
  return Buffer.from(raw);
}

function buildXref(buf: Buffer): { objects: Map<number,any>; trailer: any } {
  const sx=buf.lastIndexOf(Buffer.from('startxref'),buf.length,'latin1'); let p=sx+9; while(ws(buf[p]))p++;
  let ns=''; while(buf[p]>=0x30&&buf[p]<=0x39){ns+=String.fromCharCode(buf[p]);p++;} let xo: number|null=parseInt(ns,10);
  const objects=new Map<number,any>(); const seen=new Set<number>(); let trailer: any={};
  while (xo!=null && !seen.has(xo)){
    seen.add(xo);
    if (buf.toString('latin1',xo,xo+4)==='xref'){
      let i=xo+4; const ri=()=>{ while(ws(buf[i]))i++; let s=''; while(buf[i]>=0x30&&buf[i]<=0x39){s+=String.fromCharCode(buf[i]);i++;} return parseInt(s,10); };
      while(true){ while(ws(buf[i]))i++; if (buf.toString('latin1',i,i+7)==='trailer'){i+=7;break;} const st=ri(),cnt=ri();
        for(let n=0;n<cnt;n++){ while(ws(buf[i]))i++; const off=parseInt(buf.toString('latin1',i,i+10),10);i+=10;i++; const g=parseInt(buf.toString('latin1',i,i+5),10);i+=5;i++; const t=String.fromCharCode(buf[i]);i++; const num=st+n; if(t==='n'&&!objects.has(num))objects.set(num,{type:1,offset:off,gen:g}); } }
      while(ws(buf[i]))i++; const td=parseDict(buf,i); trailer={...td.dict,...trailer}; xo=td.dict['Prev']!=null?toInt(td.dict['Prev']):null;
    } else {
      const dstart=buf.indexOf(Buffer.from('<<'),xo,'latin1'); const {dict,end}=parseDict(buf,dstart);
      const data=decodeAfter(rawStreamBytes(buf,end,dict),dict); // xref-stream ist nicht verschluesselt
      const W=(dict['W'].match(/\d+/g)||[]).map(Number); const size=toInt(dict['Size']);
      const index=dict['Index']?(dict['Index'].match(/\d+/g)||[]).map(Number):[0,size];
      const [w0,w1,w2]=W; let pos=0;
      for (let s=0;s<index.length;s+=2){ let num=index[s]; const cnt=index[s+1];
        for (let n=0;n<cnt;n++){ const rf=(w: number)=>{let v=0;for(let b=0;b<w;b++)v=v*256+data[pos++];return w===0?null:v;};
          const t=w0===0?1:rf(w0); const f2=rf(w1); const f3=rf(w2);
          if(!objects.has(num)){ if(t===1)objects.set(num,{type:1,offset:f2,gen:f3==null?0:f3}); else if(t===2)objects.set(num,{type:2,streamObj:f2,idx:f3==null?0:f3}); } num++; } }
      Object.keys(dict).forEach(k=>{ if(!(k in trailer)) trailer[k]=dict[k]; });
      xo=dict['Prev']!=null?toInt(dict['Prev']):null;
    }
  }
  return { objects, trailer };
}

const resolveRef = (v: any): number|null => { const m=String(v).trim().match(/^(\d+)\s+\d+\s+R/); return m?parseInt(m[1],10):null; };

// ---------------------------------------------------------------------------
// Oeffentlich: datasets-XML aus PDF extrahieren
// ---------------------------------------------------------------------------
export function extractDatasetsXml(pdf: Uint8Array): Buffer {
  const buf = Buffer.from(pdf);
  const xref = buildXref(buf);
  const objCache = new Map<number,any>();
  let CRYPTO: any = null;

  const loadObject = (num: number): any => {
    if (objCache.has(num)) return objCache.get(num);
    const rec=xref.objects.get(num); if(!rec) return null; let result: any;
    if (rec.type===1){
      const dstart=buf.indexOf(Buffer.from('<<'),rec.offset,'latin1'); const {dict,end}=parseDict(buf,dstart);
      const hasStream=buf.toString('latin1',end,end+30).includes('stream');
      result={dict,hasStream,streamAt:end,objNum:num,gen:rec.gen||0};
    } else {
      const container=loadObject(rec.streamObj);
      let raw=rawStreamBytes(buf,container.streamAt,container.dict);
      if (CRYPTO) raw=CRYPTO.decrypt(Buffer.from(raw), container.objNum, container.gen);
      const bytes=decodeAfter(raw,container.dict);
      const N=toInt(container.dict['N'])!, first=toInt(container.dict['First'])!;
      const nums=bytes.toString('latin1',0,first).trim().split(/\s+/).map(Number); const offs: any[]=[];
      for(let k=0;k<N;k++) offs.push({num:nums[k*2],off:nums[k*2+1]});
      const sB=first+offs[rec.idx].off, eB=rec.idx+1<N?first+offs[rec.idx+1].off:bytes.length;
      const slice=bytes.subarray(sB,eB); const ds=slice.indexOf(Buffer.from('<<'),0,'latin1');
      const {dict}=parseDict(slice, ds>=0?ds:0); result={dict,hasStream:false,inObjStm:true};
    }
    objCache.set(num,result); return result;
  };

  let id0=Buffer.alloc(0); const idm=(xref.trailer['ID']||'').match(/<([0-9a-fA-F]+)>/); if(idm) id0=Buffer.from(idm[1],'hex');
  const encRef=resolveRef(xref.trailer['Encrypt']);
  if (encRef!=null){ const encRec=xref.objects.get(encRef); const enc=parseEncrypt(buf, encRec.offset); CRYPTO=makeCrypto(enc, id0); }
  const root=loadObject(resolveRef(xref.trailer['Root'])!);
  const acroRef=resolveRef(root.dict['AcroForm']); const acro=acroRef!=null?loadObject(acroRef):{dict:root.dict};
  const tokens=(acro.dict['XFA']||'').replace(/^\[/,'').replace(/\]$/,'');
  const re=/\(([^)]*)\)\s*(\d+)\s+\d+\s+R/g; let m: any, dsRef: number|null=null;
  while((m=re.exec(tokens))){ if(m[1]==='datasets'){ dsRef=parseInt(m[2],10); break; } }
  if (dsRef==null) throw new Error('kein datasets-Ref im XFA-Array');
  const dsObj=loadObject(dsRef);
  let raw=rawStreamBytes(buf,dsObj.streamAt,dsObj.dict);
  if (CRYPTO) raw=CRYPTO.decrypt(Buffer.from(raw), dsObj.objNum, dsObj.gen);
  return decodeAfter(raw,dsObj.dict);
}

// ===========================================================================
// Minimaler XML-Parser (nur was fuer XFA-datasets noetig ist)
// ===========================================================================
interface XNode { tag: string; children: XNode[]; text: string; }

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (mm, e) => {
    if (e==='amp') return '&'; if (e==='lt') return '<'; if (e==='gt') return '>';
    if (e==='quot') return '"'; if (e==='apos') return "'";
    if (e[0]==='#'){ const code = (e[1]==='x'||e[1]==='X') ? parseInt(e.slice(2),16) : parseInt(e.slice(1),10); return String.fromCodePoint(code); }
    return mm;
  });
}

function parseXml(xml: string): XNode {
  let i=0; const n=xml.length;
  const root: XNode = { tag:'#root', children:[], text:'' };
  const stack: XNode[] = [root];
  while (i<n){
    if (xml[i]==='<'){
      if (xml.startsWith('<?', i)){ i=xml.indexOf('?>', i)+2; continue; }
      if (xml.startsWith('<!--', i)){ i=xml.indexOf('-->', i)+3; continue; }
      if (xml.startsWith('<![CDATA[', i)){ const e=xml.indexOf(']]>',i); stack[stack.length-1].text+=xml.slice(i+9,e); i=e+3; continue; }
      if (xml.startsWith('<!', i)){ i=xml.indexOf('>', i)+1; continue; }
      if (xml[i+1]==='/'){ const e=xml.indexOf('>', i); stack.pop(); i=e+1; continue; }
      const e=xml.indexOf('>', i);
      let raw=xml.slice(i+1, e);
      const selfClose=raw.endsWith('/'); if (selfClose) raw=raw.slice(0,-1);
      let tn=raw; const sp=raw.search(/[\s\/]/); if (sp>=0) tn=raw.slice(0,sp);
      if (tn.includes(':')) tn=tn.slice(tn.indexOf(':')+1);
      const node: XNode = { tag:tn, children:[], text:'' };
      stack[stack.length-1].children.push(node);
      if (!selfClose) stack.push(node);
      i=e+1;
    } else {
      const e=xml.indexOf('<', i); const t=xml.slice(i, e<0?n:e);
      if (t.length){ const cur=stack[stack.length-1]; cur.text += decodeEntities(t); }
      i = e<0? n : e;
    }
  }
  return root;
}

function findFirst(node: XNode, tag: string): XNode|null {
  if (node.tag===tag) return node;
  for (const c of node.children){ const r=findFirst(c,tag); if (r) return r; }
  return null;
}
function childText(node: XNode, ...names: string[]): string {
  for (const c of node.children) if (names.includes(c.tag)) return c.text.trim();
  return '';
}
function collectZeilen(node: XNode|null): XNode[] {
  const out: XNode[]=[]; if(!node) return out;
  const walk=(x: XNode)=>{ if (x.tag.startsWith('Zeile')) out.push(x); for (const c of x.children) walk(c); };
  for (const c of node.children) walk(c);
  return out;
}

// ===========================================================================
// Antrag-Parser (datasets -> Schnittstellen-Spezifikation)
// ===========================================================================
const SYN: Record<string,string[]> = {
  ap_nr:['lfd','Arbeitspaket_Nr'], ap_name:['ap','Arbeitspaket'],
  von:['von','RealisierungVON'], bis:['bis','RealisierungBIS'],
  ma_nr:['ma_nr','MA_Nr'], pm:['pm'], pm2:['pm2'],
};
function fld(row: XNode, key: string): string {
  for (const nm of SYN[key]) for (const c of row.children) if (c.tag===nm) return c.text.trim();
  return '';
}
const normApcode = (raw: string) => raw ? raw.trim().replace(/\.+$/,'').trim() : raw;
function parseApcode(code: string){ const parts=code.split('.').filter(x=>x!==''); const nums=parts.map(p=>{const v=parseInt(p,10); return isNaN(v)?null:v;});
  return { ap_number: nums[0]??null, ap_sub_number: nums[1]??null, ebene: parts.length }; }

function tableRows(root: XNode, containerTag: string): XNode[] {
  const cont=findFirst(root,containerTag); if(!cont) return [];
  let tab: XNode|null=null; for (const c of cont.children) if (c.tag.startsWith('Tabelle')){ tab=c; break; }
  if(!tab) return [];
  return tab.children.filter(c=>c.tag.startsWith('Zeile')||c.tag.startsWith('cg_file'));
}

function splitName(raw: string): [string,string,string] {
  raw=(raw||'').replace(/\r/g,'\n'); let beruf='';
  let person=raw;
  if (raw.includes('/')){ const p=raw.split('/'); person=p[0].trim(); beruf=(p[1]||'').trim(); }
  else if (raw.includes('\n')){ const p=raw.split('\n'); person=p[0].trim(); beruf=(p[1]||'').trim(); }
  else person=raw.trim();
  if (person.includes(',')){ const idx=person.indexOf(','); return [person.slice(0,idx).trim(), person.slice(idx+1).trim(), beruf]; }
  const toks=person.split(/\s+/).filter(Boolean);
  return [ toks.length?toks[toks.length-1]:person, toks.length>1?toks.slice(0,-1).join(' '):'', beruf ];
}

const round = (x: number, d: number) => { const f=Math.pow(10,d); return Math.round(x*f)/f; };

function collectByTag(node: XNode, tag: string): string[] {
  const out: string[] = [];
  const walk = (x: XNode) => { if (x.tag === tag && x.children.length === 0) { const v = x.text.trim(); if (v) out.push(v); } for (const c of x.children) walk(c); };
  walk(node); return out;
}
function modeNum(nums: number[]): number | null {
  if (!nums.length) return null;
  const m = new Map<number, number>(); let best = nums[0], bc = 0;
  for (const n of nums) { const c = (m.get(n) || 0) + 1; m.set(n, c); if (c > bc) { bc = c; best = n; } }
  return best;
}
function cleanTitle(s: string): string {
  return (s || '').replace(/^[\s"'\u201e\u201c\u201d]+/, '').replace(/[\s"'\u201c\u201d]+$/, '').trim();
}
function deriveAcronym(titel: string): string {
  const parts = (titel || '').split(/[\u2010-\u2015-]/);
  if (parts.length > 1) { const a = parts[0].trim(); if (a && a.length <= 15) return a; }
  return '';
}

export interface Contract {
  format_erkannt: string;
  ist_durchfuehrbarkeitsstudie: boolean;
  projekt: any;
  mitarbeiter: any[];
  arbeitspakete: any[];
  kontrollsummen_pruefung: any;
}

export function parseAntrag(datasetsXml: Buffer): Contract {
  const root = parseXml(datasetsXml.toString('utf-8'));

  // --- Mitarbeiter ---
  const qmap: Record<string,string> = { '1':'A','2':'B','3':'C' };
  const mitarbeiter: any[] = [];
  for (const rowNode of tableRows(root,'a72_tab')){
    const nr=childText(rowNode,'cg_VMS_PK_DdsId_261','lfd');
    const qual=childText(rowNode,'cg_VMS_PK_aQualGruppe','ddl_qual');
    const rawName=childText(rowNode,'name'); const pk=childText(rowNode,'p_kosten');
    let tzf=childText(rowNode,'cg_VMS_PK_fTeilzFaktor');
    if (!tzf){ let t13: XNode|null=null; for (const c of rowNode.children) if (c.tag==='Tabelle13') t13=c;
      if (t13 && t13.children.length) tzf=childText(t13.children[0],'tz1'); }
    if (!nr && !rawName) continue;
    const [nn,vn,beruf]=splitName(rawName);
    mitarbeiter.push({ ma_nr:nr, nachname:nn, vorname:vn, berufsbezeichnung:beruf,
      qualifikation: qmap[qual]||qual,
      monatsbrutto: pk? parseFloat(pk): null,
      teilzeitfaktor: tzf? parseFloat(tzf): null });
  }

  // --- Gehalts-/WAZ-Modell: bWAZ (global) + tatsaechliche Werte je MA -------
  // p_kosten im Antrag ist das Vollzeit-aequivalente Monatsbrutto. PZE nutzt das
  // tatsaechliche (Teilzeit-)Monatsbrutto = p_kosten * TZF, pWAZ = TZF * bWAZ und
  // den Stundensatz = (p_kosten * 12) / (bWAZ * 52). std_satz steht im Antrag.
  const stdSatzRaw = collectByTag(root, 'std_satz').map(v => parseFloat(v.replace(',', '.'))).filter(v => !isNaN(v) && v > 0);
  let bwaz = parseFloat((findFirst(root, 'bWAZ')?.text || '').trim().replace(',', '.'));
  if (!bwaz || bwaz <= 0) {
    const cand: number[] = [];
    mitarbeiter.forEach((m: any, i: number) => {
      const pk = m.monatsbrutto; const ss = stdSatzRaw[i];
      if (pk && ss && ss > 0) cand.push(Math.round(((pk * 12) / (ss * 52)) * 2) / 2);
    });
    bwaz = modeNum(cand) ?? 40;
  }
  for (const m of mitarbeiter as any[]) {
    const pkFte = m.monatsbrutto;            // p_kosten (Vollzeit-Basis)
    const tzf = m.teilzeitfaktor ?? 1;
    m.monatsbrutto_vollzeit = pkFte;
    m.monatsbrutto = pkFte != null ? round(pkFte * tzf, 2) : null;      // tatsaechlich
    m.personal_weekly_hours = round(tzf * bwaz, 2);                     // pWAZ
    m.company_weekly_hours = bwaz;                                      // bWAZ
    m.stundensatz = pkFte != null ? round((pkFte * 12) / (bwaz * 52), 2) : null;
  }

  // --- Arbeitsplan ---
  const aps: Record<string,any> = {}; const order: string[]=[];
  let cur: string|null=null, curName='', curVon='', curBis='';
  for (const r of tableRows(root,'a6_tabelle')){
    if (!r.tag.startsWith('Zeile')) continue;
    const apNr=normApcode(fld(r,'ap_nr')); const apName=fld(r,'ap_name');
    const von=fld(r,'von'), bis=fld(r,'bis');
    const ma=fld(r,'ma_nr'), pm=fld(r,'pm'), pm2=fld(r,'pm2');
    if (apNr) cur=apNr;
    if (apName){ curName=apName; curVon=von; curBis=bis; }
    if (cur==null) continue;
    if (!(cur in aps)){ const pc=parseApcode(cur);
      aps[cur]={ ap_code:cur, ...pc, name:curName, start_date:curVon||null, end_date:curBis||null, is_technical:null, zuordnungen:[] };
      order.push(cur); }
    if (pm){ aps[cur].is_technical=true; aps[cur].zuordnungen.push({ ma_nr:ma, planned_pm:parseFloat(pm) }); }
    else if (pm2){ aps[cur].is_technical=false; aps[cur].zuordnungen.push({ ma_nr:ma, planned_pm:parseFloat(pm2) }); }
  }
  const arbeitspakete = order.map(k=>{ const ap=aps[k]; ap.planned_pm=round(ap.zuordnungen.reduce((s: number,z: any)=>s+z.planned_pm,0),4); return ap; });

  // --- ist DS? ---
  const istDs = arbeitspakete.some(a=>a.is_technical===false) && arbeitspakete.some(a=>a.is_technical===true);
  if (!istDs) for (const a of arbeitspakete) a.is_technical=null;

  // --- Kontrollsummen ---
  const kMa: Record<string,{pm:number;pm2:number}> = {};
  for (const z of collectZeilen(findFirst(root,'kontr_ma'))){
    const nr=childText(z,'lfd','MA_10B'); const pm=childText(z,'pm','pm_10B'); const pm2=childText(z,'pm2');
    if (nr && pm) kMa[nr]={ pm:parseFloat(pm), pm2: pm2?parseFloat(pm2):0 };
  }

  // --- Projekt ---
  const t = (tag: string) => { const x=findFirst(root,tag); return x? x.text.trim(): ''; };
  const titel = cleanTitle(t('thema') || t('cg_VMS_VB_Projekt'));
  const akronym = cleanTitle(t('cg_VMS_VB_KurzName')) || deriveAcronym(titel);
  const projekt = {
    titel,
    akronym,
    antragsteller: t('Seite2_AST'),
    laufzeit_von: (t('cg_VMS_HB_A_Beginn') || t('LaufzeitVON')) || null,
    laufzeit_bis: (t('cg_VMS_HB_A_Ende') || t('LaufzeitBIS')) || null,
    bwaz: bwaz,
    pm_basis_weekly_hours: bwaz,
    gesamt_pm: round(arbeitspakete.reduce((s,a)=>s+a.planned_pm,0),3),
  };

  // --- Validierung gegen Kontrollsummen ---
  const maPm: Record<string,number> = {}, maPm2: Record<string,number> = {};
  for (const ap of arbeitspakete) for (const z of ap.zuordnungen){
    if (ap.is_technical===false) maPm2[z.ma_nr]=(maPm2[z.ma_nr]||0)+z.planned_pm;
    else maPm[z.ma_nr]=(maPm[z.ma_nr]||0)+z.planned_pm;
  }
  const nrs=Array.from(new Set([...Object.keys(maPm),...Object.keys(maPm2)])).sort((a,b)=> a.length-b.length || (a<b?-1:1));
  let allOk=true; const checks: any[]=[];
  for (const nr of nrs){
    const kv=kMa[nr]||{pm:0,pm2:0};
    const aPm=round(maPm[nr]||0,3), aPm2=round(maPm2[nr]||0,3);
    const ok=Math.abs(aPm-kv.pm)<0.01 && Math.abs(aPm2-kv.pm2)<0.01; allOk=allOk&&ok;
    const entry: any={ ma_nr:nr, arbeitsplan_pm:aPm, kontrolle_pm:kv.pm, ok };
    if (istDs){ entry.arbeitsplan_pm2=aPm2; entry.kontrolle_pm2=kv.pm2; }
    checks.push(entry);
  }

  return {
    format_erkannt: istDs? 'durchfuehrbarkeitsstudie' : (findFirst(root,'Antrag_EP')? 'antrag_ep':'standard_zim_v13'),
    ist_durchfuehrbarkeitsstudie: istDs,
    projekt, mitarbeiter, arbeitspakete,
    kontrollsummen_pruefung: { status: allOk?'ok':'ABWEICHUNG', je_mitarbeiter: checks },
  };
}

// ---------------------------------------------------------------------------
// Komfort: PDF -> Contract in einem Schritt
// ---------------------------------------------------------------------------
export function extractContract(pdf: Uint8Array): Contract {
  return parseAntrag(extractDatasetsXml(pdf));
}
