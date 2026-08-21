(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const S=D.sources?.sources||[],R=D.records?.records||[];
  const mediaUrl=s=>s?.url||s?.source_url||'';
  const classify=u=>{
    u=String(u||'');
    if(/(?:youtu\.be\/[\w-]{6,}|youtube\.com\/(?:watch\?[^#]*v=[\w-]{6,}|shorts\/[\w-]{6,}|live\/[\w-]{6,}|embed\/[\w-]{6,}))/i.test(u))return {type:'YOUTUBE',asset:true};
    if(/youtube\.com/i.test(u))return {type:'YOUTUBE',asset:false};
    if(/spotify\.com\/episode\//i.test(u)||/podcasts\.apple\.com\/[^/]+\/podcast\/[^/]+\/id\d+\?i=\d+/i.test(u)||/soundcloud\.com\/[^/]+\/[^/?#]+/i.test(u))return {type:'PODCAST',asset:true};
    if(/podcast|spotify\.com|podcasts\.apple\.com|soundcloud/i.test(u))return {type:'PODCAST',asset:false};
    return null;
  };
  let target;
  if(Array.isArray(D.media_registry?.media))target=D.media_registry.media;
  else if(Array.isArray(D.media_registry?.items))target=D.media_registry.items;
  else if(Array.isArray(D.media?.media))target=D.media.media;
  else if(Array.isArray(D.media?.items))target=D.media.items;
  else if(Array.isArray(D.media))target=D.media;
  else {D.media=D.media||{};D.media.media=D.media.media||[];target=D.media.media}
  const seen=new Set(target.flatMap(x=>[x.media_id,x.id,x.url,x.exact_url]).filter(Boolean));
  let skippedContainerCount=0,skippedUnlinkedAssetCount=0;
  for(const s of S){
    const u=mediaUrl(s),c=classify(u);if(!c)continue;
    if(!c.asset){skippedContainerCount++;continue;}
    const related=R.filter(r=>(r.source_ids||[]).includes(s.id)).map(r=>r.id);
    if(!related.length){skippedUnlinkedAssetCount++;continue;}
    const id='SRCMEDIA-'+(s.id||u);if(seen.has(id)||seen.has(u))continue;
    target.push({media_id:id,media_type:c.type,title:s.title||s.name||(c.type==='YOUTUBE'?'YouTube':'Podcast'),channel_or_publisher:s.publisher||s.organization||'',publication_date:s.publication_date||null,url:u,exact_url:u,source_ids:s.id?[s.id]:[],related_ids:related,source_tier:s.source_tier??s.tier,materialization_status:'DERIVED_FROM_CANONICAL_ASSET_SOURCE_URL'});
    seen.add(id);seen.add(u);
  }
  window.__ENGINEER_MEDIA_SOURCE_MATERIALIZATION__={derived_count:target.filter(x=>x.materialization_status==='DERIVED_FROM_CANONICAL_ASSET_SOURCE_URL').length,skipped_container_count:skippedContainerCount,skipped_unlinked_asset_count:skippedUnlinkedAssetCount};
})();
