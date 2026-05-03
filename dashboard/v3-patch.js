(function(){
  if (typeof state === 'undefined' || typeof $ === 'undefined') return;

  function normalizeUsers(){
    if (!Array.isArray(state.users)) state.users = [];
    if (state.users.length && Array.isArray(state.users[0])) {
      state.users = state.users.map(function(u, i){
        return {
          name: u[0],
          email: u[1],
          plan: u[2],
          role: u[2] === 'Admin' ? 'Admin' : 'Member',
          status: 'Active',
          batches: Number(u[3] || 0),
          credits: Number(u[4] || 0),
          used: i === 0 ? 18 : Math.min(12 + i * 4, Number(u[4] || 0)),
          created: i === 0 ? 'Founder account' : 'Demo workspace'
        };
      });
    }
    if (typeof state.adminSelected !== 'number') state.adminSelected = 0;
  }

  function adminRows(){
    normalizeUsers();
    var q = (($('#adminSearch') && $('#adminSearch').value) || '').toLowerCase();
    return state.users.filter(function(u){ return (u.name + ' ' + u.email + ' ' + u.plan + ' ' + u.status).toLowerCase().includes(q); });
  }

  window.admin = function(){
    normalizeUsers();
    if (!$('#adminRows')) return;
    var users = adminRows();
    if ($('#adminUsersCount')) $('#adminUsersCount').textContent = state.users.length;
    if ($('#adminCreditsUsed')) $('#adminCreditsUsed').textContent = state.users.reduce(function(a,u){ return a + Number(u.used || 0); }, 0);
    if ($('#adminBatches')) $('#adminBatches').textContent = state.users.reduce(function(a,u){ return a + Number(u.batches || 0); }, 0);
    $('#adminRows').innerHTML = users.map(function(u){
      var idx = state.users.indexOf(u);
      return '<tr data-admin-user="'+idx+'" class="'+(idx===state.adminSelected?'selected':'')+'">'+
        '<td><strong>'+u.name+'</strong><br><small>'+u.role+'</small></td>'+
        '<td>'+u.email+'</td>'+
        '<td><select class="admin-select" data-admin-plan="'+idx+'">'+['Free','Starter','Growth','Admin'].map(function(p){return '<option '+(u.plan===p?'selected':'')+'>'+p+'</option>';}).join('')+'</select></td>'+
        '<td><span class="status-pill '+String(u.status).toLowerCase()+'">'+u.status+'</span></td>'+
        '<td><input class="admin-input" data-admin-batches="'+idx+'" type="number" value="'+u.batches+'"></td>'+
        '<td><input class="admin-input" data-admin-credits="'+idx+'" type="number" value="'+u.credits+'"></td>'+
        '<td><div class="admin-actions"><button data-v3-add-credits="'+idx+'">+50</button><button data-v3-reset-usage="'+idx+'">Reset</button><button class="danger" data-v3-toggle-suspend="'+idx+'">'+(u.status==='Active'?'Suspend':'Activate')+'</button></div></td>'+
      '</tr>';
    }).join('');
    adminDetail();
  };

  function adminDetail(){
    normalizeUsers();
    if (!$('#adminDetail')) return;
    var u = state.users[state.adminSelected] || state.users[0];
    if (!u) { $('#adminDetail').innerHTML = ''; return; }
    $('#adminDetail').innerHTML = '<div class="detail-head"><h3>'+u.name+'</h3><p>'+u.email+'</p><span class="status-pill '+String(u.status).toLowerCase()+'">'+u.status+'</span></div>'+
      '<div class="detail-body"><div class="field-row"><span>Role</span><strong>'+u.role+'</strong></div>'+
      '<div class="field-row"><span>Plan</span><strong>'+u.plan+'</strong></div>'+
      '<div class="field-row"><span>Batches</span><strong>'+u.batches+'</strong></div>'+
      '<div class="field-row"><span>Lead Credits</span><strong>'+u.credits+'</strong></div>'+
      '<div class="field-row"><span>Credits Used</span><strong>'+u.used+'</strong></div>'+
      '<div class="field-row"><span>Created</span><strong>'+u.created+'</strong></div>'+
      '<div class="score-card"><strong>Admin Notes</strong><p class="reason">Manual credit and plan changes should create activity log records for billing transparency.</p></div>'+
      '<div class="crm-actions"><button data-v3-add-credits="'+state.adminSelected+'">Add 50 Credits</button><button class="primary" data-v3-reset-usage="'+state.adminSelected+'">Reset Usage</button></div></div>';
  }

  function addActivity(message){
    state.activity.unshift(message);
    if (typeof activity === 'function') activity();
  }

  document.body.addEventListener('click', function(e){
    var row = e.target.closest && e.target.closest('tr[data-admin-user]');
    if (row && !e.target.matches('input,select,button')) {
      e.preventDefault(); e.stopPropagation();
      state.adminSelected = Number(row.dataset.adminUser);
      window.admin();
      return;
    }
    if (e.target.dataset.v3AddCredits) {
      e.preventDefault(); e.stopPropagation();
      var u = state.users[Number(e.target.dataset.v3AddCredits)];
      if (!u) return;
      u.credits = Number(u.credits || 0) + 50;
      addActivity('Admin added 50 lead credits to ' + u.email);
      window.admin();
      return;
    }
    if (e.target.dataset.v3ResetUsage) {
      e.preventDefault(); e.stopPropagation();
      var r = state.users[Number(e.target.dataset.v3ResetUsage)];
      if (!r) return;
      r.used = 0;
      addActivity('Admin reset credit usage for ' + r.email);
      window.admin();
      return;
    }
    if (e.target.dataset.v3ToggleSuspend) {
      e.preventDefault(); e.stopPropagation();
      var s = state.users[Number(e.target.dataset.v3ToggleSuspend)];
      if (!s) return;
      s.status = s.status === 'Active' ? 'Suspended' : 'Active';
      addActivity('Admin changed account status: ' + s.email + ' to ' + s.status);
      window.admin();
      return;
    }
    if (e.target.id === 'clearLogsBtn') {
      e.preventDefault(); e.stopPropagation();
      state.activity = [];
      if (typeof activity === 'function') activity();
      return;
    }
    if (e.target.id === 'logoutBtn') {
      e.preventDefault(); e.stopPropagation();
      alert('Demo logout: connect this to your auth sign-out.');
    }
  }, true);

  document.body.addEventListener('input', function(e){
    if (e.target.id === 'adminSearch') { window.admin(); return; }
    if (e.target.dataset.adminBatches) { state.users[Number(e.target.dataset.adminBatches)].batches = Number(e.target.value || 0); adminDetail(); return; }
    if (e.target.dataset.adminCredits) { state.users[Number(e.target.dataset.adminCredits)].credits = Number(e.target.value || 0); adminDetail(); }
  }, true);

  document.body.addEventListener('change', function(e){
    if (e.target.dataset.adminPlan) {
      var u = state.users[Number(e.target.dataset.adminPlan)];
      if (!u) return;
      u.plan = e.target.value;
      u.role = e.target.value === 'Admin' ? 'Admin' : 'Member';
      addActivity('Admin changed plan for ' + u.email + ' to ' + u.plan);
      window.admin();
    }
  }, true);

  normalizeUsers();
  window.admin();
  if (typeof activity === 'function') activity();
})();