(function(){
  var PLAN_KEY="rankforge-selected-plan-v1";
  var BILLING_KEY="rankforge-billing-status-v1";
  var PLANS={
    free:{name:"Free",price:"$0",summary:"1 search batch · up to 10 qualified lead previews"},
    starter:{name:"Starter",price:"$29/month",summary:"5 search batches/month · up to 50 qualified leads/month · max 25 per batch"},
    growth:{name:"Growth",price:"$79/month",summary:"15 search batches/month · up to 250 qualified leads/month · max 50 per batch"},
    agency_intelligence:{name:"Agency Intelligence",price:"Coming soon",summary:"More search batches · 750+ qualified leads/month · detailed SEO analysis"}
  };
  function clean(v){return String(v==null?"":v).trim();}
  function normalize(v){var raw=clean(v).toLowerCase().replace(/\s+/g,"_").replace(/-/g,"_");if(raw==="growth"||raw==="pro")return"growth";if(raw==="starter"||raw==="start"||raw==="basic")return"starter";if(raw==="agency"||raw==="agency_intelligence")return"agency_intelligence";return"free";}
  function getPlan(){try{return normalize(new URLSearchParams(location.search||"").get("plan")||"free");}catch(e){return"free";}}
  function addStyles(){if(document.getElementById("signupPlanStyles"))return;var s=document.createElement("style");s.id="signupPlanStyles";s.textContent=".signup-selected-plan{display:grid;gap:6px;margin-bottom:14px;padding:14px;border:1px solid rgba(21,94,239,.18);border-radius:18px;background:linear-gradient(135deg,rgba(21,94,239,.08),rgba(13,148,136,.05)),#fff}.signup-selected-plan strong{color:#0f172a;font-size:20px;letter-spacing:-.03em}.signup-selected-plan small{color:#667085;line-height:1.45}.signup-selected-plan p{margin:4px 0 0;color:#475467;font-size:13px;line-height:1.5}";document.head.appendChild(s);}
  function init(){var form=document.getElementById("signupForm");if(!form||document.querySelector(".signup-selected-plan"))return;var key=getPlan();var plan=PLANS[key]||PLANS.free;localStorage.setItem(PLAN_KEY,key);localStorage.setItem(BILLING_KEY,key==="agency_intelligence"?"waitlist":(key==="free"?"free":"pending_payment"));var card=document.createElement("div");card.className="signup-selected-plan";card.innerHTML='<span class="workspace-label">Selected plan</span><strong>'+plan.name+'</strong><small>'+plan.price+' · '+plan.summary+'</small><p>'+(key==="free"?'Try RankForge with one free focused search before choosing a paid plan.':key==="agency_intelligence"?'Agency Intelligence is coming soon. This saves your interest without activating paid access.':'This selection is saved for checkout. Paid access activates only after payment confirmation.')+'</p>';form.insertBefore(card,form.firstChild);var status=document.getElementById("authFormStatus");if(status)status.textContent=key==="free"?"Create your free workspace and run one test search.":key==="agency_intelligence"?"Agency Intelligence is coming soon. Signup saves your interest and opens the workspace.":"After signup, continue to checkout to activate this paid plan.";}
  addStyles();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
