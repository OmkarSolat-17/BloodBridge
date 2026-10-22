// ============================================================
// BloodBridge API Client
// Frontend -> Flask Backend
// ============================================================

(() => {
  'use strict';

  // Flask backend URL
  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  // ------------------------------------------------------------
  // Generic API request function
  // ------------------------------------------------------------

  async function apiRequest(endpoint, options = {}) {

    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
      method: options.method || 'GET',

      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    // ----------------------------------------------------------
    // Add JWT token automatically if available
    // ----------------------------------------------------------

    const token = sessionStorage.getItem('bloodbridge_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ----------------------------------------------------------
    // Add request body
    // ----------------------------------------------------------

    if (options.body !== undefined) {
      config.body = JSON.stringify(options.body);
    }

    // ----------------------------------------------------------
    // Send request
    // ----------------------------------------------------------

    const response = await fetch(url, config);

    // Try to read JSON response
    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    // ----------------------------------------------------------
    // Handle HTTP errors
    // ----------------------------------------------------------

    if (!response.ok) {

      throw new Error(
        data.message ||
        `API request failed with status ${response.status}`
      );
    }

    return data;
  }


  // ------------------------------------------------------------
  // GET request
  // ------------------------------------------------------------

  async function apiGet(endpoint) {
    return apiRequest(endpoint, {
      method: 'GET'
    });
  }


  // ------------------------------------------------------------
  // POST request
  // ------------------------------------------------------------

  async function apiPost(endpoint, body) {
    return apiRequest(endpoint, {
      method: 'POST',
      body
    });
  }


  // ------------------------------------------------------------
  // PUT request
  // ------------------------------------------------------------

  async function apiPut(endpoint, body) {
    return apiRequest(endpoint, {
      method: 'PUT',
      body
    });
  }


  // ------------------------------------------------------------
  // DELETE request
  // ------------------------------------------------------------

  async function apiDelete(endpoint) {
    return apiRequest(endpoint, {
      method: 'DELETE'
    });
  }


  // ------------------------------------------------------------
  // Make functions available globally
  // ------------------------------------------------------------

  window.BloodBridgeAPI = {
    API_BASE_URL,
    request: apiRequest,
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete
  };

})();