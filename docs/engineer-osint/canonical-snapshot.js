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
  const freeze=value=>{
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    for(const child of Object.values(value))freeze(child);
    return value;
  };
  Object.defineProperty(window,'__ENGINEER_CANONICAL_DATA__',{
    value:freeze(restore(clone)),writable:false,configurable:false,enumerable:false
  });
})();
