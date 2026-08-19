import {readFileSync} from 'node:fs';
const html=readFileSync('docs/engineer-osint-dist/index.html','utf8');
const marker='window.__ENGINEER_DATA__=';
const a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('ENGINEER_DATA marker missing');
const d=JSON.parse(html.slice(a+marker.length,b));
const ids=['ENG-EVT-0004','ENG-EVT-0005','ENG-EVT-0006','ENG-EVT-0007','ENG-EVT-0008','ENG-EVT-0009','ENG-EVT-0010','ENG-EVT-0011','ENG-EVT-0012','ENG-EVT-0013','ENG-EVT-0016','ENG-EVT-0017','ENG-EVT-0018','ENG-EVT-0020','ENG-EVT-0022','ENG-EVT-0024','ENG-EVT-0025','ENG-EVT-0026'];
const m=new Map((d.records?.records||[]).map(x=>[x.id,x]));
for(const id of ids){const x=m.get(id);if(x)console.log('TRANSLATION_RECORD='+JSON.stringify(x));}
