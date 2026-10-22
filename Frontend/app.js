const app = document.getElementById('app');
const modalRoot = document.getElementById('modalRoot');
const toastRoot = document.getElementById('toastRoot');

const I = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
// Official Stitch logo is embedded so it also works when index.html is opened directly on Windows.
const LOGO_COLOR = "data:image/webp;base64,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";
const logo = (onDark = false) => `<a class="logo logo-image ${onDark ? 'logo--on-dark' : ''}" href="#/home" data-home-link aria-label="BloodBridge — go to homepage"><img class="brand-logo" src="${LOGO_COLOR}" alt="BloodBridge" /></a>`;

const requests = [
  { id: 'REQ-2408', hospital: 'City General Hospital', distance: '2.4 miles away', priority: 'Critical', badge: 'red', type: 'O−', units: 4, left: '2h', reason: 'Trauma Surgery' },
  { id: 'REQ-2409', hospital: 'Mercy Medical Center', distance: '5.1 miles away', priority: 'High', badge: 'amber', type: 'A+', units: 2, left: '6h', reason: 'Emergency Surgery' },
  { id: 'REQ-2410', hospital: 'St. Jude Clinic', distance: '8.3 miles away', priority: 'Standard', badge: 'green', type: 'B−', units: 1, left: '24h+', reason: 'Inventory Refill' },
  { id: 'REQ-2411', hospital: 'Metro Health Institute', distance: '10.7 miles away', priority: 'Critical', badge: 'red', type: 'AB−', units: 3, left: '1h', reason: 'ICU Patient' },
  { id: 'REQ-2412', hospital: 'Valley Community Hospital', distance: '12.1 miles away', priority: 'High', badge: 'amber', type: 'O+', units: 5, left: '8h', reason: 'Scheduled Procedure' },
  { id: 'REQ-2413', hospital: 'Northside Medical Center', distance: '14.5 miles away', priority: 'Standard', badge: 'green', type: 'A−', units: 2, left: '24h+', reason: 'General Reserve' }
];

const inventory = [
  { type: 'O−', units: 45, location: 'Central Blood Bank', status: 'Critical Low', badge: 'red', percent: 18 },
  { type: 'A+', units: 1204, location: 'North Wing Regional', status: 'Optimal', badge: 'green', percent: 82 },
  { type: 'B−', units: 120, location: 'South Clinic', status: '12 Expiring (48h)', badge: 'amber', percent: 52 },
  { type: 'O+', units: 860, location: 'Central Blood Bank', status: 'Adequate', badge: 'green', percent: 71 },
  { type: 'AB−', units: 24, location: 'Mercy General', status: 'Critical Low', badge: 'red', percent: 12 },
  { type: 'A−', units: 437, location: 'Westside Center', status: 'Stable', badge: 'green', percent: 64 },
  { type: 'B+', units: 985, location: 'Metro Blood Center', status: 'Optimal', badge: 'green', percent: 87 },
  { type: 'AB+', units: 610, location: 'North Wing Regional', status: 'Adequate', badge: 'green', percent: 69 }
];

const centers = [
  { name: 'Mercy General Hospital', address: '1240 Healthway Blvd', distance: '0.8 mi', types: ['O−','A−'], time: 'Today, 2:30 PM', active: true },
  { name: 'Central Metro Blood Center', address: '85 Hope Street', distance: '1.7 mi', types: ['O+','B−'], time: 'Today, 3:15 PM' },
  { name: 'St. Jude Medical Center', address: '221 Central Avenue', distance: '2.6 mi', types: ['AB−','O−'], time: 'Tomorrow, 9:00 AM' },
  { name: 'Westside Donation Clinic', address: '765 Ridge Road', distance: '4.2 mi', types: ['A+','B+'], time: 'Today, 5:00 PM' }
];

const users = [
  { initials:'JD', name:'John Doe', id:'DON-84729', type:'O+', role:'Donor', status:'Verified', badge:'green', active:'Today, 09:41 AM' },
  { initials:'AS', name:'Alice Smith', id:'DON-84730', type:'A−', role:'Donor', status:'Pending', badge:'amber', active:'Yesterday, 2:22 PM' },
  { initials:'MG', name:'Mercy General', id:'HOSP-8921', type:'Facility', role:'Hospital', status:'Verified', badge:'green', active:'Today, 08:19 AM' },
  { initials:'MC', name:'Michael Chen', id:'DON-84745', type:'B+', role:'Donor', status:'Verified', badge:'green', active:'Aug 20, 2026' },
  { initials:'SJ', name:'Sarah Jenkins', id:'DON-84902', type:'O−', role:'Donor', status:'Pending', badge:'amber', active:'Aug 20, 2026' }
];

function getRoute() {
  const raw = location.hash.replace(/^#/, '') || '/home';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/home', query: new URLSearchParams(query) };
}

function navigate(path) {
  location.hash = path.startsWith('/') ? path : `/${path}`;
}

function toast(title, message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.innerHTML = `${I(type === 'error' ? 'alert' : 'check-circle')}<div><strong>${title}</strong><p>${message}</p></div>`;
  toastRoot.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-6px)'; }, 3500);
  setTimeout(() => el.remove(), 3800);
}

function openModal(content, footer = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true" aria-label="BloodBridge dialog">${content}${footer ? `<div class="modal-foot">${footer}</div>` : ''}</div></div>`;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modalRoot.querySelector('.modal-close, input, select, button')?.focus());
}

function closeModal() {
  modalRoot.innerHTML = '';
  document.body.style.overflow = '';
}

function mapMarkup(full = false) {
  return `<div class="map-canvas">
    <div class="map-grid"></div>
    <svg viewBox="0 0 900 430" preserveAspectRatio="none" aria-hidden="true">
      <path class="map-water" d="M690-20c-60 80-42 144 34 184s101 118 54 287h160V-20Z"/>
      <path class="map-road" d="M-20 332C150 278 198 358 350 251S600 90 920 82"/>
      <path class="map-road" d="M81-30c61 110 110 151 209 207s171 141 201 280"/>
      <path class="map-road" d="M-10 94c178 28 283 14 420-36s242-21 334 96"/>
      <path class="map-road-minor" d="M-20 225c137-26 265-5 386 63s280 54 416-15M212-20c-14 137-6 246 72 460M582-20c-82 125-66 239 22 460M-10 391c248-50 455-43 660 28"/>
    </svg>
    <span class="map-pin primary" style="left:48%;top:43%">${I('hospital')}</span>
    <span class="map-pin green" style="left:26%;top:66%">${I('drop')}</span>
    <span class="map-pin" style="left:69%;top:30%">${I('hospital')}</span>
    <span class="map-pin green" style="left:73%;top:68%">${I('drop')}</span>
    <span class="map-pin" style="left:38%;top:24%">${I('hospital')}</span>
    ${full ? `<span class="map-pin green" style="left:18%;top:31%">${I('drop')}</span><span class="map-pin" style="left:58%;top:79%">${I('hospital')}</span>` : ''}
    <div class="map-legend"><span><i></i> Hospitals</span><span><i class="green"></i> Blood centers</span></div>
  </div>`;
}

function publicNav() {
  return `<nav class="public-nav">
    <div class="public-nav__inner">
      ${logo()}
      <div class="public-links" id="publicLinks">
        <a href="#/home" data-scroll="about">About us</a><a href="#/home" data-scroll="impact">Impact</a><a href="#/home" data-scroll="network">Our network</a><a href="#/home" data-scroll="how">How it works</a>
      </div>
      <div class="public-actions">
        <a href="#/login" class="btn btn-secondary btn-sm">Sign in</a>
        <a href="#/register" class="btn btn-primary btn-sm">Join BloodBridge ${I('arrow','icon-sm')}</a>
        <button class="btn-icon mobile-menu-btn" data-mobile-menu aria-label="Open menu">${I('menu')}</button>
      </div>
    </div>
  </nav>`;
}

function homePage() {
  return `<div class="public-page">
    ${publicNav()}
    <main>
      <section class="hero" id="about">
        <div class="hero-copy">
          <span class="eyebrow">Every second matters</span>
          <h1>Connecting blood to those who <span>need it most.</span></h1>
          <p>BloodBridge intelligently connects hospitals, blood banks, and verified donors in real time—making life-saving blood available when every minute counts.</p>
          <div class="hero-actions">
            <a href="#/register" class="btn btn-primary btn-lg">Become a donor ${I('arrow')}</a>
            <a href="#/login?role=hospital" class="btn btn-secondary btn-lg">Hospital access</a>
          </div>
          <div class="hero-trust"><span>${I('shield','icon-sm')} Secure & confidential</span><span>${I('check-circle','icon-sm')} Verified network</span><span>${I('clock','icon-sm')} 24/7 response</span></div>
        </div>
        <div class="hero-visual" aria-label="Live emergency matching preview">
          <div class="hero-pulse"><svg viewBox="0 0 800 140" preserveAspectRatio="none"><path d="M0 78h135l24-38 34 81 42-61 28 18h103l18-32 47 67 34-35h335" fill="none" stroke="#fff" stroke-width="3"/></svg></div>
          <div class="match-card">
            <div class="match-card__head"><strong>${I('alert','icon-sm')} Emergency Request</strong><span class="live-pill"><i></i> Live matching</span></div>
            <div class="match-card__body">
              <div class="request-line"><div class="blood-orb"><span>O−</span></div><div><small>Blood type required</small><strong>O Negative</strong></div><div class="units"><b>4</b><small>Units</small></div></div>
              <div class="match-route"><div class="route-track"><i></i><i></i></div><div class="route-points"><div><span><small>Matched source</small><strong>Central Blood Bank</strong></span><b>Verified</b></div><div><span><small>Destination</small><strong>Mercy General Hospital</strong></span><b>ETA 12 min</b></div></div></div>
            </div>
          </div>
          <div class="hero-status"><div class="hero-status__icon">${I('ambulance')}</div><div><small>Network status</small><strong>12 facilities responding now</strong></div></div>
        </div>
      </section>
      <section class="stats-strip" id="impact"><div class="stats-strip__inner">
        <div class="public-stat"><strong data-count="12458" data-format="comma">0</strong><span>Verified donors</span></div><div class="public-stat"><strong data-count="1284" data-format="comma">0</strong><span>Matches this month</span></div><div class="public-stat"><strong data-count="98.5" data-decimals="1" data-suffix="%">0%</strong><span>Fulfillment rate</span></div><div class="public-stat"><strong data-count="11" data-suffix=" min">0 min</strong><span>Average match time</span></div>
      </div></section>
      <section class="public-section" id="network"><div class="public-section__inner">
        <div class="section-heading"><span class="eyebrow">One connected network</span><h2 class="section-title">Built for faster, safer emergency response.</h2><p>A clinically focused platform that helps healthcare teams act with confidence while enabling donors to create measurable impact.</p></div>
        <div class="feature-grid">
          <article class="feature"><span class="feature-number">01</span><div class="feature-icon">${I('alert')}</div><h3>Real-time emergency matching</h3><p>Automatically locate compatible blood across the nearest verified facilities and donor network.</p></article>
          <article class="feature"><span class="feature-number">02</span><div class="feature-icon">${I('box')}</div><h3>Live inventory intelligence</h3><p>Monitor blood levels, expiration risks, and regional shortages from one clinical dashboard.</p></article>
          <article class="feature"><span class="feature-number">03</span><div class="feature-icon">${I('shield')}</div><h3>Secure verified network</h3><p>Connect only with approved hospitals, licensed facilities, and verified voluntary donors.</p></article>
        </div>
      </div></section>
      <section class="public-section how-section" id="how"><div class="public-section__inner">
        <div class="section-heading center"><span class="eyebrow">How it works</span><h2 class="section-title">From urgent request to verified match.</h2><p>BloodBridge simplifies a complex emergency workflow into four clear, trackable steps.</p></div>
        <div class="process-grid"><div class="process"><div class="process-num">1</div><h3>Submit request</h3><p>Clinical staff enter the blood type, units, destination, and urgency.</p></div><div class="process"><div class="process-num">2</div><h3>Find availability</h3><p>The network checks live inventory and eligible nearby donors.</p></div><div class="process"><div class="process-num">3</div><h3>Verify & route</h3><p>Compatibility and optimal transport routes are confirmed.</p></div><div class="process"><div class="process-num">4</div><h3>Deliver & track</h3><p>Teams monitor fulfillment until the blood safely arrives.</p></div></div>
      </div></section>
      <section class="cta-section"><div class="cta-card"><div><h2>Your donation can be someone's tomorrow.</h2><p>Join thousands of verified donors ready to answer urgent needs.</p></div><a href="#/register" class="btn btn-lg">Register as a donor ${I('arrow')}</a></div></section>
    </main>
    <footer class="public-footer"><div class="footer-inner"><div class="footer-brand">${logo(true)}<p>Connecting donors, hospitals, and blood banks through secure, intelligent emergency matching.</p></div><div class="footer-col"><h4>Platform</h4><a href="#/home" data-scroll="how">How it works</a><a href="#/login">Hospital access</a><a href="#/register">Donor registration</a></div><div class="footer-col"><h4>Company</h4><a href="#/home" data-scroll="about">About us</a><a href="#/home" data-scroll="impact">Our impact</a><a href="#" data-support>Contact</a></div><div class="footer-col"><h4>Legal</h4><a href="#" data-support>Privacy policy</a><a href="#" data-support>Terms of service</a><a href="#" data-support>Security</a></div></div><div class="footer-bottom"><span>© 2026 BloodBridge. All rights reserved.</span><span>Built to save lives, one match at a time.</span></div></footer>
  </div>`;
}

function authLayout(kind = 'login', role = 'hospital') {
  const isLogin = kind === 'login';
  const isDonor = role === 'donor';
  const asideTitle = isLogin ? (isDonor ? 'Welcome back, donor.' : 'Secure access for clinical teams.') : 'Connect. Donate. Save lives.';
  const asideText = isLogin ? (isDonor ? 'Your willingness to donate makes a measurable difference. Sign in to manage appointments and respond to urgent needs.' : 'Monitor inventory, submit emergency requests, and coordinate life-saving matches through one trusted network.') : 'Join our secure network of donors and medical professionals. Your contribution is a vital link in emergency healthcare.';
  return `<div class="auth-page">
    <aside class="auth-aside">${logo(true)}<div class="auth-message"><div class="icon-wrap">${I(isLogin ? 'lock' : 'heart','icon-lg')}</div><h1>${asideTitle}</h1><p>${asideText}</p></div><div class="auth-security">${I('shield','icon-sm')} Secure & confidential healthcare network</div></aside>
    <main class="auth-main"><a href="#/home" class="back-home">${I('x','icon-sm')} Close</a>${isLogin ? loginForm(role) : registerForm()}</main>
  </div>`;
}

function loginForm(role) {
  const isDonor = role === 'donor';
  return `<div class="auth-card">
    <div class="auth-heading"><span class="eyebrow">Account access</span><h2>Sign in to BloodBridge</h2><p>${isDonor ? 'Access your donor profile and upcoming appointments.' : 'Use your verified institutional credentials to continue.'}</p></div>
    <div class="role-switch"><button data-role="hospital" class="${!isDonor ? 'active' : ''}">${I('hospital','icon-sm')} Hospital staff</button><button data-role="donor" class="${isDonor ? 'active' : ''}">${I('heart','icon-sm')} Donor</button></div>
    <form id="loginForm" data-role-value="${role}">
      <div class="form-group"><label class="form-label" for="loginEmail">${isDonor ? 'Email or phone number' : 'Institutional email'}</label><div class="input-wrap">${I(isDonor ? 'user' : 'mail')}<input id="loginEmail" type="text" placeholder="${isDonor ? 'alex@example.com' : 'name@hospital.org'}" required /></div></div>
      <div class="form-group"><label class="form-label" for="loginPassword">Password <a href="#" data-forgot>Forgot password?</a></label><div class="input-wrap">${I('lock')}<input id="loginPassword" type="password" placeholder="Enter your password" required minlength="4"/><button type="button" class="password-toggle" data-password-toggle aria-label="Show password">${I('eye','icon-sm')}</button></div></div>
      <label class="form-check"><input type="checkbox" checked /> Keep me signed in on this device</label>
      <button class="btn btn-primary btn-block btn-lg" type="submit">${isDonor ? 'Login as donor' : 'Secure login'} ${I('arrow')}</button>
    </form>
    <div class="auth-divider">New to BloodBridge?</div><a href="#/register" class="btn btn-secondary btn-block">${isDonor ? 'Register as a donor' : 'Request access'} ${I('user','icon-sm')}</a>
    <p class="auth-bottom">Need help? <a href="#" data-support>Contact support</a></p>
  </div>`;
}

function registerForm() {
  return `<div class="auth-card auth-card--wide">
    <div class="auth-heading"><span class="eyebrow">Join the network</span><h2>Create an account</h2><p>Register to join the BloodBridge donor and healthcare network.</p></div>
    <form id="registerForm">
      <div class="form-row"><div class="form-group"><label class="form-label">Full name</label><div class="input-wrap">${I('user')}<input type="text" placeholder="Your full name" required /></div></div><div class="form-group"><label class="form-label">Account type</label><div class="input-wrap">${I('users')}<select class="has-icon" id="accountType"><option value="donor">Blood Donor</option><option value="hospital">Medical Professional</option></select></div></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Blood type</label><div class="input-wrap">${I('drop')}<select class="has-icon" required><option value="">Select type</option><option>A+</option><option>A−</option><option>B+</option><option>B−</option><option>AB+</option><option>AB−</option><option>O+</option><option>O−</option><option>I don't know</option></select></div></div><div class="form-group"><label class="form-label">Contact number</label><div class="input-wrap">${I('phone')}<input type="tel" placeholder="+91 98765 43210" required /></div></div></div>
      <div class="form-group"><label class="form-label">Email address</label><div class="input-wrap">${I('mail')}<input type="email" placeholder="you@example.com" required /></div></div>
      <div class="form-group"><label class="form-label">Location</label><div class="input-wrap">${I('pin')}<input type="text" placeholder="Ahmedabad, Gujarat" required /></div></div>
      <label class="form-check"><input type="checkbox" required /> I agree to BloodBridge's Terms of Service and Privacy Policy.</label>
      <button class="btn btn-primary btn-block btn-lg" type="submit">Create account ${I('arrow')}</button>
    </form>
    <p class="auth-bottom">Already have an account? <a href="#/login">Return to login</a></p><p class="auth-terms">Your information is encrypted and handled according to applicable healthcare privacy standards.</p>
  </div>`;
}

const navSets = {
  hospital: [
    ['Overview','grid','/dashboard'], ['Emergency Request','alert','/emergency'], ['Active Requests','drop','/requests','6'], ['Find Centers','map','/centers'], ['Inventory','box','/inventory']
  ],
  donor: [
    ['My Dashboard','grid','/donor-dashboard'], ['Blood Requests','alert','/requests','6'], ['Find Centers','map','/centers'], ['My Profile','user','/profile']
  ],
  admin: [
    ['Dashboard','grid','/admin'], ['User Management','users','/users'], ['Inventory','box','/inventory'], ['Pending Requests','file','/pending','3'], ['Verification Queue','shield','/verification','12']
  ]
};

function shell(content, activePath, role = 'hospital', title = 'Overview') {
  const nav = navSets[role];
  const roleName = role === 'admin' ? 'System Administrator' : role === 'donor' ? 'Verified Donor' : 'Chief Surgeon';
  const personName = role === 'admin' ? 'Admin Team' : role === 'donor' ? 'Alex Morgan' : 'Dr. Sarah Chen';
  const initials = role === 'admin' ? 'AD' : role === 'donor' ? 'AM' : 'SC';
  const groups = role === 'admin' ? ['MANAGEMENT'] : role === 'donor' ? ['DONOR PORTAL'] : ['CLINICAL OPERATIONS'];
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar"><div class="sidebar-brand">${logo()}</div><nav class="sidebar-nav"><div class="nav-section-label">${groups[0]}</div>${nav.map(([label, icon, path, count]) => `<a href="#${path}" class="nav-item ${activePath === path ? 'active' : ''}">${I(icon)}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</a>`).join('')}<div class="nav-section-label">ACCOUNT</div><a href="#${role === 'donor' ? '/profile' : '/home'}" class="nav-item">${I('settings')}<span>Settings</span></a><a href="#/home" class="nav-item">${I('log-out')}<span>Sign out</span></a></nav><div class="sidebar-footer"><div class="sidebar-profile"><div class="avatar">${initials}</div><div><strong>${personName}</strong><span>${roleName}</span></div>${I('chevron')}</div></div></aside>
    <div class="overlay" id="sidebarOverlay" data-sidebar-close></div>
    <div class="main-shell"><header class="topbar"><div class="topbar-left"><button class="btn-icon sidebar-toggle" data-sidebar-toggle aria-label="Open navigation">${I('menu')}</button><div class="breadcrumb"><span>BloodBridge</span>${I('chevron','icon-sm')}<strong>${title}</strong></div></div><div class="topbar-right"><div class="top-search">${I('search')}<input type="search" placeholder="Search BloodBridge" data-global-search /></div><button class="btn-icon notification-btn" data-notifications aria-label="Notifications">${I('bell')}</button><div class="avatar">${initials}</div></div></header><main class="content">${content}</main></div>
  </div>`;
}

function kpi(label, value, icon, color, meta) {
  return `<div class="card kpi-card"><div class="kpi-top"><span>${label}</span><span class="kpi-icon ${color}">${I(icon)}</span></div><div class="kpi-value">${value}</div><div class="kpi-meta">${meta}</div></div>`;
}

function pageHead(title, subtitle, actions = '') {
  return `<div class="page-head"><div class="page-title"><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
}

function hospitalDashboard() {
  const content = `${pageHead('System Overview', 'Real-time status of blood inventory and critical requests.', `<button class="btn btn-secondary">${I('download','icon-sm')} Export report</button><a href="#/emergency" class="btn btn-primary">${I('plus','icon-sm')} Emergency Request</a>`)}
    <section class="kpi-grid">${kpi('ACTIVE REQUESTS','24','alert','red','<span class="text-red">8 critical priority</span>')}${kpi('TOTAL INVENTORY','1,452','box','blue','<span class="up">↗ 12%</span> vs last week')}${kpi('ACTIVE DONORS','386','users','green','Across 12 verified centers')}${kpi('MATCH RATE','98.5%','check-circle','amber','<span class="up">↗ 2.4%</span> this month')}</section>
    <section class="dashboard-grid"><div class="dashboard-stack"><div class="card map-card"><div class="card-head"><div><h2>Live Operations Map</h2><p>Real-time facility and donor network status</p></div><a href="#/centers" class="link-red">View full map ${I('arrow')}</a></div>${mapMarkup()}</div>
      <div class="card"><div class="card-head"><div><h2>Urgent Requests</h2><p>Requests requiring immediate fulfillment</p></div><a href="#/requests" class="link-red">View all ${I('arrow')}</a></div><div class="data-table-wrap"><table class="request-table"><thead><tr><th>Type</th><th>Facility</th><th>Priority</th><th>Units</th><th>Time left</th><th></th></tr></thead><tbody>${requests.slice(0,3).map(r => `<tr><td><span class="type-chip">${r.type}</span></td><td><strong>${r.hospital}</strong>${r.reason}</td><td><span class="badge badge-${r.badge} badge-dot">${r.priority}</span></td><td>${r.units} units</td><td>${r.left}</td><td><button class="btn btn-primary btn-sm" data-fulfill="${r.id}">Fulfill</button></td></tr>`).join('')}</tbody></table></div></div></div>
      <aside class="dashboard-stack"><div class="card"><div class="card-head"><div><h2>Inventory Status</h2><p>Across all active centers</p></div><a href="#/inventory" class="link-red">View all</a></div><div class="inventory-list">${inventory.slice(0,4).map(x => `<div class="inventory-row"><span class="blood-mini">${x.type}</span><div><div class="inventory-name">${x.units} units available</div><div class="inventory-bar"><i class="${x.badge === 'red' ? 'low' : x.badge === 'amber' ? 'warn' : ''}" style="width:${x.percent}%"></i></div></div><span class="text-${x.badge}">${x.status}</span></div>`).join('')}</div></div>
      <div class="card"><div class="card-head"><div><h2>System Alerts</h2><p>Latest operational updates</p></div><span class="badge badge-red">3 new</span></div><div class="alert-list"><div class="alert-item"><span class="alert-icon red">${I('alert')}</span><div><strong>O− inventory critically low</strong><p>St. Jude Center reports below minimum reserve.</p></div><time>10m</time></div><div class="alert-item"><span class="alert-icon blue">${I('box')}</span><div><strong>Inventory re-stocked</strong><p>150 units of A+ logged at Metro General.</p></div><time>1h</time></div><div class="alert-item"><span class="alert-icon amber">${I('clock')}</span><div><strong>Transport route delayed</strong><p>Route 4A ETA revised by 30 minutes.</p></div><time>3h</time></div></div></div></aside></section>`;
  return shell(content, '/dashboard', 'hospital', 'Overview');
}

function adminDashboard() {
  const content = `${pageHead('Dashboard Overview', 'Real-time clinical metrics and system status.', `<button class="btn btn-secondary">${I('download','icon-sm')} Export analytics</button><a href="#/users" class="btn btn-primary">${I('plus','icon-sm')} Add User</a>`)}
  <section class="kpi-grid">${kpi('TOTAL ACTIVE DONORS','12,458','users','green','<span class="up">↗ 4.2%</span> this week')}${kpi('CRITICAL REQUESTS','34','alert','red','<span class="text-red">Requires immediate action</span>')}${kpi('LOW INVENTORY ALERTS','8','box','amber','O− (2) · AB− (6)')}${kpi('SUCCESSFUL MATCHES (24H)','1,284','check-circle','blue','<span class="up">98.5%</span> fulfillment rate')}</section>
  <section class="dashboard-grid"><div class="card map-card"><div class="card-head"><div><h2>Live Operations</h2><p>Regional blood movement and facility status</p></div><a href="#/centers" class="link-red">View full map ${I('arrow')}</a></div>${mapMarkup(true)}</div><div class="card"><div class="card-head"><div><h2>System Alerts</h2><p>Operational events requiring review</p></div><span class="badge badge-red">3 critical</span></div><div class="alert-list"><div class="alert-item"><span class="alert-icon red">${I('ambulance')}</span><div><strong>Transport Delay — Route 4A</strong><p>Vehicle BD-492 reporting a 30m delay. Blood temperature stable.</p></div><time>10 min</time></div><div class="alert-item"><span class="alert-icon blue">${I('box')}</span><div><strong>Inventory Re-stocked: Metro General</strong><p>150 units of A+ successfully delivered and logged.</p></div><time>1 hour</time></div><div class="alert-item"><span class="alert-icon amber">${I('settings')}</span><div><strong>Centrifuge Maintenance Required</strong><p>Unit 7 requires scheduled recalibration.</p></div><time>3 hours</time></div></div><div class="card-body"><a href="#/pending" class="btn btn-secondary btn-block">View all alerts ${I('arrow')}</a></div></div></section>`;
  return shell(content, '/admin', 'admin', 'Admin Dashboard');
}

function emergencyPage() {
  const content = `<div class="emergency-banner"><div class="emergency-banner__icon">${I('alert')}</div><div><h1>Emergency Blood Request</h1><p>Please complete this form immediately. Critical requests alert nearby available blood banks and verified donors as soon as they are submitted.</p></div></div>
  <form id="emergencyForm"><div class="form-layout"><div class="dashboard-stack"><section class="card form-section"><h2 class="form-section-title"><span>1</span> Patient & blood requirements</h2><div class="form-row"><div class="form-group"><label class="form-label">Patient name / ID <em class="required">*</em></label><input class="form-control" name="patient" placeholder="Enter patient name or ID" required></div><div class="form-group"><label class="form-label">Blood type required <em class="required">*</em></label><select class="form-control" name="bloodType" id="bloodType" required><option value="">Select blood type</option><option>A+</option><option>A−</option><option>B+</option><option>B−</option><option>O+</option><option>O−</option><option>AB+</option><option>AB−</option><option>Unknown / Pending Crossmatch</option></select></div></div><div class="form-row"><div class="form-group"><label class="form-label">Units required <em class="required">*</em></label><input class="form-control" type="number" name="units" id="unitsRequired" min="1" max="50" value="2" required></div><div class="form-group"><label class="form-label">Required by <em class="required">*</em></label><input class="form-control" name="requiredBy" type="datetime-local" required></div></div></section>
  <section class="card form-section"><h2 class="form-section-title"><span>2</span> Facility & urgency</h2><div class="form-group"><label class="form-label">Hospital / facility location <em class="required">*</em></label><input class="form-control" name="hospital" id="facilityName" value="St. Jude Medical Center" required></div><div class="form-group"><label class="form-label">Urgency level <em class="required">*</em></label><div class="radio-cards"><div class="radio-card"><input id="critical" type="radio" name="urgency" value="Critical" checked><label for="critical"><strong class="text-red">Critical</strong>Need immediately</label></div><div class="radio-card"><input id="high" type="radio" name="urgency" value="High"><label for="high"><strong class="text-amber">High</strong>Within 1 hour</label></div><div class="radio-card"><input id="moderate" type="radio" name="urgency" value="Moderate"><label for="moderate"><strong>Moderate</strong>Within 4 hours</label></div></div></div><div class="form-group"><label class="form-label">Clinical notes <span class="muted">(Optional)</span></label><textarea class="form-control" name="notes" placeholder="Add crossmatch details, patient condition, or handling requirements..."></textarea></div></section></div>
  <aside class="card summary-card"><div class="card-head"><h2>Request Summary</h2><span class="badge badge-red badge-dot" id="summaryUrgency">Critical</span></div><div class="card-body"><div class="summary-title">${I('file','icon-sm')} Clinical Request</div><div class="summary-item"><span>Blood type</span><strong id="summaryType">Not selected</strong></div><div class="summary-item"><span>Quantity</span><strong id="summaryUnits">2 Units</strong></div><div class="summary-item"><span>Destination</span><strong id="summaryFacility">St. Jude Medical Center</strong></div><div class="summary-note">${I('alert','icon-sm')} Critical requests are immediately shared with the nearest compatible facilities.</div><button class="btn btn-primary btn-block btn-lg" type="submit">${I('alert','icon-sm')} Submit Emergency Request</button><a href="#/dashboard" class="btn btn-ghost btn-block">Cancel</a></div></aside></div></form>`;
  return shell(content, '/emergency', 'hospital', 'Emergency Request');
}

function requestsPage() {
  const cards = requests.map(r => `<article class="card request-card" data-request-card data-priority="${r.priority.toLowerCase()}" data-search="${r.hospital.toLowerCase()} ${r.type.toLowerCase()}"><div class="request-card-head"><div><h3>${r.hospital}</h3><span class="request-location">${I('pin')} ${r.distance}</span></div><span class="badge badge-${r.badge} badge-dot">${r.priority}</span></div><div class="request-info"><div><span>Type required</span><strong class="text-red">${r.type}</strong></div><div><span>Units needed</span><strong>${r.units}</strong></div><div><span>Time left</span><strong>${r.left}</strong></div></div><div class="request-card-foot"><small>${r.reason} · ${r.id}</small><button class="btn ${r.priority === 'Standard' ? 'btn-secondary' : 'btn-primary'} btn-sm" data-fulfill="${r.id}">${r.priority === 'Standard' ? 'View Details' : 'Fulfill Request'}</button></div></article>`).join('');
  const content = `${pageHead('Active Requests', 'Urgent blood needs from nearby medical facilities.', `<button class="btn btn-secondary">${I('download','icon-sm')} Export</button><a href="#/emergency" class="btn btn-primary">${I('plus','icon-sm')} New Request</a>`)}<div class="card filter-bar"><div class="filter-search">${I('search')}<input id="requestSearch" type="search" placeholder="Search facility or blood type..."></div><select id="priorityFilter" class="filter-select"><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="standard">Standard</option></select><select class="filter-select"><option>Within 15 miles</option><option>Within 5 miles</option><option>Within 10 miles</option></select><button class="btn btn-secondary btn-sm">${I('filter','icon-sm')} More filters</button></div><section class="requests-grid" id="requestsGrid">${cards}</section>`;
  return shell(content, '/requests', 'hospital', 'Active Requests');
}

function inventoryPage() {
  const rows = inventory.map((x,i) => `<tr><td><span class="type-chip">${x.type}</span></td><td><strong style="font-size:12px;color:var(--slate-900)">${x.units.toLocaleString()}</strong> units</td><td>${x.location}</td><td><div class="stock-level"><div class="stock-level__top"><span>Stock level</span><strong>${x.percent}%</strong></div><div class="stock-level__bar"><i class="${x.badge === 'red' ? 'red' : x.badge === 'amber' ? 'amber' : ''}" style="width:${x.percent}%"></i></div></div></td><td><span class="badge badge-${x.badge} badge-dot">${x.status}</span></td><td><div class="table-actions"><button data-stock="${i}" title="Edit stock">${I('file')}</button><button title="More">${I('settings')}</button></div></td></tr>`).join('');
  const content = `${pageHead('Inventory Management', 'Detailed view of blood stock levels and expiry alerts.', `<button class="btn btn-secondary">${I('download','icon-sm')} Export</button><button class="btn btn-primary" data-log-delivery>${I('plus','icon-sm')} Log Delivery</button>`)}<section class="kpi-grid inventory-kpis"><div class="card metric-card"><span class="kpi-icon red">${I('drop')}</span><div><small>TOTAL AVAILABLE UNITS</small><strong>4,285</strong> <span class="badge badge-green">↗ 12%</span></div></div><div class="card metric-card"><span class="kpi-icon amber">${I('alert')}</span><div><small>CRITICAL SHORTAGES</small><strong>O−, AB−</strong><div class="text-small muted">Below 3-day reserve</div></div></div><div class="card metric-card"><span class="kpi-icon blue">${I('clock')}</span><div><small>EXPIRING WITHIN 48H</small><strong>142 units</strong><div class="text-small muted">Across 4 facilities</div></div></div></section>
  <section class="card table-card"><div class="table-tools"><div class="tabs"><button class="tab active">All Blood Types</button><button class="tab">A+</button><button class="tab">O−</button><button class="tab">B−</button></div><div class="page-actions"><select class="filter-select"><option>All Facilities</option><option>Central Blood Bank</option><option>North Wing Regional</option></select><button class="btn btn-secondary btn-sm">${I('filter','icon-sm')} Filter</button></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Blood Type</th><th>Units Available</th><th>Facility Location</th><th>Capacity</th><th>Status / Expiry Alert</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div><div class="table-footer"><span>Showing all 8 blood types across 14 facilities</span><div class="pagination"><button>‹</button><button class="active">1</button><button>2</button><button>›</button></div></div></section>`;
  return shell(content, '/inventory', 'admin', 'Inventory');
}

async function donorDashboard() {

  // ============================================================
  // STEP 4B
  // REAL DONOR DASHBOARD DATA
  // ============================================================

  const session = JSON.parse(
  sessionStorage.getItem('bloodbridge_session') || 'null'
);

console.log(
  "Step 4B - Current session:",
  session
);


  // ------------------------------------------------------------
  // CHECK DONOR ID
  // ------------------------------------------------------------

  if (!session || !session.donorId) {

    console.error(
      "Step 4B: Donor ID missing from frontend session"
    );

    return shell(
      `
      <section class="card" style="margin-top:24px;">
        <div class="empty-state">
          <div class="empty-state__icon">
            ${I('alert')}
          </div>

          <h2>Donor profile not linked</h2>

          <p>
            Your account is logged in, but the donor profile
            could not be found.
          </p>
        </div>
      </section>
      `,
      '/donor-dashboard',
      'donor',
      'My Dashboard'
    );
  }


  // ------------------------------------------------------------
  // FETCH REAL DONOR DASHBOARD
  // ------------------------------------------------------------

  try {

    console.log(
      "Step 4B: Fetching dashboard for donor ID:",
      session.donorId
    );


    const response = await BloodBridgeAPI.get(
      `/donors/${session.donorId}/dashboard`
    );


    console.log(
      "Step 4B: Backend dashboard response:",
      response
    );


    if (
      !response ||
      response.status !== 'success'
    ) {

      throw new Error(
        response?.message ||
        "Unable to load donor dashboard."
      );

    }


    const dashboard =
  response.dashboard || {};

const donor =
  response.donor || {};

const summary =
  response.summary || {};


// ==========================================================
// STEP 7D
// FETCH REAL DONOR APPOINTMENTS
// ==========================================================

let appointments = [];

try {

  console.log(
    "Step 7D: Fetching appointments for donor ID:",
    session.donorId
  );


  const appointmentResponse =
    await BloodBridgeAPI.get(
      `/appointments/donor/${session.donorId}`
    );


  console.log(
    "Step 7D: Appointment history response:",
    appointmentResponse
  );


  if (
    appointmentResponse &&
    appointmentResponse.status === 'success'
  ) {

    appointments =
      appointmentResponse.appointments || [];

  }


} catch (error) {

  console.error(
    "Step 7D: Appointment history error:",
    error
  );

  appointments = [];

}

const donorName =
  dashboard.name ||
  session.fullName ||
  "Donor";

const bloodType =
  dashboard.blood_type ||
  session.bloodType ||
  "—";

const totalDonations =
  dashboard.total_donations ??
  0;

    const livesSaved =
      summary.lives_saved ??
      (totalDonations * 3);
    
    // ==========================================================
// STEP 5B
// REAL DONOR ELIGIBILITY
// ==========================================================

let eligibility = null;

try {

  console.log(
    "Step 5B: Checking donor eligibility...",
    session.donorId
  );

  const eligibilityResponse =
    await BloodBridgeAPI.get(
      `/donors/${session.donorId}/eligibility`
    );

  console.log(
    "Step 5B: Eligibility response:",
    eligibilityResponse
  );

  if (
    !eligibilityResponse ||
    eligibilityResponse.status !== "success"
  ) {
    throw new Error(
      eligibilityResponse?.message ||
      "Unable to check donor eligibility."
    );
  }

  // Backend response:
  // {
  //   status: "success",
  //   eligibility: {
  //     donor_id: 5,
  //     eligible: true,
  //     days_remaining: 0,
  //     next_eligible_date: "2026-08-23"
  //   }
  // }

  eligibility = eligibilityResponse;

} catch (error) {

  console.error(
    "Step 5B eligibility error:",
    error
  );

}

  // ==========================================================
// STEP 5B
// PREPARE ELIGIBILITY MESSAGE
// ==========================================================

let eligibilityMessage =
  "Eligibility information is currently unavailable.";

if (eligibility?.eligible === true) {

  eligibilityMessage =
    "You're eligible to donate now. A single appointment can help save up to three lives.";

} else if (eligibility?.next_eligible_date) {

  eligibilityMessage =
    `You're currently not eligible to donate. You can donate again after ${eligibility.next_eligible_date}.`;

} else if (eligibility) {

  eligibilityMessage =
    "You're currently not eligible to donate.";

}


    // ==========================================================
    // HISTORY HTML
    // ==========================================================

    const historyRows =
  appointments.length > 0

    ? appointments.map(item => {

        const date =
          item.appointment_date ||
          "—";


        const time =
          item.appointment_time ||
          "—";


        const location =
          item.blood_bank_name ||
          `Blood Bank #${item.blood_bank_id}`;


        const appointmentId =
          item.id ||
          "—";


        const status =
          item.status ||
          "scheduled";


        // ----------------------------------------------------
        // STEP 7E
        // APPOINTMENT ACTION
        // ----------------------------------------------------

        let statusHtml = '';


        if (status === 'scheduled') {

          statusHtml = `

            <div
              style="
                display:flex;
                align-items:center;
                gap:8px;
                flex-wrap:wrap;
              "
            >

              <span
                class="badge badge-green"
              >
                Scheduled
              </span>


              <button
                type="button"
                class="btn btn-ghost btn-sm"
                data-cancel-appointment="${appointmentId}"
              >
                Cancel
              </button>

            </div>

          `;

        } else if (status === 'cancelled') {

          statusHtml = `

            <span
              class="badge"
              style="
                background:#f3f4f6;
                color:#6b7280;
              "
            >
              Cancelled
            </span>

          `;

        } else if (status === 'completed') {

          statusHtml = `

            <span
              class="badge badge-green"
            >
              Completed
            </span>

          `;

        } else {

          statusHtml = `

            <span
              class="badge"
            >
              ${status}
            </span>

          `;

        }


        return `

          <tr>

            <td>

              <strong>
                ${date}
              </strong>


              <small
                style="
                  display:block;
                  margin-top:4px;
                  color:var(--slate-500);
                "
              >
                ${time}
              </small>

            </td>


            <td>
              ${location}
            </td>


            <td>
              APP-${appointmentId}
            </td>


            <td>
              ${statusHtml}
            </td>

          </tr>

        `;

      }).join('')


    : `

      <tr>

        <td colspan="4">

          <div class="empty-state">

            <p>
              No donation appointments available yet.
            </p>

          </div>

        </td>

      </tr>

    `;


    // ==========================================================
    // FINAL DASHBOARD
    // ==========================================================

    const content = `

      <section class="donor-hero">

        <div>

          <h1>
            Hello, ${donorName}
          </h1>

          <p>
            ${eligibilityMessage}
          </p>


          <div class="donor-type">

            <span class="blood-mini">
              ${bloodType}
            </span>

            <div>

              <span>Your blood type</span>

              <strong>
                ${bloodType}
              </strong>

            </div>

          </div>

        </div>


        <div class="impact-box">

          <div class="impact-stat">

            ${I('heart')}

            <strong>
              ${livesSaved}
            </strong>

            <span>
              Lives saved
            </span>

          </div>


          <div class="impact-stat">

            ${I('drop')}

            <strong>
              ${totalDonations}
            </strong>

            <span>
              Donations
            </span>

          </div>

        </div>

      </section>


      <section class="card urgent-card">

        <span class="urgent-icon">
          ${I('alert')}
        </span>

        <div class="urgent-copy">

          <h3>
            Urgent Blood Need
          </h3>

          <p>
            Check current BloodBridge requests and respond
            to urgent blood requirements.
          </p>

        </div>

        <button
          class="btn btn-primary"
          data-schedule
        >
          Schedule Now
          ${I('arrow','icon-sm')}
        </button>

      </section>


      <section class="quick-grid">

        <button
          class="card quick-card"
          data-schedule
        >

          <span class="quick-icon">
            ${I('calendar')}
          </span>

          <span>

            <h3>
              Schedule Donation
            </h3>

            <p>
              Book an appointment at a nearby center.
            </p>

          </span>

          ${I('chevron')}

        </button>


        <a
          href="#/centers"
          class="card quick-card"
        >

          <span class="quick-icon">
            ${I('pin')}
          </span>

          <span>

            <h3>
              Find Blood Bank
            </h3>

            <p>
              Locate the nearest donation facilities.
            </p>

          </span>

          ${I('chevron')}

        </a>

      </section>


      <section class="card">

        <div class="card-head">

          <div>

            <h2>
              Recent Donation History
            </h2>

            <p>
              Your completed BloodBridge appointments
            </p>

          </div>


          <a
            href="#/profile"
            class="link-red"
          >
            View profile
            ${I('arrow')}
          </a>

        </div>


        <div class="data-table-wrap">

          <table class="request-table">

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Location
                </th>

                <th>
                  Donation ID
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              ${historyRows}

            </tbody>

          </table>

        </div>

      </section>

    `;


    return shell(
      content,
      '/donor-dashboard',
      'donor',
      'My Dashboard'
    );


  } catch (error) {

    console.error(
      "Step 4B: Donor dashboard error:",
      error
    );


    return shell(
      `
      <section class="card" style="margin-top:24px;">

        <div class="empty-state">

          <div class="empty-state__icon">
            ${I('alert')}
          </div>

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            ${error.message || "Something went wrong while loading your donor data."}
          </p>

        </div>

      </section>
      `,
      '/donor-dashboard',
      'donor',
      'My Dashboard'
    );

  }
}

// ============================================================
// STEP 6B
// REAL DONOR PROFILE INTEGRATION
// ============================================================

async function profilePage() {

  // ----------------------------------------------------------
  // GET CURRENT SESSION
  // ----------------------------------------------------------

  let session = null;

  try {

    session = JSON.parse(
      sessionStorage.getItem('bloodbridge_session')
    );

  } catch (error) {

    console.error(
      'Step 6B: Unable to read session:',
      error
    );

  }


  // ----------------------------------------------------------
  // SESSION CHECK
  // ----------------------------------------------------------

  if (
    !session ||
    !session.loggedIn ||
    !session.donorId
  ) {

    return shell(

      `
        <section class="card empty-state">

          ${I('alert')}

          <h3>
            Donor profile unavailable
          </h3>

          <p>
            Please login again to access your donor profile.
          </p>

          <a
            href="#/login?role=donor"
            class="btn btn-primary">

            Login Again

          </a>

        </section>
      `,

      '/profile',
      'donor',
      'Donor Profile'

    );

  }


  // ----------------------------------------------------------
  // FETCH REAL DONOR PROFILE
  // ----------------------------------------------------------

  let donor = null;

  try {

    console.log(
      'Step 6B: Fetching donor profile for ID:',
      session.donorId
    );


    const response =
      await BloodBridgeAPI.get(
        `/donors/${session.donorId}`
      );


    console.log(
      'Step 6B: Donor profile response:',
      response
    );


    if (
      !response ||
      response.status !== 'success'
    ) {

      throw new Error(
        response?.message ||
        'Unable to load donor profile.'
      );

    }


    donor =
      response.donor || {};


  } catch (error) {

    console.error(
      'Step 6B profile error:',
      error
    );


    return shell(

      `
        <section class="card empty-state">

          ${I('alert')}

          <h3>
            Unable to load profile
          </h3>

          <p>
            ${error.message ||
            'Could not connect to the BloodBridge backend.'}
          </p>

          <button
            class="btn btn-primary"
            onclick="location.reload()">

            Try Again

          </button>

        </section>
      `,

      '/profile',
      'donor',
      'Donor Profile'

    );

  }


  // ==========================================================
  // REAL DONOR DATA
  // ==========================================================

  const donorName =
    donor.name ||
    session.fullName ||
    'BloodBridge Donor';


  const bloodType =
    donor.blood_type ||
    session.bloodType ||
    'Not provided';


  const phone =
    donor.phone ||
    session.phone ||
    'Not provided';


  const email =
    session.email ||
    'Not provided';


  const totalDonations =
    Number(
      donor.total_donations || 0
    );


  const optedInForAlerts =
    Boolean(
      donor.opted_in_for_alerts
    );


  const lastDonation =
    donor.last_donation_date ||
    null;


  const createdAt =
    donor.created_at ||
    null;


  // ----------------------------------------------------------
  // FORMAT DATE
  // ----------------------------------------------------------

  function formatDate(dateValue) {

    if (!dateValue) {
      return 'Not available';
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return dateValue;

    }

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }
    );

  }


  const memberSince =
    formatDate(createdAt);


  const formattedLastDonation =
    formatDate(lastDonation);


  // ----------------------------------------------------------
  // AVATAR INITIALS
  // ----------------------------------------------------------

  const initials =
    donorName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        name =>
          name.charAt(0).toUpperCase()
      )
      .join('');


  // ----------------------------------------------------------
  // BLOOD TYPE FULL NAME
  // ----------------------------------------------------------

  const bloodTypeNames = {

    'A+': 'A Positive',
    'A-': 'A Negative',

    'B+': 'B Positive',
    'B-': 'B Negative',

    'AB+': 'AB Positive',
    'AB-': 'AB Negative',

    'O+': 'O Positive',
    'O-': 'O Negative'

  };


  const bloodTypeLabel =
    bloodTypeNames[bloodType] ||
    bloodType;


  // ----------------------------------------------------------
  // ELIGIBILITY
  // ----------------------------------------------------------

  let eligibilityText =
    'Eligibility information unavailable.';

  let eligibilityBadge =
    'badge badge-amber';


  try {

    const eligibilityResponse =
      await BloodBridgeAPI.get(
        `/donors/${session.donorId}/eligibility`
      );


    if (
      eligibilityResponse &&
      eligibilityResponse.status === 'success'
    ) {

      if (
        eligibilityResponse.eligible === true
      ) {

        eligibilityText =
          'Eligible to Donate';

        eligibilityBadge =
          'badge badge-green';

      } else {

        eligibilityText =
          'Currently Not Eligible';

        eligibilityBadge =
          'badge badge-amber';

      }

    }

  } catch (error) {

    console.warn(
      'Step 6B: Eligibility could not be loaded:',
      error
    );

  }


  // ==========================================================
  // PROFILE PAGE
  // ==========================================================

  const content = `

    ${pageHead(

      'Donor Profile',

      'Manage your identity, donor information, and notification preferences.',

      `
        <button class="btn btn-secondary" data-open-profile-editor>
          ${I('user','icon-sm')}
          Edit Profile

        </button>

        <button
          class="btn btn-primary"
          data-schedule>

          ${I('calendar','icon-sm')}
          Schedule Donation

        </button>
      `

    )}


    <div class="profile-grid">


      <!-- ================================================== -->
      <!-- PROFILE SUMMARY -->
      <!-- ================================================== -->

      <aside class="card profile-summary">

        <div class="profile-cover"></div>


        <div class="profile-main">

          <div class="profile-avatar">
            ${initials}
          </div>


          <h2>
            ${donorName}
          </h2>


          <p>
            Member since ${memberSince}
          </p>


          <div class="profile-tags">

            <span class="badge badge-red">
              ${bloodTypeLabel}
            </span>

            <span class="badge badge-green">
              Verified Donor
            </span>

          </div>


          <div class="profile-impact">

            <div>

              <strong>
                ${totalDonations * 3}
              </strong>

              <span>
                Lives saved
              </span>

            </div>


            <div>

              <strong>
                ${totalDonations}
              </strong>

              <span>
                Donations
              </span>

            </div>

          </div>


          <button
            class="btn btn-secondary btn-block"
            data-card>

            ${I('file','icon-sm')}
            Digital Donor Card

          </button>

        </div>

      </aside>


      <!-- ================================================== -->
      <!-- PROFILE CONTENT -->
      <!-- ================================================== -->

      <div class="profile-content">


        <!-- PERSONAL INFORMATION -->

        <section class="card">

          <div class="card-head">

            <div>

              <h2>
                Personal Information
              </h2>

              <p>
                Your registered donor contact details
              </p>

            </div>


            <button class="btn btn-ghost btn-sm" data-open-profile-editor>

              Edit

            </button>

          </div>


          <div class="card-body">

            <div class="info-grid">


              <div class="info-item">

                <span>
                  Full Name
                </span>

                <strong>
                  ${donorName}
                </strong>

              </div>


              <div class="info-item">

                <span>
                  Blood Type
                </span>

                <strong>
                  ${bloodTypeLabel}
                </strong>

              </div>


              <div class="info-item">

                <span>
                  Email Address
                </span>

                <strong>
                  ${email}
                </strong>

              </div>


              <div class="info-item">

                <span>
                  Phone Number
                </span>

                <strong>
                  ${phone}
                </strong>

              </div>


              <div class="info-item">

                <span>
                  Last Donation
                </span>

                <strong>
                  ${formattedLastDonation}
                </strong>

              </div>


              <div class="info-item">

                <span>
                  Donor ID
                </span>

                <strong>
                  #${session.donorId}
                </strong>

              </div>


            </div>

          </div>

        </section>


        <!-- ================================================= -->
        <!-- HEALTH / ELIGIBILITY SUMMARY -->
        <!-- ================================================= -->

        <section class="card">

          <div class="card-head">

            <div>

              <h2>
                Donation Eligibility
              </h2>

              <p>
                Current eligibility status from BloodBridge
              </p>

            </div>

            <span class="${eligibilityBadge}">
              ${eligibilityText}
            </span>

          </div>


          <div class="card-body">

            <div class="health-grid">


              <div class="health-status">

                ${I('check-circle')}

                <div>

                  <strong>
                    ${eligibilityText}
                  </strong>

                  <span>
                    Based on your latest donor information
                  </span>

                </div>

              </div>


              <div class="health-metric">

                <span>
                  Blood Type
                </span>

                <strong>
                  ${bloodType}
                </strong>

              </div>


              <div class="health-metric">

                <span>
                  Total Donations
                </span>

                <strong>
                  ${totalDonations}
                </strong>

              </div>


              <div class="health-metric">

                <span>
                  Emergency Alerts
                </span>

                <strong>
                  ${optedInForAlerts
                    ? 'Enabled'
                    : 'Disabled'}
                </strong>

              </div>


            </div>

          </div>

        </section>


        <!-- ================================================= -->
        <!-- NOTIFICATION PREFERENCES -->
        <!-- ================================================= -->

        <section class="card">

          <div class="card-head">

            <div>

              <h2>
                Notification Preferences
              </h2>

              <p>
                Choose how BloodBridge keeps you informed
              </p>

            </div>

          </div>


          <div class="card-body">


            <div class="preference">

              <span class="quick-icon">
                ${I('alert')}
              </span>


              <div class="preference-copy">

                <strong>
                  Urgent Need Alerts
                </strong>

                <span>
                  Receive alerts when matching blood is urgently needed nearby.
                </span>

              </div>


              <button
                class="switch ${optedInForAlerts ? 'on' : ''}"
                aria-label="Toggle urgent alerts">
              </button>

            </div>


            <div class="preference">

              <span class="quick-icon">
                ${I('calendar')}
              </span>


              <div class="preference-copy">

                <strong>
                  Donation Reminders
                </strong>

                <span>
                  Get reminders when you become eligible to donate again.
                </span>

              </div>


              <button
                class="switch on"
                aria-label="Toggle donation reminders">
              </button>

            </div>


            <div class="preference">

              <span class="quick-icon">
                ${I('heart')}
              </span>


              <div class="preference-copy">

                <strong>
                  Share Impact Data
                </strong>

                <span>
                  Use anonymized donation statistics for community impact.
                </span>

              </div>


              <button
                class="switch"
                aria-label="Toggle impact sharing">
              </button>

            </div>


          </div>

        </section>


      </div>

    </div>

  `;


  // ----------------------------------------------------------
  // RETURN PROFILE PAGE
  // ----------------------------------------------------------

  return shell(
    content,
    '/profile',
    'donor',
    'Donor Profile'
  );

}

async function centersPage() {

  // ==========================================================
  // STEP 8B
  // FETCH REAL BLOOD BANKS
  // ==========================================================

  let bloodBanks = [];

  try {

    console.log(
      'STEP 8B: Fetching blood banks...'
    );


    const response =
      await BloodBridgeAPI.get(
        '/blood-banks'
      );


    console.log(
      'STEP 8B: Blood banks response:',
      response
    );


    if (
      !response ||
      response.status !== 'success'
    ) {

      throw new Error(
        response?.message ||
        'Unable to load blood banks.'
      );

    }


    bloodBanks =
      response.blood_banks || [];

    // ==========================================================
// STEP 8E - FETCH STOCK FOR EACH BLOOD BANK
// ==========================================================

for (const bank of bloodBanks) {

  try {

    const stockResponse =
      await BloodBridgeAPI.get(
        `/blood-banks/${bank.id}/stock`
      );

    bank.stock =
      stockResponse?.stock || [];

    console.log(
      `STEP 8E: Stock for bank ${bank.id}:`,
      bank.stock
    );

  } catch (error) {

    console.error(
      `STEP 8E: Stock error for bank ${bank.id}:`,
      error
    );

    bank.stock = [];

  }

}


  } catch (error) {

    console.error(
      'STEP 8B: Blood bank error:',
      error
    );


    const content = `

      ${pageHead(
        'Find Centers',
        'Locate verified hospitals, blood banks, and donation facilities near you.'
      )}

      <section class="card">

        <div class="empty-state">

          <h3>
            Unable to load blood banks
          </h3>

          <p>
            ${error.message || 'Please try again later.'}
          </p>

        </div>

      </section>

    `;


    return shell(
      content,
      '/centers',
      'donor',
      'Find Centers'
    );

  }


  // ==========================================================
  // CREATE CENTER LIST
  // ==========================================================

  const list =
    bloodBanks.length > 0

      ? bloodBanks.map((bank, i) => `

          <article
  class="center-item ${i === 0 ? 'active' : ''}"
  data-center="${i}"
  data-blood-bank-id="${bank.id}"
>

            <div class="center-item-top">

              <div>

                <h3>
                  ${bank.name || `Blood Bank #${bank.id}`}
                </h3>

                <p>
                  ${I('pin')}
Lat: ${bank.latitude} · Lng: ${bank.longitude}
                </p>

              </div>


              <span
                class="badge badge-green badge-dot"
              >
                Available
              </span>

            </div>

<div class="center-meta">

  <div class="center-types">

    <span>
      Blood Bank
    </span>

    ${
      bank.verified
        ? `<span>Verified</span>`
        : `<span>Unverified</span>`
    }

  </div>


  <small>
  Contact:

  ${
    bank.contact_phone

      ? `
        <a
          href="tel:${bank.contact_phone}"
          class="link-red"
        >
          ${bank.contact_phone}
        </a>
      `

      : `
        <strong>
          Not available
        </strong>
      `
  }

</small>

</div>

<div class="blood-stock">

  <strong>
    Blood Availability
  </strong>

  ${
    bank.stock && bank.stock.length > 0

      ? bank.stock.map(stock => {

          const units =
            Number(stock.units_available || 0);

          const reserved =
            Number(stock.reserved_units || 0);

          const available =
            units;

          let stockClass =
            'stock-good';

          let stockLabel =
            'Available';


          if (available <= 0) {

            stockClass =
              'stock-empty';

            stockLabel =
              'Out of Stock';

          } else if (available <= 5) {

            stockClass =
              'stock-low';

            stockLabel =
              'Low Stock';

          }


          return `

            <div
              class="stock-item ${stockClass}"
            >

              <span class="stock-blood-type">
                ${stock.blood_type}
              </span>


              <span class="stock-units">

                <strong>
                  ${available}
                </strong>

                units

              </span>


              <span class="stock-label">
                ${stockLabel}
              </span>

            </div>

          `;

        }).join('')

      : `

        <div class="stock-empty">
          No stock information available
        </div>

      `
  }

</div>

<div style="margin-top:10px;">

  <a
    href="https://www.google.com/maps/search/?api=1&query=${bank.latitude},${bank.longitude}"
    target="_blank"
    rel="noopener noreferrer"
    class="btn btn-secondary btn-sm"
  >
    ${I('pin','icon-sm')}
    View Location
  </a>

</div>

<div style="margin-top:12px;">
  <button
    type="button"
    class="btn btn-primary btn-sm"
    data-center-schedule="${bank.id}"
  >
    ${I('calendar','icon-sm')}
    Book Appointment
  </button>
</div>

          </article>

        `).join('')

      : `

          <div class="empty-state">

            <h3>
              No blood banks found
            </h3>

            <p>
              There are currently no registered blood banks.
            </p>

          </div>

        `;


  // ==========================================================
  // PAGE
  // ==========================================================

  const content = `

    ${pageHead(
      'Find Centers',
      'Locate verified hospitals, blood banks, and donation facilities near you.',
      `
        <button
          class="btn btn-secondary"
        >
          ${I('pin','icon-sm')}
          Use my location
        </button>
      `
    )}


    <section class="centers-layout">


      <div class="card centers-panel">


        <div class="centers-search">


          <div class="filter-search">

            ${I('search')}

            <input
              type="search"
              placeholder="Search by city or facility..."
              id="centerSearch"
            >

          </div>


          <div class="center-filters">

            <button
              class="center-filter active"
            >
              All Centers
            </button>

            <button
              class="center-filter"
            >
              Hospitals
            </button>

            <button
              class="center-filter active"
            >
              Blood Banks
            </button>

            <button
              class="center-filter"
            >
              Mobile Drives
            </button>

          </div>


        </div>


        <div class="center-list">

          ${list}

        </div>


      </div>


      <div class="centers-map">

        ${mapMarkup(true)}

      </div>


    </section>

  `;


  return shell(
    content,
    '/centers',
    'donor',
    'Find Centers'
  );

}



// ============================================================
// STEP 8C - CENTER SEARCH & FILTER
// ============================================================

document.addEventListener('input', event => {

  if (event.target.id !== 'centerSearch') {
    return;
  }


  const searchValue =
    event.target.value
      .trim()
      .toLowerCase();


  const centerItems =
    document.querySelectorAll(
      '.center-list .center-item'
    );


  centerItems.forEach(item => {

    const text =
      item.textContent.toLowerCase();


    const matches =
      text.includes(searchValue);


    item.style.display =
      matches ? '' : 'none';

  });

});


document.addEventListener('click', event => {

  const filter =
    event.target.closest(
      '.center-filter'
    );


  if (!filter) {
    return;
  }


  // Remove active state
  document
    .querySelectorAll('.center-filter')
    .forEach(button => {
      button.classList.remove('active');
    });


  // Add active state
  filter.classList.add('active');


  const filterText =
    filter.textContent
      .trim()
      .toLowerCase();


  const centerItems =
    document.querySelectorAll(
      '.center-list .center-item'
    );


  centerItems.forEach(item => {

    const itemText =
      item.textContent.toLowerCase();


    if (
      filterText === 'all centers' ||
      filterText === 'blood banks'
    ) {

      item.style.display = '';

    } else {

      // Backend currently provides
      // blood banks only.

      item.style.display = 'none';

    }

  });

});


function usersPage() {
  const rows = users.map((u,i) => `<tr data-user-row data-role="${u.role.toLowerCase()}"><td><div class="table-person"><div class="avatar">${u.initials}</div><div><strong>${u.name}</strong><span>${u.id}</span></div></div></td><td>${u.role}</td><td><span class="type-chip">${u.type}</span></td><td><span class="badge badge-${u.badge} badge-dot">${u.status}</span></td><td>${u.active}</td><td><div class="table-actions"><button data-view-user="${i}" title="View">${I('eye')}</button><button data-edit-user="${i}" title="Edit">${I('file')}</button></div></td></tr>`).join('');
  const content = `${pageHead('User Management', 'Manage hospital accounts and donor profiles.', `<button class="btn btn-secondary">${I('download','icon-sm')} Export</button><button class="btn btn-primary" data-add-user>${I('plus','icon-sm')} Add User</button>`)}<section class="card table-card"><div class="table-tools"><div class="tabs"><button class="tab active" data-user-filter="all">All Users</button><button class="tab" data-user-filter="donor">Donors</button><button class="tab" data-user-filter="hospital">Hospitals</button><button class="tab" data-user-filter="pending">Pending Verification (12)</button></div><div class="filter-search" style="max-width:240px">${I('search')}<input type="search" id="userSearch" placeholder="Search users..."></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Name / ID</th><th>Account Type</th><th>Blood Type</th><th>Status</th><th>Last Activity</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div><div class="table-footer"><span>Showing 1 to 5 of 42 results</span><div class="pagination"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></div></div></section>`;
  return shell(content, '/users', 'admin', 'User Management');
}

function pendingPage() {
  const items = [
    {icon:'hospital',name:'Mercy General Hospital',meta:'Requested 10 mins ago · Dr. Sarah Jenkins',priority:'Critical',badge:'red',type:'O− Negative',units:'4 Units'},
    {icon:'hospital',name:'St. Jude Medical Center',meta:'Requested 45 mins ago · Trauma Wing',priority:'High Priority',badge:'amber',type:'A+ Positive',units:'2 Units'},
    {icon:'file',name:'Valley Health Clinic',meta:'Requested 2 hours ago · Surgical Prep',priority:'Routine',badge:'green',type:'B− Negative',units:'1 Unit'}
  ];
  const cards = items.map((x,i) => `<article class="card approval-card" id="pending-${i}"><div class="approval-entity"><span class="entity-icon">${I(x.icon)}</span><div><h3>${x.name}</h3><p>${x.meta}</p></div></div><div class="approval-data"><span>Priority</span><strong><span class="badge badge-${x.badge} badge-dot">${x.priority}</span></strong></div><div class="approval-data"><span>Requirement</span><strong>${x.type} · ${x.units}</strong></div><div class="approval-actions"><button class="btn btn-danger-outline btn-sm" data-deny="pending-${i}">Deny</button><button class="btn btn-secondary btn-sm" data-details="${x.name}">Details</button><button class="btn btn-primary btn-sm" data-approve="pending-${i}">Approve</button></div></article>`).join('');
  const content = `${pageHead('Pending Requests', 'Review and approve urgent blood transfusion requests.', `<button class="btn btn-secondary">${I('filter','icon-sm')} Filter Requests</button>`)}<div class="queue-stats"><div class="card queue-stat"><span>TOTAL PENDING</span><strong>24</strong></div><div class="card queue-stat"><span>CRITICAL</span><strong class="text-red">3</strong></div><div class="card queue-stat"><span>HIGH PRIORITY</span><strong class="text-amber">8</strong></div><div class="card queue-stat"><span>APPROVED TODAY</span><strong class="text-green">17</strong></div></div><section class="approval-list">${cards}</section>`;
  return shell(content, '/pending', 'admin', 'Pending Requests');
}

function verificationPage() {
  const queue = [
    {icon:'hospital',name:'Mercy General Hospital',id:'HOSP-8921',type:'Hospital',date:'Aug 19, 2026',wait:'48h+ Wait',status:'Pending License Verification',risk:'red'},
    {icon:'user',name:'Sarah Jenkins',id:'DNR-4492',type:'Donor',date:'Aug 21, 2026',wait:'24h Wait',status:'Pending ID Check',risk:'amber'},
    {icon:'user',name:'Michael Chen',id:'DNR-4495',type:'Donor',date:'Aug 22, 2026',wait:'2h Wait',status:'Pending Medical History',risk:'green'}
  ];
  const rows = queue.map((q,i) => `<tr id="verify-${i}"><td><div class="table-person"><span class="entity-icon">${I(q.icon)}</span><div><strong>${q.name}</strong><span>ID: ${q.id}</span></div></div></td><td>${q.type}</td><td>${q.date}<br><span class="text-${q.risk}">${q.wait}</span></td><td><span class="badge badge-${q.risk}">${q.status}</span></td><td><button class="btn btn-primary btn-sm" data-review="${i}">Review</button></td></tr>`).join('');
  const content = `${pageHead('Verification Queue', 'Review user documentation for clinical approval.', `<button class="btn btn-secondary">${I('filter','icon-sm')} Filter Queue</button>`)}<div class="queue-stats"><div class="card queue-stat"><span>TOTAL PENDING</span><strong>12</strong></div><div class="card queue-stat"><span>WAITING > 48H</span><strong class="text-red">3</strong></div><div class="card queue-stat"><span>HOSPITALS</span><strong>4</strong></div><div class="card queue-stat"><span>DONORS</span><strong>8</strong></div></div><section class="card table-card"><div class="table-tools"><div class="tabs"><button class="tab active">All</button><button class="tab">Hospitals</button><button class="tab">Donors</button></div><button class="btn btn-secondary btn-sm">${I('download','icon-sm')} Export Queue</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Entity Name</th><th>Type</th><th>Submission Date</th><th>Status / Risk</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div><div class="table-footer"><span>Showing 1–3 of 12</span><div class="pagination"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>4</button><button>›</button></div></div></section>`;
  return shell(content, '/verification', 'admin', 'Verification Queue');
}

function notFound() {
  return `<div class="auth-page"><aside class="auth-aside">${logo(true)}<div class="auth-message"><div class="icon-wrap">${I('alert')}</div><h1>Page not found.</h1><p>The BloodBridge page you're looking for may have moved or is no longer available.</p></div></aside><main class="auth-main"><div class="auth-card"><div class="auth-heading"><span class="eyebrow">Error 404</span><h2>Let's get you back on track</h2><p>Return to the homepage or open a secure demo dashboard.</p></div><a href="#/home" class="btn btn-primary btn-block btn-lg">Return home ${I('arrow')}</a><a href="#/dashboard" class="btn btn-secondary btn-block" style="margin-top:10px">Open dashboard</a></div></main></div>`;
}

function routePage() {
  const { path, query } = getRoute();
  const pages = {
    '/home': homePage,
    '/login': () => authLayout('login', query.get('role') || 'hospital'),
    '/register': () => authLayout('register'),
    '/dashboard': hospitalDashboard,
    '/emergency': emergencyPage,
    '/requests': requestsPage,
    '/inventory': inventoryPage,
    '/donor-dashboard': donorDashboard,
    '/profile': profilePage,
    '/centers': centersPage,
    '/admin': adminDashboard,
    '/users': usersPage,
    '/pending': pendingPage,
    '/verification': verificationPage
  };
  app.innerHTML = (pages[path] || notFound)();
  window.scrollTo(0, 0);
  bindPageSpecific(path);
}

async function scheduleModal(selectedBankId = null) {

  const token =
    sessionStorage.getItem('bloodbridge_token');

  const session =
    JSON.parse(
      sessionStorage.getItem('bloodbridge_session') || 'null'
    );


  if (!token || !session || !session.donorId) {

    toast(
      'Session expired',
      'Please login again before scheduling a donation.',
      'error'
    );

    return;
  }


  // ----------------------------------------------------------
  // LOAD REAL BLOOD BANKS FROM BACKEND
  // ----------------------------------------------------------

  let bloodBanks = [];

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/blood-banks',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );


    const data =
      await response.json();


    console.log(
      'Step 7C: Blood banks response:',
      data
    );


    if (
      !data ||
      data.status !== 'success'
    ) {

      throw new Error(
        data?.message ||
        'Unable to load blood banks.'
      );

    }


    bloodBanks =
      data.blood_banks || [];


  } catch (error) {

    console.error(
      'Step 7C: Blood bank loading error:',
      error
    );


    toast(
      'Unable to load centers',
      error.message ||
      'Please try again.',
      'error'
    );

    return;
  }


  if (!bloodBanks.length) {

    toast(
      'No blood banks available',
      'Please add a blood bank before scheduling.',
      'error'
    );

    return;
  }


  // ----------------------------------------------------------
  // OPEN REAL APPOINTMENT MODAL
  // ----------------------------------------------------------

  const today =
    new Date()
      .toISOString()
      .split('T')[0];


  openModal(`

    <div class="modal-head">

      <h2>
        Schedule a Donation
      </h2>

      <button
        type="button"
        class="modal-close"
        data-close-modal>
        ${I('x')}
      </button>

    </div>


    <form id="scheduleForm">

      <div class="modal-body">


        <div class="form-group">

          <label class="form-label">
            Donation center
          </label>

          ${selectedBankId
  ? `

    <input
      type="hidden"
      name="blood_bank_id"
      value="${selectedBankId}"
    >

    <div class="form-control">
      ${
        bloodBanks.find(
          bank =>
            Number(bank.id) ===
            Number(selectedBankId)
        )?.name ||
        `Blood Bank #${selectedBankId}`
      }
    </div>

  `
  : `

    <select
      class="form-control"
      name="blood_bank_id"
      required>

      <option value="" disabled selected>
        Select a blood bank
      </option>

      ${bloodBanks.map(bank => `

        <option value="${bank.id}">
          ${bank.name || `Blood Bank #${bank.id}`}
        </option>

      `).join('')}

    </select>

  `
}

        </div>


        <div class="form-row">

          <div class="form-group">

            <label class="form-label">
              Preferred date
            </label>

            <input
              class="form-control"
              type="date"
              name="appointment_date"
              min="${today}"
              required>

          </div>


          <div class="form-group">

            <label class="form-label">
              Preferred time
            </label>

            <select
              class="form-control"
              name="appointment_time"
              required>

              <option value="09:00 AM">
                09:00 AM
              </option>

              <option value="11:30 AM">
                11:30 AM
              </option>

              <option value="02:30 PM">
                02:30 PM
              </option>

              <option value="05:00 PM">
                05:00 PM
              </option>

            </select>

          </div>

        </div>


        <div class="form-group">

          <label class="form-label">
            Notes
          </label>

          <textarea
            class="form-control"
            name="notes"
            rows="3"
            placeholder="Optional notes">
          </textarea>

        </div>


        <div class="summary-note">

          ${I('check-circle','icon-sm')}

          Your donor eligibility will be confirmed
          before the appointment.

        </div>


      </div>


      <div class="modal-foot">

        <button
          type="button"
          class="btn btn-secondary"
          data-close-modal>

          Cancel

        </button>


        <button
          type="submit"
          class="btn btn-primary">

          Confirm Appointment

        </button>

      </div>

    </form>

  `);
}

function userModal(title = 'Add New User') {
  openModal(`<div class="modal-head"><h2>${title}</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><form id="userForm"><div class="modal-body"><div class="form-row"><div class="form-group"><label class="form-label">Full name</label><input class="form-control" placeholder="Enter full name" required></div><div class="form-group"><label class="form-label">Account type</label><select class="form-control"><option>Donor</option><option>Hospital Staff</option><option>Administrator</option></select></div></div><div class="form-group"><label class="form-label">Email address</label><input class="form-control" type="email" placeholder="name@example.com" required></div><div class="form-row"><div class="form-group"><label class="form-label">Blood type</label><select class="form-control"><option>Not Applicable</option><option>O−</option><option>O+</option><option>A−</option><option>A+</option><option>B−</option><option>B+</option></select></div><div class="form-group"><label class="form-label">Status</label><select class="form-control"><option>Pending Verification</option><option>Verified</option></select></div></div></div><div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save User</button></div></form>`);
}

function deliveryModal() {
  openModal(`<div class="modal-head"><h2>Log Inventory Delivery</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><form id="deliveryForm"><div class="modal-body"><div class="form-row"><div class="form-group"><label class="form-label">Blood type</label><select class="form-control" required><option>O−</option><option>O+</option><option>A−</option><option>A+</option><option>B−</option><option>B+</option><option>AB−</option><option>AB+</option></select></div><div class="form-group"><label class="form-label">Units received</label><input class="form-control" type="number" min="1" placeholder="0" required></div></div><div class="form-group"><label class="form-label">Receiving facility</label><select class="form-control">${centers.map(c => `<option>${c.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Batch / tracking ID</label><input class="form-control" placeholder="e.g. BLD-2026-00482" required></div></div><div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Log Delivery</button></div></form>`);
}

function verificationModal(index) {
  const names = ['Mercy General Hospital', 'Sarah Jenkins', 'Michael Chen'];
  openModal(`<div class="modal-head"><h2>Review Verification</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><div class="modal-body"><div class="approval-entity"><span class="entity-icon">${I(index === '0' ? 'hospital' : 'user')}</span><div><h3 style="margin:0 0 5px">${names[Number(index)]}</h3><p class="muted" style="margin:0;font-size:10px">Submitted documents are ready for review</p></div></div><div class="separator" style="margin:18px 0"></div><div class="preference"><span class="quick-icon">${I('file')}</span><div class="preference-copy"><strong>Identity Document</strong><span>Government-issued photo identification</span></div><span class="badge badge-green">Verified</span></div><div class="preference"><span class="quick-icon">${I('shield')}</span><div class="preference-copy"><strong>Clinical / Donor Record</strong><span>Credentials and safety information</span></div><span class="badge badge-amber">Review</span></div><div class="summary-note">${I('alert','icon-sm')} Approval grants access to the verified BloodBridge network.</div></div>`, `<button class="btn btn-danger-outline" data-verify-decline="verify-${index}">Decline</button><button class="btn btn-primary" data-verify-approve="verify-${index}">Approve Verification</button>`);
}

function animateCounter(element) {
  if (element.dataset.counted === 'true') return;
  element.dataset.counted = 'true';
  const target = Number(element.dataset.count || 0);
  const decimals = Number(element.dataset.decimals || 0);
  const suffix = element.dataset.suffix || '';
  const useComma = element.dataset.format === 'comma';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 0 : 1450;
  const start = performance.now();
  const renderValue = (value) => {
    const fixed = decimals ? value.toFixed(decimals) : Math.round(value).toString();
    const output = useComma ? Number(fixed).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : fixed;
    element.textContent = `${output}${suffix}`;
  };
  if (!duration) { renderValue(target); return; }
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    renderValue(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
    else renderValue(target);
  };
  requestAnimationFrame(tick);
}

function bindPageSpecific(path) {
  if (path === '/home') {
    const animated = document.querySelectorAll('.section-heading, .feature, .process, .public-stat, .cta-card');
    animated.forEach((el, index) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${(index % 4) * 70}ms`);
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -35px' });
      animated.forEach(el => observer.observe(el));
    } else {
      animated.forEach(el => el.classList.add('is-visible'));
    }

    const counters = document.querySelectorAll('[data-count]');
    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            currentObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.55 });
      counters.forEach(counter => counterObserver.observe(counter));
    } else {
      counters.forEach(animateCounter);
    }
  }
  if (path === '/emergency') {
    const type = document.getElementById('bloodType');
    const units = document.getElementById('unitsRequired');
    const facility = document.getElementById('facilityName');
    const sync = () => {
      document.getElementById('summaryType').textContent = type.value || 'Not selected';
      document.getElementById('summaryUnits').textContent = `${units.value || 0} Unit${units.value === '1' ? '' : 's'}`;
      document.getElementById('summaryFacility').textContent = facility.value || 'Not entered';
      const urgency = document.querySelector('input[name="urgency"]:checked')?.value || 'Critical';
      document.getElementById('summaryUrgency').textContent = urgency;
    };
    [type, units, facility, ...document.querySelectorAll('input[name="urgency"]')].forEach(el => el?.addEventListener('input', sync));
  }
  if (path === '/requests') {
    const search = document.getElementById('requestSearch');
    const filter = document.getElementById('priorityFilter');
    const run = () => {
      const q = search.value.toLowerCase().trim();
      const f = filter.value;
      let visible = 0;
      document.querySelectorAll('[data-request-card]').forEach(card => {
        const show = card.dataset.search.includes(q) && (f === 'all' || card.dataset.priority === f);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      const old = document.getElementById('requestsEmpty');
      if (old) old.remove();
      if (!visible) document.getElementById('requestsGrid').insertAdjacentHTML('beforeend', `<div class="empty-state" id="requestsEmpty">${I('search')}<h3>No matching requests</h3><p>Try another facility, blood type, or priority.</p></div>`);
    };
    search.addEventListener('input', run); filter.addEventListener('change', run);
  }
}

app.addEventListener('click', async (e) => {
  const el = e.target.closest('button, a, [data-center]');
  if (!el) return;
  if (el.matches('[data-home-link]')) {
    e.preventDefault();
    document.getElementById('publicLinks')?.classList.remove('open');
    if (getRoute().path === '/home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else navigate('/home');
  }
  if (el.matches('[data-mobile-menu]')) document.getElementById('publicLinks')?.classList.toggle('open');
  if (el.matches('[data-scroll]')) { e.preventDefault(); document.getElementById(el.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('publicLinks')?.classList.remove('open'); }
  if (el.matches('[data-sidebar-toggle]')) { document.getElementById('sidebar')?.classList.add('open'); document.getElementById('sidebarOverlay')?.classList.add('open'); }
  if (el.matches('[data-sidebar-close]')) { document.getElementById('sidebar')?.classList.remove('open'); el.classList.remove('open'); }
  if (el.matches('[data-role]')) { e.preventDefault(); navigate(`/login?role=${el.dataset.role}`); }
  if (el.matches('[data-password-toggle]')) { const input = el.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; }
  if (el.matches('[data-forgot]')) { e.preventDefault(); openModal(`<div class="modal-head"><h2>Reset Password</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><form id="forgotForm"><div class="modal-body"><p class="muted" style="font-size:11px;line-height:1.6;margin-top:0">Enter the email associated with your account and we'll send you a secure reset link.</p><div class="form-group"><label class="form-label">Email Address</label><div class="input-wrap">${I('mail')}<input type="email" placeholder="you@example.com" required></div></div></div><div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Send Reset Link</button></div></form>`); }
  if (el.matches('[data-support]')) { e.preventDefault(); toast('Support request started', 'Our emergency support desk is available 24/7.'); }
  if (el.matches('[data-notifications]')) {

  const session = JSON.parse(
    sessionStorage.getItem('bloodbridge_session')
  );

  if (!session || session.role !== 'donor') {
    toast(
      'Notifications',
      'No donor notifications available.'
    );
    return;
  }

  const donorId = session.donorId;

  if (!donorId) {
    toast(
      'Notifications',
      'Donor profile not found.'
    );
    return;
  }

  try {

    const token =
      sessionStorage.getItem(
        'bloodbridge_token'
      );

    const response =
      await fetch(
        `http://127.0.0.1:5000/api/donor_alerts?donor_id=${donorId}`,
        {
          headers: {
            'Authorization':
              `Bearer ${token}`
          }
        }
      );

    const data =
      await response.json();

    console.log(
      'STEP 11C - DONOR NOTIFICATIONS:',
      data
    );

    if (
      data.status !== 'success'
    ) {
      throw new Error(
        data.message ||
        'Unable to load notifications.'
      );
    }

    const alerts =
      data.alerts || [];

    if (!alerts.length) {

      toast(
        'Notifications',
        'You have no new emergency alerts.'
      );

      return;
    }

    const unread =
      alerts.filter(
        alert => alert.status === 'sent'
      );

    if (unread.length) {

      toast(
        `${unread.length} Emergency Alert${unread.length > 1 ? 's' : ''}`,
        `You have ${unread.length} emergency blood request${unread.length > 1 ? 's' : ''}.`
      );

    } else {

      toast(
        'Notifications',
        'No new emergency alerts.'
      );

    }

  } catch (error) {

    console.error(
      'STEP 11C - NOTIFICATION ERROR:',
      error
    );

    toast(
      'Notification error',
      error.message ||
      'Unable to load notifications.',
      'error'
    );

  }

  return;
}
  if (el.matches('[data-fulfill]')) {
    const card = el.closest('.request-card'); if (card) card.classList.add('fulfilled');
    el.textContent = 'Response Sent'; el.disabled = true; toast('Response sent', `Your facility response for ${el.dataset.fulfill} has been recorded.`);
  }
  if (el.matches('[data-schedule]')) scheduleModal();
  if (el.matches('[data-card]')) openModal(`<div class="modal-head"><h2>Digital Donor Card</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><div class="modal-body"><div class="donor-hero" style="display:block;min-height:210px;margin:0"><div style="display:flex;justify-content:space-between;align-items:start">${logo(true)}<span class="badge badge-green">VERIFIED</span></div><div style="margin-top:38px"><small style="color:#91a0b2">DONOR NAME</small><h3 style="margin:5px 0 17px">Sarah Jenkins</h3><div style="display:flex;gap:40px"><div><small style="color:#91a0b2">BLOOD TYPE</small><strong style="display:block;font-size:22px;margin-top:3px">O−</strong></div><div><small style="color:#91a0b2">DONOR ID</small><strong style="display:block;margin-top:8px">DNR-4492</strong></div></div></div></div></div>`);
  if (el.matches('[data-edit-profile]')) userModal('Edit Donor Profile');
  if (el.matches('.switch')) el.classList.toggle('on');
  if (el.matches('[data-log-delivery]')) deliveryModal();
  if (el.matches('[data-stock]')) deliveryModal();
  if (el.matches('[data-add-user]')) userModal();
  if (el.matches('[data-edit-user]')) userModal('Edit User');
  if (el.matches('[data-view-user]')) { const u = users[Number(el.dataset.viewUser)]; openModal(`<div class="modal-head"><h2>User Details</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><div class="modal-body"><div class="approval-entity"><div class="profile-avatar" style="width:60px;height:60px;margin:0;font-size:16px">${u.initials}</div><div><h3 style="margin:0 0 5px">${u.name}</h3><p class="muted" style="margin:0;font-size:10px">${u.id} · ${u.role}</p></div></div><div class="separator" style="margin:18px 0"></div><div class="summary-item"><span>Blood type</span><strong>${u.type}</strong></div><div class="summary-item"><span>Status</span><strong><span class="badge badge-${u.badge}">${u.status}</span></strong></div><div class="summary-item"><span>Last activity</span><strong>${u.active}</strong></div></div>`); }
  if (el.matches('[data-user-filter]')) {
    document.querySelectorAll('[data-user-filter]').forEach(b => b.classList.remove('active')); el.classList.add('active');
    const f = el.dataset.userFilter; document.querySelectorAll('[data-user-row]').forEach(row => { row.style.display = f === 'all' || row.dataset.role === f || (f === 'pending' && row.textContent.includes('Pending')) ? '' : 'none'; });
  }
  if (el.matches('[data-approve]')) { document.getElementById(el.dataset.approve)?.remove(); toast('Request approved', 'Matching and dispatch teams have been notified.'); }
  if (el.matches('[data-deny]')) { document.getElementById(el.dataset.deny)?.remove(); toast('Request denied', 'The decision was recorded and the requester notified.', 'error'); }
  if (el.matches('[data-details]')) toast('Request details opened', `${el.dataset.details} submitted complete clinical documentation.`);
  if (el.matches('[data-review]')) verificationModal(el.dataset.review);
  if (el.matches('[data-center]')) {
    document.querySelectorAll('[data-center]').forEach(x => x.classList.remove('active')); el.classList.add('active'); const c = centers[Number(el.dataset.center)]; const pop = document.getElementById('centerPopover'); if (pop) pop.innerHTML = `<h3>${c.name}</h3><p>${c.address} · ${c.distance} away</p><div class="center-popover__row"><span>Next available<strong>${c.time}</strong></span><button class="btn btn-primary btn-sm" data-schedule>Book Appointment</button></div>`;
  }
});

document.addEventListener('click', (e) => {
  const routeButton = e.target.closest('[data-modal-route]');
  if (routeButton) {
    e.preventDefault();
    const destination = routeButton.dataset.modalRoute;
    closeModal();
    navigate(destination);
    return;
  }
  if (e.target.matches('[data-modal-backdrop]') || e.target.closest('[data-close-modal]')) {
    e.preventDefault();
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalRoot.children.length) closeModal();
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'loginForm') { const role = form.dataset.roleValue; toast('Secure login successful', 'Opening your BloodBridge workspace...'); setTimeout(() => navigate(role === 'donor' ? '/donor-dashboard' : '/dashboard'), 450); }
  if (form.id === 'registerForm') { openModal(`<div class="modal-head"><h2>Registration Complete</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><div class="modal-body"><div class="success-state"><div class="success-mark">${I('check')}</div><h3>Welcome to BloodBridge</h3><p>Your account has been created. Verification instructions have been sent to your email.</p></div></div>`, `<button type="button" class="btn btn-primary" data-modal-route="/login?role=donor">Continue to Login ${I('arrow','icon-sm')}</button>`); }
  if (form.id === 'emergencyForm') { const fd = new FormData(form); openModal(`<div class="modal-head"><h2>Request Submitted</h2><button class="modal-close" data-close-modal>${I('x')}</button></div><div class="modal-body"><div class="success-state"><div class="success-mark">${I('check')}</div><h3>Emergency request is live</h3><p>BloodBridge is searching for ${fd.get('units')} units of ${fd.get('bloodType')} near ${fd.get('hospital')}. Critical facilities have been alerted.</p></div><div class="summary-note">${I('clock','icon-sm')} Estimated matching time: under 5 minutes</div></div>`, `<button type="button" class="btn btn-primary" data-modal-route="/requests">Track Request ${I('arrow','icon-sm')}</button>`); }
  if (form.id === 'scheduleForm') {

  const formData =
    new FormData(form);


  const token =
    sessionStorage.getItem('bloodbridge_token');


  const session =
    JSON.parse(
      sessionStorage.getItem(
        'bloodbridge_session'
      ) || 'null'
    );


  const donorId =
    session?.donorId;


  const bloodBankId =
    Number(
      formData.get('blood_bank_id')
    );


  const appointmentDate =
    formData.get(
      'appointment_date'
    );


  const appointmentTime =
    formData.get(
      'appointment_time'
    );


  const notes =
    String(
      formData.get('notes') || ''
    ).trim();


  console.log(
    'Step 7C: Creating appointment...',
    {
      donorId,
      bloodBankId,
      appointmentDate,
      appointmentTime,
      notes
    }
  );


  if (!token || !donorId) {

    toast(
      'Session expired',
      'Please login again.',
      'error'
    );

    return;
  }


  try {

    const response =
      await fetch(
        'http://127.0.0.1:5000/api/appointments',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            'Authorization':
              `Bearer ${token}`
          },

          body: JSON.stringify({

            donor_id:
              Number(donorId),

            blood_bank_id:
              bloodBankId,

            appointment_date:
              appointmentDate,

            appointment_time:
              appointmentTime,

            notes:
              notes || null

          })
        }
      );


    const data =
      await response.json();


    console.log(
      'Step 7C: Appointment backend response:',
      data
    );


    if (
      !data ||
      data.status !== 'success'
    ) {

      throw new Error(
        data?.message ||
        'Appointment could not be created.'
      );

    }


    closeModal();


    toast(
      'Appointment confirmed',
      'Your donation appointment has been scheduled successfully.'
    );


  } catch (error) {

    console.error(
      'Step 7C: Appointment error:',
      error
    );


    toast(
      'Appointment failed',
      error.message ||
      'Unable to schedule your appointment.',
      'error'
    );

  }
}
  if (form.id === 'forgotForm') { closeModal(); toast('Reset link sent', 'Check your email for secure password reset instructions.'); }
  if (form.id === 'userForm') { closeModal(); toast('User saved', 'The BloodBridge user record has been updated.'); }
  if (form.id === 'deliveryForm') { closeModal(); toast('Delivery logged', 'Inventory totals have been updated across the network.'); }
});

document.addEventListener('click', (e) => {
  const approve = e.target.closest('[data-verify-approve]');
  if (approve) {
    const id = approve.dataset.verifyApprove;
    closeModal();
    document.getElementById(id)?.remove();
    toast('Verification approved', 'The account now has access to the verified network.');
    return;
  }
  const decline = e.target.closest('[data-verify-decline]');
  if (decline) {
    const id = decline.dataset.verifyDecline;
    closeModal();
    document.getElementById(id)?.remove();
    toast('Verification declined', 'The applicant was notified and can submit corrected documents.', 'error');
  }
});

window.addEventListener('hashchange', routePage);
routePage();
// ============================================================
// STEP 7E - FRONTEND CANCEL APPOINTMENT
// ============================================================

document.addEventListener('click', async (event) => {

  const button = event.target.closest(
    '[data-cancel-appointment]'
  );

  if (!button) return;

  const appointmentId =
    button.dataset.cancelAppointment;

  if (!appointmentId) return;

  const confirmed = confirm(
    'Are you sure you want to cancel this donation appointment?'
  );

  if (!confirmed) return;

  const token =
    sessionStorage.getItem('bloodbridge_token');

  if (!token) {
    toast(
      'Session expired',
      'Please login again.',
      'error'
    );
    return;
  }

  try {

    button.disabled = true;
    button.textContent = 'Cancelling...';

    console.log(
      'STEP 7E: Cancelling appointment:',
      appointmentId
    );

    const response = await fetch(
      `http://127.0.0.1:5000/api/appointments/${appointmentId}/cancel`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    console.log(
      'STEP 7E: Frontend cancel response:',
      data
    );

    if (
      !data ||
      data.status !== 'success'
    ) {
      throw new Error(
        data?.message ||
        'Unable to cancel appointment.'
      );
    }

    toast(
      'Appointment cancelled',
      'Your donation appointment has been cancelled successfully.'
    );

    navigate('/donor-dashboard');

  } catch (error) {

    console.error(
      'STEP 7E: Frontend cancel error:',
      error
    );

    button.disabled = false;
    button.textContent = 'Cancel';

    toast(
      'Cancellation failed',
      error.message ||
      'Unable to cancel appointment.',
      'error'
    );
  }

});

// ============================================================
// STEP 8D - SELECT BLOOD BANK FOR APPOINTMENT
// ============================================================

let selectedBloodBankId = null;


document.addEventListener('click', event => {

  const button = event.target.closest(
    '[data-center-schedule]'
  );

  if (!button) {
    return;
  }


  selectedBloodBankId =
    Number(
      button.dataset.centerSchedule
    );


  console.log(
    'STEP 8D: Selected blood bank:',
    selectedBloodBankId
  );


  scheduleModal(
    selectedBloodBankId
  );

});