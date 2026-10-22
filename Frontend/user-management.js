/*
  BloodBridge — Functional User Management
  -----------------------------------------
  Load after profile.js.

  Features:
  - Admin can create Donor and Admin accounts
  - New accounts can log in through auth.js
  - Dynamic user table from localStorage
  - Search and role/status filters
  - View, edit, suspend, and safely delete account details
  - Hospital count with pending-verification summary
  - Blocks deletion of protected, current, or operationally active accounts
  - Demo/system accounts are protected from editing/deletion
  - Hospital accounts continue to use the verification workflow
*/

(() => {
  'use strict';

  const ACCOUNTS_KEY = 'bloodbridge_accounts';
  const SESSION_KEY = 'bloodbridge_session';
  const PROFILES_KEY = 'bloodbridge_profiles';
  const SETTINGS_KEY = 'bloodbridge_user_settings';
  const REQUESTS_KEY = 'bloodbridge_emergency_requests';

  const systemAccounts = [
    {
      id: 'DNR-DEMO-001',
      fullName: 'Alex Morgan',
      email: 'donor@bloodbridge.demo',
      phone: '',
      location: 'Ahmedabad, Gujarat',
      bloodType: 'O−',
      role: 'donor',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      systemAccount: true
    },
    {
      id: 'HOSP-DEMO-001',
      fullName: 'St. Jude Medical Center',
      email: 'hospital@bloodbridge.demo',
      phone: '',
      location: 'Ahmedabad, Gujarat',
      role: 'hospital',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      systemAccount: true
    },
    {
      id: 'ADM-DEMO-001',
      fullName: 'BloodBridge Admin',
      email: 'admin@bloodbridge.demo',
      phone: '',
      location: 'BloodBridge Operations',
      designation: 'System Administrator',
      department: 'BloodBridge Operations',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      systemAccount: true
    }
  ];

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

  function readAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
      return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
      return [];
    }
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function allAccounts() {
    return [...systemAccounts, ...readAccounts()]
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function findAnyAccount(email) {
    const normalizedEmail = normalizeEmail(email);
    return allAccounts().find(account => normalizeEmail(account.email) === normalizedEmail) || null;
  }

  function findStoredAccount(email) {
    const normalizedEmail = normalizeEmail(email);
    return readAccounts().find(account => normalizeEmail(account.email) === normalizedEmail) || null;
  }

  function encodeEmail(email) {
    return encodeURIComponent(normalizeEmail(email));
  }

  function decodeEmail(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function initials(name) {
    return String(name || 'User')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || 'U';
  }

  function roleInfo(role) {
    const roles = {
      donor: { label: 'Donor', badge: 'red', icon: 'heart' },
      hospital: { label: 'Hospital', badge: 'blue', icon: 'hospital' },
      admin: { label: 'Administrator', badge: 'gray', icon: 'shield' }
    };

    return roles[role] || roles.donor;
  }

  function statusInfo(status) {
    const statuses = {
      active: { label: 'Active', badge: 'green' },
      pending: { label: 'Pending Verification', badge: 'amber' },
      rejected: { label: 'Rejected', badge: 'red' },
      suspended: { label: 'Suspended', badge: 'red' }
    };

    return statuses[status] || statuses.active;
  }

  function userRow(account) {
    const role = roleInfo(account.role);
    const status = statusInfo(account.status);
    const emailValue = encodeEmail(account.email);
    const searchValue = `${account.fullName} ${account.email} ${account.id} ${account.role} ${account.status}`.toLowerCase();

    return `
      <tr
        data-managed-user-row
        data-role="${escapeHTML(account.role)}"
        data-status="${escapeHTML(account.status)}"
        data-search="${escapeHTML(searchValue)}"
      >
        <td>
          <div class="table-person">
            <div class="avatar">${escapeHTML(initials(account.fullName))}</div>
            <div>
              <strong>${escapeHTML(account.fullName || 'Unnamed User')}</strong>
              <span>${escapeHTML(account.id || 'Account')}</span>
            </div>
          </div>
        </td>
        <td>
          <strong class="managed-user-email">${escapeHTML(account.email)}</strong>
          <span class="managed-user-phone">${escapeHTML(account.phone || 'No phone added')}</span>
        </td>
        <td>
          <span class="badge badge-${role.badge}">${I(role.icon, 'icon-sm')} ${role.label}</span>
        </td>
        <td>
          ${account.role === 'donor' && account.bloodType
            ? `<span class="type-chip">${escapeHTML(account.bloodType)}</span>`
            : '<span class="muted">—</span>'}
        </td>
        <td><span class="badge badge-${status.badge} badge-dot">${status.label}</span></td>
        <td>
          ${escapeHTML(formatDate(account.createdAt))}
          ${account.systemAccount ? '<br><span class="text-small muted">Protected demo account</span>' : ''}
        </td>
        <td>
          <div class="table-actions">
            <button type="button" data-managed-user-view="${emailValue}" title="View account">
              ${I('eye')}
            </button>
            ${account.systemAccount ? '' : `
              <button type="button" data-managed-user-edit="${emailValue}" title="Edit account">
                ${I('file')}
              </button>
              <button type="button" class="managed-delete-action" data-managed-user-delete="${emailValue}" title="Delete account">
                ${I('x')}
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }

  window.usersPage = function usersPage() {
    const accounts = allAccounts();
    const activeCount = accounts.filter(account => account.status === 'active').length;
    const donorCount = accounts.filter(account => account.role === 'donor').length;
    const adminCount = accounts.filter(account => account.role === 'admin').length;
    const hospitalCount = accounts.filter(account => account.role === 'hospital').length;
    const pendingCount = accounts.filter(account => account.role === 'hospital' && account.status === 'pending').length;

    const content = `
      ${pageHead(
        'User Management',
        'Create and manage Donor and Administrator access across BloodBridge.',
        `<button type="button" class="btn btn-primary" data-create-managed-user>${I('plus', 'icon-sm')} Add User</button>`
      )}

      <div class="queue-stats">
        <div class="card queue-stat"><span>TOTAL ACCOUNTS</span><strong>${accounts.length}</strong></div>
        <div class="card queue-stat"><span>ACTIVE</span><strong class="text-green">${activeCount}</strong></div>
        <div class="card queue-stat"><span>DONORS / ADMINS</span><strong>${donorCount} / ${adminCount}</strong></div>
        <div class="card queue-stat managed-hospital-stat"><span>HOSPITALS</span><strong>${hospitalCount}</strong><small class="${pendingCount ? 'text-amber' : 'muted'}">${pendingCount} pending verification</small></div>
      </div>

      <section class="card table-card">
        <div class="table-tools managed-user-tools">
          <div class="tabs" aria-label="User role filters">
            <button type="button" class="tab active" data-managed-user-filter="all">All</button>
            <button type="button" class="tab" data-managed-user-filter="donor">Donors</button>
            <button type="button" class="tab" data-managed-user-filter="admin">Admins</button>
            <button type="button" class="tab" data-managed-user-filter="hospital">Hospitals</button>
            <button type="button" class="tab" data-managed-user-filter="pending">Pending</button>
          </div>

          <div class="filter-search" style="max-width:270px">
            ${I('search')}
            <input
              type="search"
              id="managedUserSearch"
              placeholder="Search name, email or ID..."
              aria-label="Search users"
            />
          </div>
        </div>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name / ID</th>
                <th>Contact</th>
                <th>Account Type</th>
                <th>Blood Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="managedUsersTableBody">
              ${accounts.map(userRow).join('')}
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>${accounts.length} BloodBridge account${accounts.length === 1 ? '' : 's'}</span>
          <span>Admins can create Donors and other Administrators.</span>
        </div>
      </section>
    `;

    return shell(content, '/users', 'admin', 'User Management');
  };

  function passwordField(name, label, placeholder) {
    return `
      <label class="profile-field">
        <span>${escapeHTML(label)}</span>
        <div class="input-wrap">
          ${I('lock')}
          <input
            type="password"
            name="${escapeHTML(name)}"
            placeholder="${escapeHTML(placeholder)}"
            minlength="6"
            required
          />
          <button type="button" class="password-toggle" data-password-toggle aria-label="Show password">
            ${I('eye', 'icon-sm')}
          </button>
        </div>
      </label>
    `;
  }

  function openCreateUserModal() {
    const session = getSession();

    if (!session || session.role !== 'admin') {
      toast('Admin access required', 'Please sign in through the Admin Portal.', 'error');
      return;
    }

    openModal(`
      <div class="modal-head managed-user-modal-head">
        <div>
          <span class="eyebrow">Admin action</span>
          <h2>Create BloodBridge User</h2>
          <p>Add an active Donor or Administrator account.</p>
        </div>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>

      <form id="managedUserCreateForm">
        <div class="modal-body managed-user-modal-body">
          <div class="managed-role-selector">
            <label>
              <input type="radio" name="role" value="donor" checked />
              <span>${I('heart')}<strong>Donor</strong><small>Create an active voluntary Donor account</small></span>
            </label>
            <label>
              <input type="radio" name="role" value="admin" />
              <span>${I('shield')}<strong>Administrator</strong><small>Grant BloodBridge management access</small></span>
            </label>
          </div>

          <div class="managed-security-note">
            ${I('shield', 'icon-sm')}
            <span>Administrator creation is restricted to signed-in Admin users and is recorded with the creator account.</span>
          </div>

          <section class="profile-editor-section">
            <div class="profile-editor-section__head">
              ${I('user')}
              <div><h3>Account Information</h3><p>Enter verified user details and login credentials.</p></div>
            </div>
            <div class="profile-form-grid">
              <label class="profile-field">
                <span>Full Name</span>
                <input class="form-control" name="fullName" type="text" placeholder="Enter full name" required />
              </label>
              <label class="profile-field">
                <span>Email Address</span>
                <input class="form-control" name="email" type="email" placeholder="user@example.com" required />
              </label>
              <label class="profile-field">
                <span>Contact Number</span>
                <input class="form-control" name="phone" type="tel" placeholder="+91 98765 43210" />
              </label>
              <label class="profile-field">
                <span>Location</span>
                <input class="form-control" name="location" type="text" placeholder="Ahmedabad, Gujarat" />
              </label>
            </div>
          </section>

          <section class="profile-editor-section managed-role-fields" data-donor-fields>
            <div class="profile-editor-section__head">
              ${I('drop')}
              <div><h3>Donor Details</h3><p>Blood type is required for compatible emergency matching.</p></div>
            </div>
            <div class="profile-form-grid">
              <label class="profile-field">
                <span>Verified Blood Type</span>
                <select class="form-control" name="bloodType" required>
                  <option value="">Select blood type</option>
                  <option>A+</option><option>A−</option>
                  <option>B+</option><option>B−</option>
                  <option>AB+</option><option>AB−</option>
                  <option>O+</option><option>O−</option>
                </select>
              </label>
              <label class="profile-field">
                <span>Account Status</span>
                <div class="profile-readonly-value">${I('check-circle', 'icon-sm')}<strong>Active immediately</strong></div>
              </label>
            </div>
          </section>

          <section class="profile-editor-section managed-role-fields" data-admin-fields hidden>
            <div class="profile-editor-section__head">
              ${I('shield')}
              <div><h3>Administrator Details</h3><p>Define the Admin's responsibility inside BloodBridge.</p></div>
            </div>
            <div class="profile-form-grid">
              <label class="profile-field">
                <span>Designation</span>
                <input class="form-control" name="designation" type="text" value="System Administrator" />
              </label>
              <label class="profile-field">
                <span>Department</span>
                <input class="form-control" name="department" type="text" value="BloodBridge Operations" />
              </label>
            </div>
          </section>

          <section class="profile-editor-section">
            <div class="profile-editor-section__head">
              ${I('lock')}
              <div><h3>Create Login Password</h3><p>Set the password this user will use to sign in.</p></div>
            </div>
            <div class="profile-form-grid">
              ${passwordField('password', 'Login Password', 'Minimum 6 characters')}
              ${passwordField('confirmPassword', 'Confirm Login Password', 'Enter password again')}
            </div>
          </section>
        </div>

        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">${I('plus', 'icon-sm')} Create User</button>
        </div>
      </form>
    `);

    modalRoot.querySelector('.modal')?.classList.add('managed-user-modal');
  }

  function createUser(form) {
    const session = getSession();

    if (!session || session.role !== 'admin') {
      closeModal();
      toast('Admin access required', 'Your session is not authorized.', 'error');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const role = String(data.get('role') || 'donor');
    const email = normalizeEmail(data.get('email'));
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (!['donor', 'admin'].includes(role)) {
      toast('Invalid account type', 'Only Donor and Admin accounts can be created here.', 'error');
      return;
    }

    if (findAnyAccount(email)) {
      toast('Email already exists', 'Use another email address or edit the existing account.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast('Passwords do not match', 'Enter the same password in both fields.', 'error');
      form.elements.confirmPassword.focus();
      return;
    }

    const now = new Date().toISOString();
    const account = {
      id: `${role === 'admin' ? 'ADM' : 'DNR'}-${Date.now()}`,
      fullName: String(data.get('fullName') || '').trim(),
      email,
      password,
      phone: String(data.get('phone') || '').trim(),
      location: String(data.get('location') || '').trim(),
      bloodType: role === 'donor' ? String(data.get('bloodType') || '') : '',
      designation: role === 'admin' ? String(data.get('designation') || '').trim() : '',
      department: role === 'admin' ? String(data.get('department') || '').trim() : '',
      role,
      status: 'active',
      createdAt: now,
      createdBy: session.email,
      updatedAt: now
    };

    const accounts = readAccounts();
    accounts.push(account);
    saveAccounts(accounts);
    closeModal();

    toast(
      `${role === 'admin' ? 'Administrator' : 'Donor'} created`,
      `${account.fullName} can now sign in using ${account.email}.`
    );

    if (getRoute().path === '/admin/users') routePage();
  }

  function accountInformationRows(account) {
    const role = roleInfo(account.role);
    const status = statusInfo(account.status);

    return `
      <div class="info-grid managed-account-info-grid">
        <div class="info-item"><span>Full Name</span><strong>${escapeHTML(account.fullName)}</strong></div>
        <div class="info-item"><span>Email Address</span><strong>${escapeHTML(account.email)}</strong></div>
        <div class="info-item"><span>Contact Number</span><strong>${escapeHTML(account.phone || 'Not provided')}</strong></div>
        <div class="info-item"><span>Location</span><strong>${escapeHTML(account.location || 'Not provided')}</strong></div>
        <div class="info-item"><span>Account Type</span><strong>${escapeHTML(role.label)}</strong></div>
        <div class="info-item"><span>Status</span><strong><span class="badge badge-${status.badge}">${status.label}</span></strong></div>
        <div class="info-item"><span>Account ID</span><strong>${escapeHTML(account.id || 'Not available')}</strong></div>
        <div class="info-item"><span>Created</span><strong>${escapeHTML(formatDate(account.createdAt))}</strong></div>
      </div>
    `;
  }

  function openViewUserModal(email) {
    const account = findAnyAccount(email);
    if (!account) {
      toast('User not found', 'This account may have been removed.', 'error');
      return;
    }

    const role = roleInfo(account.role);

    openModal(`
      <div class="modal-head">
        <div>
          <h2>User Account Details</h2>
          <p style="margin:4px 0 0;color:var(--slate-500);font-size:9px">${escapeHTML(account.id)}</p>
        </div>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>
      <div class="modal-body">
        <div class="managed-account-hero">
          <div class="profile-avatar">${escapeHTML(initials(account.fullName))}</div>
          <div>
            <h3>${escapeHTML(account.fullName)}</h3>
            <p>${escapeHTML(account.email)}</p>
          </div>
          <span class="badge badge-${role.badge}">${I(role.icon, 'icon-sm')} ${role.label}</span>
        </div>
        <div class="separator" style="margin:17px 0"></div>
        ${accountInformationRows(account)}
        ${account.systemAccount ? `
          <div class="managed-security-note" style="margin-top:16px">
            ${I('lock', 'icon-sm')}<span>This is a protected demo account and cannot be edited or suspended.</span>
          </div>
        ` : ''}
      </div>
    `, `
      ${account.systemAccount ? '' : `<button type="button" class="btn btn-danger-outline" data-managed-user-delete="${encodeEmail(account.email)}">Delete Account</button>`}
      <span style="flex:1"></span>
      <button type="button" class="btn btn-secondary" data-close-modal>Close</button>
      ${account.systemAccount ? '' : `<button type="button" class="btn btn-primary" data-managed-user-edit="${encodeEmail(account.email)}">Edit Account</button>`}
    `);
  }

  function openEditUserModal(email) {
    const account = findStoredAccount(email);
    const session = getSession();

    if (!account || !session || session.role !== 'admin') {
      toast('Account cannot be edited', 'Protected or missing accounts cannot be changed.', 'error');
      return;
    }

    closeModal();

    const hospitalPending = account.role === 'hospital' && account.status === 'pending';

    openModal(`
      <div class="modal-head">
        <div><h2>Edit User Account</h2><p style="margin:4px 0 0;color:var(--slate-500);font-size:9px">${escapeHTML(account.id)}</p></div>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>
      <form id="managedUserEditForm" data-user-email="${encodeEmail(account.email)}">
        <div class="modal-body">
          <div class="profile-form-grid managed-edit-grid">
            <label class="profile-field"><span>Full Name</span><input class="form-control" name="fullName" value="${escapeHTML(account.fullName)}" required /></label>
            <label class="profile-field"><span>Contact Number</span><input class="form-control" name="phone" type="tel" value="${escapeHTML(account.phone || '')}" /></label>
            <label class="profile-field"><span>Location</span><input class="form-control" name="location" value="${escapeHTML(account.location || '')}" /></label>
            <label class="profile-field">
              <span>Account Status</span>
              ${hospitalPending
                ? `<div class="profile-readonly-value">${I('clock', 'icon-sm')}<strong>Use Verification Queue</strong></div>`
                : `
                    <select class="form-control" name="status">
                      <option value="active" ${account.status === 'active' ? 'selected' : ''}>Active</option>
                      <option value="suspended" ${account.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                    </select>
                  `}
            </label>
            <div class="profile-field profile-field--readonly"><span>Email Address</span><div class="profile-readonly-value">${I('lock', 'icon-sm')}<strong>${escapeHTML(account.email)}</strong></div><small>Verified email cannot be changed.</small></div>
            <div class="profile-field profile-field--readonly"><span>Account Role</span><div class="profile-readonly-value">${I('shield', 'icon-sm')}<strong>${escapeHTML(roleInfo(account.role).label)}</strong></div><small>Role changes require a new account.</small></div>
          </div>
          ${normalizeEmail(account.email) === normalizeEmail(session.email) ? `
            <div class="managed-security-note">${I('alert', 'icon-sm')}<span>You cannot suspend the Administrator account currently signed in.</span></div>
          ` : ''}
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
      </form>
    `);
  }

  function saveEditedUser(form) {
    const session = getSession();
    if (!session || session.role !== 'admin') return;

    const email = decodeEmail(form.dataset.userEmail);
    const accounts = readAccounts();
    const index = accounts.findIndex(account => normalizeEmail(account.email) === normalizeEmail(email));

    if (index === -1) {
      closeModal();
      toast('User not found', 'The account could not be updated.', 'error');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const requestedStatus = String(data.get('status') || accounts[index].status);

    if (
      normalizeEmail(accounts[index].email) === normalizeEmail(session.email) &&
      requestedStatus === 'suspended'
    ) {
      toast('Action blocked', 'You cannot suspend your currently signed-in Admin account.', 'error');
      return;
    }

    accounts[index] = {
      ...accounts[index],
      fullName: String(data.get('fullName') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      location: String(data.get('location') || '').trim(),
      status: accounts[index].role === 'hospital' && accounts[index].status === 'pending'
        ? 'pending'
        : requestedStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: session.email
    };

    saveAccounts(accounts);
    closeModal();
    toast('User updated', `${accounts[index].fullName}'s account has been updated.`);

    if (getRoute().path === '/admin/users') routePage();
  }

  function readEmergencyRequests() {
    try {
      const requests = JSON.parse(localStorage.getItem(REQUESTS_KEY));
      return Array.isArray(requests) ? requests : [];
    } catch (error) {
      return [];
    }
  }

  function activeAccountDependency(account) {
    const openStatuses = ['pending_admin', 'active', 'partially_matched', 'matched'];
    const requests = readEmergencyRequests().filter(request => openStatuses.includes(request.status));
    const email = normalizeEmail(account.email);

    if (account.role === 'hospital') {
      const activeRequest = requests.find(request => normalizeEmail(request.hospitalEmail) === email);
      if (activeRequest) {
        return `This Hospital still owns active emergency request ${activeRequest.id}. Complete or cancel it before deleting the account.`;
      }
    }

    if (account.role === 'donor') {
      const activeCommitment = requests.find(request =>
        (request.donorResponses || []).some(response =>
          normalizeEmail(response.donorEmail) === email && response.status === 'confirmed'
        )
      );
      if (activeCommitment) {
        return `This Donor has a confirmed response on active request ${activeCommitment.id}. Complete that workflow before deleting the account.`;
      }
    }

    return '';
  }

  function removeAccountPreferences(email) {
    const identity = normalizeEmail(email);

    try {
      const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY)) || {};
      delete profiles[identity];
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (error) {
      // A malformed optional profile record must not block account deletion.
    }

    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      delete settings[identity];
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      // A malformed optional settings record must not block account deletion.
    }
  }

  function openDeleteUserModal(email) {
    const account = findAnyAccount(email);
    const session = getSession();

    if (!account || !session || session.role !== 'admin') {
      toast('Account cannot be deleted', 'The account is missing or your session is not authorized.', 'error');
      return;
    }

    if (account.systemAccount) {
      toast('Protected account', 'Default demo accounts cannot be deleted.', 'error');
      return;
    }

    if (normalizeEmail(account.email) === normalizeEmail(session.email)) {
      toast('Action blocked', 'You cannot delete the Administrator account currently signed in.', 'error');
      return;
    }

    const dependency = activeAccountDependency(account);
    if (dependency) {
      toast('Account has an active responsibility', dependency, 'error');
      return;
    }

    closeModal();

    openModal(`
      <div class="modal-head">
        <div>
          <h2>Delete User Account</h2>
          <p style="margin:4px 0 0;color:var(--slate-500);font-size:9px">Permanent account removal</p>
        </div>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>
      <form id="managedUserDeleteForm" data-user-email="${encodeEmail(account.email)}">
        <div class="modal-body">
          <div class="managed-delete-warning">
            ${I('alert')}
            <div>
              <strong>This action cannot be undone</strong>
              <p>The login account, saved profile, and account settings will be permanently removed. Emergency audit history will be retained.</p>
            </div>
          </div>

          <div class="managed-account-hero" style="margin:18px 0">
            <div class="profile-avatar">${escapeHTML(initials(account.fullName))}</div>
            <div>
              <h3>${escapeHTML(account.fullName)}</h3>
              <p>${escapeHTML(account.email)} · ${escapeHTML(roleInfo(account.role).label)}</p>
            </div>
            <span class="badge badge-${statusInfo(account.status).badge}">${statusInfo(account.status).label}</span>
          </div>

          <label class="profile-field">
            <span>Type DELETE to confirm</span>
            <input class="form-control" name="confirmation" autocomplete="off" placeholder="DELETE" required />
            <small>Use capital letters exactly as shown.</small>
          </label>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary managed-confirm-delete">Delete Account Permanently</button>
        </div>
      </form>
    `);
  }

  function deleteManagedUser(form) {
    const session = getSession();
    const email = decodeEmail(form.dataset.userEmail);
    const account = findStoredAccount(email);

    if (!session || session.role !== 'admin' || !account) {
      closeModal();
      toast('Deletion failed', 'The account could not be found or your session expired.', 'error');
      return;
    }

    if (normalizeEmail(account.email) === normalizeEmail(session.email)) {
      toast('Action blocked', 'You cannot delete your currently signed-in account.', 'error');
      return;
    }

    if (String(new FormData(form).get('confirmation') || '').trim() !== 'DELETE') {
      toast('Confirmation required', 'Type DELETE in capital letters to continue.', 'error');
      form.elements.confirmation.focus();
      return;
    }

    const dependency = activeAccountDependency(account);
    if (dependency) {
      closeModal();
      toast('Deletion blocked', dependency, 'error');
      return;
    }

    const remainingAccounts = readAccounts().filter(
      item => normalizeEmail(item.email) !== normalizeEmail(account.email)
    );

    saveAccounts(remainingAccounts);
    removeAccountPreferences(account.email);
    closeModal();
    toast('Account deleted', `${account.fullName}'s ${roleInfo(account.role).label} account was permanently removed.`);

    if (getRoute().path === '/admin/users') routePage();
  }

  function applyManagedUserFilters() {
    const activeFilter = document.querySelector('[data-managed-user-filter].active')?.dataset.managedUserFilter || 'all';
    const search = String(document.getElementById('managedUserSearch')?.value || '').trim().toLowerCase();
    const rows = [...document.querySelectorAll('[data-managed-user-row]')];
    let visible = 0;

    rows.forEach(row => {
      const roleMatches = activeFilter === 'all' || row.dataset.role === activeFilter;
      const statusMatches = activeFilter !== 'pending' || row.dataset.status === 'pending';
      const filterMatches = activeFilter === 'pending' ? statusMatches : roleMatches;
      const searchMatches = !search || row.dataset.search.includes(search);
      const show = filterMatches && searchMatches;

      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    document.getElementById('managedUsersEmpty')?.remove();

    if (!visible) {
      document.getElementById('managedUsersTableBody')?.insertAdjacentHTML('beforeend', `
        <tr id="managedUsersEmpty"><td colspan="7"><div class="empty-state" style="padding:42px 20px">${I('search')}<h3>No matching accounts</h3><p>Try another role filter or search term.</p></div></td></tr>
      `);
    }
  }

  function toggleCreateRoleFields(role) {
    const donorFields = document.querySelector('[data-donor-fields]');
    const adminFields = document.querySelector('[data-admin-fields]');
    const bloodType = document.querySelector('[name="bloodType"]');

    if (donorFields) donorFields.hidden = role !== 'donor';
    if (adminFields) adminFields.hidden = role !== 'admin';
    if (bloodType) bloodType.required = role === 'donor';
  }

  document.addEventListener('click', event => {
    const createButton = event.target.closest('[data-create-managed-user]');
    if (createButton) {
      event.preventDefault();
      openCreateUserModal();
      return;
    }

    const viewButton = event.target.closest('[data-managed-user-view]');
    if (viewButton) {
      event.preventDefault();
      openViewUserModal(decodeEmail(viewButton.dataset.managedUserView));
      return;
    }

    const editButton = event.target.closest('[data-managed-user-edit]');
    if (editButton) {
      event.preventDefault();
      openEditUserModal(decodeEmail(editButton.dataset.managedUserEdit));
      return;
    }

    const deleteButton = event.target.closest('[data-managed-user-delete]');
    if (deleteButton) {
      event.preventDefault();
      openDeleteUserModal(decodeEmail(deleteButton.dataset.managedUserDelete));
      return;
    }

    const filterButton = event.target.closest('[data-managed-user-filter]');
    if (filterButton) {
      event.preventDefault();
      document.querySelectorAll('[data-managed-user-filter]').forEach(button => button.classList.remove('active'));
      filterButton.classList.add('active');
      applyManagedUserFilters();
    }
  });

  document.addEventListener('change', event => {
    if (event.target.matches('#managedUserCreateForm [name="role"]')) {
      toggleCreateRoleFields(event.target.value);
    }
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'managedUserSearch') applyManagedUserFilters();
  });

  document.addEventListener('submit', event => {
    if (event.target.id === 'managedUserCreateForm') {
      event.preventDefault();
      event.stopImmediatePropagation();
      createUser(event.target);
      return;
    }

    if (event.target.id === 'managedUserEditForm') {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveEditedUser(event.target);
      return;
    }

    if (event.target.id === 'managedUserDeleteForm') {
      event.preventDefault();
      event.stopImmediatePropagation();
      deleteManagedUser(event.target);
    }
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    .managed-user-email,
    .managed-user-phone {
      display: block;
    }
    .managed-user-email { color: var(--slate-800); font-size: 9px; }
    .managed-user-phone { margin-top: 4px; color: var(--slate-500); font-size: 8px; }
    .data-table .badge .icon { width: 11px; height: 11px; }

    .managed-hospital-stat small {
      display: block;
      margin-top: 5px;
      font-size: 8px;
    }

    .table-actions .managed-delete-action {
      color: var(--red);
      border-color: var(--red-border);
      background: var(--red-soft);
    }

    .table-actions .managed-delete-action:hover {
      color: #fff;
      border-color: var(--red);
      background: var(--red);
    }

    .managed-delete-warning {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 14px;
      border: 1px solid var(--red-border);
      border-radius: 9px;
      color: var(--red);
      background: var(--red-soft);
    }

    .managed-delete-warning > .icon {
      width: 21px;
      height: 21px;
      flex: 0 0 auto;
    }

    .managed-delete-warning strong {
      display: block;
      font-size: 11px;
    }

    .managed-delete-warning p {
      margin: 5px 0 0;
      color: #9e4950;
      font-size: 8px;
      line-height: 1.55;
    }

    .managed-confirm-delete {
      background: var(--red-dark);
    }

    .managed-user-modal {
      width: min(760px, 96vw);
      max-height: min(880px, 94vh);
      display: flex;
      flex-direction: column;
    }
    .managed-user-modal-head h2 { margin: 8px 0 3px; font-size: 19px; }
    .managed-user-modal-head p { margin: 0; color: var(--slate-500); font-size: 9px; }
    .managed-user-modal form { min-height: 0; display: flex; flex: 1; flex-direction: column; }
    .managed-user-modal-body { min-height: 0; overflow-y: auto; background: var(--slate-50); }

    .managed-role-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 13px;
    }
    .managed-role-selector label { position: relative; }
    .managed-role-selector input { position: absolute; opacity: 0; pointer-events: none; }
    .managed-role-selector label > span {
      min-height: 72px;
      display: grid;
      grid-template-columns: 29px 1fr;
      grid-template-rows: auto auto;
      column-gap: 10px;
      align-content: center;
      padding: 12px;
      border: 1px solid var(--slate-200);
      border-radius: 9px;
      background: #fff;
      cursor: pointer;
    }
    .managed-role-selector .icon { grid-row: 1 / 3; align-self: center; color: var(--red); }
    .managed-role-selector strong { font-size: 10px; }
    .managed-role-selector small { margin-top: 4px; color: var(--slate-500); font-size: 8px; }
    .managed-role-selector input:checked + span { border-color: var(--red); background: var(--red-soft); box-shadow: 0 0 0 2px rgba(180,35,44,.06); }

    .managed-security-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 14px;
      padding: 11px 12px;
      border: 1px solid #cfe0f5;
      border-radius: 8px;
      color: var(--blue);
      background: var(--blue-soft);
      font-size: 8px;
      line-height: 1.5;
    }
    [hidden] { display: none !important; }

    .managed-account-hero { display: flex; align-items: center; gap: 13px; }
    .managed-account-hero .profile-avatar { width: 58px; height: 58px; margin: 0; font-size: 16px; }
    .managed-account-hero > div:nth-child(2) { flex: 1; }
    .managed-account-hero h3 { margin: 0 0 5px; font-size: 14px; }
    .managed-account-hero p { margin: 0; color: var(--slate-500); font-size: 9px; }
    .managed-account-info-grid .info-item:nth-last-child(-n + 2) { border-bottom: 0; }
    .managed-edit-grid { padding: 0; }

    @media (max-width: 760px) {
      .managed-user-tools { align-items: stretch; flex-direction: column; }
      .managed-user-tools .tabs { overflow-x: auto; }
      .managed-user-tools .filter-search { width: 100%; max-width: none !important; }
    }
    @media (max-width: 600px) {
      .managed-role-selector { grid-template-columns: 1fr; }
      .managed-account-info-grid { grid-template-columns: 1fr; }
      .managed-account-info-grid .info-item:nth-child(odd),
      .managed-account-info-grid .info-item:nth-child(even) { padding: 13px 0; border-left: 0; }
    }
  `;
  document.head.appendChild(style);

  if (getRoute().path === '/admin/users') routePage();
})();
