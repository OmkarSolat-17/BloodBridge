/*
  BloodBridge — Admin Hospital Verification
  ------------------------------------------
  Load this file after portal.js.

  Features:
  - Shows hospital access requests stored by auth.js
  - Admin can review complete facility information
  - Approve activates Hospital login
  - Decline marks the request as rejected
  - Pending/Approved/Declined filters
  - Search and dynamic verification counts
*/

(() => {
  'use strict';

  const ACCOUNTS_KEY = 'bloodbridge_accounts';
  const VERIFICATION_LOG_KEY = 'bloodbridge_verification_log';

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

  function readVerificationLog() {
    try {
      const log = JSON.parse(localStorage.getItem(VERIFICATION_LOG_KEY));
      return Array.isArray(log) ? log : [];
    } catch (error) {
      return [];
    }
  }

  function saveVerificationLog(log) {
    localStorage.setItem(VERIFICATION_LOG_KEY, JSON.stringify(log));
  }

  function getHospitalAccounts() {
    return readAccounts()
      .filter(account => account.role === 'hospital')
      .sort((first, second) => {
        const firstDate = new Date(first.createdAt || 0).getTime();
        const secondDate = new Date(second.createdAt || 0).getTime();
        return secondDate - firstDate;
      });
  }

  function findHospital(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return readAccounts().find(
      account =>
        account.role === 'hospital' &&
        String(account.email || '').trim().toLowerCase() === normalizedEmail
    );
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function hoursWaiting(value) {
    const submittedAt = new Date(value).getTime();
    if (!submittedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - submittedAt) / 3600000));
  }

  function waitingLabel(value) {
    const hours = hoursWaiting(value);

    if (hours < 1) return 'Submitted just now';
    if (hours < 24) return `${hours}h waiting`;

    const days = Math.floor(hours / 24);
    return `${days}d waiting`;
  }

  function statusDetails(status) {
    const statuses = {
      pending: {
        label: 'Pending Verification',
        badge: 'amber'
      },
      active: {
        label: 'Approved',
        badge: 'green'
      },
      rejected: {
        label: 'Declined',
        badge: 'red'
      }
    };

    return statuses[status] || statuses.pending;
  }

  function encodedEmail(email) {
    return encodeURIComponent(String(email || '').trim().toLowerCase());
  }

  function decodedEmail(email) {
    try {
      return decodeURIComponent(email);
    } catch (error) {
      return email;
    }
  }

  function updateAdminNavCount(pendingCount) {
    const verificationNavigation = navSets.admin.find(
      navigationItem => navigationItem[2] === '/admin/verification'
    );

    if (verificationNavigation) {
      verificationNavigation[3] = pendingCount > 0 ? String(pendingCount) : undefined;
    }

    const visibleCount = document.querySelector(
      '.nav-item[href="#/admin/verification"] .nav-count'
    );

    if (visibleCount) {
      if (pendingCount > 0) visibleCount.textContent = pendingCount;
      else visibleCount.remove();
    }
  }

  function verificationStats(accounts) {
    const pending = accounts.filter(account => account.status === 'pending');
    const approved = accounts.filter(account => account.status === 'active');
    const declined = accounts.filter(account => account.status === 'rejected');
    const delayed = pending.filter(account => hoursWaiting(account.createdAt) >= 48);

    return {
      pending: pending.length,
      approved: approved.length,
      declined: declined.length,
      delayed: delayed.length
    };
  }

  function verificationRow(account) {
    const status = statusDetails(account.status);
    const initials = String(account.fullName || 'Hospital')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
    const emailValue = encodedEmail(account.email);
    const rowStatus = account.status === 'active' ? 'approved' : account.status;

    return `
      <tr
        data-verification-row
        data-status="${escapeHTML(rowStatus)}"
        data-search="${escapeHTML(`${account.fullName} ${account.email} ${account.licenseNumber} ${account.location}`.toLowerCase())}"
        style="${rowStatus === 'pending' ? '' : 'display:none'}"
      >
        <td>
          <div class="table-person">
            <div class="avatar">${escapeHTML(initials || 'H')}</div>
            <div>
              <strong>${escapeHTML(account.fullName || 'Unnamed Facility')}</strong>
              <span>${escapeHTML(account.id || 'Hospital request')}</span>
            </div>
          </div>
        </td>
        <td>
          <strong style="display:block;color:var(--slate-800);font-size:10px;margin-bottom:4px">
            ${escapeHTML(account.email)}
          </strong>
          <span class="muted">${escapeHTML(account.phone || 'No phone')}</span>
        </td>
        <td>
          ${escapeHTML(formatDate(account.createdAt))}
          <br />
          <span class="${hoursWaiting(account.createdAt) >= 48 ? 'text-red' : 'muted'}">
            ${escapeHTML(waitingLabel(account.createdAt))}
          </span>
        </td>
        <td>
          <strong style="display:block;color:var(--slate-800);font-size:10px;margin-bottom:4px">
            ${escapeHTML(account.licenseNumber || 'Not provided')}
          </strong>
          <span class="muted">${escapeHTML(account.location || 'Location unavailable')}</span>
        </td>
        <td>
          <span class="badge badge-${status.badge} badge-dot">${status.label}</span>
        </td>
        <td>
          <button
            type="button"
            class="btn ${account.status === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-sm"
            data-review-hospital="${emailValue}"
          >
            ${account.status === 'pending' ? 'Review' : 'View Details'}
          </button>
        </td>
      </tr>
    `;
  }

  function emptyVerificationRow() {
    return `
      <tr id="verificationEmptyRow">
        <td colspan="6">
          <div class="empty-state" style="padding:45px 20px">
            ${I('shield')}
            <h3>No pending hospital requests</h3>
            <p>New Hospital Access Requests will automatically appear here.</p>
          </div>
        </td>
      </tr>
    `;
  }

  window.verificationPage = function verificationPage() {
    const accounts = getHospitalAccounts();
    const stats = verificationStats(accounts);
    updateAdminNavCount(stats.pending);

    const pendingAccounts = accounts.filter(account => account.status === 'pending');
    const rows = accounts.length
      ? accounts.map(verificationRow).join('')
      : emptyVerificationRow();

    const content = `
      ${pageHead(
        'Hospital Verification',
        'Review facility credentials and approve secure Hospital Portal access.',
        `<button type="button" class="btn btn-secondary" data-refresh-verification>${I('check-circle', 'icon-sm')} Refresh Queue</button>`
      )}

      <div class="queue-stats">
        <div class="card queue-stat">
          <span>PENDING APPROVAL</span>
          <strong class="${stats.pending ? 'text-amber' : ''}">${stats.pending}</strong>
        </div>
        <div class="card queue-stat">
          <span>WAITING &gt; 48H</span>
          <strong class="${stats.delayed ? 'text-red' : ''}">${stats.delayed}</strong>
        </div>
        <div class="card queue-stat">
          <span>APPROVED</span>
          <strong class="text-green">${stats.approved}</strong>
        </div>
        <div class="card queue-stat">
          <span>DECLINED</span>
          <strong>${stats.declined}</strong>
        </div>
      </div>

      <section class="card table-card">
        <div class="table-tools">
          <div class="tabs" aria-label="Verification filters">
            <button type="button" class="tab active" data-verification-filter="pending">
              Pending (${stats.pending})
            </button>
            <button type="button" class="tab" data-verification-filter="approved">
              Approved (${stats.approved})
            </button>
            <button type="button" class="tab" data-verification-filter="rejected">
              Declined (${stats.declined})
            </button>
            <button type="button" class="tab" data-verification-filter="all">
              All (${accounts.length})
            </button>
          </div>

          <div class="filter-search" style="max-width:280px">
            ${I('search')}
            <input
              type="search"
              id="verificationSearch"
              placeholder="Search hospital, email or licence..."
              aria-label="Search hospital verification requests"
            />
          </div>
        </div>

        <div class="data-table-wrap">
          <table class="data-table" id="verificationTable">
            <thead>
              <tr>
                <th>Hospital / Request ID</th>
                <th>Official Contact</th>
                <th>Submitted</th>
                <th>Licence / Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="verificationTableBody">
              ${rows}
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>${pendingAccounts.length} request${pendingAccounts.length === 1 ? '' : 's'} currently awaiting verification</span>
          <span>Hospital approvals are saved in this browser demo.</span>
        </div>
      </section>
    `;

    return shell(content, '/verification', 'admin', 'Hospital Verification');
  };

  function informationItem(label, value) {
    return `
      <div class="info-item">
        <span>${escapeHTML(label)}</span>
        <strong>${escapeHTML(value || 'Not provided')}</strong>
      </div>
    `;
  }

  function openHospitalReview(email) {
    const account = findHospital(email);

    if (!account) {
      toast('Request not found', 'This hospital request may have been removed.', 'error');
      if (getRoute().path === '/admin/verification') routePage();
      return;
    }

    const status = statusDetails(account.status);
    const isPending = account.status === 'pending';
    const emailValue = encodedEmail(account.email);

    openModal(
      `
        <div class="modal-head">
          <div>
            <h2>Hospital Verification Review</h2>
            <p style="margin:4px 0 0;color:var(--slate-500);font-size:9px">
              ${escapeHTML(account.id || 'Hospital access request')}
            </p>
          </div>
          <button type="button" class="modal-close" data-close-modal aria-label="Close">
            ${I('x')}
          </button>
        </div>

        <div class="modal-body">
          <div class="approval-entity">
            <span class="entity-icon">${I('hospital')}</span>
            <div style="flex:1">
              <h3 style="margin:0 0 5px">${escapeHTML(account.fullName || 'Unnamed Facility')}</h3>
              <p class="muted" style="margin:0;font-size:9px">
                Submitted ${escapeHTML(formatDate(account.createdAt))}
              </p>
            </div>
            <span class="badge badge-${status.badge} badge-dot">${status.label}</span>
          </div>

          <div class="separator" style="margin:18px 0"></div>

          <div class="info-grid verification-info-grid">
            ${informationItem('Official Email', account.email)}
            ${informationItem('Contact Number', account.phone)}
            ${informationItem('Licence Number', account.licenseNumber)}
            ${informationItem('Authorized Person', account.contactPerson)}
            ${informationItem('Facility Address', account.location)}
            ${informationItem('Waiting Time', waitingLabel(account.createdAt))}
          </div>

          ${isPending ? `
            <div class="summary-note" style="margin-bottom:0">
              ${I('alert', 'icon-sm')}
              Approval will immediately activate this Hospital account. Verify the licence and official contact before continuing.
            </div>
          ` : `
            <div class="summary-note" style="margin-bottom:0;background:${account.status === 'active' ? 'var(--green-soft)' : 'var(--red-soft)'};color:${account.status === 'active' ? 'var(--green)' : 'var(--red)'}">
              ${I(account.status === 'active' ? 'check-circle' : 'alert', 'icon-sm')}
              This request was ${account.status === 'active' ? 'approved' : 'declined'} on ${escapeHTML(formatDate(account.verifiedAt || account.rejectedAt))}.
            </div>
          `}
        </div>
      `,
      isPending
        ? `
            <button type="button" class="btn btn-danger-outline" data-decline-hospital="${emailValue}">
              Decline Request
            </button>
            <button type="button" class="btn btn-primary" data-approve-hospital="${emailValue}">
              ${I('check', 'icon-sm')} Approve Hospital
            </button>
          `
        : `<button type="button" class="btn btn-secondary" data-close-modal>Close</button>`
    );
  }

  function recordVerification(account, action) {
    const log = readVerificationLog();

    log.unshift({
      id: `VER-${Date.now()}`,
      accountId: account.id,
      email: account.email,
      hospitalName: account.fullName,
      action,
      performedAt: new Date().toISOString()
    });

    saveVerificationLog(log.slice(0, 100));
  }

  function changeHospitalStatus(email, newStatus) {
    const accounts = readAccounts();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const accountIndex = accounts.findIndex(
      account =>
        account.role === 'hospital' &&
        String(account.email || '').trim().toLowerCase() === normalizedEmail
    );

    if (accountIndex === -1) {
      closeModal();
      toast('Request not found', 'The Hospital account could not be updated.', 'error');
      return;
    }

    const updatedAt = new Date().toISOString();
    const account = accounts[accountIndex];

    account.status = newStatus;

    if (newStatus === 'active') {
      account.verifiedAt = updatedAt;
      delete account.rejectedAt;
    } else {
      account.rejectedAt = updatedAt;
      delete account.verifiedAt;
    }

    accounts[accountIndex] = account;
    saveAccounts(accounts);
    recordVerification(account, newStatus === 'active' ? 'approved' : 'declined');
    closeModal();

    if (newStatus === 'active') {
      toast(
        'Hospital approved',
        `${account.fullName} can now sign in to the Hospital Portal.`
      );
    } else {
      toast(
        'Hospital request declined',
        `${account.fullName} has not been granted portal access.`,
        'error'
      );
    }

    if (getRoute().path === '/admin/verification') routePage();
  }

  function applyVerificationFilters() {
    const activeFilter = document.querySelector('[data-verification-filter].active')?.dataset.verificationFilter || 'pending';
    const searchValue = String(document.getElementById('verificationSearch')?.value || '').trim().toLowerCase();
    const rows = [...document.querySelectorAll('[data-verification-row]')];
    let visibleRows = 0;

    rows.forEach(row => {
      const statusMatches = activeFilter === 'all' || row.dataset.status === activeFilter;
      const searchMatches = !searchValue || row.dataset.search.includes(searchValue);
      const shouldDisplay = statusMatches && searchMatches;

      row.style.display = shouldDisplay ? '' : 'none';
      if (shouldDisplay) visibleRows += 1;
    });

    const existingEmptyState = document.getElementById('filteredVerificationEmpty');
    if (existingEmptyState) existingEmptyState.remove();

    if (!visibleRows && rows.length) {
      document.getElementById('verificationTableBody')?.insertAdjacentHTML(
        'beforeend',
        `
          <tr id="filteredVerificationEmpty">
            <td colspan="6">
              <div class="empty-state" style="padding:42px 20px">
                ${I('search')}
                <h3>No matching requests</h3>
                <p>Try another status filter or search term.</p>
              </div>
            </td>
          </tr>
        `
      );
    }
  }

  document.addEventListener('click', event => {
    const reviewButton = event.target.closest('[data-review-hospital]');
    if (reviewButton) {
      event.preventDefault();
      openHospitalReview(decodedEmail(reviewButton.dataset.reviewHospital));
      return;
    }

    const approveButton = event.target.closest('[data-approve-hospital]');
    if (approveButton) {
      event.preventDefault();
      changeHospitalStatus(
        decodedEmail(approveButton.dataset.approveHospital),
        'active'
      );
      return;
    }

    const declineButton = event.target.closest('[data-decline-hospital]');
    if (declineButton) {
      event.preventDefault();
      changeHospitalStatus(
        decodedEmail(declineButton.dataset.declineHospital),
        'rejected'
      );
      return;
    }

    const filterButton = event.target.closest('[data-verification-filter]');
    if (filterButton) {
      event.preventDefault();
      document.querySelectorAll('[data-verification-filter]').forEach(button => {
        button.classList.remove('active');
      });
      filterButton.classList.add('active');
      applyVerificationFilters();
      return;
    }

    const refreshButton = event.target.closest('[data-refresh-verification]');
    if (refreshButton) {
      event.preventDefault();
      routePage();
      toast('Queue refreshed', 'Hospital verification requests are up to date.');
    }
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'verificationSearch') {
      applyVerificationFilters();
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .verification-info-grid .info-item:nth-last-child(-n + 2) {
      border-bottom: 0;
    }

    @media (max-width: 760px) {
      .table-tools {
        align-items: stretch;
        flex-direction: column;
      }

      .table-tools .tabs {
        max-width: 100%;
        overflow-x: auto;
      }

      .table-tools .filter-search {
        max-width: none !important;
        width: 100%;
      }

      .verification-info-grid {
        grid-template-columns: 1fr;
      }

      .verification-info-grid .info-item:nth-child(odd),
      .verification-info-grid .info-item:nth-child(even) {
        padding: 13px 0;
        border-left: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Refresh the Admin verification route if this module loads while that
  // page is already open.
  if (getRoute().path === '/admin/verification') {
    routePage();
  }
})();
