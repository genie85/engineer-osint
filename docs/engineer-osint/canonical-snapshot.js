(function(){
  const source=window.__ENGINEER_DATA__;
  if(!source)return;
  const clone=typeof structuredClone==='function'?structuredClone(source):JSON.parse(JSON.stringify(source));
  const restore=value=>{
    if(!value||typeof value!=='object')return value;
    if(value.__i18n_public_orig&&typeof value.__i18n_public_orig==='object'){
      for(const[key,original]of Object.entries(value.__i18n_public_orig))value[key]=original;
      delete value.__i18n_public_orig;
    }
    if(Object.prototype.hasOwnProperty.call(value,'__i18n_public_orig_text')){
      value.text=value.__i18n_public_orig_text;
      delete value.__i18n_public_orig_text;
    }
    delete value.__orig;delete value.__orig_text;
    for(const child of Object.values(value))restore(child);
    return value;
  };
  const canonical=restore(clone);
  const copyValue=value=>{
    if(value===undefined||value===null)return value;
    if(typeof value!=='object')return value;
    return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  };
  const hydrateEnglish=(live,orig)=>{
    if(!live||!orig||typeof live!=='object'||typeof orig!=='object')return;
    if(Array.isArray(live)&&Array.isArray(orig)){
      for(let i=0;i<Math.min(live.length,orig.length);i++)hydrateEnglish(live[i],orig[i]);
      return;
    }
    for(const key of Object.keys(live)){
      if(!key.endsWith('_cs'))continue;
      const base=key.slice(0,-3),enKey=base+'_en';
      if(live[enKey]!==undefined&&live[enKey]!==null&&live[enKey]!=='')continue;
      const original=orig[base];
      if(original===undefined||original===null||original==='')continue;
      live[enKey]=copyValue(original);
    }
    for(const key of Object.keys(live)){
      if(key==='__orig'||key==='__orig_text'||key==='__i18n_public_orig'||key==='__i18n_public_orig_text')continue;
      if(live[key]&&orig[key]&&typeof live[key]==='object'&&typeof orig[key]==='object')hydrateEnglish(live[key],orig[key]);
    }
  };
  hydrateEnglish(source,canonical);
  const freeze=value=>{
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    for(const child of Object.values(value))freeze(child);
    return value;
  };
  Object.defineProperty(window,'__ENGINEER_CANONICAL_DATA__',{
    value:freeze(canonical),writable:false,configurable:false,enumerable:false
  });
})();
