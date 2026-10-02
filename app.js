(() => {
"use strict";

const KEY = "xmhtcv.v1";
const DEFAULT_POSITIONS = ["Phục vụ","Pha chế","Thu ngân","Bếp","Khác"];
const MENU = [
  ["dashboard","⌂","Trang tổng quan","Tổng ca / tổng giờ / thu nhập"],
  ["calendar","▣","Lịch tháng","Xem ca theo ngày"],
  ["add","＋","Thêm ca","Tạo ca làm mới"],
  ["stats","⌁","Thống kê","Ngày / tuần / tháng / công việc / vị trí"],
  ["positions","⌖","Vị trí làm việc","Thêm / đổi tên / xóa"],
  ["data","▤","Dữ liệu","Lưu máy, xuất PDF, sao lưu / nhập"],
  ["github","◉","Mở app GitHub","Mở trang GitHub chấm công"],
  ["account","♙","Tài khoản","Đăng nhập / tạo tài khoản / mật khẩu"],
];

const state = {
  route: "dashboard",
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: todayISO(),
  statsPeriod: "month",
  editingId: null
};

let db = loadDB();
let tempPhotos = {start:null,end:null};

function todayISO(d=new Date()){
  const x = new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return x.toISOString().slice(0,10);
}
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
function loadDB(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const x=JSON.parse(raw);
      return {positions:x.positions?.length?x.positions:DEFAULT_POSITIONS.slice(), shifts:Array.isArray(x.shifts)?x.shifts:[], account:x.account||null};
    }
  }catch(e){}
  return {positions:DEFAULT_POSITIONS.slice(), shifts:[], account:null};
}
function saveDB(){ localStorage.setItem(KEY, JSON.stringify(db)); }
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function money(n){return new Intl.NumberFormat("vi-VN").format(Math.round(Number(n)||0))+"đ";}
function hoursFor(s){
  if(!s || s.off || !s.start || !s.end) return 0;
  const [sh,sm]=s.start.split(":").map(Number), [eh,em]=s.end.split(":").map(Number);
  let a=sh*60+sm,b=eh*60+em;if(b<a)b+=1440;
  return Math.max(0,(b-a)/60);
}
function totalExtra(s){return (s.extras||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);}
function shiftPay(s){return s.off?0:hoursFor(s)*(Number(s.hourlyRate)||0)+totalExtra(s);}
function fmtHours(h){return Number.isInteger(h)?h.toString():h.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");}
function monthLabel(d){return d.toLocaleDateString("vi-VN",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());}
function startOfWeek(d){const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x;}
function endOfWeek(d){const x=startOfWeek(d);x.setDate(x.getDate()+6);return x;}
function between(date,a,b){return date>=todayISO(a)&&date<=todayISO(b);}
function shiftsForDate(date){return db.shifts.filter(s=>s.date===date);}
function hasOverlap(candidate){
  if(candidate.off || !candidate.start || !candidate.end) return [];
  const cStart = mins(candidate.start), cEnd = mins(candidate.end)+(mins(candidate.end)<mins(candidate.start)?1440:0);
  return db.shifts.filter(s=>{
    if(s.id===candidate.id || s.date!==candidate.date || s.off || !s.start || !s.end)return false;
    let a=mins(s.start),b=mins(s.end)+(mins(s.end)<mins(s.start)?1440:0);
    return cStart<b && a<cEnd;
  });
}
function mins(t){const [h,m]=t.split(":").map(Number);return h*60+m;}
function toast(msg){const el=document.querySelector("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600);}
function setRoute(route){
  state.route=route;
  if(route==="add") state.editingId=null;
  render(); closeDrawer();
}
function render(){
  const app=document.querySelector("#app");
  if(state.route==="dashboard")app.innerHTML=dashboardView();
  else if(state.route==="calendar")app.innerHTML=calendarView();
  else if(state.route==="add")app.innerHTML=shiftFormView(false);
  else if(state.route==="edit")app.innerHTML=shiftFormView(true);
  else if(state.route==="stats")app.innerHTML=statsView();
  else if(state.route==="positions")app.innerHTML=positionsView();
  else if(state.route==="data")app.innerHTML=dataView();
  else if(state.route==="github")app.innerHTML=githubView();
  else if(state.route==="account")app.innerHTML=accountView();
  else if(state.route==="photo")app.innerHTML=photoView();
  else if(state.route==="menu")app.innerHTML=menuView();
  bindPage();
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.route===state.route || (state.route==="add"&&b.dataset.route==="dashboard")));
}

function periodShifts(period){
  const now=new Date();
  let a,b;
  if(period==="day"){a=b=new Date(state.selectedDate+"T12:00:00");}
  else if(period==="week"){a=startOfWeek(new Date(state.selectedDate+"T12:00:00"));b=endOfWeek(a);}
  else {a=new Date(now.getFullYear(),now.getMonth(),1);b=new Date(now.getFullYear(),now.getMonth()+1,0);}
  return db.shifts.filter(s=>between(s.date,a,b));
}
function summary(list){
  return {count:list.length,hours:list.reduce((a,s)=>a+hoursFor(s),0),income:list.reduce((a,s)=>a+shiftPay(s),0)};
}
function dashboardView(){
  const now=new Date(), list=db.shifts.filter(s=>s.date.slice(0,7)===todayISO(now).slice(0,7));
  const sum=summary(list), recent=[...db.shifts].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return `<h1>Tổng quan</h1><div class="subtitle">Quản lý ca làm • giờ công • thu nhập</div>
  <div class="stats-grid">
    <div class="stat"><small>📅 Tổng ca</small><strong>${sum.count}</strong></div>
    <div class="stat pink"><small>🕐 Tổng giờ</small><strong>${fmtHours(sum.hours)}h</strong></div>
    <div class="stat green"><small>💰 Thu nhập</small><strong>${money(sum.income)}</strong></div>
  </div>
  <div class="card" style="margin-top:12px"><div class="card-title"><span>Ca gần đây</span><button class="link-btn" data-route="calendar">Xem tất cả</button></div>
  ${recent.length?recent.map(shiftCard).join(""):`<div class="empty">Chưa có ca nào. Bấm “Thêm ca” để bắt đầu.</div>`}</div>
  <button class="primary-btn big-add" data-route="add">＋ Thêm ca</button>`;
}
function shiftCard(s){
  const img=s.photoStart||s.photoEnd;
  return `<article class="shift-card">
    ${img?`<img class="thumb" src="${img}" alt="">`:`<div class="thumb">🕐</div>`}
    <div><h3>${esc(s.jobName)} ${s.off?`<span class="badge off-badge">OFF</span>`:""}</h3>
      <p>${esc(s.position)} • ${s.off?"Nghỉ":`${s.start||"--"} – ${s.end||"--"} • ${fmtHours(hoursFor(s))}h`}</p>
      <div class="actions"><button class="secondary-btn mini" data-edit="${s.id}">✏️ Sửa</button><button class="secondary-btn mini" data-copy="${s.id}">⧉ Sao chép</button><button class="danger-btn mini" data-delete="${s.id}">🗑️</button></div>
    </div><div class="money">${money(shiftPay(s))}</div>
  </article>`;
}
function calendarView(){
  const d=state.month, y=d.getFullYear(),m=d.getMonth(), first=new Date(y,m,1), last=new Date(y,m+1,0);
  const offset=(first.getDay()+6)%7, days=[];
  for(let i=0;i<offset;i++)days.push(`<div class="day muted"></div>`);
  for(let n=1;n<=last.getDate();n++){
    const date=todayISO(new Date(y,m,n)), ss=shiftsForDate(date);
    days.push(`<button class="day ${date===todayISO()?"today":""} ${date===state.selectedDate?"selected":""}" data-date="${date}"><span class="daynum">${n}</span><div>${ss.map(s=>`<i class="dot ${s.off?"off":""}" title="${esc(s.jobName)}"></i>`).join("")}</div></button>`);
  }
  const selected=shiftsForDate(state.selectedDate);
  return `<div class="calendar-head"><button class="icon-btn" data-month="-1">‹</button><h1>${monthLabel(d)}</h1><button class="icon-btn" data-month="1">›</button></div>
  <div class="card"><div class="calendar-grid">${["T2","T3","T4","T5","T6","T7","CN"].map(x=>`<div class="dow">${x}</div>`).join("")}${days.join("")}</div></div>
  <div class="card"><div class="card-title"><span>${new Date(state.selectedDate+"T12:00:00").toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</span><button class="link-btn" data-route="add">＋ Thêm</button></div>
  ${selected.length?selected.map(shiftCard).join(""):`<div class="empty">Ngày này chưa có ca.</div>`}</div>`;
}
function shiftFormView(edit){
  const s=edit?db.shifts.find(x=>x.id===state.editingId):null;
  return `<h1>${edit?"Sửa ca":"Thêm ca"}</h1><div class="subtitle">${edit?"Sửa toàn bộ thông tin ca làm":"Nhập đầy đủ thông tin để lưu ca"}</div>
  <div class="card">${document.querySelector("#shiftFormTemplate").innerHTML.replace("<form id=\"shiftForm\"","<form id=\"shiftForm\"").replace("</form>","")}</div>`;
}
function fillForm(){
  const edit=state.route==="edit", s=edit?db.shifts.find(x=>x.id===state.editingId):null;
  const f=document.querySelector("#shiftForm"); if(!f)return;
  f.querySelector("#shiftId").value=s?.id||"";
  f.querySelector("#jobName").value=s?.jobName||"";
  f.querySelector("#date").value=s?.date||state.selectedDate||todayISO();
  f.querySelector("#start").value=s?.start||"08:00";f.querySelector("#end").value=s?.end||"16:00";
  f.querySelector("#hourlyRate").value=s?.hourlyRate??60000;f.querySelector("#note").value=s?.note||"";
  f.querySelector("#off").checked=!!s?.off;
  const sel=f.querySelector("#position");sel.innerHTML=db.positions.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join("");
  sel.value=s?.position&&db.positions.includes(s.position)?s.position:db.positions[0];
  renderExtras(s?.extras||[]);
  tempPhotos={start:s?.photoStart||null,end:s?.photoEnd||null};renderPhotoPreviews();
  updateFormDisabled();updateCalc();
}
function renderExtras(extras){
  const el=document.querySelector("#extras");if(!el)return;
  el.innerHTML=extras.map((x,i)=>`<div class="extra-row"><input class="extra-name" value="${esc(x.name)}" placeholder="Tên phí"><input class="extra-amount" type="number" min="0" step="1000" value="${Number(x.amount)||0}"><button type="button" class="remove-extra" data-remove-extra="${i}">×</button></div>`).join("");
}
function collectExtras(){
  return [...document.querySelectorAll("#extras .extra-row")].map(r=>({name:r.querySelector(".extra-name").value.trim()||"Phí cộng thêm",amount:Number(r.querySelector(".extra-amount").value)||0})).filter(x=>x.amount||x.name);
}
function updateCalc(){
  const box=document.querySelector("#shiftPreview"), off=document.querySelector("#off")?.checked;
  if(!box)return;
  const fake={off,start:document.querySelector("#start")?.value,end:document.querySelector("#end")?.value,hourlyRate:Number(document.querySelector("#hourlyRate")?.value),extras:collectExtras()};
  box.innerHTML=off?"🌙 Ca OFF — không tính giờ và thu nhập.":`⏱️ ${fmtHours(hoursFor(fake))} giờ • 💰 ${money(shiftPay(fake))}`;
}
function updateFormDisabled(){
  const off=document.querySelector("#off")?.checked;["start","end","hourlyRate"].forEach(id=>{const e=document.querySelector("#"+id);if(e)e.disabled=off});
}
function positionsView(){
  return `<h1>Vị trí làm việc</h1><div class="subtitle">Có thể đổi tên vị trí để thống kê theo tên.</div><div class="card">
  <div class="position-list">${db.positions.map((p,i)=>`<div class="position-row"><span>⌖ ${esc(p)}</span><button class="secondary-btn mini" data-rename-position="${i}">✏️</button>${db.positions.length>1?`<button class="danger-btn mini" data-delete-position="${i}">🗑️</button>`:""}</div>`).join("")}</div>
  <button class="primary-btn big-add" data-add-position>＋ Thêm vị trí mới</button></div>`;
}
function statsView(){
  const list=periodShifts(state.statsPeriod);
  const search=(document.querySelector("#statsSearch")?.value||"").trim();
  const mode=document.querySelector("#statsMode")?.value||"job";
  const q=search.toLocaleLowerCase("vi-VN");

  // Tìm kiếm không phân biệt hoa/thường và tìm trên tên công việc,
  // vị trí, ghi chú. Kết quả thống kê chỉ lấy đúng các ca khớp tìm kiếm.
  const filtered=list.filter(s=>{
    if(!q)return true;
    return [s.jobName,s.position,s.note].some(v=>String(v||"").toLocaleLowerCase("vi-VN").includes(q));
  });

  const sum=summary(filtered);
  const groups={};
  filtered.forEach(s=>{
    const key=mode==="job"?s.jobName:s.position;
    if(!groups[key])groups[key]={count:0,hours:0,base:0,extra:0,actual:0};
    groups[key].count++;
    groups[key].hours+=hoursFor(s);
    groups[key].base+=s.off?0:hoursFor(s)*(Number(s.hourlyRate)||0);
    groups[key].extra+=totalExtra(s);
    groups[key].actual+=shiftPay(s);
  });

  const groupRows=Object.entries(groups).sort((a,b)=>b[1].actual-a[1].actual).map(([name,g])=>`
    <tr>
      <td><b>${esc(name)}</b></td>
      <td>${g.count}</td>
      <td>${fmtHours(g.hours)}h</td>
      <td>${money(g.base)}</td>
      <td>${money(g.extra)}</td>
      <td><b>${money(g.actual)}</b></td>
    </tr>`).join("");

  const detailRows=filtered.sort((a,b)=>
    a.date.localeCompare(b.date)||String(a.start||"").localeCompare(String(b.start||""))
  ).map(s=>{
    const base=s.off?0:hoursFor(s)*(Number(s.hourlyRate)||0);
    const extraNames=(s.extras||[]).filter(x=>Number(x.amount)||x.name).map(x=>`${esc(x.name)}: ${money(x.amount)}`).join("<br>")||"—";
    return `<tr>
      <td>${esc(s.date)}</td>
      <td><b>${esc(s.jobName)}</b><small class="table-sub">${esc(s.position)}</small></td>
      <td>${s.off?"OFF":`${esc(s.start||"--")} – ${esc(s.end||"--")}`}</td>
      <td>${s.off?"0":fmtHours(hoursFor(s))+"h"}</td>
      <td>${money(s.hourlyRate||0)}/h</td>
      <td>${extraNames}</td>
      <td>${money(base)}</td>
      <td><b>${money(shiftPay(s))}</b></td>
    </tr>`;
  }).join("");

  const modeLabel=mode==="job"?"Tên công việc":"Vị trí công việc";
  return `<h1>Thống kê</h1>
  <div class="subtitle">Chọn một dạng thống kê để xem bảng rõ ràng, không hiển thị dồn nhiều bảng.</div>

  <div class="card stats-controls">
    <div class="actions" style="justify-content:flex-start">
      ${["day","week","month"].map(p=>`<button class="${state.statsPeriod===p?"primary-btn":"secondary-btn"} mini" data-period="${p}">${p==="day"?"Theo ngày":p==="week"?"Theo tuần":"Theo tháng"}</button>`).join("")}
    </div>
    <div class="two-col stats-filter-row">
      <label>Dạng thống kê
        <select id="statsMode">
          <option value="job" ${mode==="job"?"selected":""}>Theo tên công việc</option>
          <option value="position" ${mode==="position"?"selected":""}>Theo vị trí công việc</option>
        </select>
      </label>
      <label>Tìm kiếm
        <input id="statsSearch" value="${esc(search)}" placeholder="Gõ tên công việc / vị trí...">
      </label>
    </div>
    <div class="notice">🔎 Tìm kiếm không phân biệt chữ hoa/chữ thường. Thống kê sẽ lọc đúng theo nội dung bạn nhập.</div>
  </div>

  <div class="stats-grid">
    <div class="stat"><small>Tổng ca</small><strong>${sum.count}</strong></div>
    <div class="stat"><small>Tổng giờ</small><strong>${fmtHours(sum.hours)}h</strong></div>
    <div class="stat green"><small>Thực lãnh</small><strong>${money(sum.income)}</strong></div>
  </div>

  <div class="card">
    <div class="card-title"><span>${modeLabel}</span><span class="badge">${filtered.length} ca</span></div>
    ${Object.keys(groups).length?`<div class="table-wrap"><table class="stats-table compact-table">
      <thead><tr><th>${modeLabel}</th><th>Số ca</th><th>Số giờ</th><th>Lương chưa cộng</th><th>Cộng thêm</th><th>Thực lãnh</th></tr></thead>
      <tbody>${groupRows}</tbody>
    </table></div>`:`<div class="empty">Không có dữ liệu phù hợp với tìm kiếm.</div>`}
  </div>

  <div class="card">
    <div class="card-title"><span>Chi tiết ${modeLabel.toLowerCase()}</span></div>
    ${filtered.length?`<div class="table-wrap"><table class="stats-table detail-table">
      <thead><tr><th>Ngày</th><th>Ca làm việc</th><th>Giờ vào/ra</th><th>Số giờ làm</th><th>Mức lương</th><th>Cộng thêm</th><th>Chưa cộng</th><th>Thực lãnh</th></tr></thead>
      <tbody>${detailRows}</tbody>
    </table></div>`:`<div class="empty">Không có ca nào để hiển thị.</div>`}
  </div>`;
}

function dataView(){
  return `<h1>Dữ liệu</h1><div class="subtitle">Bản này lưu trực tiếp trên thiết bị. Chưa kết nối cloud.</div>
  <div class="notice">💾 Dữ liệu được lưu tự động vào trình duyệt sau mỗi thay đổi. Hãy xuất file sao lưu định kỳ.</div>
  <div class="card menu-list">
    <button class="menu-item" id="exportJson">⬇️ <div><b>Xuất bản sao dữ liệu</b><small>File JSON để nhập lại chính xác dữ liệu</small></div></button>
    <button class="menu-item" id="printPdf">📄 <div><b>Xuất dữ liệu / báo cáo PDF</b><small>Mở chế độ in để chọn “Save as PDF”</small></div></button>
    <button class="menu-item" id="importJson">⬆️ <div><b>Nhập lại dữ liệu</b><small>Khôi phục từ file JSON đã sao lưu</small></div></button>
    <button class="menu-item" id="clearData">🗑️ <div><b>Xóa toàn bộ dữ liệu</b><small>Luôn yêu cầu xác nhận</small></div></button>
  </div>`;
}
function githubView(){
  return `<h1>App GitHub chấm công</h1><div class="subtitle">Nút này để mở đúng trang app GitHub của bạn.</div>
  <div class="card"><div class="empty">Bạn chưa đặt địa chỉ GitHub Pages trong bản này.</div>
  <button class="primary-btn big-add" id="setGithub">⚙️ Đặt địa chỉ GitHub Pages</button></div>`;
}
function accountView(){
  const a=db.account;
  return `<h1>Tài khoản</h1><div class="subtitle">Bản hiện tại chỉ quản lý tài khoản cục bộ, chưa gửi dữ liệu lên cloud.</div>
  <div class="card">${a?`<div class="notice">Đang dùng tài khoản: <b>${esc(a.email)}</b></div><div class="actions"><button class="secondary-btn" id="changePass">🔐 Đổi mật khẩu</button><button class="danger-btn" id="logout">Đăng xuất</button></div>`:`<div class="menu-list"><button class="menu-item" id="login">🔑 <div><b>Đăng nhập</b><small>Tài khoản local</small></div></button><button class="menu-item" id="createAccount">👤 <div><b>Tạo tài khoản</b><small>Tạo thông tin đăng nhập local</small></div></button></div>`}</div>
  <div class="notice">⚠️ Tài khoản local không phải hệ thống cloud. Khi làm cloud thật, phần này sẽ được thay bằng xác thực máy chủ.</div>`;
}
function photoView(){
  const s=db.shifts.find(x=>x.id===state.editingId);
  return `<h1>Ảnh ca làm</h1><div class="card">${s?.photoStart?`<h3>Ảnh đầu ca</h3><img class="photo-full" src="${s.photoStart}">`:""}${s?.photoEnd?`<h3>Ảnh cuối ca</h3><img class="photo-full" src="${s.photoEnd}">`:""}</div>`;
}
function menuView(){
  return `<h1>Menu</h1><div class="subtitle">Các chức năng chính</div><div class="menu-list">${MENU.map(([r,ico,t,d])=>`<button class="menu-item" data-route="${r}">${ico} <div><b>${t}</b><small>${d}</small></div></button>`).join("")}</div>`;
}

function bindPage(){
  document.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>setRoute(b.dataset.route==="menu"?"menu":b.dataset.route));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{state.editingId=b.dataset.edit;state.route="edit";render();});
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyShift(b.dataset.copy));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteShift(b.dataset.delete));
  document.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{state.selectedDate=b.dataset.date;state.month=new Date(b.dataset.date+"T12:00:00");render();});
  document.querySelectorAll("[data-month]").forEach(b=>b.onclick=()=>{state.month.setMonth(state.month.getMonth()+Number(b.dataset.month));render();});
  document.querySelectorAll("[data-period]").forEach(b=>b.onclick=()=>{state.statsPeriod=b.dataset.period;render();});
  document.querySelector("#statsMode")?.addEventListener("change",()=>{render();});
  document.querySelector("#statsSearch")?.addEventListener("input",e=>{
    const mode=document.querySelector("#statsMode")?.value||"job";
    const val=e.target.value;
    render();
    const input=document.querySelector("#statsSearch");
    if(input){input.focus();input.value=val;try{input.setSelectionRange(val.length,val.length);}catch{}}
  });
  document.querySelectorAll("[data-rename-position]").forEach(b=>b.onclick=()=>renamePosition(Number(b.dataset.renamePosition)));
  document.querySelectorAll("[data-delete-position]").forEach(b=>b.onclick=()=>deletePosition(Number(b.dataset.deletePosition)));
  document.querySelector("[data-add-position]")?.addEventListener("click",addPosition);
  document.querySelector("#shiftForm") && setupForm();
  document.querySelector("#exportJson")?.addEventListener("click",exportJSON);
  document.querySelector("#printPdf")?.addEventListener("click",printPDF);
  document.querySelector("#importJson")?.addEventListener("click",()=>importInput.click());
  document.querySelector("#clearData")?.addEventListener("click",clearData);
  document.querySelector("#setGithub")?.addEventListener("click",setGithub);
  document.querySelector("#login")?.addEventListener("click",login);
  document.querySelector("#createAccount")?.addEventListener("click",createAccount);
  document.querySelector("#changePass")?.addEventListener("click",changePass);
  document.querySelector("#logout")?.addEventListener("click",logout);
  document.querySelector("#addPositionInline")?.addEventListener("click",addPosition);
  document.querySelectorAll("[data-action=cancel]").forEach(b=>b.onclick=()=>setRoute("dashboard"));
  document.querySelectorAll("[data-remove-extra]").forEach(b=>b.onclick=()=>{const ex=collectExtras();ex.splice(Number(b.dataset.removeExtra),1);renderExtras(ex);updateCalc();});
  document.querySelector("#addExtra")?.addEventListener("click",()=>{const ex=collectExtras();ex.push({name:"Phí cộng thêm",amount:0});renderExtras(ex);});
}
const importInput=document.createElement("input");importInput.type="file";importInput.accept=".json,application/json";importInput.style.display="none";document.body.appendChild(importInput);
importInput.addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.shifts)||!Array.isArray(x.positions))throw Error();db={positions:x.positions,shifts:x.shifts,account:x.account||null};saveDB();toast("Đã nhập lại dữ liệu.");render();}catch{toast("File sao lưu không hợp lệ.");}e.target.value="";});

function setupForm(){
  fillForm();
  ["start","end","hourlyRate","off"].forEach(id=>document.querySelector("#"+id)?.addEventListener("input",()=>{updateFormDisabled();updateCalc();}));
  document.querySelector("#extras")?.addEventListener("input",updateCalc);
  document.querySelector("#photoStartCamera")?.addEventListener("change",e=>readImage(e.target.files[0],"start"));
  document.querySelector("#photoStartAlbum")?.addEventListener("change",e=>readImage(e.target.files[0],"start"));
  document.querySelector("#photoEndCamera")?.addEventListener("change",e=>readImage(e.target.files[0],"end"));
  document.querySelector("#photoEndAlbum")?.addEventListener("change",e=>readImage(e.target.files[0],"end"));
  document.querySelectorAll("[data-photo-camera]").forEach(b=>b.onclick=()=>document.querySelector("#photo"+b.dataset.photoCamera[0].toUpperCase()+b.dataset.photoCamera.slice(1)+"Camera").click());
  document.querySelectorAll("[data-photo-album]").forEach(b=>b.onclick=()=>document.querySelector("#photo"+b.dataset.photoAlbum[0].toUpperCase()+b.dataset.photoAlbum.slice(1)+"Album").click());
  document.querySelector("#shiftForm").addEventListener("submit",saveShift);
}
function readImage(file,which){if(!file)return;const r=new FileReader();r.onload=()=>{tempPhotos[which]=r.result;renderPhotoPreviews();};r.readAsDataURL(file);}
function renderPhotoPreviews(){["start","end"].forEach(k=>{const e=document.querySelector("#photo"+k[0].toUpperCase()+k.slice(1)+"Preview");if(e)e.innerHTML=tempPhotos[k]?`<img src="${tempPhotos[k]}" alt="Ảnh ${k}">`:"";});}
function saveShift(e){
  e.preventDefault();
  const id=document.querySelector("#shiftId").value||uid();
  const s={id,jobName:document.querySelector("#jobName").value.trim(),position:document.querySelector("#position").value,date:document.querySelector("#date").value,start:document.querySelector("#start").value,end:document.querySelector("#end").value,hourlyRate:Number(document.querySelector("#hourlyRate").value)||0,extras:collectExtras(),note:document.querySelector("#note").value.trim(),off:document.querySelector("#off").checked,photoStart:tempPhotos.start,photoEnd:tempPhotos.end};
  if(!s.jobName||!s.date||!s.position)return toast("Vui lòng nhập đủ thông tin bắt buộc.");
  const overlaps=hasOverlap(s);if(overlaps.length&&!confirm("Phát hiện trùng thời gian với: "+overlaps.map(x=>x.jobName).join(", ")+". Vẫn lưu ca này?"))return;
  const idx=db.shifts.findIndex(x=>x.id===id);if(idx>=0)db.shifts[idx]=s;else db.shifts.push(s);saveDB();toast("Đã lưu ca thành công.");state.selectedDate=s.date;state.month=new Date(s.date+"T12:00:00");state.route="calendar";render();
}
function deleteShift(id){const s=db.shifts.find(x=>x.id===id);if(s&&confirm(`Xóa ca “${s.jobName}” ngày ${s.date}?`)){db.shifts=db.shifts.filter(x=>x.id!==id);saveDB();toast("Đã xóa ca.");render();}}
function copyShift(id){const s=db.shifts.find(x=>x.id===id);if(!s)return;const c=JSON.parse(JSON.stringify(s));c.id=uid();c.date=state.selectedDate||todayISO();c.jobName=s.jobName+" (sao chép)";db.shifts.push(c);saveDB();toast("Đã sao chép ca.");render();}
function addPosition(){const p=prompt("Tên vị trí mới:","");if(!p?.trim())return;if(db.positions.includes(p.trim()))return toast("Vị trí này đã tồn tại.");db.positions.push(p.trim());saveDB();toast("Đã thêm vị trí.");render();}
function renamePosition(i){const old=db.positions[i], p=prompt("Đổi tên vị trí:",old);if(!p?.trim()||p.trim()===old)return;if(db.positions.includes(p.trim()))return toast("Tên vị trí đã tồn tại.");db.positions[i]=p.trim();db.shifts.forEach(s=>{if(s.position===old)s.position=p.trim();});saveDB();toast("Đã đổi tên vị trí và cập nhật thống kê.");render();}
function deletePosition(i){if(db.positions.length<=1)return toast("Phải giữ ít nhất một vị trí.");const p=db.positions[i];if(!confirm(`Xóa vị trí “${p}”? Các ca cũ sẽ chuyển sang “Khác”.`))return;db.positions.splice(i,1);db.shifts.forEach(s=>{if(s.position===p)s.position=db.positions.includes("Khác")?"Khác":db.positions[0]});saveDB();render();}
function exportJSON(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),...db},null,2)],{type:"application/json"});download(blob,"xac-minh-sao-luu-"+todayISO()+".json");toast("Đã tạo file sao lưu.");}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function printPDF(){
  const list=[...db.shifts].sort((a,b)=>a.date.localeCompare(b.date));
  const w=window.open("","_blank");if(!w)return toast("Trình duyệt đã chặn cửa sổ in.");
  w.document.write(`<html><head><title>Báo cáo chấm công</title><style>body{font-family:Arial;padding:25px;color:#222}h1{color:#6d45bd}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:7px;font-size:11px}th{background:#eee}</style></head><body><h1>XÁC MINH HOÀN THÀNH CÔNG VIỆC</h1><p>Xuất ngày ${new Date().toLocaleString("vi-VN")}</p><table><tr><th>Ngày</th><th>Công việc</th><th>Vị trí</th><th>Giờ</th><th>Tiền</th><th>Ghi chú</th></tr>${list.map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.jobName)}</td><td>${esc(s.position)}</td><td>${s.off?"OFF":`${s.start}-${s.end} (${fmtHours(hoursFor(s))}h)`}</td><td>${money(shiftPay(s))}</td><td>${esc(s.note)}</td></tr>`).join("")}</table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function clearData(){if(confirm("Xóa TOÀN BỘ ca, vị trí và tài khoản trên thiết bị? Không thể hoàn tác nếu chưa sao lưu.")){db={positions:DEFAULT_POSITIONS.slice(),shifts:[],account:null};saveDB();toast("Đã xóa dữ liệu.");render();}}
function setGithub(){const current=localStorage.getItem("xmhtcv.github")||"";const u=prompt("Nhập URL GitHub Pages của bạn:",current);if(u===null)return;if(!/^https?:\/\//i.test(u))return toast("URL phải bắt đầu bằng http:// hoặc https://");localStorage.setItem("xmhtcv.github",u);window.open(u,"_blank","noopener");}
function createAccount(){const email=prompt("Email/tên đăng nhập:");if(!email)return;const pass=prompt("Mật khẩu local:");if(!pass)return;db.account={email,password:pass};saveDB();toast("Đã tạo tài khoản local.");render();}
function login(){const email=prompt("Tên đăng nhập:");const pass=prompt("Mật khẩu:");if(db.account?.email===email&&db.account?.password===pass)toast("Đăng nhập thành công.");else toast("Sai thông tin hoặc chưa tạo tài khoản.");}
function changePass(){if(!db.account)return;const p=prompt("Mật khẩu mới:");if(p){db.account.password=p;saveDB();toast("Đã đổi mật khẩu.");}}
function logout(){toast("Đã đăng xuất.");}
function openDrawer(){document.querySelector("#drawer").classList.add("open");document.querySelector("#backdrop").classList.add("show");document.querySelector("#drawer").setAttribute("aria-hidden","false");document.querySelector("#drawerNav").innerHTML=MENU.map(([r,ico,t,d])=>`<button data-drawer-route="${r}">${ico} ${t}</button>`).join("");document.querySelectorAll("[data-drawer-route]").forEach(b=>b.onclick=()=>{setRoute(b.dataset.drawerRoute);closeDrawer();});}
function closeDrawer(){document.querySelector("#drawer").classList.remove("open");document.querySelector("#backdrop").classList.remove("show");}
document.querySelector("#menuBtn").onclick=openDrawer;document.querySelector("#closeMenu").onclick=closeDrawer;document.querySelector("#backdrop").onclick=closeDrawer;
document.querySelector("#bellBtn").onclick=()=>toast("Không có thông báo mới.");
document.querySelector("#bottomNav").addEventListener("click",e=>{const b=e.target.closest("button[data-route]");if(!b)return;setRoute(b.dataset.route==="menu"?"menu":b.dataset.route);});
render();
})();