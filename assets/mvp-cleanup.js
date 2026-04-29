(function(){
  'use strict';

  function page(){return document.body&&document.body.dataset&&document.body.dataset.page||'';}
  function clean(v){return String(v==null?'':v).trim();}
  function homePrefix(){return ['dashboard','lists','leads','lead-detail','settings','quality','login','signup'].indexOf(page())>=0?'../':'';}

  function fixBrandLinks(){document.querySelectorAll('.sidebar .brand,.sidebar-site-link').forEach(function(link){link.setAttribute('href',homePrefix());});}
  function simplifyTopbar(){document.querySelectorAll('.app-brand-context,.app-back-home-link').forEach(function(n){n.remove();});document.querySelectorAll('.topbar-actions .data-status').forEach(function(n){n.remove();});document.querySelectorAll('.topbar-actions button').forEach(function(btn){var txt=clean(btn.textContent).toLowerCase();if(txt.indexOf('sync')>=0)btn.remove();});document.querySelectorAll('.topbar-insight-row,.topbar-insight').forEach(function(n){n.remove();});}

  function displayDomain(value){
    var raw=clean(value);if(!raw)return '';
    var match=raw.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})(?:[\/?#][^\s]*)?/i);
    if(!match)return raw;
    var domain=match[1].replace(/^www\./i,'').toLowerCase();
    return domain;
  }

  function cleanVisibleUrls(){
    var pages=['dashboard','leads','lead-detail','lists'];
    if(pages.indexOf(page())<0)return;
    var urlPattern=/(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[\/?#][^\s]*)?/ig;
    document.querySelectorAll('.data-table td,.lead-detail-card,.lead-hero,.panel,.hero-card,.metric-card').forEach(function(node){
      if(node.children.length>0){
        node.childNodes.forEach(function(child){
          if(child.nodeType===3){
            var before=child.nodeValue;
            if(/gad_source|gbraid|gclid|utm_|fbclid|msclkid|\?/.test(before||'')){
              child.nodeValue=before.replace(urlPattern,function(url){return displayDomain(url);});
            }
          }
        });
        return;
      }
      var before=node.textContent;
      if(!/gad_source|gbraid|gclid|utm_|fbclid|msclkid|\?/.test(before||''))return;
      var after=before.replace(urlPattern,function(url){return displayDomain(url);});
      if(after!==before)node.textContent=after;
    });
    document.querySelectorAll('a[href]').forEach(function(a){
      var href=clean(a.getAttribute('href'));
      if(/gad_source|gbraid|gclid|utm_|fbclid|msclkid/.test(href)){
        try{var u=new URL(href,location.href);['gad_source','gbraid','gclid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','msclkid'].forEach(function(k){u.searchParams.delete(k);});a.href=u.toString();}catch(e){}
      }
      if(/gad_source|gbraid|gclid|utm_|fbclid|msclkid|\?/.test(a.textContent||''))a.textContent=displayDomain(a.textContent);
    });
  }

  function humanizeMachineLabels(){
    var selectors=['.pill','.status-pill','.workspace-card strong','.workspace-card small','.metric-card span','.data-table td','.data-table th','.form-status','#activeListStatus','#activeLeadSummary','#workspaceSelectedListHealth','#workspaceSelectedListMeta'];
    document.querySelectorAll(selectors.join(',')).forEach(function(node){
      if(node.children.length>0)return;
      var before=node.textContent;if(!/[a-z]+_[a-z]+|usr_|Workspace scoped to|Min thresholds|stays visible until archived/i.test(before))return;
      var after=before.replace(/\breview_needed\b/gi,'Needs Review').replace(/\bqualified\b/gi,'Qualified Lead').replace(/\brejected\b/gi,'Not a Fit').replace(/\bcompleted_no_qualified_leads\b/gi,'No Qualified Leads').replace(/\bno_qualified\b/gi,'No Qualified Leads').replace(/\bpending_payment\b/gi,'Payment Pending').replace(/\badmin_unlimited\b/gi,'Admin Unlimited').replace(/\busr_[a-z0-9_\-]+\b/gi,'Workspace').replace(/Workspace scoped to [0-9a-f\-]{12,}/gi,'Private workspace').replace(/Min thresholds:\s*/gi,'Minimum scores: ').replace(/\bSEO\s*([0-9]+)\s*\/\s*Lead\s*([0-9]+)\b/gi,'SEO $1 / Lead $2').replace(/([a-zA-Z ]+) stays visible until archived/gi,'Saved until you archive it');
      if(after!==before)node.textContent=after;
    });
  }

  function removeLeadsFeedbackFlash(){if(page()!=='leads')return;var table=document.getElementById('leadsTable');if(!table)return;table.querySelectorAll('[class*="feedback"], [data-feedback], textarea').forEach(function(n){n.remove();});table.querySelectorAll('button, a').forEach(function(n){if(/feedback|good lead|bad lead|wrong niche|bad contact/i.test(clean(n.textContent)))n.remove();});}
  function ensureSearchLoading(){if(page()!=='dashboard')return;var form=document.getElementById('quickCreateForm');if(!form||document.querySelector('.rf-search-loading-card'))return;var card=document.createElement('section');card.className='rf-search-loading-card';card.innerHTML='<strong>Creating search batch<span class="rf-loading-dots"></span></strong><p>RankForge is sending this search to the workflow. New leads will appear automatically after the search starts.</p>';var top=document.querySelector('.create-search-top');if(top)top.insertAdjacentElement('afterend',card);form.addEventListener('submit',function(){card.classList.add('is-visible');var status=document.getElementById('createSearchStatus');if(status)status.textContent='Creating search batch...';var button=form.querySelector('button[type="submit"]');if(button){button.dataset.originalText=button.dataset.originalText||button.textContent;button.textContent='Creating search...';button.disabled=true;setTimeout(function(){button.disabled=false;button.textContent=button.dataset.originalText||'Create Search Batch';},9000);}},true);}
  function labelSampleData(){if(page())return;document.querySelectorAll('.preview-card strong').forEach(function(n,i){if(i===0)n.textContent='Sample Restoration Company';if(i===1)n.textContent='Sample Dental Studio';});var sampleTitle=document.querySelector('.sample-lead-card h3');if(sampleTitle)sampleTitle.textContent='Sample Miami Restoration Co.';}
  function hideActiveSavedList(){if(page()!=='dashboard')return;document.querySelectorAll('.hero-card-primary').forEach(function(card){var text=clean(card.textContent).toLowerCase();if(text.indexOf('active saved list')>=0)card.style.display='none';});}
  function parseDateText(text){var raw=clean(text);if(!raw||/no run|never|-/i.test(raw))return 0;var d=new Date(raw);if(!Number.isNaN(d.getTime()))return d.getTime();var match=raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);if(match)return new Date(Number(match[1]),Number(match[2])-1,Number(match[3])).getTime();return 0;}
  function sortRecentSavedLists(){if(page()!=='dashboard')return;var tbody=document.querySelector('#savedListsTable tbody');if(!tbody||tbody.dataset.rfSortedOnce==='busy')return;var rows=Array.prototype.slice.call(tbody.querySelectorAll('tr'));if(rows.length<2)return;tbody.dataset.rfSortedOnce='busy';rows.sort(function(a,b){var ad=parseDateText((a.children[3]&&a.children[3].textContent)||'');var bd=parseDateText((b.children[3]&&b.children[3].textContent)||'');if(bd!==ad)return bd-ad;return clean((b.children[0]&&b.children[0].textContent)||'').localeCompare(clean((a.children[0]&&a.children[0].textContent)||''));});rows.forEach(function(row){tbody.appendChild(row);});tbody.dataset.rfSortedOnce='done';setTimeout(function(){tbody.dataset.rfSortedOnce='';},1800);}

  function init(){fixBrandLinks();simplifyTopbar();removeLeadsFeedbackFlash();ensureSearchLoading();labelSampleData();hideActiveSavedList();humanizeMachineLabels();cleanVisibleUrls();sortRecentSavedLists();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,300);setTimeout(init,900);
  setInterval(function(){removeLeadsFeedbackFlash();simplifyTopbar();hideActiveSavedList();humanizeMachineLabels();cleanVisibleUrls();sortRecentSavedLists();},1500);
})();
