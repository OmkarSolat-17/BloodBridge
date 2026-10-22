/*
  BloodBridge — Role-Based Profile & Account Editor
  -------------------------------------------------
  Load after settings.js.

  Features:
  - Makes the sidebar profile card clickable
  - Separate Donor, Hospital, and Admin profile fields
  - Upload, resize, preview, change, and remove profile photo
  - Edit name, phone, location, and role-specific details
  - Verified fields remain read-only
  - Saves profiles in localStorage
  - Updates session, sidebar, and topbar immediately
*/

(() => {
  'use strict';

  const PROFILES_KEY = 'bloodbridge_profiles';
  const ACCOUNTS_KEY = 'bloodbridge_accounts';
  const SESSION_KEY = 'bloodbridge_session';
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  let pendingProfilePhoto = '';
  let observerFramePending = false;

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

  function saveSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function readProfiles() {
    try {
      const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY));
      return profiles && typeof profiles === 'object' ? profiles : {};
    } catch (error) {
      return {};
    }
  }

  function saveProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
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

  function profileIdentity(session) {
    return String(session?.email || session?.role || 'guest').trim().toLowerCase();
  }

  function findStoredAccount(session) {
    if (!session) return null;

    return readAccounts().find(
      account => String(account.email || '').trim().toLowerCase() === profileIdentity(session)
    ) || null;
  }

  function defaultRoleDetails(session, account) {
    if (session.role === 'donor') {
      return {
        bloodType: account?.bloodType || (session.email === 'donor@bloodbridge.demo' ? 'O−' : ''),
        dateOfBirth: '',
        occupation: '',
        donationAvailability: true
      };
    }

    if (session.role === 'hospital') {
      return {
        authorizedContact: account?.contactPerson || '',
        licenseNumber: account?.licenseNumber || (session.email === 'hospital@bloodbridge.demo' ? 'HOSP-DEMO-001' : ''),
        department: 'Emergency & Transfusion Services',
        facilityType: 'Hospital'
      };
    }

    return {
      designation: 'System Administrator',
      department: 'BloodBridge Operations',
      administratorId: session.email === 'admin@bloodbridge.demo' ? 'ADM-DEMO-001' : '',
      officeLocation: ''
    };
  }

  function getProfile(session = getSession()) {
    if (!session) return null;

    const account = findStoredAccount(session);
    const profiles = readProfiles();
    const savedProfile = profiles[profileIdentity(session)] || {};

    return {
      role: session.role,
      email: session.email,
      fullName: savedProfile.fullName || account?.fullName || session.fullName || session.email,
      phone: savedProfile.phone || account?.phone || '',
      location: savedProfile.location || account?.location || '',
      photo: savedProfile.photo || '',
      roleDetails: {
        ...defaultRoleDetails(session, account),
        ...(savedProfile.roleDetails || {})
      },
      updatedAt: savedProfile.updatedAt || null
    };
  }

  function initials(name) {
    return String(name || 'BloodBridge')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || 'BB';
  }

  function roleLabel(role) {
    if (role === 'admin') return 'System Administrator';
    if (role === 'hospital') return 'Hospital Staff';
    return 'Verified Donor';
  }

  function roleTitle(role) {
    if (role === 'admin') return 'Admin Profile';
    if (role === 'hospital') return 'Hospital Profile';
    return 'Donor Profile';
  }

  function applyAvatar(element, profile) {
    if (!element || !profile) return;

    if (profile.photo) {
      if (element.textContent) element.textContent = '';
      element.classList.add('avatar--photo');
      element.style.backgroundImage = `url("${profile.photo}")`;
      element.setAttribute('aria-label', `${profile.fullName} profile photo`);
      return;
    }

    const profileInitials = initials(profile.fullName);
    if (element.textContent !== profileInitials) element.textContent = profileInitials;
    element.classList.remove('avatar--photo');
    element.style.removeProperty('background-image');
    element.setAttribute('aria-label', `${profile.fullName} initials`);
  }

  function applyProfileToInterface(profile = getProfile()) {
    if (!profile) return;

    document.querySelectorAll('.sidebar-profile strong').forEach(element => {
      if (element.textContent !== profile.fullName) element.textContent = profile.fullName;
    });

    document.querySelectorAll('.sidebar-profile span').forEach(element => {
      const label = roleLabel(profile.role);
      if (element.textContent !== label) element.textContent = label;
    });

    document.querySelectorAll('.sidebar-profile .avatar, .topbar-right > .avatar').forEach(element => {
      applyAvatar(element, profile);
    });

    // Keep the dedicated Donor profile page consistent with edited details.
    if (profile.role === 'donor' && getRoute().path === '/donor/profile') {
      const profileName = document.querySelector('.profile-main h2');
      const profileAvatar = document.querySelector('.profile-avatar');

      if (profileName && profileName.textContent !== profile.fullName) {
        profileName.textContent = profile.fullName;
      }

      if (profileAvatar) applyAvatar(profileAvatar, profile);
    }
  }

  function configureSidebarProfileCard() {
    const card = document.querySelector('.sidebar-profile');
    const session = getSession();

    if (!card || !session || card.hasAttribute('data-open-profile-editor')) return;

    card.setAttribute('data-open-profile-editor', '');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open ${roleTitle(session.role)}`);
    card.setAttribute('title', 'View and edit profile');
  }

  function readOnlyField(label, value, note = 'Verified field') {
    return `
      <label class="profile-field profile-field--readonly">
        <span>${escapeHTML(label)}</span>
        <div class="profile-readonly-value">
          ${I('lock', 'icon-sm')}
          <strong>${escapeHTML(value || 'Not available')}</strong>
        </div>
        <small>${escapeHTML(note)}</small>
      </label>
    `;
  }

  function textField(name, label, value, placeholder, type = 'text') {
    return `
      <label class="profile-field">
        <span>${escapeHTML(label)}</span>
        <input
          class="form-control"
          type="${escapeHTML(type)}"
          name="${escapeHTML(name)}"
          value="${escapeHTML(value || '')}"
          placeholder="${escapeHTML(placeholder)}"
          ${name === 'fullName' ? 'required' : ''}
        />
      </label>
    `;
  }

  function selectField(name, label, value, options) {
    return `
      <label class="profile-field">
        <span>${escapeHTML(label)}</span>
        <select class="form-control" name="${escapeHTML(name)}">
          ${options.map(option => `
            <option value="${escapeHTML(option.value)}" ${String(value) === String(option.value) ? 'selected' : ''}>
              ${escapeHTML(option.label)}
            </option>
          `).join('')}
        </select>
      </label>
    `;
  }

  function donorFields(profile) {
    return `
      <div class="profile-form-grid">
        ${readOnlyField('Verified Blood Type', profile.roleDetails.bloodType || 'Not set', 'Contact support to request a blood-type correction.')}
        ${textField('dateOfBirth', 'Date of Birth', profile.roleDetails.dateOfBirth, '', 'date')}
        ${textField('occupation', 'Occupation', profile.roleDetails.occupation, 'Optional occupation')}
        ${selectField(
          'donationAvailability',
          'Donation Availability',
          String(profile.roleDetails.donationAvailability),
          [
            { value: 'true', label: 'Available for compatible alerts' },
            { value: 'false', label: 'Temporarily unavailable' }
          ]
        )}
      </div>
    `;
  }

  function hospitalFields(profile) {
    return `
      <div class="profile-form-grid">
        ${textField('authorizedContact', 'Authorized Contact Person', profile.roleDetails.authorizedContact, 'Doctor or administrator name')}
        ${textField('department', 'Department', profile.roleDetails.department, 'e.g. Emergency Services')}
        ${selectField(
          'facilityType',
          'Facility Type',
          profile.roleDetails.facilityType,
          [
            { value: 'Hospital', label: 'Hospital' },
            { value: 'Blood Bank', label: 'Blood Bank' },
            { value: 'Clinic', label: 'Clinic' },
            { value: 'Medical Center', label: 'Medical Center' }
          ]
        )}
        ${readOnlyField('Verified Licence Number', profile.roleDetails.licenseNumber, 'Licence changes require Admin re-verification.')}
      </div>
    `;
  }

  function adminFields(profile) {
    return `
      <div class="profile-form-grid">
        ${textField('designation', 'Designation', profile.roleDetails.designation, 'e.g. System Administrator')}
        ${textField('department', 'Department', profile.roleDetails.department, 'e.g. BloodBridge Operations')}
        ${textField('officeLocation', 'Office Location', profile.roleDetails.officeLocation, 'Optional office location')}
        ${readOnlyField('Administrator ID', profile.roleDetails.administratorId || 'Internal Account', 'Administrator IDs are managed internally.')}
      </div>
    `;
  }

  function roleFields(profile) {
    if (profile.role === 'hospital') return hospitalFields(profile);
    if (profile.role === 'admin') return adminFields(profile);
    return donorFields(profile);
  }

  function profilePreview(photo, name) {
    return photo
      ? `<div class="profile-photo-preview profile-photo-preview--image" id="profilePhotoPreview" style="background-image:url('${photo}')" aria-label="Profile photo preview"></div>`
      : `<div class="profile-photo-preview" id="profilePhotoPreview">${escapeHTML(initials(name))}</div>`;
  }

  function openProfileEditor() {
    const session = getSession();
    const profile = getProfile(session);

    if (!session || !profile) {
      toast('Login required', 'Please sign in before opening your Profile.', 'error');
      navigate('/login');
      return;
    }

    pendingProfilePhoto = profile.photo || '';

    openModal(`
      <div class="modal-head profile-modal-head">
        <div>
          <span class="eyebrow">${escapeHTML(profile.role)} account</span>
          <h2>${escapeHTML(roleTitle(profile.role))}</h2>
          <p>View and update your BloodBridge account details.</p>
        </div>
        <button type="button" class="modal-close" data-close-modal aria-label="Close Profile">
          ${I('x')}
        </button>
      </div>

      <form id="profileEditorForm" data-profile-role="${escapeHTML(profile.role)}">
        <div class="modal-body profile-modal-body">
          <section class="profile-photo-section">
            ${profilePreview(profile.photo, profile.fullName)}
            <div class="profile-photo-copy">
              <strong>Profile Picture</strong>
              <p>Upload a JPG, PNG, or WebP image. It will be cropped to a square automatically.</p>
              <div>
                <label class="btn btn-secondary btn-sm profile-upload-button">
                  ${I('user', 'icon-sm')} Change Picture
                  <input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden />
                </label>
                <button type="button" class="btn btn-ghost btn-sm" data-remove-profile-photo ${profile.photo ? '' : 'disabled'}>
                  Remove
                </button>
              </div>
            </div>
            <span class="badge badge-green badge-dot">${escapeHTML(roleLabel(profile.role))}</span>
          </section>

          <section class="profile-editor-section">
            <div class="profile-editor-section__head">
              ${I('user')}
              <div>
                <h3>Basic Information</h3>
                <p>These details appear in your sidebar and workflow activity.</p>
              </div>
            </div>
            <div class="profile-form-grid">
              ${textField('fullName', profile.role === 'hospital' ? 'Hospital / Facility Name' : 'Display Name', profile.fullName, 'Enter display name')}
              ${textField('phone', 'Contact Number', profile.phone, '+91 98765 43210', 'tel')}
              ${textField('location', profile.role === 'hospital' ? 'Facility Address' : 'Location', profile.location, 'Ahmedabad, Gujarat')}
              ${readOnlyField('Verified Email', profile.email, 'Email changes require identity verification.')}
            </div>
          </section>

          <section class="profile-editor-section">
            <div class="profile-editor-section__head">
              ${I(profile.role === 'donor' ? 'heart' : profile.role === 'hospital' ? 'hospital' : 'shield')}
              <div>
                <h3>${escapeHTML(roleTitle(profile.role))} Details</h3>
                <p>Role-specific information and verified credentials.</p>
              </div>
            </div>
            ${roleFields(profile)}
          </section>

          <div class="profile-security-note">
            ${I('shield', 'icon-sm')}
            <span>Verified email, role, licence number, and blood type cannot be directly changed for safety reasons.</span>
          </div>
        </div>

        <div class="modal-foot profile-modal-foot">
          <span class="profile-last-updated">
            ${profile.updatedAt ? `Last updated ${escapeHTML(new Date(profile.updatedAt).toLocaleString('en-IN'))}` : 'Profile has not been edited yet'}
          </span>
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">${I('check', 'icon-sm')} Save Profile</button>
        </div>
      </form>
    `);

    modalRoot.querySelector('.modal')?.classList.add('profile-editor-modal');
  }

  function setPhotoPreview(photo, fallbackName) {
    const preview = document.getElementById('profilePhotoPreview');
    const removeButton = document.querySelector('[data-remove-profile-photo]');
    if (!preview) return;

    if (photo) {
      preview.textContent = '';
      preview.classList.add('profile-photo-preview--image');
      preview.style.backgroundImage = `url("${photo}")`;
      if (removeButton) removeButton.disabled = false;
      return;
    }

    preview.textContent = initials(fallbackName);
    preview.classList.remove('profile-photo-preview--image');
    preview.style.removeProperty('background-image');
    if (removeButton) removeButton.disabled = true;
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        reject(new Error('Image must be smaller than 5 MB.'));
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => reject(new Error('The selected image could not be read.'));
      reader.onload = () => {
        const image = new Image();

        image.onerror = () => reject(new Error('The selected image is not supported.'));
        image.onload = () => {
          const size = Math.min(image.naturalWidth, image.naturalHeight);
          const sourceX = (image.naturalWidth - size) / 2;
          const sourceY = (image.naturalHeight - size) / 2;
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;

          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, 256, 256);
          context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 256, 256);

          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoSelection(input) {
    const file = input.files?.[0];
    if (!file) return;

    try {
      input.disabled = true;
      pendingProfilePhoto = await resizeImage(file);
      const currentName = document.querySelector('[name="fullName"]')?.value || 'BloodBridge';
      setPhotoPreview(pendingProfilePhoto, currentName);
      toast('Photo ready', 'Save Profile to apply the new picture.');
    } catch (error) {
      toast('Photo upload failed', error.message, 'error');
      input.value = '';
    } finally {
      input.disabled = false;
    }
  }

  function validatePhone(phone) {
    if (!phone) return true;
    return /^[+\d][\d\s()-]{6,19}$/.test(phone);
  }

  function roleDetailsFromForm(formData, role, previousDetails) {
    if (role === 'donor') {
      return {
        ...previousDetails,
        dateOfBirth: String(formData.get('dateOfBirth') || ''),
        occupation: String(formData.get('occupation') || '').trim(),
        donationAvailability: String(formData.get('donationAvailability')) === 'true'
      };
    }

    if (role === 'hospital') {
      return {
        ...previousDetails,
        authorizedContact: String(formData.get('authorizedContact') || '').trim(),
        department: String(formData.get('department') || '').trim(),
        facilityType: String(formData.get('facilityType') || 'Hospital')
      };
    }

    return {
      ...previousDetails,
      designation: String(formData.get('designation') || '').trim(),
      department: String(formData.get('department') || '').trim(),
      officeLocation: String(formData.get('officeLocation') || '').trim()
    };
  }

  function updateStoredAccount(session, profile) {
    const accounts = readAccounts();
    const index = accounts.findIndex(
      account => String(account.email || '').trim().toLowerCase() === profileIdentity(session)
    );

    if (index === -1) return;

    accounts[index] = {
      ...accounts[index],
      fullName: profile.fullName,
      phone: profile.phone,
      location: profile.location,
      contactPerson: profile.role === 'hospital'
        ? profile.roleDetails.authorizedContact
        : accounts[index].contactPerson
    };

    saveAccounts(accounts);
  }

  async function saveProfile(form) {

  const session = getSession();
  const previousProfile = getProfile(session);

  console.log('Step 6C: saveProfile() called');
  console.log('Step 6C: Session:', session);
  console.log('Step 6C: Previous profile:', previousProfile);

  if (!session || !previousProfile) {

    closeModal();

    toast(
      'Session expired',
      'Please sign in again.',
      'error'
    );

    navigate('/login');

    return;
  }

  if (!form.checkValidity()) {

    form.reportValidity();

    return;
  }

  const formData = new FormData(form);

  const fullName =
    String(
      formData.get('fullName') || ''
    ).trim();

  const phone =
    String(
      formData.get('phone') || ''
    ).trim();

  const location =
    String(
      formData.get('location') || ''
    ).trim();


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (fullName.length < 2) {

    toast(
      'Invalid name',
      'Please enter at least 2 characters.',
      'error'
    );

    form.elements.fullName.focus();

    return;
  }


  if (!validatePhone(phone)) {

    toast(
      'Invalid contact number',
      'Please enter a valid contact number.',
      'error'
    );

    form.elements.phone.focus();

    return;
  }


  // ==========================================================
  // STEP 6C
  // UPDATE REAL BACKEND DONOR PROFILE
  // ==========================================================

  if (session.role === 'donor') {

    console.log(
      'Step 6C: Donor detected'
    );

    console.log(
      'Step 6C: Donor ID:',
      session.donorId
    );


    if (!session.donorId) {

      console.error(
        'Step 6C: Donor ID missing from session'
      );

      toast(
        'Donor ID missing',
        'Please sign in again.',
        'error'
      );

      return;
    }


    try {

      console.log(
        'Step 6C: Updating donor profile:',
        session.donorId
      );

      console.log(
        'Step 6C: Sending data:',
        {
          name: fullName,
          phone: phone,
          opted_in_for_alerts:
            previousProfile.roleDetails
              ?.donationAvailability !== false
        }
      );


      const updateResponse =
        await BloodBridgeAPI.put(
          `/donors/${session.donorId}`,
          {
            name: fullName,
            phone: phone,

            opted_in_for_alerts:
              previousProfile.roleDetails
                ?.donationAvailability !== false
          }
        );


      console.log(
        'Step 6C: Backend update response:',
        updateResponse
      );


      if (
        !updateResponse ||
        updateResponse.status !== 'success'
      ) {

        throw new Error(
          updateResponse?.message ||
          'Unable to update donor profile.'
        );

      }


      console.log(
        'Step 6C: Backend donor profile updated successfully.'
      );


      // ------------------------------------------------------
      // UPDATE LOCAL PROFILE
      // ------------------------------------------------------

      const profile = {

        ...previousProfile,

        fullName,

        phone,

        location,

        photo:
          pendingProfilePhoto,

        roleDetails:
          roleDetailsFromForm(
            formData,
            session.role,
            previousProfile.roleDetails
          ),

        updatedAt:
          new Date().toISOString()

      };


      const profiles =
        readProfiles();


      profiles[
        profileIdentity(session)
      ] = profile;


      saveProfiles(profiles);


      updateStoredAccount(
        session,
        profile
      );


      session.fullName =
        profile.fullName;


      session.phone =
        profile.phone;


      saveSession(session);


      closeModal();


      applyProfileToInterface(
        profile
      );


      toast(
        'Profile updated',
        'Your donor profile has been updated successfully.'
      );


      if (
        getRoute().path === '/profile'
      ) {

        navigate('/profile');

      }


    } catch (error) {

      console.error(
        'Step 6C: Backend profile update error:',
        error
      );


      toast(
        'Update failed',
        error.message ||
        'Unable to update your donor profile.',
        'error'
      );

    }


    return;
  }


  // ==========================================================
  // NON-DONOR ACCOUNTS
  // ==========================================================

  const profile = {

    ...previousProfile,

    fullName,

    phone,

    location,

    photo:
      pendingProfilePhoto,

    roleDetails:
      roleDetailsFromForm(
        formData,
        session.role,
        previousProfile.roleDetails
      ),

    updatedAt:
      new Date().toISOString()

  };


  const profiles =
    readProfiles();


  profiles[
    profileIdentity(session)
  ] = profile;


  saveProfiles(profiles);


  updateStoredAccount(
    session,
    profile
  );


  session.fullName =
    profile.fullName;


  saveSession(session);


  closeModal();


  applyProfileToInterface(
    profile
  );


  toast(
    'Profile updated',
    `${roleTitle(session.role)} details were saved successfully.`
  );

}

  function removePendingPhoto() {
    pendingProfilePhoto = '';
    const fallbackName = document.querySelector('[name="fullName"]')?.value || 'BloodBridge';
    setPhotoPreview('', fallbackName);
    toast('Photo removed', 'Save Profile to confirm this change.');
  }

  document.addEventListener('click', event => {
    const profileCard = event.target.closest('[data-open-profile-editor]');
    if (profileCard) {
      event.preventDefault();
      openProfileEditor();
      return;
    }

    const removePhotoButton = event.target.closest('[data-remove-profile-photo]');
    if (removePhotoButton) {
      event.preventDefault();
      if (!removePhotoButton.disabled) removePendingPhoto();
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      event.target.matches('[data-open-profile-editor]')
    ) {
      event.preventDefault();
      openProfileEditor();
    }
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'profilePhotoInput') {
      handlePhotoSelection(event.target);
    }
  });

  document.addEventListener('input', event => {
    if (event.target.matches('#profileEditorForm [name="fullName"]') && !pendingProfilePhoto) {
      setPhotoPreview('', event.target.value);
    }
  });

  document.addEventListener('submit', event => {
    if (event.target.id !== 'profileEditorForm') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    saveProfile(event.target);
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    .sidebar-profile[data-open-profile-editor] {
      cursor: pointer;
      transition: background .18s ease, transform .18s ease, box-shadow .18s ease;
    }

    .sidebar-profile[data-open-profile-editor]:hover,
    .sidebar-profile[data-open-profile-editor]:focus-visible {
      background: rgba(255,255,255,.09);
      box-shadow: 0 5px 16px rgba(0,0,0,.12);
      transform: translateY(-1px);
      outline: none;
    }

    .sidebar-profile[data-open-profile-editor] > .icon {
      transition: transform .18s ease, color .18s ease;
    }

    .sidebar-profile[data-open-profile-editor]:hover > .icon {
      color: #fff;
      transform: translateX(2px);
    }

    .avatar--photo,
    .profile-avatar.avatar--photo {
      color: transparent !important;
      background-color: var(--slate-100) !important;
      background-position: center !important;
      background-size: cover !important;
      background-repeat: no-repeat !important;
    }

    .profile-editor-modal {
      width: min(780px, 96vw);
      max-height: min(860px, 94vh);
      display: flex;
      flex-direction: column;
    }

    .profile-modal-head {
      flex: 0 0 auto;
    }

    .profile-modal-head h2 {
      margin: 8px 0 3px;
      font-size: 19px;
    }

    .profile-modal-head p {
      margin: 0;
      color: var(--slate-500);
      font-size: 9px;
    }

    .profile-editor-modal form {
      min-height: 0;
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    .profile-modal-body {
      min-height: 0;
      overflow-y: auto;
      background: var(--slate-50);
    }

    .profile-photo-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 17px;
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .profile-photo-preview {
      width: 76px;
      height: 76px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border: 3px solid #fff;
      border-radius: 50%;
      color: var(--red-dark);
      background: #f2c9cc;
      box-shadow: 0 0 0 1px var(--slate-200), 0 5px 16px rgba(16,24,40,.12);
      font-size: 20px;
      font-weight: 800;
      background-position: center;
      background-size: cover;
    }

    .profile-photo-preview--image {
      color: transparent;
    }

    .profile-photo-copy {
      min-width: 0;
      flex: 1;
    }

    .profile-photo-copy > strong {
      display: block;
      font-size: 12px;
    }

    .profile-photo-copy > p {
      max-width: 430px;
      margin: 5px 0 11px;
      color: var(--slate-500);
      font-size: 8px;
      line-height: 1.5;
    }

    .profile-photo-copy > div {
      display: flex;
      gap: 7px;
    }

    .profile-upload-button {
      cursor: pointer;
    }

    .profile-editor-section {
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .profile-editor-section__head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--slate-100);
    }

    .profile-editor-section__head > .icon {
      width: 18px;
      height: 18px;
      color: var(--red);
    }

    .profile-editor-section__head h3,
    .profile-editor-section__head p {
      margin: 0;
    }

    .profile-editor-section__head h3 {
      font-size: 11px;
    }

    .profile-editor-section__head p {
      margin-top: 4px;
      color: var(--slate-500);
      font-size: 8px;
    }

    .profile-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      padding: 16px;
    }

    .profile-field {
      display: block;
    }

    .profile-field > span {
      display: block;
      margin-bottom: 7px;
      color: var(--slate-700);
      font-size: 9px;
      font-weight: 700;
    }

    .profile-field > small {
      display: block;
      margin-top: 5px;
      color: var(--slate-400);
      font-size: 7px;
      line-height: 1.4;
    }

    .profile-readonly-value {
      min-height: 42px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 11px;
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      color: var(--slate-500);
      background: var(--slate-50);
    }

    .profile-readonly-value .icon {
      width: 14px;
      height: 14px;
    }

    .profile-readonly-value strong {
      color: var(--slate-600);
      font-size: 10px;
      font-weight: 600;
    }

    .profile-security-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid #cfe0f5;
      border-radius: 8px;
      color: var(--blue);
      background: var(--blue-soft);
      font-size: 8px;
      line-height: 1.55;
    }

    .profile-modal-foot {
      flex: 0 0 auto;
    }

    .profile-last-updated {
      margin-right: auto;
      color: var(--slate-400);
      font-size: 8px;
    }

    @media (max-width: 680px) {
      .profile-photo-section {
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .profile-photo-section > .badge {
        display: none;
      }

      .profile-form-grid {
        grid-template-columns: 1fr;
      }

      .profile-modal-foot {
        flex-wrap: wrap;
      }

      .profile-last-updated {
        width: 100%;
        margin: 0 0 5px;
      }

      .profile-modal-foot .btn {
        flex: 1;
      }
    }

    @media (max-width: 430px) {
      .profile-photo-section {
        flex-direction: column;
      }

      .profile-photo-copy > div {
        flex-wrap: wrap;
      }
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => {
    if (observerFramePending) return;
    observerFramePending = true;

    requestAnimationFrame(() => {
      observerFramePending = false;
      configureSidebarProfileCard();
      applyProfileToInterface();
    });
  });

  observer.observe(app, {
    childList: true,
    subtree: true
  });

  configureSidebarProfileCard();
  applyProfileToInterface();
})();
