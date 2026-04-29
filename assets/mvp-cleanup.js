(function(){
  'use strict';

  function page(){return document.body&&document.body.dataset&&document.body.dataset.page||'';}
  function clean(v){return String(v==null?'':v).trim();}
  function homePrefix(){return ['dashboard','lists','leads','lead-detail','settings','quality','login','signup'].indexOf(page())>=0?'../':'';}

  function fixBrandLinks(){
    document.querySelectorAll('.sidebar .brand,.sidebar-site-link').forEach(function(link){
      link.setAttribute('href',homePrefix());
    });
  }

  function simplifyTopbar(){
    document.querySelectorAll('.app-brand-context,.app-back-home-link').forEach(function(n){n.remove();});
    document.querySelectorAll('.topbar-actions .data-status').forEach(function(n){n.remove();});
    document.querySelectorAll('.topbar-actions button').forEach(function(btn){
      var txt=clean(btn.textContent).toLowerCase();
      if(txt.indexOf('sync')>=0)btn.remove();
    });
  }

  function removeLeadsFeedbackFlash(){
    if(page()!=='leads')return;
    var table=document.getElementById('leadsTable');
    if(!table)return;
    table.querySelectorAll('[class*="feedback"], [data-feedback], textarea').forEach(function(n){n.remove();});
    table.querySelectorAll('button, a').forEach(function(n){
      if(/feedback|good lead|bad lead|wrong niche|bad contact/i.test(clean(n.textContent)))n.remove();
    });
  }

  function ensureSearchLoading(){
    if(page()!=='dashboard')return;
    var form=document.getElementById('quickCreateForm');
    if(!form||document.querySelector('.rf-search-loading-card'))return;
    var card=document.createElement('section');
    card.className='rf-search-loading-card';
    card.innerHTML='<strong>Creating search batch<span class="rf-loading-dots"></span></strong><p>RankForge is sending this search to the workflow. New leads will appear automatically after the search starts.</p>';
    var top=document.querySelector('.create-search-top');
    if(top)top.insertAdjacentElement('afterend',card);
    form.addEventListener('submit',function(){
      card.classList.add('is-visible');
      var status=document.getElementById('createSearchStatus');
      if(status)status.textContent='Creating search batch...';
      var button=form.querySelector('button[type="submit"]');
      if(button){button.dataset.originalText=button.dataset.originalText||button.textContent;button.textContent='Creating search...';button.disabled=true;setTimeout(function(){button.disabled=false;button.textContent=button.dataset.originalText||'Create Search Batch';},9000);}
    },true);
  }

  function labelSampleData(){
    if(page())return;
    document.querySelectorAll('.preview-card strong').forEach(function(n,i){
      if(i===0)n.textContent='Sample Restoration Company';
      if(i===1)n.textContent='Sample Dental Studio';
    });
    var sampleTitle=document.querySelector('.sample-lead-card h3');
    if(sampleTitle)sampleTitle.textContent='Sample Miami Restoration Co.';
  }

  function init(){
    fixBrandLinks();
    simplifyTopbar();
    removeLeadsFeedbackFlash();
    ensureSearchLoading();
    labelSampleData();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,700);
  setInterval(function(){removeLeadsFeedbackFlash();simplifyTopbar();},1500);
})();
