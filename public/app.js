const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let currentUser = null;
let cachedRequests = [];

function toast(message, error = false) {
  const el = $('#toast'); el.textContent = message; el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.className = 'toast', 3500);
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
function showAuth(mode = 'login') {
  $('#authView').classList.remove('hidden'); $('#appView').classList.add('hidden');
  const signup = mode === 'signup';
  $('#loginForm').classList.toggle('hidden', signup); $('#signupForm').classList.toggle('hidden', !signup);
  $('#loginTab').classList.toggle('active', !signup); $('#signupTab').classList.toggle('active', signup);
  $('#authTitle').innerHTML = signup ? 'Create your<br><em>workspace account.</em>' : 'Sign in to your<br><em>workspace.</em>';
  $('#authSubtitle').textContent = signup ? 'A few details and you’re ready to get started.' : 'Your work-life balance starts here.';
}
function showApp(user) {
  currentUser = user; $('#authView').classList.add('hidden'); $('#appView').classList.remove('hidden');
  $('#topName').textContent = user.name; $('#topRole').textContent = user.role; $('#topAvatar').textContent = user.name.charAt(0).toUpperCase();
  $('#welcomeName').textContent = user.name.split(' ')[0];
  $$('.manager-only').forEach(el => el.classList.toggle('hidden', !['manager','admin'].includes(user.role)));
  $$('.admin-only').forEach(el => el.classList.toggle('hidden', user.role !== 'admin'));
  navigate('overview'); refresh();
}
function navigate(page) {
  const allowed = ['overview','apply','history','requests','people'];
  if (!allowed.includes(page)) page = 'overview';
  if (page === 'requests' && !['manager','admin'].includes(currentUser?.role)) page = 'overview';
  if (page === 'people' && currentUser?.role !== 'admin') page = 'overview';
  $$('.page').forEach(el => el.classList.add('hidden')); $(`#${page}Page`).classList.remove('hidden');
  $$('.nav-link[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  $('#pageCrumb').textContent = ({overview:'Overview',apply:'Apply for leave',history:'My leave history',requests:'Leave approvals',people:'People & access'})[page];
  if (page === 'history') loadHistory(); if (page === 'apply') loadLeaveTypes();
  if (page === 'requests') loadTeamRequests(); if (page === 'people') loadPeople();
}
function statusBadge(status) { return `<span class="status ${status}">${status}</span>`; }
function empty(message) { return `<div class="empty-state"><strong>Nothing here just yet</strong>${message}</div>`; }
function renderTable(rows, type = 'history') {
  if (!rows.length) return empty(type === 'requests' ? 'No leave requests to review.' : 'Your requests will appear here once submitted.');
  if (type === 'requests') return `<div class="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>LEAVE TYPE</th><th>DATES</th><th>REASON</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.employee_name)}</b><br><small>${esc(r.department||'')}</small></td><td>${esc(r.type_name)}</td><td>${date(r.from_date)} – ${date(r.to_date)}</td><td>${esc(r.reason)}</td><td>${statusBadge(r.status)}</td><td>${r.status==='pending'?`<button class="action-btn approve-btn" data-review="${r.request_id}" data-status="approved">Approve</button><button class="action-btn reject-btn" data-review="${r.request_id}" data-status="rejected">Reject</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>LEAVE TYPE</th><th>FROM</th><th>TO</th><th>REASON</th><th>STATUS</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.type_name)}</b></td><td>${date(r.from_date)}</td><td>${date(r.to_date)}</td><td>${esc(r.reason)}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}</tbody></table></div>`;
}
function date(value) { if (!value) return '—'; const d = new Date(`${String(value).slice(0,10)}T00:00:00`); return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function esc(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function refresh() {
  try {
    const {stats} = await api('/api/dashboard');
    $('#totalStat').textContent = stats.total || 0; $('#pendingStat').textContent = stats.pending || 0;
    $('#approvedStat').textContent = stats.approved || 0; $('#rejectedStat').textContent = stats.rejected || 0;
    if (currentUser.role === 'employee') {
      const data = await api('/api/leave-requests/mine'); cachedRequests = data.requests;
      $('#recentTable').innerHTML = renderTable(cachedRequests.slice(0,4));
    } else {
      const data = await api('/api/manager/requests'); cachedRequests = data.requests;
      $('#recentTable').innerHTML = renderTable(cachedRequests.slice(0,4),'requests');
      $('#pendingDot').classList.toggle('hidden', !cachedRequests.some(r=>r.status==='pending'));
    }
  } catch(e) { toast(e.message,true); }
}
async function loadHistory() {
  try { const d=await api('/api/leave-requests/mine'); $('#historyTable').innerHTML=renderTable(d.requests); $('#historyCount').textContent=`${d.requests.length} records`; }
  catch(e){toast(e.message,true);}
}
async function loadLeaveTypes() {
  try { const d=await api('/api/leave-types'); $('#leaveType').innerHTML='<option value="">Choose a leave type</option>'+d.leaveTypes.map(t=>`<option value="${t.leave_type_id}">${esc(t.type_name)} · up to ${t.max_days} days</option>`).join(''); }
  catch(e){toast(e.message,true);}
}
async function loadTeamRequests() {
  try { const d=await api('/api/manager/requests'); $('#requestsTable').innerHTML=renderTable(d.requests,'requests'); $('#teamCount').textContent=`${d.requests.length} requests`; }
  catch(e){toast(e.message,true);}
}
async function loadPeople() {
  try {
    const d=await api('/api/admin/employees'); $('#peopleCount').textContent=`${d.employees.length} people`;
    if (!d.employees.length) { $('#peopleTable').innerHTML=empty('No employees have signed up yet.'); return; }
    $('#peopleTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>ROLE</th><th>ACCOUNT STATUS</th><th>ACCESS</th></tr></thead><tbody>${d.employees.map(e=>`<tr><td><b>${esc(e.name)}</b><br><small>${esc(e.email)}</small></td><td>${esc(e.department||'—')}</td><td><select class="select-role" data-role="${e.employee_id}">${['employee','manager','admin'].map(r=>`<option ${e.role===r?'selected':''}>${r}</option>`).join('')}</select></td><td>${statusBadge(e.approval_status)}</td><td>${e.approval_status!=='approved'?`<button class="action-btn approve-btn" data-approval="${e.employee_id}" data-value="approved">Approve</button>`:''}${e.approval_status!=='rejected'?`<button class="action-btn reject-btn" data-approval="${e.employee_id}" data-value="rejected">Reject</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  } catch(e){toast(e.message,true);}
}
$('#loginTab').onclick=()=>showAuth('login'); $('#signupTab').onclick=()=>showAuth('signup');
$('#loginForm').onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify(body)});showApp(d.user);}catch(err){toast(err.message,true);}};
$('#signupForm').onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));try{const d=await api('/api/auth/signup',{method:'POST',body:JSON.stringify(body)});toast(d.message);e.target.reset();showAuth('login');}catch(err){toast(err.message,true);}};
$('#logoutBtn').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});currentUser=null;showAuth();};
$('#leaveForm').onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));try{const d=await api('/api/leave-requests',{method:'POST',body:JSON.stringify(body)});toast(d.message);e.target.reset();navigate('history');refresh();}catch(err){toast(err.message,true);}};
$('#quickApply').onclick=()=>navigate('apply');
$('#sideNav').onclick=e=>{const b=e.target.closest('[data-page]');if(b)navigate(b.dataset.page);};
document.body.addEventListener('click',async e=>{
  const goto=e.target.closest('[data-goto]');if(goto)navigate(goto.dataset.goto);
  const review=e.target.closest('[data-review]');if(review){const status=review.dataset.status;const comment=status==='rejected'?prompt('Optional reason for rejection:')||'':'';
    try{const d=await api(`/api/manager/requests/${review.dataset.review}`,{method:'PATCH',body:JSON.stringify({status,manager_comment:comment})});toast(d.message);loadTeamRequests();refresh();}catch(err){toast(err.message,true);}}
  const approval=e.target.closest('[data-approval]');if(approval){try{const d=await api(`/api/admin/employees/${approval.dataset.approval}/approval`,{method:'PATCH',body:JSON.stringify({approval_status:approval.dataset.value})});toast(d.message);loadPeople();}catch(err){toast(err.message,true);}}
});
document.body.addEventListener('change',async e=>{if(e.target.matches('[data-role]')){try{const d=await api(`/api/admin/employees/${e.target.dataset.role}/role`,{method:'PATCH',body:JSON.stringify({role:e.target.value})});toast(d.message);}catch(err){toast(err.message,true);}}});
(async()=>{try{const d=await api('/api/auth/me');if(d.user)showApp(d.user);else showAuth();}catch(e){showAuth();}})();
