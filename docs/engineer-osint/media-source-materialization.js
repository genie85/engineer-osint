(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const S=D.sources?.sources||[],R=D.records?.records||[];
  const mediaUrl=s=>s?.url||s?.source_url||'';
  const mediaType=u=>/youtu\.be|youtube\.com/i.test(u)?'YOUTUBE':(/podcast|spotify\.com\/episode|podcasts\.apple|soundcloud/i.test(u)?'PODCAST':null);
  let target;
  if(Array.isArray(D.media_registry?.media))target=D.media_registry.media;
  else if(Array.isArray(D.media_registry?.items))target=D.media_registry.items;
  else if(Array.isArray(D.media?.media))target=D.media.media;
  else if(Array.isArray(D.media?.items))target=D.media.items;
  else if(Array.isArray(D.media))target=D.media;
  else {D.media=D.media||{};D.media.media=D.media.media||[];target=D.media.media}
  const seen=new Set(target.map(x=>x.media_id||x.id||x.url||x.exact_url).filter(Boolean));
  for(const s of S){
    const u=mediaUrl(s),type=mediaType(u);if(!type)continue;
    const id='SRCMEDIA-'+(s.id||u);if(seen.has(id)||seen.has(u))continue;
    const related=R.filter(r=>(r.source_ids||[]).includes(s.id)).map(r=>r.id);
    target.push({media_id:id,media_type:type,title:s.title||s.name||(type==='YOUTUBE'?'YouTube':'Podcast'),channel_or_publisher:s.publisher||s.organization||'',publication_date:s.publication_date||null,url:u,exact_url:u,source_ids:s.id?[s.id]:[],related_ids:related,source_tier:s.source_tier??s.tier,materialization_status:'DERIVED_FROM_CANONICAL_SOURCE_URL'});
    seen.add(id);seen.add(u);
  }
  window.__ENGINEER_MEDIA_SOURCE_MATERIALIZATION__={derived_count:target.filter(x=>x.materialization_status==='DERIVED_FROM_CANONICAL_SOURCE_URL').length};
})();
