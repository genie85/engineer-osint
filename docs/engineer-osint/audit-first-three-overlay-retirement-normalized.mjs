const originalStringify=JSON.stringify.bind(JSON);
JSON.stringify=(value,replacer,space)=>originalStringify(structuredClone(value),replacer,space);
try{
  await import('./audit-first-three-overlay-retirement.mjs');
}finally{
  JSON.stringify=originalStringify;
}
