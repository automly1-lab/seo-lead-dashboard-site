(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='leads')return;
  function text(el){return String((el&&el.textContent)||'').trim();}
  function clean(v){return String(v||'').trim().replace(/^(https?:\/\/)?(www\.)?/i,'').replace(/\/.*$/,'');}
  function saveSnapshotFromNode(node, href){
    try{
      var url=new URL(href||location.href,location.href);
      var leadId=url.searchParams.get('lead_id')||'';
      var listId=url.searchParams.get('list_id')||'';
      var name='',domain='',city='',niche='',score='';
      var row=node&&node.closest&&node.closest('#rfProspectsTable tbody tr');
      var card=node&&node.closest&&node.closest('.rf-prospect-card');
      if(row){
        name=text(row.querySelector('.rf-business-name'));
        domain=clean(text(row.querySelector('.rf-business-sub')));
        var meta=text(row.querySelector('.rf-business-meta')).split('·');
        city=(meta[0]||'').trim();niche=(meta[1]||'').trim();
        score=text(row.querySelector('.rf-score-cell strong'));
      }else if(card){
        name=text(card.querySelector('.rf-card-title'));
        var metaText=text(card.querySelector('.rf-card-meta'));
        var parts=metaText.split('·');domain=clean(parts[0]||'');city=(parts[1]||'').trim();
        var metas=card.querySelectorAll('.rf-card-meta');
        if(metas.length>1){var cn=text(metas[1]).split('·');city=(cn[0]||city).trim();niche=(cn[1]||'').trim();}
        score=text(card.querySelector('.rf-card-score strong'));
      }
      var snapshot={lead_id:leadId,list_id:listId,business_name:name,company_name:name,domain:domain,display_domain:domain,city:city,target_city:city,niche:niche,business_type:niche,seo_need_score:score};
      if(leadId){sessionStorage.setItem('rankforge-selected-lead-id-v1',leadId);localStorage.setItem('rankforge-selected-lead-id-v1',leadId);} 
      if(domain){sessionStorage.setItem('rankforge-selected-lead-domain-v1',domain);localStorage.setItem('rankforge-selected-lead-domain-v1',domain);} 
      if(name){sessionStorage.setItem('rankforge-selected-lead-name-v1',name);localStorage.setItem('rankforge-selected-lead-name-v1',name);} 
      sessionStorage.setItem('rankforge-selected-lead-snapshot-v1',JSON.stringify(snapshot));
      localStorage.setItem('rankforge-selected-lead-snapshot-v1',JSON.stringify(snapshot));
      var state={};try{state=JSON.parse(localStorage.getItem('rankforge-clean-app-state-v1')||'{}')||{};}catch(e){}
      state.selectedLeadId=leadId||state.selectedLeadId;state.selectedLeadDomain=domain||state.selectedLeadDomain;state.selectedLeadName=name||state.selectedLeadName;state.selectedLeadSnapshot=snapshot;
      localStorage.setItem('rankforge-clean-app-state-v1',JSON.stringify(state));
    }catch(e){}
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href*="lead-detail"]');
    if(a)saveSnapshotFromNode(a,a.getAttribute('href'));
    var row=e.target.closest&&e.target.closest('#rfProspectsTable tbody tr[data-href]');
    if(row&&!e.target.closest('button,a,input'))saveSnapshotFromNode(row,row.dataset.href);
  },true);
})();
