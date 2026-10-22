/*
  BloodBridge — Role-Based Settings & Dashboard Motion
  ----------------------------------------------------
  Load after emergency-flow.js.

  Features:
  - Working Settings button for Donor, Hospital, and Admin
  - Per-account settings saved in localStorage
  - Compact dashboard mode
  - Reduced-motion accessibility mode
  - Role-specific notification and workflow preferences
  - Hospital default facility auto-fill
  - Admin dashboard auto-refresh
  - Subtle dashboard entrance, count-up, progress, and map animations
*/

(() => {
  'use strict';

  const SETTINGS_KEY = 'bloodbridge_user_settings';
  const SESSION_KEY = 'bloodbridge_session';
  let autoRefreshTimer = null;
  let animationFramePending = false;

  const defaultSettings = {
    common: {
      compactMode: false,
      reduceMotion: false,
      emailNotifications: true,
      browserNotifications: true
    },
    donor: {
      urgentNeedAlerts: true,
      donationReminders: true,
      alertDistance: '15',
      preferredContact: 'both',
      shareAvailability: true
    },
    hospital: {
      criticalAlerts: true,
      inventoryWarnings: true,
      defaultFacility: 'St. Jude Medical Center',
      inventoryThreshold: '10',
      emergencyContact: '',
      autoBroadcastHigh: true
    },
    admin: {
      criticalSystemAlerts: true,
      verificationReminders: true,
      lowStockThreshold: '10',
      autoRefreshSeconds: '0',
      dailySummary: true,
      auditRetention: '90'
    }
  };

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      return session && session.loggedIn ? session : null;
    } catch (error) {
      return null;
    }
  }

  function readAllSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return settings && typeof settings === 'object' ? settings : {};
    } catch (error) {
      return {};
    }
  }

  function settingsIdentity(session) {
    return String(session?.email || session?.role || 'guest').trim().toLowerCase();
  }

  function cloneDefaults(role) {
    return {
      common: { ...defaultSettings.common },
      role: { ...(defaultSettings[role] || {}) }
    };
  }

  function getUserSettings(session = getSession()) {
    if (!session) return cloneDefaults('donor');

    const allSettings = readAllSettings();
    const saved = allSettings[settingsIdentity(session)] || {};
    const defaults = cloneDefaults(session.role);

    return {
      common: {
        ...defaults.common,
        ...(saved.common || {})
      },
      role: {
        ...defaults.role,
        ...(saved.role || {})
      }
    };
  }

  function saveUserSettings(session, settings) {
    const allSettings = readAllSettings();
    allSettings[settingsIdentity(session)] = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(allSettings));
  }

  function checked(value) {
    return value ? 'checked' : '';
  }

  function selected(currentValue, expectedValue) {
    return String(currentValue) === String(expectedValue) ? 'selected' : '';
  }

  function toggleSetting(name, title, description, value) {
    return `
      <label class="settings-toggle-row">
        <span class="settings-item-icon">${I('bell')}</span>
        <span class="settings-item-copy">
          <strong>${escapeHTML(title)}</strong>
          <small>${escapeHTML(description)}</small>
        </span>
        <span class="settings-switch-control">
          <input type="checkbox" name="${escapeHTML(name)}" ${checked(value)} />
          <i></i>
        </span>
      </label>
    `;
  }

  function selectSetting(name, title, description, value, options, icon = 'settings') {
    return `
      <label class="settings-select-row">
        <span class="settings-item-icon">${I(icon)}</span>
        <span class="settings-item-copy">
          <strong>${escapeHTML(title)}</strong>
          <small>${escapeHTML(description)}</small>
        </span>
        <select name="${escapeHTML(name)}" class="filter-select">
          ${options.map(option => `
            <option value="${escapeHTML(option.value)}" ${selected(value, option.value)}>
              ${escapeHTML(option.label)}
            </option>
          `).join('')}
        </select>
      </label>
    `;
  }

  function textSetting(name, title, description, value, placeholder, icon = 'file') {
    return `
      <label class="settings-text-row">
        <span class="settings-item-icon">${I(icon)}</span>
        <span class="settings-item-copy">
          <strong>${escapeHTML(title)}</strong>
          <small>${escapeHTML(description)}</small>
        </span>
        <input
          type="text"
          name="${escapeHTML(name)}"
          class="form-control"
          value="${escapeHTML(value || '')}"
          placeholder="${escapeHTML(placeholder)}"
        />
      </label>
    `;
  }

  function commonSettingsHTML(settings) {
    return `
      <section class="settings-section">
        <div class="settings-section__head">
          <span>${I('grid')}</span>
          <div>
            <h3>Appearance & Accessibility</h3>
            <p>Control dashboard density and motion effects.</p>
          </div>
        </div>
        <div class="settings-section__body">
          ${toggleSetting(
            'compactMode',
            'Compact Dashboard',
            'Reduce spacing to show more information on screen.',
            settings.common.compactMode
          )}
          ${toggleSetting(
            'reduceMotion',
            'Reduce Animations',
            'Disable card, number, progress, and map animations.',
            settings.common.reduceMotion
          )}
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-section__head">
          <span>${I('bell')}</span>
          <div>
            <h3>Communication</h3>
            <p>Choose how BloodBridge can notify this account.</p>
          </div>
        </div>
        <div class="settings-section__body">
          ${toggleSetting(
            'emailNotifications',
            'Email Notifications',
            'Receive important account and workflow updates by email.',
            settings.common.emailNotifications
          )}
          ${toggleSetting(
            'browserNotifications',
            'In-App Notifications',
            'Show alerts and confirmation messages inside BloodBridge.',
            settings.common.browserNotifications
          )}
        </div>
      </section>
    `;
  }

  function donorSettingsHTML(settings) {
    return `
      <section class="settings-section settings-section--role">
        <div class="settings-section__head">
          <span>${I('heart')}</span>
          <div>
            <h3>Donor Preferences</h3>
            <p>Control matching alerts and donation availability.</p>
          </div>
        </div>
        <div class="settings-section__body">
          ${toggleSetting(
            'urgentNeedAlerts',
            'Urgent Compatible Requests',
            'Alert me when my blood type is urgently needed.',
            settings.role.urgentNeedAlerts
          )}
          ${toggleSetting(
            'donationReminders',
            'Donation Reminders',
            'Remind me when I am eligible to donate again.',
            settings.role.donationReminders
          )}
          ${toggleSetting(
            'shareAvailability',
            'Share Availability Status',
            'Allow verified Hospitals to see that I can receive matching alerts.',
            settings.role.shareAvailability
          )}
          ${selectSetting(
            'alertDistance',
            'Alert Distance',
            'Maximum distance for nearby emergency request alerts.',
            settings.role.alertDistance,
            [
              { value: '5', label: 'Within 5 km' },
              { value: '15', label: 'Within 15 km' },
              { value: '30', label: 'Within 30 km' },
              { value: 'all', label: 'All nearby regions' }
            ],
            'pin'
          )}
          ${selectSetting(
            'preferredContact',
            'Preferred Contact Method',
            'How a Hospital should contact me after confirmation.',
            settings.role.preferredContact,
            [
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
              { value: 'both', label: 'Email & SMS' }
            ],
            'phone'
          )}
        </div>
      </section>
    `;
  }

  function hospitalSettingsHTML(settings) {
    return `
      <section class="settings-section settings-section--role">
        <div class="settings-section__head">
          <span>${I('hospital')}</span>
          <div>
            <h3>Hospital Workflow</h3>
            <p>Configure emergency requests and facility inventory defaults.</p>
          </div>
        </div>
        <div class="settings-section__body">
          ${toggleSetting(
            'criticalAlerts',
            'Critical Response Alerts',
            'Show immediate updates when a Donor or Admin confirms supply.',
            settings.role.criticalAlerts
          )}
          ${toggleSetting(
            'inventoryWarnings',
            'Inventory Warning Alerts',
            'Notify staff when blood stock falls below the configured threshold.',
            settings.role.inventoryWarnings
          )}
          ${toggleSetting(
            'autoBroadcastHigh',
            'Instant High-Priority Broadcast',
            'Broadcast Critical and High requests without waiting for Admin review.',
            settings.role.autoBroadcastHigh
          )}
          ${textSetting(
            'defaultFacility',
            'Default Facility Name',
            'Automatically fill this Hospital in new emergency requests.',
            settings.role.defaultFacility,
            'Enter official facility name',
            'hospital'
          )}
          ${selectSetting(
            'inventoryThreshold',
            'Low Inventory Threshold',
            'Warn staff when available units fall below this number.',
            settings.role.inventoryThreshold,
            [
              { value: '5', label: 'Below 5 units' },
              { value: '10', label: 'Below 10 units' },
              { value: '20', label: 'Below 20 units' },
              { value: '50', label: 'Below 50 units' }
            ],
            'box'
          )}
          ${textSetting(
            'emergencyContact',
            'Emergency Contact',
            'Contact number shown to Admin response teams.',
            settings.role.emergencyContact,
            '+91 79 0000 0000',
            'phone'
          )}
        </div>
      </section>
    `;
  }

  function adminSettingsHTML(settings) {
    return `
      <section class="settings-section settings-section--role">
        <div class="settings-section__head">
          <span>${I('shield')}</span>
          <div>
            <h3>Administration</h3>
            <p>Configure monitoring, verification, and network controls.</p>
          </div>
        </div>
        <div class="settings-section__body">
          ${toggleSetting(
            'criticalSystemAlerts',
            'Critical System Alerts',
            'Notify me about critical shortages and unfulfilled requests.',
            settings.role.criticalSystemAlerts
          )}
          ${toggleSetting(
            'verificationReminders',
            'Verification Reminders',
            'Alert me when Hospital access requests remain pending.',
            settings.role.verificationReminders
          )}
          ${toggleSetting(
            'dailySummary',
            'Daily Operations Summary',
            'Receive a daily summary of requests, matches, and inventory.',
            settings.role.dailySummary
          )}
          ${selectSetting(
            'lowStockThreshold',
            'Network Low-Stock Threshold',
            'Global unit level used for inventory warning indicators.',
            settings.role.lowStockThreshold,
            [
              { value: '5', label: 'Below 5 units' },
              { value: '10', label: 'Below 10 units' },
              { value: '20', label: 'Below 20 units' },
              { value: '50', label: 'Below 50 units' }
            ],
            'box'
          )}
          ${selectSetting(
            'autoRefreshSeconds',
            'Dashboard Auto-Refresh',
            'Automatically refresh open Admin pages at this interval.',
            settings.role.autoRefreshSeconds,
            [
              { value: '0', label: 'Off' },
              { value: '15', label: 'Every 15 seconds' },
              { value: '30', label: 'Every 30 seconds' },
              { value: '60', label: 'Every 1 minute' }
            ],
            'clock'
          )}
          ${selectSetting(
            'auditRetention',
            'Audit Log Retention',
            'Preferred retention period for workflow activity records.',
            settings.role.auditRetention,
            [
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '180', label: '180 days' },
              { value: '365', label: '1 year' }
            ],
            'file'
          )}
        </div>
      </section>
    `;
  }

  function roleSettingsHTML(role, settings) {
    if (role === 'hospital') return hospitalSettingsHTML(settings);
    if (role === 'admin') return adminSettingsHTML(settings);
    return donorSettingsHTML(settings);
  }

  function roleTitle(role) {
    if (role === 'hospital') return 'Hospital Settings';
    if (role === 'admin') return 'Admin Settings';
    return 'Donor Settings';
  }

  function openSettings() {
    const session = getSession();

    if (!session) {
      toast('Login required', 'Please sign in before opening Settings.', 'error');
      navigate('/login');
      return;
    }

    const settings = getUserSettings(session);

    openModal(`
      <div class="modal-head settings-modal-head">
        <div>
          <span class="eyebrow">${escapeHTML(session.role)} portal</span>
          <h2>${escapeHTML(roleTitle(session.role))}</h2>
          <p>${escapeHTML(session.email)}</p>
        </div>
        <button type="button" class="modal-close" data-close-modal aria-label="Close Settings">
          ${I('x')}
        </button>
      </div>

      <form id="roleSettingsForm" data-settings-role="${escapeHTML(session.role)}">
        <div class="modal-body settings-modal-body">
          <div class="settings-account-card">
            <div class="avatar">${escapeHTML(
              String(session.fullName || session.role)
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part[0].toUpperCase())
                .join('')
            )}</div>
            <div>
              <strong>${escapeHTML(session.fullName || session.email)}</strong>
              <span>${escapeHTML(roleTitle(session.role))} · Preferences saved per account</span>
            </div>
            <span class="badge badge-green badge-dot">Signed In</span>
          </div>

          <div class="settings-grid">
            <div>${roleSettingsHTML(session.role, settings)}</div>
            <div>${commonSettingsHTML(settings)}</div>
          </div>
        </div>

        <div class="modal-foot settings-modal-foot">
          <button type="button" class="btn btn-danger-outline" data-reset-settings>
            Reset Defaults
          </button>
          <span class="settings-foot-spacer"></span>
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">${I('check', 'icon-sm')} Save Settings</button>
        </div>
      </form>
    `);

    modalRoot.querySelector('.modal')?.classList.add('settings-modal');
  }

  function formBoolean(formData, name) {
    return formData.get(name) === 'on';
  }

  function settingsFromForm(form, session) {
    const formData = new FormData(form);
    const common = {
      compactMode: formBoolean(formData, 'compactMode'),
      reduceMotion: formBoolean(formData, 'reduceMotion'),
      emailNotifications: formBoolean(formData, 'emailNotifications'),
      browserNotifications: formBoolean(formData, 'browserNotifications')
    };

    let role = {};

    if (session.role === 'donor') {
      role = {
        urgentNeedAlerts: formBoolean(formData, 'urgentNeedAlerts'),
        donationReminders: formBoolean(formData, 'donationReminders'),
        shareAvailability: formBoolean(formData, 'shareAvailability'),
        alertDistance: String(formData.get('alertDistance') || '15'),
        preferredContact: String(formData.get('preferredContact') || 'both')
      };
    }

    if (session.role === 'hospital') {
      role = {
        criticalAlerts: formBoolean(formData, 'criticalAlerts'),
        inventoryWarnings: formBoolean(formData, 'inventoryWarnings'),
        autoBroadcastHigh: formBoolean(formData, 'autoBroadcastHigh'),
        defaultFacility: String(formData.get('defaultFacility') || '').trim(),
        inventoryThreshold: String(formData.get('inventoryThreshold') || '10'),
        emergencyContact: String(formData.get('emergencyContact') || '').trim()
      };
    }

    if (session.role === 'admin') {
      role = {
        criticalSystemAlerts: formBoolean(formData, 'criticalSystemAlerts'),
        verificationReminders: formBoolean(formData, 'verificationReminders'),
        dailySummary: formBoolean(formData, 'dailySummary'),
        lowStockThreshold: String(formData.get('lowStockThreshold') || '10'),
        autoRefreshSeconds: String(formData.get('autoRefreshSeconds') || '0'),
        auditRetention: String(formData.get('auditRetention') || '90')
      };
    }

    return { common, role };
  }

  function applySettings(settings, session = getSession()) {
    document.body.classList.toggle('bb-compact-mode', Boolean(settings.common.compactMode));
    document.body.classList.toggle('bb-reduce-motion', Boolean(settings.common.reduceMotion));

    if (session?.role === 'hospital' && settings.role.defaultFacility) {
      const facilityInput = document.getElementById('facilityName');
      if (facilityInput && !facilityInput.dataset.settingsApplied) {
        facilityInput.value = settings.role.defaultFacility;
        facilityInput.dataset.settingsApplied = 'true';
        facilityInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    setupAutoRefresh(settings, session);
  }

  function setupAutoRefresh(settings, session = getSession()) {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }

    const seconds = Number(settings.role.autoRefreshSeconds || 0);
    if (session?.role !== 'admin' || !seconds) return;

    autoRefreshTimer = setInterval(() => {
      if (
        getSession()?.role === 'admin' &&
        getRoute().path.startsWith('/admin/') &&
        !modalRoot.children.length &&
        !document.hidden
      ) {
        routePage();
        toast('Dashboard refreshed', 'Admin data was refreshed automatically.');
      }
    }, seconds * 1000);
  }

  function saveSettings(form) {
    const session = getSession();
    if (!session) {
      closeModal();
      toast('Session expired', 'Please sign in again.', 'error');
      navigate('/login');
      return;
    }

    const settings = settingsFromForm(form, session);
    saveUserSettings(session, settings);
    applySettings(settings, session);
    closeModal();
    toast('Settings saved', `${roleTitle(session.role)} were updated successfully.`);
    animateDashboard(true);
  }

  function resetSettings() {
    const session = getSession();
    if (!session) return;

    const settings = cloneDefaults(session.role);
    saveUserSettings(session, settings);
    applySettings(settings, session);
    closeModal();
    toast('Settings reset', 'Default preferences have been restored.');
    animateDashboard(true);
  }

  function configureSettingsButton() {
    const session = getSession();
    const navItems = [...document.querySelectorAll('.sidebar-nav .nav-item')];
    const settingsItem = navItems.find(item => item.textContent.trim().startsWith('Settings'));

    if (!settingsItem || settingsItem.hasAttribute('data-open-role-settings')) return;

    settingsItem.removeAttribute('href');
    settingsItem.setAttribute('role', 'button');
    settingsItem.setAttribute('tabindex', '0');
    settingsItem.setAttribute('data-open-role-settings', '');
    settingsItem.setAttribute('aria-label', `Open ${roleTitle(session?.role || 'donor')}`);
  }

  function animateNumericElement(element, force = false) {
    if (!force && element.dataset.numberAnimated === 'true') return;

    const originalText = String(element.dataset.originalNumber || element.textContent || '').trim();
    const match = originalText.match(/^([\d,.]+)(.*)$/);
    if (!match) return;

    const target = Number(match[1].replaceAll(',', ''));
    if (!Number.isFinite(target)) return;

    const suffix = match[2] || '';
    const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
    const useComma = match[1].includes(',');
    const settings = getUserSettings();

    element.dataset.originalNumber = originalText;
    element.dataset.numberAnimated = 'true';

    if (settings.common.reduceMotion) {
      element.textContent = originalText;
      return;
    }

    const startTime = performance.now();
    const duration = 850;

    const render = currentValue => {
      const fixed = decimals ? currentValue.toFixed(decimals) : Math.round(currentValue).toString();
      const number = useComma
        ? Number(fixed).toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          })
        : fixed;
      element.textContent = `${number}${suffix}`;
    };

    render(0);

    const tick = now => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      render(target * eased);

      if (progress < 1) requestAnimationFrame(tick);
      else element.textContent = originalText;
    };

    requestAnimationFrame(tick);
  }

  function animateProgressBars(container) {
    if (getUserSettings().common.reduceMotion) return;

    container.querySelectorAll(
      '.inventory-bar i, .stock-level__bar i, .emergency-progress__bar i'
    ).forEach(bar => {
      if (bar.dataset.progressAnimated === 'true') return;

      const targetWidth = bar.style.width || getComputedStyle(bar).width;
      bar.dataset.progressAnimated = 'true';
      bar.style.width = '0%';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.width = targetWidth;
        });
      });
    });
  }

  function animateDashboard(force = false) {
    const shell = document.querySelector('.app-shell');
    const content = document.querySelector('.main-shell .content');
    if (!shell || !content) return;

    const settings = getUserSettings();
    applySettings(settings);

    if (settings.common.reduceMotion) return;

    const cards = [...content.querySelectorAll(
      '.page-head, .kpi-card, .metric-card, .queue-stat, .dashboard-grid > *, .request-card, .hospital-request-card, .admin-emergency-card, .table-card, .donor-hero, .urgent-card, .quick-card, .profile-summary, .profile-content > *, .centers-layout'
    )];

    cards.forEach((card, index) => {
      if (!force && card.dataset.dashboardAnimated === 'true') return;

      card.dataset.dashboardAnimated = 'true';
      card.style.setProperty('--dashboard-delay', `${Math.min(index, 9) * 45}ms`);
      card.classList.remove('bb-dashboard-enter');
      void card.offsetWidth;
      card.classList.add('bb-dashboard-enter');
    });

    content.querySelectorAll(
      '.kpi-value, .queue-stat strong, .metric-card strong, .impact-stat strong'
    ).forEach(element => animateNumericElement(element, force));

    animateProgressBars(content);
  }

  function afterPageRender() {
    configureSettingsButton();

    const session = getSession();
    if (session) {
      const settings = getUserSettings(session);
      applySettings(settings, session);
    }

    animateDashboard();
  }

  document.addEventListener('click', event => {
    const settingsButton = event.target.closest('[data-open-role-settings]');
    if (settingsButton) {
      event.preventDefault();
      openSettings();
      return;
    }

    const resetButton = event.target.closest('[data-reset-settings]');
    if (resetButton) {
      event.preventDefault();
      resetSettings();
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      event.target.matches('[data-open-role-settings]')
    ) {
      event.preventDefault();
      openSettings();
    }
  });

  document.addEventListener('submit', event => {
    if (event.target.id !== 'roleSettingsForm') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    saveSettings(event.target);
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    .settings-modal {
      width: min(900px, 96vw);
      max-height: min(820px, 92vh);
      display: flex;
      flex-direction: column;
    }

    .settings-modal-head {
      flex: 0 0 auto;
    }

    .settings-modal-head h2 {
      margin: 8px 0 3px;
      font-size: 19px;
    }

    .settings-modal-head p {
      margin: 0;
      color: var(--slate-500);
      font-size: 9px;
    }

    .settings-modal form {
      min-height: 0;
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    .settings-modal-body {
      min-height: 0;
      overflow-y: auto;
      background: var(--slate-50);
    }

    .settings-account-card {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 16px;
      padding: 13px 14px;
      border: 1px solid var(--slate-200);
      border-radius: 9px;
      background: #fff;
    }

    .settings-account-card > div:nth-child(2) {
      min-width: 0;
      flex: 1;
    }

    .settings-account-card strong,
    .settings-account-card span {
      display: block;
    }

    .settings-account-card strong {
      font-size: 11px;
    }

    .settings-account-card div > span {
      margin-top: 4px;
      color: var(--slate-500);
      font-size: 8px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }

    .settings-section {
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .settings-section__head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 15px;
      border-bottom: 1px solid var(--slate-100);
    }

    .settings-section__head > span,
    .settings-item-icon {
      width: 31px;
      height: 31px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 7px;
      color: var(--red);
      background: var(--red-soft);
    }

    .settings-section__head .icon,
    .settings-item-icon .icon {
      width: 15px;
      height: 15px;
    }

    .settings-section__head h3,
    .settings-section__head p {
      margin: 0;
    }

    .settings-section__head h3 {
      font-size: 11px;
    }

    .settings-section__head p {
      margin-top: 4px;
      color: var(--slate-500);
      font-size: 8px;
    }

    .settings-toggle-row,
    .settings-select-row,
    .settings-text-row {
      display: flex;
      align-items: center;
      gap: 11px;
      min-height: 62px;
      padding: 11px 14px;
      border-bottom: 1px solid var(--slate-100);
    }

    .settings-section__body > :last-child {
      border-bottom: 0;
    }

    .settings-item-copy {
      min-width: 0;
      flex: 1;
    }

    .settings-item-copy strong,
    .settings-item-copy small {
      display: block;
    }

    .settings-item-copy strong {
      color: var(--slate-800);
      font-size: 10px;
    }

    .settings-item-copy small {
      margin-top: 4px;
      color: var(--slate-500);
      font-size: 8px;
      line-height: 1.45;
    }

    .settings-select-row .filter-select {
      width: 135px;
      flex: 0 0 auto;
    }

    .settings-text-row {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .settings-text-row .settings-item-copy {
      padding-top: 7px;
    }

    .settings-text-row .form-control {
      width: 100%;
      margin-left: 42px;
    }

    .settings-switch-control {
      position: relative;
      width: 38px;
      height: 22px;
      flex: 0 0 auto;
    }

    .settings-switch-control input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .settings-switch-control i {
      position: absolute;
      inset: 0;
      border-radius: 20px;
      background: var(--slate-300);
      cursor: pointer;
      transition: background .2s ease;
    }

    .settings-switch-control i::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      left: 2px;
      top: 2px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 4px rgba(16,24,40,.24);
      transition: transform .2s ease;
    }

    .settings-switch-control input:checked + i {
      background: var(--green);
    }

    .settings-switch-control input:checked + i::after {
      transform: translateX(16px);
    }

    .settings-switch-control input:focus-visible + i {
      outline: 3px solid rgba(35,132,83,.18);
      outline-offset: 2px;
    }

    .settings-modal-foot {
      flex: 0 0 auto;
    }

    .settings-foot-spacer {
      flex: 1;
    }

    .bb-compact-mode .content {
      padding: 19px;
    }

    .bb-compact-mode .kpi-grid,
    .bb-compact-mode .dashboard-grid,
    .bb-compact-mode .dashboard-stack {
      gap: 11px;
    }

    .bb-compact-mode .kpi-card,
    .bb-compact-mode .card-body,
    .bb-compact-mode .hospital-request-card,
    .bb-compact-mode .admin-emergency-card {
      padding: 14px;
    }

    .bb-dashboard-enter {
      animation: bbDashboardEnter .55s cubic-bezier(.2,.75,.25,1) var(--dashboard-delay, 0ms) both;
    }

    @keyframes bbDashboardEnter {
      from {
        opacity: 0;
        transform: translateY(15px) scale(.992);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .app-shell .map-pin.primary {
      animation: bbMapPulse 2.4s ease-in-out infinite;
    }

    .app-shell .notification-btn::after {
      animation: bbNotifyPulse 1.8s ease-in-out infinite;
    }

    @keyframes bbMapPulse {
      0%, 100% { box-shadow: 0 5px 12px rgba(44,58,58,.16), 0 0 0 0 rgba(180,35,44,0); }
      50% { box-shadow: 0 5px 12px rgba(44,58,58,.16), 0 0 0 8px rgba(180,35,44,.13); }
    }

    @keyframes bbNotifyPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.35); }
    }

    .bb-reduce-motion *,
    .bb-reduce-motion *::before,
    .bb-reduce-motion *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }

    @media (max-width: 760px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }

      .settings-modal {
        max-height: 95vh;
      }

      .settings-modal-foot {
        flex-wrap: wrap;
      }

      .settings-modal-foot .settings-foot-spacer {
        display: none;
      }

      .settings-modal-foot .btn {
        flex: 1;
      }
    }

    @media (max-width: 480px) {
      .settings-select-row {
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .settings-select-row .filter-select {
        width: calc(100% - 42px);
        margin-left: 42px;
      }

      .settings-account-card > .badge {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);

  const appObserver = new MutationObserver(() => {
    if (animationFramePending) return;
    animationFramePending = true;

    requestAnimationFrame(() => {
      animationFramePending = false;
      afterPageRender();
    });
  });

  appObserver.observe(app, {
    childList: true,
    subtree: true
  });

  afterPageRender();
})();
