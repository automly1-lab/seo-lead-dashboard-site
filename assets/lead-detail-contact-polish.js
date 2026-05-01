(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='lead-detail')return;
  function txt(el){return String((el&&el.textContent)||'').trim().toLowerCase();}
  function decorate(){
    var list=document.getElementById('rfContactPathList');
    if(!list)return;
    Array.prototype.forEach.call(list.querySelectorAll('.rf-contact-signal'),function(row){
      var label=txt(row.querySelector('div span:first-child'));
      if(label.indexOf('phone')>=0)row.dataset.contactKind='phone';
      else if(label.indexOf('email')>=0)row.dataset.contactKind='email';
      else if(label.indexOf('page')>=0)row.dataset.contactKind='page';
      else if(label.indexOf('cta')>=0)row.dataset.contactKind='cta';
    });
    if(!document.getElementById('rfContactPathNote')){
      var note=document.createElement('div');
      note.id='rfContactPathNote';
      note.className='rf-contact-note';
      note.textContent='Contact-ready signals are shown only from captured contact data or verified crawl evidence. If a value was detected but not captured, review the website before outreach.';
      list.insertAdjacentElement('afterend',note);
    }
  }
  [0,250,700,1400,2500,5000].forEach(function(ms){setTimeout(decorate,ms);});
  setInterval(decorate,1200);
  try{new MutationObserver(decorate).observe(document.body,{subtree:true,childList:true,characterData:true});}catch(e){}
})();
