const CATEGORIES=[
["Construction","🏗️"],["Mining & Resources","⛏️"],["Food & Beverage","🍺"],["Transportation","🚂"],["Finance","🏦"],["Retail","🛒"],["Manufacturing","⚙️"],["Hospitality","🏨"],["Professional Services","💼"],["Media","📰"],["Government","🏛️"],["Other","•••"]
];
const icons=Object.fromEntries(CATEGORIES.map(x=>x));
const DEMO_B=[
{id:"demo1",name:"Northstar Construction",category:"Construction",location:"Pavia",description:"Commercial and residential construction for towns, businesses and private clients.",services:"Construction, renovation, masonry",contact:"Northstar",website:"",verified:true,priority:10,status:"published"},
{id:"demo2",name:"Ironpeak Mining",category:"Mining & Resources",location:"Griffin",description:"Independent resource extraction and supply for local manufacturers.",services:"Mining, resource contracts",contact:"Ironpeak",website:"",verified:false,priority:0,status:"published"},
{id:"demo3",name:"The Copper Kettle",category:"Food & Beverage",location:"Pavia",description:"A local tavern serving drinks and food in the city center.",services:"Restaurant, tavern, events",contact:"CopperKettle",website:"",verified:true,priority:5,status:"published"}
];
let businesses=[],requests=[],ads=[],user=null,isAdmin=false,authMode="signin",useDemo=true;
const cfg=window.BLUEPAGES_CONFIG||{};
const supabaseReady=!!(cfg.SUPABASE_URL&&cfg.SUPABASE_PUBLISHABLE_KEY&&cfg.SUPABASE_URL.startsWith("http")&&!cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_"));
let supabase=null;
let supabaseLoadError="";
if(supabaseReady){
  if(window.supabase && typeof window.supabase.createClient === "function"){
    try{supabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY)}catch(e){supabaseLoadError=e.message||String(e)}
  } else {supabaseLoadError="The Supabase JavaScript library did not load. Check that the CDN is reachable."}
}
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=x=>esc(x||"Open");

function setLoading(on){document.body.classList.toggle("loading",on)}
async function loadData(){
 setLoading(true);
 if(!supabase){businesses=[...DEMO_B];requests=[{id:"dr1",title:"Need a warehouse built",category:"Construction",location:"Pavia",budget:"25,000",details:"Looking for a company to build a medium-sized warehouse.",contact:"MerchantGuild"}];ads=[];useDemo=true;setLoading(false);return}
 useDemo=false;
 const [b,r,a,s]=await Promise.all([
   supabase.from("businesses").select("*").eq("status","published").order("priority",{ascending:false}).order("created_at",{ascending:false}),
   supabase.from("service_requests").select("*").eq("status","open").order("created_at",{ascending:false}),
   supabase.from("ads").select("*").eq("active",true).order("priority",{ascending:false}).order("created_at",{ascending:false}),
   supabase.auth.getSession()
 ]);
 if(b.error)console.error(b.error);if(r.error)console.error(r.error);if(a.error)console.error(a.error);
 businesses=b.data||[];requests=r.data||[];ads=a.data||[];
 user=s.data?.session?.user||null;
 await refreshAdmin();
 setLoading(false);
}
async function refreshAdmin(){
 if(!supabase||!user){isAdmin=false;updateAuthUI();return}
 const {data}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
 isAdmin=data?.role==="admin";
 $("adminNav")?.classList.toggle("hidden",!isAdmin);$("footerAdminWrap")?.classList.toggle("hidden",!isAdmin);
 updateAuthUI();
 if(isAdmin)renderAdmin();
}
function fillSelects(){
 for(const [n] of CATEGORIES){
   for(const id of ["categoryFilter","formCategory","requestCategory"])$(id).insertAdjacentHTML("beforeend",`<option value="${esc(n)}">${icons[n]} ${esc(n)}</option>`);
 }
 updateLocations();populateAdBusinesses();
}
function updateLocations(){
 const locs=[...new Set(businesses.map(b=>b.location).filter(Boolean))].sort();
 for(const id of ["locationFilter","heroLocation"]){let el=$(id);if(!el)continue;let old=el.value;el.innerHTML='<option value="">All locations</option>'+locs.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");if(locs.includes(old))el.value=old}
}
function populateAdBusinesses(){
 const el=$("adBusinessSelect");if(!el)return;
 el.innerHTML='<option value="">Independent ad</option>'+businesses.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("");
}
const ROUTES={home:["home","ads","categories","home-panels"],directory:["directory"],categories:["categories"],requests:["requests"],about:["about"],list:["list"],"post-request":["post-request"],admin:["admin"]};
function route(name,scroll=true){
 const allowed=ROUTES[name]||ROUTES.home;
 document.querySelectorAll(".page-section").forEach(section=>section.classList.toggle("hidden-section",!allowed.includes(section.id)));
 if(name==="admin"&&!isAdmin){name="home";return route("home",scroll)}
 const target=document.getElementById(name);
 if(target&&scroll)window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-72),behavior:"smooth"});
 if(name==="home"&&scroll)window.scrollTo({top:0,behavior:"smooth"});
 if(name==="directory")renderDirectory();
 if(name==="categories")renderCategories();
 if(name==="requests")renderRequests();
 if(name==="admin"&&isAdmin)renderAdmin();
}
function routeFromHash(){let n=location.hash.slice(1)||"home";if(!Object.prototype.hasOwnProperty.call(ROUTES,n))n="home";route(n)}
document.addEventListener("click",e=>{
 const r=e.target.closest("[data-route]");if(r){e.preventDefault();let n=r.dataset.route;if(n==="admin"&&!isAdmin){$("signinModal").classList.remove("hidden");return}history.pushState({}, "", "#"+n);route(n)}
 const c=e.target.closest("[data-close]");if(c)$(c.dataset.close).classList.add("hidden");
 const v=e.target.closest(".view");if(v)showDetail(v.dataset.id);
 const cat=e.target.closest(".category");if(cat){history.pushState({}, "", "#directory");route("directory");$("categoryFilter").value=cat.dataset.category;renderDirectory()}
 const pt=e.target.closest("[data-priority-save]");if(pt)savePriority(pt.dataset.prioritySave);
 const adx=e.target.closest("[data-ad-toggle]");if(adx)toggleAd(adx.dataset.adToggle,adx.dataset.active==="true");
 const adDel=e.target.closest("[data-ad-delete]");if(adDel)deleteAd(adDel.dataset.adDelete);
 const tab=e.target.closest("[data-admin-tab]");if(tab){document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");document.querySelectorAll(".admin-panel").forEach(x=>x.classList.add("hidden"));$(tab.dataset.adminTab).classList.remove("hidden")}
});
window.addEventListener("hashchange",routeFromHash);
$("signInBtn")?.addEventListener("click",()=>{$("signinModal").classList.remove("hidden");updateAuthUI()});
$("authToggle").onclick=()=>{authMode=authMode==="signin"?"signup":"signin";updateAuthUI()};
$("authForm").onsubmit=async e=>{e.preventDefault();if(!supabase){alert("Connect Supabase first using config.js.");return}let f=new FormData(e.target);let email=f.get("email"),password=f.get("password");if(!supabase){alert(supabaseLoadError||"Supabase is not connected. Check config.js and the Supabase client script.");return} let result=authMode==="signin"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{data:{username:email.split("@")[0]}}});if(result.error)alert(result.error.message);else{user=result.data.user;await refreshAdmin();$("signinModal").classList.add("hidden");await loadData();alert(authMode==="signup"?"Account created. If email confirmation is enabled, check your email before signing in.":"Signed in.");}};
$("signOutBtn").onclick=async()=>{await supabase?.auth.signOut();user=null;isAdmin=false;$("signinModal").classList.add("hidden");await loadData()};
if(supabase)supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;setTimeout(refreshAdmin,0)});

function filtered(){
 const q=$("heroQuery").value.trim().toLowerCase(),cat=$("categoryFilter").value,loc=$("locationFilter").value,ver=$("verifiedFilter").checked;
 return businesses.filter(b=>{let text=[b.name,b.category,b.location,b.description,b.services,b.contact].join(" ").toLowerCase();return(!q||text.includes(q))&&(!cat||b.category===cat)&&(!loc||b.location===loc)&&(!ver||b.verified)})
 .sort((a,b)=>(b.priority||0)-(a.priority||0));
}
function renderDirectory(){
 let list=filtered();$("resultCount").textContent=`${list.length} business${list.length===1?"":"es"}`;
 $("businessGrid").innerHTML=list.map(b=>`<article class="business-card"><div class="card-top"><div><h3>${esc(b.name)}</h3><div class="meta">${icons[b.category]||"•"} ${esc(b.category)} · ${esc(b.location)}</div></div>${b.verified?'<span class="badge">✓ Verified</span>':""}</div><p>${esc(b.description)}</p><div class="services">${esc(b.services||"Services not specified")}</div><button class="view" data-id="${esc(b.id)}">View business →</button></article>`).join("");
 $("emptyState").classList.toggle("hidden",list.length!==0)
}
function renderCategories(){
 $("categoryGrid").innerHTML=CATEGORIES.map(([n,i])=>{let count=businesses.filter(b=>b.category===n).length;return`<button class="category" data-category="${esc(n)}"><div class="icon">${i}</div><h3>${esc(n)}</h3><p>${count} business${count===1?"":"es"}</p></button>`}).join("");
}
function renderFeatured(){
 let list=businesses.slice(0,3);
 $("featuredList").innerHTML=list.length?list.map(b=>`<button class="view" data-id="${esc(b.id)}">${icons[b.category]} <b>${esc(b.name)}</b> · ${esc(b.location)}${b.priority>0?" · ★ Priority":""}</button>`).join(""):`<div class="empty-panel"><div><b>No businesses yet</b><span>Be the first to add a business to Blue Pages.</span><button class="add-btn" data-route="list">List your business ＋</button></div></div>`
}
function renderRecent(){
 let list=requests.slice(0,3);$("recentRequests").innerHTML=list.length?list.map(r=>`<div style="margin-bottom:12px"><b>${esc(r.title)}</b><div class="muted">${icons[r.category]} ${esc(r.location)} · Budget: ${money(r.budget)}</div></div>`).join(""):`<div class="empty-panel"><div><b>No requests yet</b><span>Be the first to post a service request.</span><button class="outline" data-route="post-request">Post a request</button></div></div>`
}
function renderRequests(){$("requestGrid").innerHTML=requests.map(r=>`<article class="request-card"><h3>${esc(r.title)}</h3><div class="muted">${icons[r.category]} ${esc(r.category)} · ${esc(r.location)}</div><p>${esc(r.details)}</p><span class="tag">Budget: ${money(r.budget)}</span><p>Contact: <b>${esc(r.contact)}</b></p></article>`).join("")}
function renderAds(){
 const grid=$("adGrid");if(!grid)return;
 grid.innerHTML=ads.length?ads.map(a=>`<article class="ad-card">${a.image_url?`<img src="${esc(a.image_url)}" alt="">`:""}<div class="ad-card-body"><div class="sponsored">Sponsored</div><h3>${esc(a.title)}</h3><p>${esc(a.text||"")}</p>${a.target_url?`<a class="add-btn" style="display:inline-block;text-decoration:none" href="${esc(a.target_url)}" target="_blank" rel="noopener">Learn more →</a>`:""}</div></article>`).join(""):`<div class="empty-panel"><div><b>No sponsored listings</b><span>Ads will appear here when the directory owner creates them.</span></div></div>`
}
function showDetail(id){
 let b=businesses.find(x=>x.id===id);if(!b)return;
 $("detailContent").innerHTML=`<div class="detail-icon">${icons[b.category]||"•"}</div><div class="eyebrow">${esc(b.category)}</div><h2>${esc(b.name)}</h2>${b.verified?'<span class="badge">✓ Verified listing</span>':""}${b.priority>0?'<span class="badge" style="margin-left:5px">★ Priority</span>':""}<div class="detail-row"><div class="detail-label">Location</div><div class="detail-value">${esc(b.location)}</div></div><div class="detail-row"><div class="detail-label">About</div><div class="detail-value">${esc(b.description)}</div></div><div class="detail-row"><div class="detail-label">Services</div><div class="detail-value">${esc(b.services||"Not specified")}</div></div><div class="detail-row"><div class="detail-label">Contact</div><div class="detail-value">${esc(b.contact)}</div></div>${b.website?`<div class="detail-row"><div class="detail-label">Website</div><div class="detail-value"><a href="${esc(b.website)}" target="_blank" rel="noopener">${esc(b.website)}</a></div></div>`:""}`;
 $("detailModal").classList.remove("hidden")
}
function updateStats(){$("statBusinesses").textContent=businesses.length;$("statRequests").textContent=requests.length;$("statCategories").textContent=CATEGORIES.length;$("statCities").textContent=new Set(businesses.map(b=>b.location)).size}
function updateAuthUI(){
 const signed=!!user;$("signInBtn").textContent=signed?(isAdmin?"♙ Admin":"♙ Account"):"♙  Sign In";
 $("authTitle").textContent=signed?"Your account":authMode==="signin"?"Sign in":"Create account";
 $("authStatus").textContent=signed?`Signed in as ${user.email}`:"Sign in to submit listings and requests. Public browsing does not require an account.";
 $("authForm").classList.toggle("hidden",signed);$("signOutBtn").classList.toggle("hidden",!signed);
 $("authToggle").classList.toggle("hidden",signed);$("adminNav")?.classList.toggle("hidden",!isAdmin);$("footerAdminWrap")?.classList.toggle("hidden",!isAdmin);
}
function requireLogin(){if(!user){$("signinModal").classList.remove("hidden");return false}return true}

$("heroSearch").onsubmit=e=>{e.preventDefault();$("categoryFilter").value="";$("locationFilter").value=$("heroLocation").value;history.pushState({}, "", "#directory");route("directory");renderDirectory()};
$("categoryFilter").onchange=renderDirectory;$("locationFilter").onchange=renderDirectory;$("verifiedFilter").onchange=renderDirectory;
$("resetFilters").onclick=()=>{$("heroQuery").value="";$("categoryFilter").value="";$("locationFilter").value="";$("heroLocation").value="";$("verifiedFilter").checked=false;renderDirectory()};

$("businessForm").onsubmit=async e=>{
 e.preventDefault();if(!requireLogin())return;if(!supabase){alert("Connect Supabase first using config.js.");return}
 let f=new FormData(e.target);let row={owner_id:user.id,name:f.get("name"),category:f.get("category"),location:f.get("location"),description:f.get("description"),services:f.get("services"),contact:f.get("contact"),website:f.get("website"),verified:false,priority:0,status:"pending"};
 let {error}=await supabase.from("businesses").insert(row);if(error)alert(error.message);else{e.target.reset();await loadData();alert("Listing submitted. It is pending approval by the directory admin.");history.pushState({}, "", "#directory");route("directory");}
};
$("requestForm").onsubmit=async e=>{
 e.preventDefault();if(!requireLogin())return;if(!supabase){alert("Connect Supabase first using config.js.");return}
 let f=new FormData(e.target);let row={author_id:user.id,title:f.get("title"),category:f.get("category"),location:f.get("location"),budget:f.get("budget"),details:f.get("details"),contact:f.get("contact"),status:"open"};
 let {error}=await supabase.from("service_requests").insert(row);if(error)alert(error.message);else{e.target.reset();await loadData();history.pushState({}, "", "#requests");route("requests")}
};

async function savePriority(id){
 if(!isAdmin)return;let input=document.querySelector(`[data-priority-input="${id}"]`);let value=Math.max(0,Math.min(100,Number(input.value)||0));
 let {error}=await supabase.from("businesses").update({priority:value}).eq("id",id);if(error)alert(error.message);else{await loadData();renderAdmin();renderDirectory();renderFeatured()}
}
async function toggleAd(id,active){
 if(!isAdmin)return;let {error}=await supabase.from("ads").update({active}).eq("id",id);if(error)alert(error.message);else{await loadData();renderAdmin()}
}
async function deleteAd(id){
 if(!isAdmin||!confirm("Delete this ad?"))return;let {error}=await supabase.from("ads").delete().eq("id",id);if(error)alert(error.message);else{await loadData();renderAdmin()}
}
function renderAdmin(){
 $("business-admin").innerHTML=`<h3>Business priority</h3><p class="muted">Higher priority businesses appear earlier in directory results and the featured area. Only you can change this.</p><div style="overflow:auto"><table class="admin-table"><thead><tr><th>Business</th><th>Status</th><th>Priority</th><th>Verified</th></tr></thead><tbody>${businesses.map(b=>`<tr><td><b>${esc(b.name)}</b><br><span class="muted">${esc(b.location)}</span></td><td>${esc(b.status||"published")}</td><td><div class="priority-control"><input data-priority-input="${esc(b.id)}" type="number" min="0" max="100" value="${Number(b.priority)||0}"><button class="add-btn mini" data-priority-save="${esc(b.id)}">Save</button></div></td><td>${b.verified?"✓":"—"}</td></tr>`).join("")}</tbody></table></div>`;
 $("ad-admin").innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><h3>Ads</h3><p class="muted">Create, activate and deactivate sponsored listings.</p></div><button class="add-btn" id="newAdBtn">＋ Create ad</button></div>${ads.length?ads.map(a=>`<div class="admin-ad-row"><div><b>${esc(a.title)}</b><div class="muted">${a.active?"Active":"Inactive"} · Priority ${a.priority||0}</div></div><div><button class="outline mini" data-ad-toggle="${esc(a.id)}" data-active="${a.active}">${a.active?"Deactivate":"Activate"}</button> <button class="outline mini" data-ad-delete="${esc(a.id)}">Delete</button></div></div>`).join(""):`<p class="muted">No ads created yet.</p>`}`;
 $("newAdBtn").onclick=()=>$("adModal").classList.remove("hidden");
}
$("adForm").onsubmit=async e=>{
 e.preventDefault();if(!isAdmin||!supabase)return;
 let f=new FormData(e.target),end=f.get("ends_at");let row={title:f.get("title"),business_id:f.get("business_id")||null,text:f.get("text"),image_url:f.get("image_url"),target_url:f.get("target_url"),priority:Math.max(0,Math.min(100,Number(f.get("priority"))||0)),active:f.get("active")==="on",starts_at:new Date().toISOString(),ends_at:end?new Date(end).toISOString():null};
 let {error}=await supabase.from("ads").insert(row);if(error)alert(error.message);else{e.target.reset();$("adModal").classList.add("hidden");await loadData();renderAdmin();renderAds()}
};

fillSelects();
loadData().then(()=>{updateStats();updateLocations();renderCategories();renderFeatured();renderRecent();renderRequests();renderAds();routeFromHash()});
