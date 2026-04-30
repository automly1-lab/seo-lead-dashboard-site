(function(){
  'use strict';
  function page(){return document.body&&document.body.dataset&&document.body.dataset.page||'';}
  function clean(v){return String(v==null?'':v).trim();}
  function isRejectedText(text){return /\brejected\b|\bnot a fit\b|\bunqualified\b/i.test(clean(text));}
  function hideRows(){
    if(['leads','dashboard'].indexOf(page())<0)return;
    document.querySelectorAll('#leadsTable tbody tr').forEach(function(row){
      if(isRejectedText(row.textContent))row.style.display='none';
    });
    document.querySelectorAll('#qualificationFilter option').forEach(function(option){
      if(isRejectedText(option.value)||isRejectedText(option.textContent))option.remove();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hideRows);else hideRows();
  setInterval(hideRows,1200);
})();
