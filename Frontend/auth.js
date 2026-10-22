/*
  BloodBridge Authentication Module
  ---------------------------------
  Step 2C:
  Frontend authentication connected to Flask backend.

  - Donor login
  - Hospital login
  - Admin login
  - Donor registration
  - Hospital access request
  - JWT token stored in sessionStorage
*/

(() => {
  'use strict';

  const ACCOUNTS_KEY = 'bloodbridge_accounts';
  const SESSION_KEY = 'bloodbridge_session';
  const TOKEN_KEY = 'bloodbridge_token';

  const dashboardByRole = {
    donor: '/donor-dashboard',
    hospital: '/dashboard',
    admin: '/admin'
  };

  const roleDetails = {
    donor: {
      title: 'Welcome back, donor.',
      description: 'Manage your appointments, view your donation impact, and respond to urgent blood needs.',
      label: 'Email address',
      placeholder: 'donor@example.com',
      button: 'Login as Donor',
      icon: 'heart'
    },

    hospital: {
      title: 'Secure access for clinical teams.',
      description: 'Monitor inventory, submit emergency requests, and coordinate verified blood matches.',
      label: 'Institutional email',
      placeholder: 'doctor@hospital.org',
      button: 'Secure Hospital Login',
      icon: 'hospital'
    },

    admin: {
      title: 'BloodBridge administration.',
      description: 'Manage users, verify facilities, review requests, and monitor the complete BloodBridge network.',
      label: 'Administrator email',
      placeholder: 'admin@bloodbridge.org',
      button: 'Login as Administrator',
      icon: 'shield'
    }
  };

  const demoAccounts = [
    {
      fullName: 'Alex Morgan',
      email: 'donor@bloodbridge.demo',
      password: 'demo123',
      role: 'donor',
      status: 'active'
    },
    {
      fullName: 'Dr. Sarah Chen',
      email: 'hospital@bloodbridge.demo',
      password: 'demo123',
      role: 'hospital',
      status: 'active'
    },
    {
      fullName: 'BloodBridge Admin',
      email: 'admin@bloodbridge.demo',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    }
  ];

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getStoredAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
      return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
      return [];
    }
  }

  function saveStoredAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function findAccount(email) {
    const normalizedEmail = normalizeEmail(email);

    return [...demoAccounts, ...getStoredAccounts()].find(
      account => normalizeEmail(account.email) === normalizedEmail
    );
  }

  /*
    Create frontend session.

    IMPORTANT:
    JWT token is stored separately in sessionStorage.
  */
  function createSession(account) {

  const session = {

    loggedIn: true,

    role:
      account.role,

    email:
      account.email,

    fullName:
      account.fullName,

    userId:
      account.id,

    // ========================================================
    // STEP 4C
    // SAVE DONOR PROFILE ID IN FRONTEND SESSION
    // ========================================================

    donorId:
      account.donorId || null,

    loginTime:
      Date.now()
  };


  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );


  console.log(
    'Step 4C: Session saved:',
    session
  );


  return session;
}

  function passwordInput(id, placeholder) {
    return `
      <div class="input-wrap">
        ${I('lock')}

        <input
          id="${id}"
          name="${id}"
          type="password"
          placeholder="${placeholder}"
          minlength="6"
          required
        />

        <button
          type="button"
          class="password-toggle"
          data-password-toggle
          aria-label="Show or hide password"
        >
          ${I('eye', 'icon-sm')}
        </button>
      </div>
    `;
  }

  function roleSelector(selectedRole) {
    return `
      <div class="role-switch role-switch--three" aria-label="Select account type">

        <button
          type="button"
          data-role="donor"
          class="${selectedRole === 'donor' ? 'active' : ''}"
        >
          ${I('heart', 'icon-sm')} Donor
        </button>

        <button
          type="button"
          data-role="hospital"
          class="${selectedRole === 'hospital' ? 'active' : ''}"
        >
          ${I('hospital', 'icon-sm')} Hospital
        </button>

        <button
          type="button"
          data-role="admin"
          class="${selectedRole === 'admin' ? 'active' : ''}"
        >
          ${I('shield', 'icon-sm')} Admin
        </button>

      </div>
    `;
  }

  window.loginForm = function loginForm(role = 'donor') {

    const selectedRole = roleDetails[role] ? role : 'donor';
    const details = roleDetails[selectedRole];
    const demo = demoAccounts.find(
      account => account.role === selectedRole
    );

    return `
      <div class="auth-card">

        <div class="auth-heading">
          <span class="eyebrow">Account access</span>

          <h2>Sign in to BloodBridge</h2>

          <p>
            Select your account type and enter your verified credentials.
          </p>
        </div>

        ${roleSelector(selectedRole)}

        <form
          id="loginForm"
          data-role-value="${selectedRole}"
          novalidate
        >

          <div class="form-group">

            <label
              class="form-label"
              for="loginEmail"
            >
              ${details.label}
            </label>

            <div class="input-wrap">

              ${I('mail')}

              <input
                id="loginEmail"
                name="email"
                type="email"
                placeholder="${details.placeholder}"
                autocomplete="email"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="loginPassword"
            >
              Password

              <a
                href="#"
                data-forgot
              >
                Forgot password?
              </a>

            </label>

            ${passwordInput(
              'loginPassword',
              'Enter your password'
            )}

          </div>

          <label class="form-check">

            <input
              type="checkbox"
              name="remember"
            />

            Keep me signed in on this device

          </label>

          <button
            class="btn btn-primary btn-block btn-lg"
            type="submit"
          >
            ${details.button} ${I('arrow')}
          </button>

        </form>

        <div class="demo-credentials">

          <div class="demo-credentials__top">

            <span>
              ${I('lock', 'icon-sm')}
              Hackathon demo account
            </span>

            <button
              type="button"
              class="link-red demo-fill-button"
              data-use-demo
              data-email="${demo.email}"
              data-password="${demo.password}"
            >
              Use demo
            </button>

          </div>

          <code>${demo.email}</code>

          <code>Password: ${demo.password}</code>

        </div>

        ${selectedRole === 'admin' ? `
          <div class="admin-registration-note">

            ${I('shield', 'icon-sm')}

            <span>
              Administrator accounts are created internally
              and cannot be registered publicly.
            </span>

          </div>
        ` : `

          <div class="auth-divider">
            New to BloodBridge?
          </div>

          <a
            href="#/register?type=${selectedRole}"
            class="btn btn-secondary btn-block"
          >
            ${
              selectedRole === 'hospital'
                ? 'Request Hospital Access'
                : 'Create Donor Account'
            }

            ${I('arrow', 'icon-sm')}

          </a>

        `}

        <p class="auth-bottom">
          Need assistance?
          <a href="#" data-support>
            Contact support
          </a>
        </p>

      </div>
    `;
  };


  // ============================================================
  // DONOR REGISTRATION FORM
  // ============================================================

  function donorRegistrationForm() {

    return `
      <form
        id="registerForm"
        data-registration-type="donor"
        novalidate
      >

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="donorName"
            >
              Full name
            </label>

            <div class="input-wrap">

              ${I('user')}

              <input
                id="donorName"
                name="fullName"
                type="text"
                placeholder="Your full name"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="donorBloodType"
            >
              Blood type
            </label>

            <div class="input-wrap">

              ${I('drop')}

              <select
                id="donorBloodType"
                name="bloodType"
                class="has-icon"
                required
              >

                <option value="">
                  Select type
                </option>

                <option>A+</option>
                <option>A−</option>
                <option>B+</option>
                <option>B−</option>
                <option>AB+</option>
                <option>AB−</option>
                <option>O+</option>
                <option>O−</option>
                <option>I don't know</option>

              </select>

            </div>

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="donorEmail"
            >
              Email address
            </label>

            <div class="input-wrap">

              ${I('mail')}

              <input
                id="donorEmail"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="donorPhone"
            >
              Contact number
            </label>

            <div class="input-wrap">

              ${I('phone')}

              <input
                id="donorPhone"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                required
              />

            </div>

          </div>

        </div>

        <div class="form-group">

          <label
            class="form-label"
            for="donorLocation"
          >
            Location
          </label>

          <div class="input-wrap">

            ${I('pin')}

            <input
              id="donorLocation"
              name="location"
              type="text"
              placeholder="Ahmedabad, Gujarat"
              required
            />

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="registerPassword"
            >
              Create password
            </label>

            ${passwordInput(
              'registerPassword',
              'Minimum 6 characters'
            )}

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="confirmPassword"
            >
              Confirm password
            </label>

            ${passwordInput(
              'confirmPassword',
              'Enter password again'
            )}

          </div>

        </div>

        <label class="form-check">

          <input
            type="checkbox"
            name="consent"
            required
          />

          I agree to the Terms of Service,
          Privacy Policy, and donor health-data consent.

        </label>

        <button
          class="btn btn-primary btn-block btn-lg"
          type="submit"
        >
          Create Donor Account ${I('arrow')}
        </button>

      </form>
    `;
  }


  // ============================================================
  // HOSPITAL REGISTRATION FORM
  // ============================================================

  function hospitalRegistrationForm() {

    return `
      <form
        id="registerForm"
        data-registration-type="hospital"
        novalidate
      >

        <div class="hospital-approval-banner">

          ${I('shield')}

          <div>

            <strong>
              Administrator verification required
            </strong>

            <span>
              Your hospital account will remain pending
              until its licence and details are approved.
            </span>

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="hospitalName"
            >
              Hospital / facility name
            </label>

            <div class="input-wrap">

              ${I('hospital')}

              <input
                id="hospitalName"
                name="fullName"
                type="text"
                placeholder="Official facility name"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="licenseNumber"
            >
              Licence number
            </label>

            <div class="input-wrap">

              ${I('file')}

              <input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                placeholder="Medical licence / ID"
                required
              />

            </div>

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="hospitalEmail"
            >
              Official institutional email
            </label>

            <div class="input-wrap">

              ${I('mail')}

              <input
                id="hospitalEmail"
                name="email"
                type="email"
                placeholder="contact@hospital.org"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="contactPerson"
            >
              Authorized contact person
            </label>

            <div class="input-wrap">

              ${I('user')}

              <input
                id="contactPerson"
                name="contactPerson"
                type="text"
                placeholder="Doctor / administrator name"
                required
              />

            </div>

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="hospitalPhone"
            >
              Official contact number
            </label>

            <div class="input-wrap">

              ${I('phone')}

              <input
                id="hospitalPhone"
                name="phone"
                type="tel"
                placeholder="+91 79 0000 0000"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="hospitalLocation"
            >
              Facility address
            </label>

            <div class="input-wrap">

              ${I('pin')}

              <input
                id="hospitalLocation"
                name="location"
                type="text"
                placeholder="Complete hospital address"
                required
              />

            </div>

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label
              class="form-label"
              for="registerPassword"
            >
              Create password
            </label>

            ${passwordInput(
              'registerPassword',
              'Minimum 6 characters'
            )}

          </div>

          <div class="form-group">

            <label
              class="form-label"
              for="confirmPassword"
            >
              Confirm password
            </label>

            ${passwordInput(
              'confirmPassword',
              'Enter password again'
            )}

          </div>

        </div>

        <label class="form-check">

          <input
            type="checkbox"
            name="consent"
            required
          />

          I confirm that I am authorized to request
          access for this healthcare facility.

        </label>

        <button
          class="btn btn-primary btn-block btn-lg"
          type="submit"
        >
          Submit Access Request ${I('arrow')}
        </button>

      </form>
    `;
  }


  // ============================================================
  // REGISTRATION PAGE
  // ============================================================

  window.registerForm = function registerForm() {

    const queryType = getRoute().query.get('type');

    const selectedType =
      queryType === 'hospital'
        ? 'hospital'
        : 'donor';

    return `
      <div class="auth-card auth-card--wide">

        <div class="auth-heading">

          <span class="eyebrow">
            Join the network
          </span>

          <h2>
            ${
              selectedType === 'hospital'
                ? 'Request Hospital Access'
                : 'Create Donor Account'
            }
          </h2>

          <p>
            ${
              selectedType === 'hospital'
                ? 'Submit your facility details for administrator verification.'
                : 'Register as a voluntary donor and help BloodBridge save lives.'
            }
          </p>

        </div>

        <div class="registration-type-switch">

          <button
            type="button"
            data-register-type="donor"
            class="${selectedType === 'donor' ? 'active' : ''}"
          >

            ${I('heart')}

            <span>
              <strong>Blood Donor</strong>
              <small>Public registration</small>
            </span>

          </button>

          <button
            type="button"
            data-register-type="hospital"
            class="${selectedType === 'hospital' ? 'active' : ''}"
          >

            ${I('hospital')}

            <span>
              <strong>Hospital</strong>
              <small>Approval required</small>
            </span>

          </button>

        </div>

        ${
          selectedType === 'hospital'
            ? hospitalRegistrationForm()
            : donorRegistrationForm()
        }

        <p class="auth-bottom">

          Already have an account?

          <a href="#/login?role=${selectedType}">
            Return to login
          </a>

        </p>

        <p class="auth-terms">
          Your information is encrypted in production and handled
          according to applicable healthcare privacy standards.
        </p>

      </div>
    `;
  };


  // ============================================================
  // AUTH LAYOUT
  // ============================================================

  window.authLayout = function authLayout(
    kind = 'login',
    role = 'donor'
  ) {

    const isLogin = kind === 'login';

    const registerType =
      !isLogin &&
      getRoute().query.get('type') === 'hospital'
        ? 'hospital'
        : 'donor';

    const selectedRole =
      roleDetails[role]
        ? role
        : 'donor';

    const details = roleDetails[selectedRole];

    const title = isLogin
      ? details.title
      : registerType === 'hospital'
        ? 'Connect your facility to a trusted network.'
        : 'Connect. Donate. Save lives.';

    const description = isLogin
      ? details.description
      : registerType === 'hospital'
        ? 'Request verified institutional access to coordinate emergency blood requirements and inventory.'
        : 'Join a secure donor network and become a vital link in emergency healthcare.';

    return `
      <div class="auth-page">

        <aside class="auth-aside">

          ${logo(true)}

          <div class="auth-message">

            <div class="icon-wrap">

              ${I(
                isLogin
                  ? details.icon
                  : registerType === 'hospital'
                    ? 'hospital'
                    : 'heart',
                'icon-lg'
              )}

            </div>

            <h1>${title}</h1>

            <p>${description}</p>

          </div>

          <div class="auth-security">

            ${I('shield', 'icon-sm')}

            Secure & confidential healthcare network

          </div>

        </aside>

        <main class="auth-main">

          <a
            href="#/home"
            class="back-home"
          >
            ${I('x', 'icon-sm')} Close
          </a>

          ${
            isLogin
              ? window.loginForm(selectedRole)
              : window.registerForm()
          }

        </main>

      </div>
    `;
  };


  // ============================================================
  // FIELD ERROR
  // ============================================================

  function showFieldError(input, message) {

    input.focus();

    input.setCustomValidity(message);

    input.reportValidity();

    setTimeout(() => {
      input.setCustomValidity('');
    }, 100);
  }


  // ============================================================
  // STEP 2C
  // LOGIN USING FLASK BACKEND
  // ============================================================

  async function handleLogin(form) {

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const role = form.dataset.roleValue;

    const email = normalizeEmail(
      form.elements.email.value
    );

    const password =
      form.elements.loginPassword.value;

    try {

      // --------------------------------------------------------
      // SEND LOGIN REQUEST TO FLASK
      // --------------------------------------------------------

      console.log('HOSPITAL LOGIN DEBUG:', {
  role,
  email,
  passwordLength: password.length,
  password
});

      const data = await BloodBridgeAPI.post(
        '/auth/login',
        {
          email: email,
          password: password
        }
      );

      console.log(
        'BloodBridge backend login response:',
        data
      );

      // --------------------------------------------------------
      // CHECK JWT
      // --------------------------------------------------------

      if (!data.access_token) {

        throw new Error(
          'Login succeeded but the backend did not return an access token.'
        );

      }

      // --------------------------------------------------------
      // GET USER FROM BACKEND RESPONSE
      // --------------------------------------------------------

      const backendUser = data.user || {};

      // --------------------------------------------------------
      // ROLE CHECK
      // --------------------------------------------------------

      if (
        backendUser.role &&
        backendUser.role !== role
      ) {

        toast(
          'Incorrect account type',
          `This account belongs to the ${backendUser.role} portal. Please select the correct role.`,
          'error'
        );

        return;
      }

      // --------------------------------------------------------
      // STATUS CHECK
      // --------------------------------------------------------

      if (backendUser.status === 'pending') {

        toast(
          'Verification pending',
          'Your hospital access request is waiting for administrator approval.',
          'error'
        );

        return;
      }

      if (
        backendUser.status &&
        backendUser.status !== 'active'
      ) {

        toast(
          'Account unavailable',
          'Please contact BloodBridge support.',
          'error'
        );

        return;
      }

      // --------------------------------------------------------
      // SAVE JWT TOKEN
      // --------------------------------------------------------

      sessionStorage.setItem(
        TOKEN_KEY,
        data.access_token
      );
      // ============================================================
// STEP 4C
// FIND DONOR PROFILE USING LOGGED-IN USER ID
// ============================================================

let donorId = null;
let donorProfile = null;

if (role === 'donor') {

  console.log(
    'Step 4C: Finding donor profile for user:',
    backendUser.id
  );

  try {

    const donorResponse =
      await BloodBridgeAPI.get(
        `/donors/user/${backendUser.id}`
      );

    console.log(
      'Step 4C: Donor profile response:',
      donorResponse
    );


    if (
      donorResponse &&
      donorResponse.status === 'success' &&
      donorResponse.donor
    ) {

      donorProfile =
        donorResponse.donor;

      donorId =
        donorProfile.id;

      console.log(
        'Step 4C: Donor ID found:',
        donorId
      );

    } else {

      console.error(
        'Step 4C: Donor profile was not found.'
      );

    }

  } catch (error) {

    console.error(
      'Step 4C donor profile lookup failed:',
      error
    );

  }

}

      // --------------------------------------------------------
      // CREATE FRONTEND SESSION
      // --------------------------------------------------------

      const account = {

  id:
    backendUser.id,

  fullName:
    backendUser.name ||
    backendUser.fullName ||
    'BloodBridge User',

  email:
    backendUser.email ||
    email,

  role:
    backendUser.role ||
    role,

  status:
    backendUser.status ||
    'active',

  phone:
    donorProfile?.phone ||
    backendUser.phone ||
    '',

  bloodType:
    donorProfile?.blood_type ||
    backendUser.blood_type ||
    '',

  donorId:
    donorId,

  createdAt:
    backendUser.created_at ||
    new Date().toISOString()

};

      createSession(account);

      // --------------------------------------------------------
      // SUCCESS MESSAGE
      // --------------------------------------------------------

      toast(
        'Secure login successful',
        `Opening the ${role} portal...`
      );

      // --------------------------------------------------------
      // GO TO EXISTING DASHBOARD
      // --------------------------------------------------------

      setTimeout(() => {

        navigate(
          dashboardByRole[role]
        );

      }, 450);

    } catch (error) {

      console.error(
        'BloodBridge backend login error:',
        error
      );

      toast(
        'Login failed',
        error.message ||
        'Unable to connect to the BloodBridge server.',
        'error'
      );

    }
  }


  // ============================================================
  // REGISTRATION
  // NOTE:
  // Registration is still localStorage-based for now.
  // We will connect this in a later step after login is verified.
  // ============================================================

  // ============================================================
// STEP 3C
// DONOR REGISTRATION USING FLASK BACKEND
// ============================================================

async function handleRegistration(form) {

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const registrationType =
    form.dataset.registrationType;

  const formData =
    new FormData(form);


  // ==========================================================
  // PASSWORD VALIDATION
  // ==========================================================

  const password =
    String(
      formData.get('registerPassword') || ''
    );

  const confirmPassword =
    String(
      formData.get('confirmPassword') || ''
    );


  if (password !== confirmPassword) {

    showFieldError(
      form.elements.confirmPassword,
      'Passwords do not match.'
    );

    return;
  }


  // ==========================================================
  // STEP 3C = DONOR REGISTRATION
  // ==========================================================

  if (registrationType === 'hospital') {

  const name =
    String(
      formData.get('fullName') || ''
    ).trim();

  const email =
    normalizeEmail(
      formData.get('email')
    );

  const phone =
    String(
      formData.get('phone') || ''
    ).trim();

  const location =
    String(
      formData.get('location') || ''
    ).trim();

  const licenseNumber =
    String(
      formData.get('licenseNumber') || ''
    ).trim();

  const contactPerson =
    String(
      formData.get('contactPerson') || ''
    ).trim();

  if (
    !name ||
    !email ||
    !password ||
    !phone ||
    !location ||
    !licenseNumber ||
    !contactPerson
  ) {

    toast(
      'Missing information',
      'Please complete all required hospital fields.',
      'error'
    );

    return;
  }

  try {

    console.log(
      'H1 - Creating hospital user account...'
    );

    const registerResponse =
      await BloodBridgeAPI.post(
        '/auth/register',
        {
          name: name,
          email: email,
          password: password,
          role: 'hospital'
        }
      );

    console.log(
      'H1 - HOSPITAL REGISTER RESPONSE:',
      registerResponse
    );

    if (
      !registerResponse ||
      registerResponse.status !== 'success'
    ) {

      throw new Error(
        registerResponse?.message ||
        'Unable to create hospital account.'
      );

    }

    toast(
      'Hospital registration submitted',
      'Your facility account has been created and is awaiting administrator verification.'
    );

    console.log(
      'H1 - HOSPITAL REGISTRATION SUCCESS'
    );

    setTimeout(() => {

      navigate(
        '/login?role=hospital'
      );

    }, 700);

  } catch (error) {

    console.error(
      'H1 - HOSPITAL REGISTRATION ERROR:',
      error
    );

    toast(
      'Registration failed',
      error.message ||
      'Unable to connect to the BloodBridge backend.',
      'error'
    );

  }

  return;
}


  // ==========================================================
  // GET DONOR FORM DATA
  // ==========================================================

  const name =
    String(
      formData.get('fullName') || ''
    ).trim();

  const email =
    normalizeEmail(
      formData.get('email')
    );

  const phone =
    String(
      formData.get('phone') || ''
    ).trim();

  const bloodType =
    String(
      formData.get('bloodType') || ''
    ).trim();

  const location =
    String(
      formData.get('location') || ''
    ).trim();


  // ==========================================================
  // BASIC VALIDATION
  // ==========================================================

  if (
    !name ||
    !email ||
    !password ||
    !phone ||
    !bloodType ||
    !location
  ) {

    toast(
      'Missing information',
      'Please complete all required donor fields.',
      'error'
    );

    return;
  }


  // ==========================================================
  // STEP 3C - PART 1
  // CREATE USER ACCOUNT
  // ==========================================================

  try {

    console.log(
      'Step 3C: Creating donor user account...'
    );


    const registerResponse =
      await BloodBridgeAPI.post(
        '/auth/register',
        {
          name: name,
          email: email,
          password: password,
          role: 'donor'
        }
      );


    console.log(
      'Backend registration response:',
      registerResponse
    );


    if (
      !registerResponse ||
      registerResponse.status !== 'success'
    ) {

      throw new Error(
        registerResponse?.message ||
        'Unable to create donor account.'
      );

    }


    // ========================================================
    // STEP 3C - PART 2
    // LOGIN TO GET JWT
    // ========================================================

    console.log(
      'Step 3C: Getting JWT token...'
    );


    const loginResponse =
      await BloodBridgeAPI.post(
        '/auth/login',
        {
          email: email,
          password: password
        }
      );


    console.log(
      'Backend login response:',
      loginResponse
    );


    if (
      !loginResponse ||
      !loginResponse.access_token
    ) {

      throw new Error(
        'Account created, but JWT token was not received.'
      );

    }


    // ========================================================
    // SAVE JWT TOKEN
    // ========================================================

    sessionStorage.setItem(
      TOKEN_KEY,
      loginResponse.access_token
    );
    


    console.log(
      'Step 3C: JWT token saved.'
    );


    // ========================================================
    // STEP 3C - PART 3
    // TEMPORARY LOCATION
    //
    // Backend currently requires latitude and longitude.
    // We will connect real GPS in a later step.
    // ========================================================

    const latitude = 23.0225;
    const longitude = 72.5714;


    // ========================================================
    // STEP 3C - PART 4
    // CREATE DONOR PROFILE
    // ========================================================

    console.log(
      'Step 3C: Creating donor profile...'
    );


    const donorResponse =
      await BloodBridgeAPI.post(
        '/donors/register',
        {
          name: name,
          phone: phone,
          blood_type: bloodType,
          latitude: latitude,
          longitude: longitude,
          total_donations: 0,
          opted_in_for_alerts: true
        }
      );


    console.log(
      'Backend donor response:',
      donorResponse
    );


    if (
      !donorResponse ||
      donorResponse.status !== 'success'
    ) {

      throw new Error(
        donorResponse?.message ||
        'Donor profile could not be created.'
      );

    }


    // ========================================================
    // GET BACKEND USER DATA
    // ========================================================

    const backendUser =
      loginResponse.user ||
      registerResponse.user ||
      {};


    // ========================================================
    // GET DONOR DATA
    // ========================================================

    const donor =
      donorResponse.donor ||
      {};


    // ========================================================
    // CREATE FRONTEND ACCOUNT
    // ========================================================

    const account = {

  id:
    backendUser.id,

  userId:
    backendUser.id,

  donorId:
    donorId,

  fullName:
    backendUser.name ||
    backendUser.fullName ||
    'BloodBridge User',

  email:
    backendUser.email ||
    email,

  role:
    backendUser.role ||
    role,

  status:
    backendUser.status ||
    'active',

  phone:
    donorProfile?.phone ||
    backendUser.phone ||
    '',

  bloodType:
    donorProfile?.blood_type ||
    backendUser.blood_type ||
    '',

  createdAt:
    backendUser.created_at ||
    new Date().toISOString()

};


    // ========================================================
    // CREATE FRONTEND SESSION
    // ========================================================

    createSession(account);


    console.log(
      'Step 4C: Frontend session created.',
      account
    );


    // ========================================================
    // SUCCESS
    // ========================================================

    toast(
      'Registration successful',
      'Your BloodBridge donor account has been created.'
    );


    // ========================================================
    // REDIRECT TO DONOR DASHBOARD
    // ========================================================

    setTimeout(() => {

      navigate(
        dashboardByRole.donor
      );

    }, 700);


  } catch (error) {

    console.error(
      'Step 3C donor registration error:',
      error
    );


    // ========================================================
    // DUPLICATE EMAIL
    // ========================================================

    if (
      error.message &&
      error.message
        .toLowerCase()
        .includes('email already exists')
    ) {

      toast(
        'Email already registered',
        'This email is already registered. Please login instead.',
        'error'
      );

      return;
    }


    // ========================================================
    // GENERAL ERROR
    // ========================================================

    toast(
      'Registration failed',
      error.message ||
      'Unable to connect to the BloodBridge backend.',
      'error'
    );

  }

}


  // ============================================================
  // FORM SUBMIT HANDLER
  // ============================================================

  document.addEventListener(
    'submit',
    event => {

      const form = event.target;

      if (form.id === 'loginForm') {

        event.preventDefault();

        event.stopImmediatePropagation();

        handleLogin(form);

        return;
      }

      if (form.id === 'registerForm') {

        event.preventDefault();

        event.stopImmediatePropagation();

        handleRegistration(form);

      }

    },
    true
  );


  // ============================================================
  // CLICK HANDLERS
  // ============================================================

  document.addEventListener(
    'click',
    event => {

      // Registration type
      const registrationTypeButton =
        event.target.closest(
          '[data-register-type]'
        );

      if (registrationTypeButton) {

        event.preventDefault();

        navigate(
          `/register?type=${registrationTypeButton.dataset.registerType}`
        );

        return;
      }


      // Demo credentials
      const demoButton =
        event.target.closest(
          '[data-use-demo]'
        );

      if (demoButton) {

        event.preventDefault();

        const emailInput =
          document.getElementById(
            'loginEmail'
          );

        const passwordInputElement =
          document.getElementById(
            'loginPassword'
          );

        if (
          emailInput &&
          passwordInputElement
        ) {

          emailInput.value =
            demoButton.dataset.email;

          passwordInputElement.value =
            demoButton.dataset.password;

          toast(
            'Demo credentials filled',
            'Click the login button to open this portal.'
          );

        }

      }

    }
  );


  // ============================================================
  // AUTH STYLES
  // ============================================================

  const style =
    document.createElement('style');

  style.textContent = `

    .role-switch--three {
      grid-template-columns: repeat(3, 1fr);
    }

    .role-switch button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .demo-credentials {
      margin-top: 18px;
      padding: 13px 14px;
      border: 1px dashed var(--slate-300);
      border-radius: 8px;
      background: var(--slate-50);
    }

    .demo-credentials__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 9px;
      color: var(--slate-700);
      font-size: 10px;
      font-weight: 700;
    }

    .demo-credentials__top span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .demo-fill-button {
      border: 0;
      padding: 0;
      background: transparent;
      cursor: pointer;
    }

    .demo-credentials code {
      display: block;
      color: var(--slate-600);
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10px;
      line-height: 1.65;
    }

    .admin-registration-note,
    .hospital-approval-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      border-radius: 8px;
      font-size: 10px;
      line-height: 1.55;
    }

    .admin-registration-note {
      margin-top: 18px;
      padding: 12px;
      color: var(--slate-600);
      background: var(--slate-100);
    }

    .hospital-approval-banner {
      margin-bottom: 19px;
      padding: 13px;
      color: #8a5a08;
      background: var(--amber-soft);
      border: 1px solid #f6ddb0;
    }

    .hospital-approval-banner strong,
    .hospital-approval-banner span {
      display: block;
    }

    .hospital-approval-banner span {
      margin-top: 3px;
      opacity: .86;
    }

    .registration-type-switch {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 23px;
    }

    .registration-type-switch button {
      min-height: 66px;
      padding: 11px 13px;
      display: flex;
      align-items: center;
      gap: 11px;
      text-align: left;
      color: var(--slate-600);
      background: #fff;
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      cursor: pointer;
    }

    .registration-type-switch button.active {
      color: var(--red);
      background: var(--red-soft);
      border-color: var(--red);
      box-shadow: 0 0 0 2px rgba(180, 35, 44, .06);
    }

    .registration-type-switch button > .icon {
      width: 22px;
      height: 22px;
    }

    .registration-type-switch strong,
    .registration-type-switch small {
      display: block;
    }

    .registration-type-switch strong {
      color: var(--slate-800);
      font-size: 11px;
    }

    .registration-type-switch button.active strong {
      color: var(--red);
    }

    .registration-type-switch small {
      margin-top: 4px;
      color: var(--slate-500);
      font-size: 8px;
    }

    @media (max-width: 680px) {

      .role-switch--three {
        grid-template-columns: 1fr;
      }

      .registration-type-switch {
        grid-template-columns: 1fr;
      }

    }

  `;

  document.head.appendChild(style);


  // ============================================================
  // RE-RENDER AUTH ROUTES
  // ============================================================

  const currentPath =
    getRoute().path;

  if (
    currentPath === '/login' ||
    currentPath === '/register'
  ) {

    routePage();

  }

})();