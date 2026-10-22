/*
  BloodBridge — Parallel Emergency Response Workflow
  --------------------------------------------------
  Load after verification.js.

  Workflow:
  1. Verified Hospital creates a request.
  2. Critical/High requests are immediately visible to compatible Donors
     and Admin at the same time.
  3. Donor can confirm one unit with "I Can Donate".
  4. Admin can allocate one or more units from blood-bank inventory.
  5. Both responses can combine until all required units are matched.
  6. Hospital tracks every status and completes the request.
*/

(() => {
  'use strict';

  const REQUESTS_KEY = 'bloodbridge_emergency_requests';
  const ACCOUNTS_KEY = 'bloodbridge_accounts';
  const SESSION_KEY = 'bloodbridge_session';

  const adminFacilities = [
    'Central Blood Bank',
    'Mercy General Blood Center',
    'North Wing Regional Bank',
    'Metro Blood Center'
  ];

  const compatibleDonorsByRecipient = {
    'O−': ['O−'],
    'O+': ['O−', 'O+'],
    'A−': ['O−', 'A−'],
    'A+': ['O−', 'O+', 'A−', 'A+'],
    'B−': ['O−', 'B−'],
    'B+': ['O−', 'O+', 'B−', 'B+'],
    'AB−': ['O−', 'A−', 'B−', 'AB−'],
    'AB+': ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+']
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

  function readRequests() {
    try {
      const requests = JSON.parse(localStorage.getItem(REQUESTS_KEY));
      return Array.isArray(requests) ? requests : [];
    } catch (error) {
      return [];
    }
  }

  function saveRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  }

  function readAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
      return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeBloodType(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replaceAll('-', '−');
  }

  function getDonorBloodType(session) {
    if (!session || session.role !== 'donor') return '';

    const account = readAccounts().find(
      item =>
        item.role === 'donor' &&
        String(item.email || '').toLowerCase() === String(session.email || '').toLowerCase()
    );

    if (account?.bloodType) return normalizeBloodType(account.bloodType);

    // Blood type for the built-in hackathon Donor demo account.
    if (session.email === 'donor@bloodbridge.demo') return 'O−';

    return '';
  }

  function requestId() {
    const datePart = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `REQ-${datePart}-${randomPart}`;
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

  function timeAgo(value) {
    const timestamp = new Date(value).getTime();
    if (!timestamp) return 'Recently';

    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
  }

  function statusInfo(status) {
    const statuses = {
      pending_admin: {
        label: 'Pending Admin Review',
        badge: 'amber',
        description: 'Waiting for Admin approval before donor broadcast.'
      },
      active: {
        label: 'Live — Finding Supply',
        badge: 'red',
        description: 'Admin and compatible Donors can respond now.'
      },
      partially_matched: {
        label: 'Partially Matched',
        badge: 'amber',
        description: 'Some units are confirmed; matching continues.'
      },
      matched: {
        label: 'Supply Matched',
        badge: 'green',
        description: 'All required units have been confirmed.'
      },
      completed: {
        label: 'Completed',
        badge: 'green',
        description: 'The Hospital confirmed successful fulfillment.'
      },
      cancelled: {
        label: 'Cancelled',
        badge: 'gray',
        description: 'The request was cancelled by the Hospital.'
      },
      rejected: {
        label: 'Rejected by Admin',
        badge: 'red',
        description: 'The request did not pass Admin review.'
      }
    };

    return statuses[status] || statuses.active;
  }

  function isClosed(request) {
    return ['completed', 'cancelled', 'rejected'].includes(request.status);
  }

  function fulfilledUnits(request) {
    const donorUnits = (request.donorResponses || [])
      .filter(response => response.status === 'confirmed')
      .reduce((sum, response) => sum + Number(response.units || 1), 0);

    const allocatedUnits = (request.adminAllocations || [])
      .reduce((sum, allocation) => sum + Number(allocation.units || 0), 0);

    return donorUnits + allocatedUnits;
  }

  function remainingUnits(request) {
    return Math.max(0, Number(request.unitsRequired || 0) - fulfilledUnits(request));
  }

  function recalculateStatus(request) {
    if (isClosed(request) || request.status === 'pending_admin') return request;

    const supplied = fulfilledUnits(request);
    const required = Number(request.unitsRequired || 0);

    if (supplied >= required && required > 0) request.status = 'matched';
    else if (supplied > 0) request.status = 'partially_matched';
    else request.status = 'active';

    request.updatedAt = new Date().toISOString();
    return request;
  }

  function addHistory(request, action, message, actor) {
    request.history = Array.isArray(request.history) ? request.history : [];
    request.history.push({
      action,
      message,
      actor,
      createdAt: new Date().toISOString()
    });
  }

  function findRequest(id) {
    return readRequests().find(request => request.id === id);
  }

  function updateRequest(id, updater) {
    const requests = readRequests();
    const index = requests.findIndex(request => request.id === id);

    if (index === -1) return null;

    const updatedRequest = updater(requests[index]);
    requests[index] = updatedRequest;
    saveRequests(requests);
    return updatedRequest;
  }

  function priorityBadge(urgency) {
    if (urgency === 'Critical') return 'red';
    if (urgency === 'High') return 'amber';
    return 'blue';
  }

  function responseProgress(request) {
    const supplied = Math.min(fulfilledUnits(request), Number(request.unitsRequired || 0));
    const required = Number(request.unitsRequired || 0);
    const percentage = required ? Math.round((supplied / required) * 100) : 0;

    return `
      <div class="emergency-progress">
        <div class="emergency-progress__top">
          <span>Supply confirmed</span>
          <strong>${supplied} of ${required} units</strong>
        </div>
        <div class="emergency-progress__bar">
          <i style="width:${Math.min(100, percentage)}%"></i>
        </div>
      </div>
    `;
  }

  function updatePortalRequestCounts() {
    const session = getSession();
    const requests = readRequests();

    const hospitalCount = session?.role === 'hospital'
      ? requests.filter(request => request.hospitalEmail === session.email && !isClosed(request)).length
      : requests.filter(request => !isClosed(request)).length;

    const adminCount = requests.filter(request => !isClosed(request)).length;
    const donorBloodType = getDonorBloodType(session);
    const donorCount = requests.filter(
      request =>
        ['active', 'partially_matched'].includes(request.status) &&
        remainingUnits(request) > 0 &&
        donorCanMatch(donorBloodType, request.bloodType)
    ).length;

    const hospitalNavigation = navSets.hospital.find(item => item[2] === '/hospital/requests');
    const donorNavigation = navSets.donor.find(item => item[2] === '/donor/requests');
    const adminNavigation = navSets.admin.find(item => item[2] === '/admin/pending-requests');

    if (hospitalNavigation) hospitalNavigation[3] = hospitalCount ? String(hospitalCount) : undefined;
    if (donorNavigation) donorNavigation[3] = donorCount ? String(donorCount) : undefined;
    if (adminNavigation) adminNavigation[3] = adminCount ? String(adminCount) : undefined;
  }

  function donorCanMatch(donorBloodType, recipientBloodType) {
    const allowedTypes = compatibleDonorsByRecipient[normalizeBloodType(recipientBloodType)] || [];
    return allowedTypes.includes(normalizeBloodType(donorBloodType));
  }

  function createEmergencyRequest(form) {
    const session = getSession();

    if (!session || session.role !== 'hospital') {
      toast('Hospital access required', 'Please sign in through the Hospital Portal.', 'error');
      navigate('/login?role=hospital');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const urgency = String(data.get('urgency') || 'Critical');
    const immediateBroadcast = urgency === 'Critical' || urgency === 'High';
    const now = new Date().toISOString();

    const request = {
      id: requestId(),
      hospitalEmail: session.email,
      hospitalAccountName: session.fullName,
      hospitalName: String(data.get('hospital') || session.fullName || 'Hospital').trim(),
      patientReference: String(data.get('patient') || '').trim(),
      bloodType: normalizeBloodType(data.get('bloodType')),
      unitsRequired: Number(data.get('units') || 1),
      urgency,
      requiredBy: String(data.get('requiredBy') || ''),
      clinicalNotes: String(data.get('notes') || '').trim(),
      status: immediateBroadcast ? 'active' : 'pending_admin',
      donorResponses: [],
      adminAllocations: [],
      history: [],
      createdAt: now,
      updatedAt: now
    };

    addHistory(
      request,
      'request_created',
      immediateBroadcast
        ? 'Emergency request created and immediately broadcast.'
        : 'Moderate request created and sent for Admin review.',
      session.fullName || session.email
    );

    const requests = readRequests();
    requests.unshift(request);
    saveRequests(requests);
    updatePortalRequestCounts();

    openModal(
      `
        <div class="modal-head">
          <h2>Emergency Request Submitted</h2>
          <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
        </div>
        <div class="modal-body">
          <div class="success-state">
            <div class="success-mark">${I('check')}</div>
            <h3>${immediateBroadcast ? 'Emergency broadcast is live' : 'Request sent for review'}</h3>
            <p>
              ${immediateBroadcast
                ? `Compatible ${escapeHTML(request.bloodType)} Donors and Admin allocation teams can respond immediately.`
                : 'This Moderate request will become visible to Donors after Admin approval.'}
            </p>
          </div>
          <div class="request-confirmation-grid">
            <div><span>Request ID</span><strong>${escapeHTML(request.id)}</strong></div>
            <div><span>Required</span><strong>${escapeHTML(request.bloodType)} · ${request.unitsRequired} units</strong></div>
          </div>
        </div>
      `,
      `<button type="button" class="btn btn-primary" data-modal-route="/hospital/requests">Track Request ${I('arrow', 'icon-sm')}</button>`
    );
  }

  function hospitalRequestCard(request) {
    const status = statusInfo(request.status);
    const canCancel = !isClosed(request) && request.status !== 'matched';
    const canComplete = request.status === 'matched';

    return `
      <article class="card hospital-request-card">
        <div class="hospital-request-card__top">
          <div>
            <div class="request-id-line">
              <span class="badge badge-${priorityBadge(request.urgency)} badge-dot">${escapeHTML(request.urgency)}</span>
              <span>${escapeHTML(request.id)}</span>
              <span>• ${escapeHTML(timeAgo(request.createdAt))}</span>
            </div>
            <h3>${escapeHTML(request.bloodType)} Blood Request</h3>
            <p>${escapeHTML(request.hospitalName)} · Patient ref: ${escapeHTML(request.patientReference || 'Protected')}</p>
          </div>
          <span class="badge badge-${status.badge} badge-dot">${status.label}</span>
        </div>

        <div class="hospital-request-metrics">
          <div><span>Units Required</span><strong>${request.unitsRequired}</strong></div>
          <div><span>Confirmed</span><strong>${fulfilledUnits(request)}</strong></div>
          <div><span>Donor Responses</span><strong>${(request.donorResponses || []).length}</strong></div>
          <div><span>Admin Allocations</span><strong>${(request.adminAllocations || []).length}</strong></div>
        </div>

        ${responseProgress(request)}

        <div class="hospital-request-card__foot">
          <span>${escapeHTML(status.description)}</span>
          <div>
            ${canCancel ? `<button type="button" class="btn btn-danger-outline btn-sm" data-cancel-emergency="${escapeHTML(request.id)}">Cancel</button>` : ''}
            <button type="button" class="btn btn-secondary btn-sm" data-view-emergency="${escapeHTML(request.id)}">View Timeline</button>
            ${canComplete ? `<button type="button" class="btn btn-primary btn-sm" data-complete-emergency="${escapeHTML(request.id)}">Mark Completed</button>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function hospitalRequestsContent(session) {
    const requests = readRequests()
      .filter(request => request.hospitalEmail === session.email)
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

    const activeCount = requests.filter(request => !isClosed(request)).length;
    const matchedCount = requests.filter(request => request.status === 'matched').length;
    const completedCount = requests.filter(request => request.status === 'completed').length;

    return `
      ${pageHead(
        'My Emergency Requests',
        'Track Donor responses, Admin allocations, and supply fulfillment in real time.',
        `<a href="#/hospital/emergency" class="btn btn-primary">${I('plus', 'icon-sm')} New Emergency Request</a>`
      )}

      <div class="queue-stats">
        <div class="card queue-stat"><span>TOTAL REQUESTS</span><strong>${requests.length}</strong></div>
        <div class="card queue-stat"><span>ACTIVE</span><strong class="text-red">${activeCount}</strong></div>
        <div class="card queue-stat"><span>SUPPLY MATCHED</span><strong class="text-green">${matchedCount}</strong></div>
        <div class="card queue-stat"><span>COMPLETED</span><strong>${completedCount}</strong></div>
      </div>

      <section class="hospital-request-list">
        ${requests.length
          ? requests.map(hospitalRequestCard).join('')
          : `
              <div class="card empty-state">
                ${I('alert')}
                <h3>No emergency requests created</h3>
                <p>Your submitted requests and live matching status will appear here.</p>
                <a href="#/hospital/emergency" class="btn btn-primary" style="margin-top:16px">Create First Request</a>
              </div>
            `}
      </section>
    `;
  }

  function donorHasResponded(request, session) {
    return (request.donorResponses || []).some(
      response => response.donorEmail === session.email && response.status === 'confirmed'
    );
  }

  function donorRequestCard(request, session, donorBloodType) {
    const status = statusInfo(request.status);
    const alreadyResponded = donorHasResponded(request, session);
    const remaining = remainingUnits(request);

    return `
      <article class="card request-card donor-emergency-card">
        <div class="request-card-head">
          <div>
            <h3>${escapeHTML(request.hospitalName)}</h3>
            <span class="request-location">${I('pin')} Verified Hospital · ${escapeHTML(timeAgo(request.createdAt))}</span>
          </div>
          <span class="badge badge-${priorityBadge(request.urgency)} badge-dot">${escapeHTML(request.urgency)}</span>
        </div>

        <div class="donor-match-banner">
          ${I('check-circle')}
          <span>Your <strong>${escapeHTML(donorBloodType)}</strong> blood is compatible with this ${escapeHTML(request.bloodType)} request.</span>
        </div>

        <div class="request-info">
          <div><span>Type Required</span><strong class="text-red">${escapeHTML(request.bloodType)}</strong></div>
          <div><span>Units Remaining</span><strong>${remaining}</strong></div>
          <div><span>Status</span><strong>${fulfilledUnits(request)}/${request.unitsRequired}</strong></div>
        </div>

        <div class="request-card-foot">
          <small>${escapeHTML(request.id)} · Required by ${escapeHTML(formatDate(request.requiredBy))}</small>
          ${alreadyResponded
            ? `<span class="badge badge-green">${I('check', 'icon-sm')} Response Confirmed</span>`
            : `<button type="button" class="btn btn-primary btn-sm" data-donor-response="${escapeHTML(request.id)}">I Can Donate</button>`}
        </div>
      </article>
    `;
  }

  function donorRequestsContent(session) {
    const donorBloodType = getDonorBloodType(session);
    const requests = readRequests()
      .filter(request =>
        ['active', 'partially_matched'].includes(request.status) &&
        remainingUnits(request) > 0 &&
        donorCanMatch(donorBloodType, request.bloodType)
      )
      .sort((first, second) => {
        const priority = { Critical: 3, High: 2, Moderate: 1 };
        return (priority[second.urgency] || 0) - (priority[first.urgency] || 0) || new Date(second.createdAt) - new Date(first.createdAt);
      });

    const criticalCount = requests.filter(request => request.urgency === 'Critical').length;

    return `
      ${pageHead(
        'Compatible Blood Requests',
        `Emergency requests matched with your ${escapeHTML(donorBloodType || 'registered')} blood type.`,
        `<a href="#/donor/centers" class="btn btn-secondary">${I('pin', 'icon-sm')} Find Donation Center</a>`
      )}

      <div class="donor-eligibility-strip card">
        <span class="blood-mini">${escapeHTML(donorBloodType || '?')}</span>
        <div>
          <strong>Compatible matching is active</strong>
          <p>Only requests compatible with your registered blood type are shown.</p>
        </div>
        <span class="badge ${criticalCount ? 'badge-red' : 'badge-green'} badge-dot">
          ${criticalCount ? `${criticalCount} critical` : 'No critical alerts'}
        </span>
      </div>

      <section class="requests-grid">
        ${requests.length
          ? requests.map(request => donorRequestCard(request, session, donorBloodType)).join('')
          : `
              <div class="card empty-state">
                ${I('check-circle')}
                <h3>No compatible emergency requests right now</h3>
                <p>We will show new verified Hospital requests here when your blood type is needed.</p>
              </div>
            `}
      </section>
    `;
  }

  window.requestsPage = function requestsPage() {
    const session = getSession();

    if (session?.role === 'donor') {
      return shell(donorRequestsContent(session), '/requests', 'donor', 'Compatible Requests');
    }

    return shell(
      hospitalRequestsContent(session || { email: '' }),
      '/requests',
      'hospital',
      'Emergency Requests'
    );
  };

  function adminRequestCard(request) {
    const status = statusInfo(request.status);
    const remaining = remainingUnits(request);
    const canAllocate = ['active', 'partially_matched'].includes(request.status) && remaining > 0;
    const needsApproval = request.status === 'pending_admin';

    return `
      <article class="card admin-emergency-card">
        <div class="admin-emergency-main">
          <div class="emergency-blood-type">${escapeHTML(request.bloodType)}</div>
          <div>
            <div class="request-id-line">
              <span class="badge badge-${priorityBadge(request.urgency)} badge-dot">${escapeHTML(request.urgency)}</span>
              <span>${escapeHTML(request.id)}</span>
              <span>• ${escapeHTML(timeAgo(request.createdAt))}</span>
            </div>
            <h3>${escapeHTML(request.hospitalName)}</h3>
            <p>${request.unitsRequired} units required · ${remaining} remaining · Patient ref: ${escapeHTML(request.patientReference || 'Protected')}</p>
          </div>
        </div>

        <div class="admin-emergency-progress">
          ${responseProgress(request)}
          <span class="badge badge-${status.badge} badge-dot">${status.label}</span>
        </div>

        <div class="approval-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-view-emergency="${escapeHTML(request.id)}">Details</button>
          ${needsApproval ? `
            <button type="button" class="btn btn-danger-outline btn-sm" data-admin-reject-request="${escapeHTML(request.id)}">Reject</button>
            <button type="button" class="btn btn-primary btn-sm" data-admin-approve-request="${escapeHTML(request.id)}">Approve & Broadcast</button>
          ` : ''}
          ${canAllocate ? `<button type="button" class="btn btn-primary btn-sm" data-open-allocation="${escapeHTML(request.id)}">Allocate Blood</button>` : ''}
        </div>
      </article>
    `;
  }

  function adminRequestsContent() {
    const requests = readRequests().sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
    const pending = requests.filter(request => request.status === 'pending_admin').length;
    const active = requests.filter(request => ['active', 'partially_matched'].includes(request.status)).length;
    const matched = requests.filter(request => request.status === 'matched').length;
    const completed = requests.filter(request => request.status === 'completed').length;

    return `
      ${pageHead(
        'Emergency Response Center',
        'Monitor live Hospital requests and allocate blood without blocking Donor responses.',
        `<button type="button" class="btn btn-secondary" data-refresh-emergency>${I('check-circle', 'icon-sm')} Refresh</button>`
      )}

      <div class="queue-stats">
        <div class="card queue-stat"><span>PENDING REVIEW</span><strong class="text-amber">${pending}</strong></div>
        <div class="card queue-stat"><span>LIVE / PARTIAL</span><strong class="text-red">${active}</strong></div>
        <div class="card queue-stat"><span>SUPPLY MATCHED</span><strong class="text-green">${matched}</strong></div>
        <div class="card queue-stat"><span>COMPLETED</span><strong>${completed}</strong></div>
      </div>

      <div class="parallel-flow-note card">
        ${I('alert')}
        <div>
          <strong>Parallel emergency response is active</strong>
          <p>Critical and High requests are already visible to compatible Donors. Admin can independently allocate remaining units.</p>
        </div>
      </div>

      <section class="approval-list">
        ${requests.length
          ? requests.map(adminRequestCard).join('')
          : `
              <div class="card empty-state">
                ${I('check-circle')}
                <h3>No emergency requests</h3>
                <p>Hospital requests will automatically appear here.</p>
              </div>
            `}
      </section>
    `;
  }

  window.pendingPage = function pendingPage() {
    return shell(adminRequestsContent(), '/pending', 'admin', 'Emergency Response Center');
  };

  function timelineHTML(request) {
    const history = [...(request.history || [])].reverse();

    return history.length
      ? history.map(item => `
          <div class="emergency-timeline-item">
            <span class="emergency-timeline-dot"></span>
            <div>
              <strong>${escapeHTML(item.message)}</strong>
              <p>${escapeHTML(item.actor)} · ${escapeHTML(formatDate(item.createdAt))}</p>
            </div>
          </div>
        `).join('')
      : '<p class="muted">No activity has been recorded yet.</p>';
  }

  function openRequestDetails(id) {
    const request = findRequest(id);
    if (!request) {
      toast('Request not found', 'The emergency request may have been removed.', 'error');
      return;
    }

    const status = statusInfo(request.status);

    openModal(`
      <div class="modal-head">
        <div>
          <h2>Emergency Request Details</h2>
          <p style="margin:4px 0 0;color:var(--slate-500);font-size:9px">${escapeHTML(request.id)}</p>
        </div>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>
      <div class="modal-body">
        <div class="request-detail-header">
          <div class="emergency-blood-type">${escapeHTML(request.bloodType)}</div>
          <div>
            <h3>${escapeHTML(request.hospitalName)}</h3>
            <p>${request.unitsRequired} units · ${escapeHTML(request.urgency)} priority</p>
          </div>
          <span class="badge badge-${status.badge} badge-dot">${status.label}</span>
        </div>

        ${responseProgress(request)}

        <div class="info-grid" style="margin-top:16px">
          <div class="info-item"><span>Patient Reference</span><strong>${escapeHTML(request.patientReference || 'Protected')}</strong></div>
          <div class="info-item"><span>Required By</span><strong>${escapeHTML(formatDate(request.requiredBy))}</strong></div>
          <div class="info-item"><span>Donor Responses</span><strong>${(request.donorResponses || []).length}</strong></div>
          <div class="info-item"><span>Admin Allocations</span><strong>${(request.adminAllocations || []).length}</strong></div>
        </div>

        <div class="separator" style="margin:18px 0"></div>
        <h3 style="font-size:12px;margin:0 0 15px">Request Timeline</h3>
        <div class="emergency-timeline">${timelineHTML(request)}</div>
      </div>
    `, `<button type="button" class="btn btn-secondary" data-close-modal>Close</button>`);
  }

  function openDonorConfirmation(id) {
    const request = findRequest(id);
    const session = getSession();

    if (!request || !session || session.role !== 'donor') {
      toast('Unable to respond', 'Please refresh and try again.', 'error');
      return;
    }

    if (!['active', 'partially_matched'].includes(request.status) || remainingUnits(request) < 1) {
      toast('Request already fulfilled', 'This request no longer needs additional units.', 'error');
      routePage();
      return;
    }

    if (donorHasResponded(request, session)) {
      toast('Already confirmed', 'You have already responded to this request.');
      return;
    }

    openModal(`
      <div class="modal-head">
        <h2>Confirm Donation Response</h2>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>
      <div class="modal-body">
        <div class="success-state" style="padding-top:0">
          <div class="success-mark" style="color:var(--red);background:var(--red-soft)">${I('heart')}</div>
          <h3>I can donate 1 unit</h3>
          <p>Your response will be shared with ${escapeHTML(request.hospitalName)} and the Admin response team.</p>
        </div>
        <div class="request-confirmation-grid">
          <div><span>Blood Type Needed</span><strong>${escapeHTML(request.bloodType)}</strong></div>
          <div><span>Hospital</span><strong>${escapeHTML(request.hospitalName)}</strong></div>
        </div>
        <div class="summary-note">${I('alert', 'icon-sm')} The Hospital may contact you to confirm eligibility and schedule the donation.</div>
      </div>
    `, `
      <button type="button" class="btn btn-secondary" data-close-modal>Not Now</button>
      <button type="button" class="btn btn-primary" data-confirm-donor-response="${escapeHTML(request.id)}">${I('heart', 'icon-sm')} Confirm I Can Donate</button>
    `);
  }

  function confirmDonorResponse(id) {
    const session = getSession();

    if (!session || session.role !== 'donor') {
      closeModal();
      toast('Donor login required', 'Please sign in again.', 'error');
      return;
    }

    const updatedRequest = updateRequest(id, request => {
      if (!['active', 'partially_matched'].includes(request.status) || remainingUnits(request) < 1) return request;
      if (donorHasResponded(request, session)) return request;

      request.donorResponses = Array.isArray(request.donorResponses) ? request.donorResponses : [];
      request.donorResponses.push({
        donorEmail: session.email,
        donorName: session.fullName || session.email,
        bloodType: getDonorBloodType(session),
        units: 1,
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });

      addHistory(
        request,
        'donor_confirmed',
        `${session.fullName || 'A compatible Donor'} confirmed 1 unit.`,
        session.fullName || session.email
      );

      return recalculateStatus(request);
    });

    closeModal();

    if (!updatedRequest) {
      toast('Request not found', 'Please refresh the request list.', 'error');
      return;
    }

    updatePortalRequestCounts();
    toast(
      'Donation response confirmed',
      `The Hospital has been notified. ${remainingUnits(updatedRequest)} unit(s) still remaining.`
    );
    routePage();
  }

  function openAllocationModal(id) {
    const request = findRequest(id);
    const session = getSession();

    if (!request || !session || session.role !== 'admin') {
      toast('Admin access required', 'Please sign in again.', 'error');
      return;
    }

    const remaining = remainingUnits(request);
    if (remaining < 1) {
      toast('Supply already matched', 'No additional allocation is required.');
      routePage();
      return;
    }

    openModal(`
      <div class="modal-head">
        <h2>Allocate Blood Supply</h2>
        <button type="button" class="modal-close" data-close-modal>${I('x')}</button>
      </div>
      <form id="bloodAllocationForm" data-request-id="${escapeHTML(request.id)}">
        <div class="modal-body">
          <div class="request-detail-header">
            <div class="emergency-blood-type">${escapeHTML(request.bloodType)}</div>
            <div>
              <h3>${escapeHTML(request.hospitalName)}</h3>
              <p>${remaining} of ${request.unitsRequired} units still required</p>
            </div>
          </div>

          <div class="form-group" style="margin-top:18px">
            <label class="form-label" for="allocationSource">Blood bank / source facility</label>
            <select class="form-control" id="allocationSource" name="source" required>
              ${adminFacilities.map(facility => `<option>${escapeHTML(facility)}</option>`).join('')}
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="allocationUnits">Units to allocate</label>
              <input class="form-control" id="allocationUnits" name="units" type="number" min="1" max="${remaining}" value="${remaining}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="allocationETA">Estimated arrival</label>
              <select class="form-control" id="allocationETA" name="eta" required>
                <option>Within 15 minutes</option>
                <option>Within 30 minutes</option>
                <option>Within 1 hour</option>
                <option>Within 2 hours</option>
              </select>
            </div>
          </div>

          <div class="summary-note">${I('alert', 'icon-sm')} Allocation is combined with confirmed Donor units. The system will stop matching when the requirement is fulfilled.</div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Confirm Allocation</button>
        </div>
      </form>
    `);
  }

  function confirmAllocation(form) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const session = getSession();
    if (!session || session.role !== 'admin') {
      closeModal();
      toast('Admin login required', 'Please sign in again.', 'error');
      return;
    }

    const data = new FormData(form);
    const requestedUnits = Number(data.get('units') || 0);

    const updatedRequest = updateRequest(form.dataset.requestId, request => {
      const allowedUnits = Math.min(requestedUnits, remainingUnits(request));
      if (allowedUnits < 1) return request;

      request.adminAllocations = Array.isArray(request.adminAllocations) ? request.adminAllocations : [];
      request.adminAllocations.push({
        adminEmail: session.email,
        adminName: session.fullName || session.email,
        source: String(data.get('source')),
        units: allowedUnits,
        eta: String(data.get('eta')),
        allocatedAt: new Date().toISOString()
      });

      addHistory(
        request,
        'admin_allocated',
        `Admin allocated ${allowedUnits} unit(s) from ${String(data.get('source'))}.`,
        session.fullName || session.email
      );

      return recalculateStatus(request);
    });

    closeModal();

    if (!updatedRequest) {
      toast('Request not found', 'The allocation could not be saved.', 'error');
      return;
    }

    updatePortalRequestCounts();
    toast(
      'Blood allocation confirmed',
      remainingUnits(updatedRequest)
        ? `${remainingUnits(updatedRequest)} unit(s) still need to be matched.`
        : 'All required units are now confirmed for the Hospital.'
    );
    routePage();
  }

  function approveModerateRequest(id) {
    const session = getSession();
    if (!session || session.role !== 'admin') return;

    const request = updateRequest(id, item => {
      if (item.status !== 'pending_admin') return item;
      item.status = 'active';
      addHistory(item, 'admin_approved', 'Admin approved the request for Donor broadcast.', session.fullName || session.email);
      return recalculateStatus(item);
    });

    if (request) {
      updatePortalRequestCounts();
      toast('Request approved', 'Compatible Donors can now respond to this request.');
      routePage();
    }
  }

  function rejectRequest(id) {
    const session = getSession();
    if (!session || session.role !== 'admin') return;

    const request = updateRequest(id, item => {
      if (item.status !== 'pending_admin') return item;
      item.status = 'rejected';
      addHistory(item, 'admin_rejected', 'Admin rejected the request during review.', session.fullName || session.email);
      return item;
    });

    if (request) {
      updatePortalRequestCounts();
      toast('Request rejected', 'The Hospital request has been closed.', 'error');
      routePage();
    }
  }

  function cancelHospitalRequest(id) {
    const session = getSession();
    if (!session || session.role !== 'hospital') return;

    const request = updateRequest(id, item => {
      if (item.hospitalEmail !== session.email || isClosed(item) || item.status === 'matched') return item;
      item.status = 'cancelled';
      addHistory(item, 'hospital_cancelled', 'Hospital cancelled the emergency request.', session.fullName || session.email);
      return item;
    });

    if (request) {
      updatePortalRequestCounts();
      toast('Request cancelled', 'Donor matching and Admin allocation have stopped.', 'error');
      routePage();
    }
  }

  function completeHospitalRequest(id) {
    const session = getSession();
    if (!session || session.role !== 'hospital') return;

    const request = updateRequest(id, item => {
      if (item.hospitalEmail !== session.email || item.status !== 'matched') return item;
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      addHistory(item, 'hospital_completed', 'Hospital confirmed successful blood fulfillment.', session.fullName || session.email);
      return item;
    });

    if (request) {
      updatePortalRequestCounts();
      toast('Request completed', 'The emergency request has been successfully closed.');
      routePage();
    }
  }

  document.addEventListener('submit', event => {
    const form = event.target;

    if (form.id === 'emergencyForm') {
      event.preventDefault();
      event.stopImmediatePropagation();
      createEmergencyRequest(form);
      return;
    }

    if (form.id === 'bloodAllocationForm') {
      event.preventDefault();
      event.stopImmediatePropagation();
      confirmAllocation(form);
    }
  }, true);

  document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-view-emergency]');
    if (viewButton) {
      event.preventDefault();
      openRequestDetails(viewButton.dataset.viewEmergency);
      return;
    }

    const donorButton = event.target.closest('[data-donor-response]');
    if (donorButton) {
      event.preventDefault();
      openDonorConfirmation(donorButton.dataset.donorResponse);
      return;
    }

    const confirmDonorButton = event.target.closest('[data-confirm-donor-response]');
    if (confirmDonorButton) {
      event.preventDefault();
      confirmDonorResponse(confirmDonorButton.dataset.confirmDonorResponse);
      return;
    }

    const allocationButton = event.target.closest('[data-open-allocation]');
    if (allocationButton) {
      event.preventDefault();
      openAllocationModal(allocationButton.dataset.openAllocation);
      return;
    }

    const approveButton = event.target.closest('[data-admin-approve-request]');
    if (approveButton) {
      event.preventDefault();
      approveModerateRequest(approveButton.dataset.adminApproveRequest);
      return;
    }

    const rejectButton = event.target.closest('[data-admin-reject-request]');
    if (rejectButton) {
      event.preventDefault();
      rejectRequest(rejectButton.dataset.adminRejectRequest);
      return;
    }

    const cancelButton = event.target.closest('[data-cancel-emergency]');
    if (cancelButton) {
      event.preventDefault();
      cancelHospitalRequest(cancelButton.dataset.cancelEmergency);
      return;
    }

    const completeButton = event.target.closest('[data-complete-emergency]');
    if (completeButton) {
      event.preventDefault();
      completeHospitalRequest(completeButton.dataset.completeEmergency);
      return;
    }

    const refreshButton = event.target.closest('[data-refresh-emergency]');
    if (refreshButton) {
      event.preventDefault();
      routePage();
      toast('Emergency requests refreshed', 'The response center is up to date.');
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .hospital-request-list {
      display: grid;
      gap: 14px;
    }

    .hospital-request-card,
    .admin-emergency-card {
      padding: 19px 20px;
    }

    .hospital-request-card__top,
    .hospital-request-card__foot,
    .admin-emergency-progress,
    .request-detail-header,
    .donor-eligibility-strip,
    .parallel-flow-note {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .hospital-request-card__top h3,
    .admin-emergency-main h3,
    .request-detail-header h3 {
      margin: 9px 0 5px;
      font-size: 14px;
    }

    .hospital-request-card__top p,
    .admin-emergency-main p,
    .request-detail-header p {
      margin: 0;
      color: var(--slate-500);
      font-size: 9px;
    }

    .request-id-line {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 7px;
      color: var(--slate-500);
      font-size: 8px;
    }

    .hospital-request-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin: 17px 0;
      padding: 14px 0;
      border-top: 1px solid var(--slate-100);
      border-bottom: 1px solid var(--slate-100);
    }

    .hospital-request-metrics div {
      padding: 0 14px;
      border-right: 1px solid var(--slate-100);
    }

    .hospital-request-metrics div:first-child { padding-left: 0; }
    .hospital-request-metrics div:last-child { border-right: 0; }
    .hospital-request-metrics span,
    .request-confirmation-grid span {
      display: block;
      color: var(--slate-500);
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .hospital-request-metrics strong,
    .request-confirmation-grid strong {
      display: block;
      margin-top: 6px;
      color: var(--slate-900);
      font-size: 12px;
    }

    .emergency-progress { flex: 1; }
    .emergency-progress__top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 7px;
      color: var(--slate-500);
      font-size: 8px;
    }
    .emergency-progress__top strong { color: var(--slate-700); }
    .emergency-progress__bar {
      height: 6px;
      overflow: hidden;
      border-radius: 10px;
      background: var(--slate-100);
    }
    .emergency-progress__bar i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--red), #db5961);
      transition: width .4s ease;
    }

    .hospital-request-card__foot {
      margin-top: 17px;
    }
    .hospital-request-card__foot > span {
      color: var(--slate-500);
      font-size: 9px;
    }
    .hospital-request-card__foot > div {
      display: flex;
      gap: 7px;
    }

    .donor-eligibility-strip,
    .parallel-flow-note {
      margin-bottom: 17px;
      padding: 15px 18px;
    }
    .donor-eligibility-strip > div,
    .parallel-flow-note > div { flex: 1; }
    .donor-eligibility-strip strong,
    .parallel-flow-note strong {
      display: block;
      font-size: 11px;
    }
    .donor-eligibility-strip p,
    .parallel-flow-note p {
      margin: 4px 0 0;
      color: var(--slate-500);
      font-size: 9px;
    }
    .parallel-flow-note { border-color: var(--red-border); background: var(--red-soft); }
    .parallel-flow-note > .icon { color: var(--red); }

    .donor-match-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 15px;
      padding: 9px 10px;
      color: var(--green);
      background: var(--green-soft);
      border-radius: 7px;
      font-size: 9px;
    }
    .donor-match-banner .icon { width: 15px; }

    .admin-emergency-card {
      display: grid;
      grid-template-columns: minmax(280px, 1.25fr) minmax(220px, .8fr) auto;
      align-items: center;
      gap: 24px;
    }
    .admin-emergency-main {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .emergency-blood-type {
      width: 50px;
      height: 50px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 50%;
      color: var(--red);
      background: var(--red-soft);
      border: 1px solid var(--red-border);
      font-size: 15px;
      font-weight: 800;
    }
    .admin-emergency-progress { align-items: flex-end; flex-direction: column; }
    .admin-emergency-progress .emergency-progress { width: 100%; }

    .request-confirmation-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 5px;
    }
    .request-confirmation-grid > div {
      padding: 13px;
      border: 1px solid var(--slate-100);
      border-radius: 8px;
      background: var(--slate-50);
    }

    .request-detail-header { justify-content: flex-start; }
    .request-detail-header > div:nth-child(2) { flex: 1; }

    .emergency-timeline {
      position: relative;
      display: grid;
      gap: 0;
    }
    .emergency-timeline-item {
      position: relative;
      display: grid;
      grid-template-columns: 17px 1fr;
      gap: 10px;
      min-height: 55px;
    }
    .emergency-timeline-item::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 13px;
      bottom: -2px;
      border-left: 1px solid var(--slate-200);
    }
    .emergency-timeline-item:last-child::before { display: none; }
    .emergency-timeline-dot {
      position: relative;
      z-index: 1;
      width: 11px;
      height: 11px;
      margin-top: 2px;
      border: 3px solid var(--red-soft);
      border-radius: 50%;
      background: var(--red);
    }
    .emergency-timeline-item strong { display: block; font-size: 10px; }
    .emergency-timeline-item p { margin: 5px 0 0; color: var(--slate-500); font-size: 8px; }

    @media (max-width: 1050px) {
      .admin-emergency-card { grid-template-columns: 1fr 1fr; }
      .admin-emergency-card .approval-actions { grid-column: 1 / -1; justify-content: flex-end; }
    }

    @media (max-width: 680px) {
      .hospital-request-card__top,
      .hospital-request-card__foot,
      .donor-eligibility-strip,
      .parallel-flow-note {
        align-items: flex-start;
        flex-direction: column;
      }
      .hospital-request-metrics { grid-template-columns: 1fr 1fr; gap: 15px 0; }
      .hospital-request-metrics div:nth-child(2) { border-right: 0; }
      .hospital-request-card__foot > div { width: 100%; flex-wrap: wrap; }
      .admin-emergency-card { grid-template-columns: 1fr; }
      .admin-emergency-card .approval-actions { grid-column: auto; justify-content: flex-start; }
      .request-confirmation-grid { grid-template-columns: 1fr; }
      .request-detail-header { align-items: flex-start; flex-wrap: wrap; }
    }
  `;
  document.head.appendChild(style);

  updatePortalRequestCounts();

  if (
    ['/hospital/requests', '/donor/requests', '/admin/pending-requests'].includes(getRoute().path)
  ) {
    routePage();
  }
})();
