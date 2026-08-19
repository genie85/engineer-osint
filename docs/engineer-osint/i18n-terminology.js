(function(){
  const D=window.__ENGINEER_DATA__;
  const ids=['ENG-EVT-0001','ENG-EVT-0002','ENG-EVT-0003','ENG-EVT-0014','ENG-EVT-0015'];
  const R=new Map((D?.records?.records||[]).map(x=>[x.id,x]));
  console.log('TRANSLATION_CANDIDATES='+JSON.stringify(ids.map(id=>R.get(id)||{id,missing:true})));
  window.__ENGINEER_I18N__={version:'audit-only',supported:['cs','en'],default_language:'cs',terms:[],ui:{cs:{}}};
})();
