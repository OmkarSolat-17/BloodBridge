/*
  BloodBridge Role-Based Portal Router
  ------------------------------------
  Load order in index.html:
  1. app.js
  2. auth.js
  3. portal.js

  This module gives Donor, Hospital, and Admin their own routes,
  navigation, access control, and logout flow.
*/

(() => {
  'use strict';

  const SESSION_KEY = 'bloodbridge_session';

  const roleHome = {
    donor: '/donor/dashboard',
    hospital: '/hospital/dashboard',
    admin: '/admin/dashboard'
  };

  const protectedRouteRoles = {
    '/donor/dashboard': 'donor',
    '/donor/requests': 'donor',
    '/donor/centers': 'donor',
    '/donor/profile': 'donor',

    '/hospital/dashboard': 'hospital',
    '/hospital/emergency': 'hospital',
    '/hospital/requests': 'hospital',
    '/hospital/centers': 'hospital',
    '/hospital/inventory': 'hospital',

    '/admin/dashboard': 'admin',
    '/admin/users': 'admin',
    '/admin/inventory': 'admin',
    '/admin/pending-requests': 'admin',
    '/admin/verification': 'admin'
  };

  const oldRouteRedirects = {
    '/donor-dashboard': session => session?.role === 'donor' ? '/donor/dashboard' : '/login?role=donor',
    '/dashboard': session => session?.role === 'hospital' ? '/hospital/dashboard' : '/login?role=hospital',
    '/admin': session => session?.role === 'admin' ? '/admin/dashboard' : '/login?role=admin',
    '/emergency': () => '/hospital/emergency',
    '/profile': () => '/donor/profile',
    '/users': () => '/admin/users',
    '/pending': () => '/admin/pending-requests',
    '/verification': () => '/admin/verification',
    '/requests': session => session?.role === 'donor' ? '/donor/requests' : '/hospital/requests',
    '/centers': session => session?.role === 'hospital' ? '/hospital/centers' : '/donor/centers',
    '/inventory': session => session?.role === 'hospital' ? '/hospital/inventory' : '/admin/inventory'
  };

  function getPortalSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      return session && session.loggedIn ? session : null;
    } catch (error) {
      return null;
    }
  }

function clearPortalSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('bloodbridge_token');
}

  function updateNavigationRoutes() {
    navSets.hospital = [
      ['Overview', 'grid', '/hospital/dashboard'],
      ['Emergency Request', 'alert', '/hospital/emergency'],
      ['Active Requests', 'drop', '/hospital/requests', '6'],
      ['Find Centers', 'map', '/hospital/centers'],
      ['Hospital Inventory', 'box', '/hospital/inventory']
    ];

    navSets.donor = [
      ['My Dashboard', 'grid', '/donor/dashboard'],
      ['Nearby Requests', 'alert', '/donor/requests', '6'],
      ['Find Centers', 'map', '/donor/centers'],
      ['My Profile', 'user', '/donor/profile']
    ];

    navSets.admin = [
      ['Dashboard', 'grid', '/admin/dashboard'],
      ['User Management', 'users', '/admin/users'],
      ['Network Inventory', 'box', '/admin/inventory'],
      ['Pending Requests', 'file', '/admin/pending-requests', '3'],
      ['Verification Queue', 'shield', '/admin/verification', '12']
    ];
  }

  async function extractPageContent(pageFunction) {

  const completePage =
    await pageFunction();

  const parsedPage =
    new DOMParser().parseFromString(
      completePage,
      'text/html'
    );

  const content =
    parsedPage.querySelector('main.content');

  return content
    ? content.innerHTML
    : completePage;
}

  async function prepareRoleContent(pageFunction, role, pageType) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML =
  await extractPageContent(pageFunction);

    if (role === 'donor' && pageType === 'requests') {
      const heading = wrapper.querySelector('.page-title h1');
      const subtitle = wrapper.querySelector('.page-title p');

      if (heading) heading.textContent = 'Nearby Blood Requests';
      if (subtitle) subtitle.textContent = 'Urgent blood needs from verified medical facilities near you.';

      wrapper.querySelectorAll('a[href="#/emergency"]').forEach(element => element.remove());
      wrapper.querySelectorAll('[data-fulfill]').forEach(button => {
        if (!button.disabled) button.textContent = 'Respond to Request';
      });
    }

    if (role === 'hospital' && pageType === 'centers') {
      const heading = wrapper.querySelector('.page-title h1');
      const subtitle = wrapper.querySelector('.page-title p');

      if (heading) heading.textContent = 'Blood Banks & Centers';
      if (subtitle) subtitle.textContent = 'Locate verified blood banks and partner facilities near your hospital.';

      wrapper.querySelectorAll('[data-schedule]').forEach(button => {
        button.removeAttribute('data-schedule');
        button.textContent = 'View Facility';
      });
    }

    if (role === 'hospital' && pageType === 'inventory') {
      const heading = wrapper.querySelector('.page-title h1');
      const subtitle = wrapper.querySelector('.page-title p');

      if (heading) heading.textContent = 'Hospital Inventory';
      if (subtitle) subtitle.textContent = 'Monitor your facility blood stock levels and expiry alerts.';
    }

    return wrapper.innerHTML;
  }

  async function portalPage(
  pageFunction,
  role,
  activePath,
  title,
  pageType = ''
) {

  const content =
    await prepareRoleContent(
      pageFunction,
      role,
      pageType
    );

  return shell(
    content,
    activePath,
    role,
    title
  );
}

  function pageDefinitions(query) {
    return {
      '/home': {
        render: homePage,
        bindAs: '/home'
      },
      '/login': {
        render: () => authLayout('login', query.get('role') || 'donor'),
        bindAs: '/login'
      },
      '/register': {
        render: () => authLayout('register'),
        bindAs: '/register'
      },

      '/donor/dashboard': {
        render: () => portalPage(donorDashboard, 'donor', '/donor/dashboard', 'My Dashboard'),
        bindAs: '/donor-dashboard',
        role: 'donor'
      },
      '/donor/requests': {
        render: () => portalPage(requestsPage, 'donor', '/donor/requests', 'Nearby Requests', 'requests'),
        bindAs: '/requests',
        role: 'donor'
      },
      '/donor/centers': {
        render: () => portalPage(centersPage, 'donor', '/donor/centers', 'Find Centers'),
        bindAs: '/centers',
        role: 'donor'
      },
      '/donor/profile': {
        render: () => portalPage(profilePage, 'donor', '/donor/profile', 'Donor Profile'),
        bindAs: '/profile',
        role: 'donor'
      },

      '/hospital/dashboard': {
        render: () => portalPage(hospitalDashboard, 'hospital', '/hospital/dashboard', 'Overview'),
        bindAs: '/dashboard',
        role: 'hospital'
      },
      '/hospital/emergency': {
        render: () => portalPage(emergencyPage, 'hospital', '/hospital/emergency', 'Emergency Request'),
        bindAs: '/emergency',
        role: 'hospital'
      },
      '/hospital/requests': {
        render: () => portalPage(requestsPage, 'hospital', '/hospital/requests', 'Active Requests', 'requests'),
        bindAs: '/requests',
        role: 'hospital'
      },
      '/hospital/centers': {
        render: () => portalPage(centersPage, 'hospital', '/hospital/centers', 'Blood Banks & Centers', 'centers'),
        bindAs: '/centers',
        role: 'hospital'
      },
      '/hospital/inventory': {
        render: () => portalPage(inventoryPage, 'hospital', '/hospital/inventory', 'Hospital Inventory', 'inventory'),
        bindAs: '/inventory',
        role: 'hospital'
      },

      '/admin/dashboard': {
        render: () => portalPage(adminDashboard, 'admin', '/admin/dashboard', 'Admin Dashboard'),
        bindAs: '/admin',
        role: 'admin'
      },
      '/admin/users': {
        render: () => portalPage(usersPage, 'admin', '/admin/users', 'User Management'),
        bindAs: '/users',
        role: 'admin'
      },
      '/admin/inventory': {
        render: () => portalPage(inventoryPage, 'admin', '/admin/inventory', 'Network Inventory'),
        bindAs: '/inventory',
        role: 'admin'
      },
      '/admin/pending-requests': {
        render: () => portalPage(pendingPage, 'admin', '/admin/pending-requests', 'Pending Requests'),
        bindAs: '/pending',
        role: 'admin'
      },
      '/admin/verification': {
        render: () => portalPage(verificationPage, 'admin', '/admin/verification', 'Verification Queue'),
        bindAs: '/verification',
        role: 'admin'
      }
    };
  }

  function setShellAccountDetails(session) {
    if (!session) return;

    const nameElements = document.querySelectorAll('.sidebar-profile strong');
    const roleElements = document.querySelectorAll('.sidebar-profile span');
    const avatars = document.querySelectorAll('.sidebar-profile .avatar, .topbar-right > .avatar');

    const initials = String(session.fullName || session.role)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    nameElements.forEach(element => {
      element.textContent = session.fullName || session.email;
    });

    roleElements.forEach(element => {
      element.textContent = session.role === 'admin'
        ? 'System Administrator'
        : session.role === 'hospital'
          ? 'Hospital Staff'
          : 'Verified Donor';
    });

    avatars.forEach(element => {
      element.textContent = initials || 'BB';
    });
  }

  function configureSidebarActions(role) {
    const navItems = [...document.querySelectorAll('.sidebar-nav .nav-item')];
    if (navItems.length < 2) return;

    const settingsItem = navItems[navItems.length - 2];
    const logoutItem = navItems[navItems.length - 1];

    settingsItem.href = `#${role === 'donor' ? '/donor/profile' : roleHome[role]}`;
    logoutItem.removeAttribute('href');
    logoutItem.setAttribute('role', 'button');
    logoutItem.setAttribute('tabindex', '0');
    logoutItem.setAttribute('data-portal-logout', '');
  }

  function showAccessMessage(requiredRole, currentRole) {
    toast(
      'Access restricted',
      `This page belongs to the ${requiredRole} portal. You are signed in as ${currentRole}.`,
      'error'
    );
  }

  async function portalRoutePage() {
    const { path, query } = getRoute();
    const session = getPortalSession();

    if (oldRouteRedirects[path]) {
      const destination = oldRouteRedirects[path](session);
      navigate(destination);
      return;
    }

    const requiredRole = protectedRouteRoles[path];

    if (requiredRole && !session) {
      navigate(`/login?role=${requiredRole}`);
      return;
    }

    if (requiredRole && session.role !== requiredRole) {
      showAccessMessage(requiredRole, session.role);
      navigate(roleHome[session.role] || '/home');
      return;
    }

    const pages = pageDefinitions(query);
    const page = pages[path];

    if (!page) {
      app.innerHTML = notFound();
      window.scrollTo(0, 0);
      return;
    }

    app.innerHTML =
  await page.render();
    window.scrollTo(0, 0);
    bindPageSpecific(page.bindAs || path);

    if (page.role) {
      configureSidebarActions(page.role);
      setShellAccountDetails(session);
    }
  }

  function logout() {
    clearPortalSession();
    toast('Signed out successfully', 'Your BloodBridge session has ended securely.');
    navigate('/home');
  }

  document.addEventListener('click', event => {
    const logoutButton = event.target.closest('[data-portal-logout]');
    if (!logoutButton) return;

    event.preventDefault();
    logout();
  }, true);

  document.addEventListener('keydown', event => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      event.target.matches('[data-portal-logout]')
    ) {
      event.preventDefault();
      logout();
    }
  });

  updateNavigationRoutes();

  // Remove the old hash router registered by app.js and replace it with
  // the protected role-based router.
  const previousRoutePage = window.routePage;
  window.removeEventListener('hashchange', previousRoutePage);
  window.routePage = portalRoutePage;
  window.addEventListener('hashchange', portalRoutePage);

  portalRoutePage();
})();
