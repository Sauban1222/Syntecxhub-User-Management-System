const API_BASE = '/api/users';
const TOKEN_KEY = 'authToken';
const page = document.body.dataset.page;
const isProtectedPage = page === 'dashboard' || page === 'profile';

function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // The following navigation still removes access to the protected page.
  }
}

function setMessage(element, message, type = 'error') {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message is-visible is-${type}`;
  element.hidden = false;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = '';
  element.hidden = true;
  element.className = 'form-message';
}

function setInlineMessage(element, message, type = 'error') {
  if (!element) return;
  element.textContent = message;
  element.className = `inline-message is-visible is-${type}`;
  element.hidden = false;
}

function setButtonLoading(button, loading, labelText) {
  if (!button) return;
  button.disabled = loading;
  const label = button.querySelector('[data-button-label]');
  const spinner = button.querySelector('.button-spinner');
  if (label) {
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = label.textContent.trim();
    }
    label.textContent = loading ? labelText : button.dataset.defaultLabel;
  }
  if (spinner) spinner.hidden = !loading;
}

async function apiRequest(path, method, data, token) {
  const headers = {};
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };
  if (data !== undefined) options.body = JSON.stringify(data);

  const response = await fetch(`${API_BASE}${path}`, options);
  let body;
  try {
    body = await response.json();
  } catch {
    body = { success: false, message: 'The server returned an unreadable response.' };
  }
  return { response, body };
}

function validationMessage(body, fallback) {
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((error) => error.field ? `${error.field}: ${error.message}` : error.message)
      .join(' ');
  }
  return body?.message || fallback;
}

function redirectForUnauthorized() {
  clearToken();
  window.location.replace('/login?expired=1');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear().toString();
});

if (isProtectedPage && !getToken()) {
  window.location.replace('/login');
} else {
  if (isProtectedPage) {
    document.documentElement.classList.remove('auth-pending');
  }
  initializePage();
}

window.addEventListener('pageshow', () => {
  if (isProtectedPage && !getToken()) {
    window.location.replace('/login');
  }
});

function initializePage() {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      clearToken();
      window.location.replace('/login');
    });
  });

  if (page === 'register') initializeRegistration();
  if (page === 'login') initializeLogin();
  if (page === 'dashboard') loadDashboard();
  if (page === 'profile') initializeProfile();
}

function initializeRegistration() {
  const form = document.querySelector('#register-form');
  const message = document.querySelector('[data-message]');
  const button = form?.querySelector('[data-submit-button]');
  if (!form || !button) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('deleted') === '1') {
    setMessage(message, 'Your account was deleted. You can register again at any time.', 'success');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    clearMessage(message);

    const fullName = form.elements.fullName.value.trim();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;
    const passwordBytes = new TextEncoder().encode(password).length;

    if (fullName.length < 2 || fullName.length > 100) {
      setMessage(message, 'Full name must be between 2 and 100 characters.');
      return;
    }
    if (!form.elements.email.validity.valid) {
      setMessage(message, 'Enter a valid email address.');
      return;
    }
    if (password.length < 8 || passwordBytes > 72) {
      setMessage(message, 'Password must be at least 8 characters and no more than 72 bytes.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage(message, 'Your passwords do not match.');
      return;
    }

    setButtonLoading(button, true, 'Creating account…');
    try {
      const { response, body } = await apiRequest('/register', 'POST', {
        fullName,
        email,
        password,
      });
      if (!response.ok) {
        setMessage(message, validationMessage(body, 'Unable to create your account.'));
        return;
      }
      window.location.replace('/login?registered=1');
    } catch {
      setMessage(message, 'We could not reach the service. Check your connection and try again.');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

function initializeLogin() {
  const form = document.querySelector('#login-form');
  const message = document.querySelector('[data-message]');
  const button = form?.querySelector('[data-submit-button]');
  if (!form || !button) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === '1') {
    setMessage(message, 'Your account is ready. Sign in to continue.', 'success');
  } else if (params.get('expired') === '1') {
    setMessage(message, 'Your session has ended. Please sign in again.');
  } else if (params.get('account') === 'deleted') {
    setMessage(message, 'That account is no longer available. Register to create a new one.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    clearMessage(message);

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!form.elements.email.validity.valid || !password) {
      setMessage(message, 'Enter a valid email address and password.');
      return;
    }

    setButtonLoading(button, true, 'Signing in…');
    try {
      const { response, body } = await apiRequest('/login', 'POST', { email, password });
      if (!response.ok) {
        setMessage(message, validationMessage(body, 'Unable to sign in.'));
        return;
      }
      if (typeof body?.data?.token !== 'string' || !body.data.token) {
        setMessage(message, 'The server did not return a valid sign-in session.');
        return;
      }
      try {
        sessionStorage.setItem(TOKEN_KEY, body.data.token);
      } catch {
        setMessage(message, 'This browser could not store your session. Check its storage settings and try again.');
        return;
      }
      window.location.replace('/dashboard');
    } catch {
      setMessage(message, 'We could not reach the service. Check your connection and try again.');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

async function loadDashboard() {
  const message = document.querySelector('[data-dashboard-message]');
  try {
    const { response, body } = await apiRequest('/profile', 'GET', undefined, getToken());
    if (response.status === 401) {
      redirectForUnauthorized();
      return;
    }
    if (response.status === 404) {
      clearToken();
      window.location.replace('/login?account=deleted');
      return;
    }
    if (!response.ok) {
      setInlineMessage(message, body?.message || 'Unable to load your profile.');
      return;
    }

    const user = body?.data;
    if (!user || typeof user.fullName !== 'string' || typeof user.email !== 'string') {
      setInlineMessage(message, 'The server returned incomplete profile information.');
      return;
    }
    document.querySelector('#welcome-name').textContent = user.fullName;
    document.querySelector('#dashboard-full-name').textContent = user.fullName;
    document.querySelector('#dashboard-email').textContent = user.email;
    document.querySelector('#dashboard-created').textContent = formatDate(user.createdAt);
  } catch {
    setInlineMessage(message, 'We could not reach the service. Refresh to try again.');
  }
}

function initializeProfile() {
  const form = document.querySelector('#profile-form');
  const saveButton = form?.querySelector('[data-submit-button]');
  const message = document.querySelector('[data-profile-message]');
  const deleteButton = document.querySelector('[data-delete-account]');
  const deleteMessage = document.querySelector('[data-delete-message]');
  if (!form || !saveButton || !deleteButton) return;

  loadProfile(form, saveButton, message);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saveButton.disabled) return;
    clearMessage(message);

    const fullName = form.elements.fullName.value.trim();
    const email = form.elements.email.value.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      setMessage(message, 'Full name must be between 2 and 100 characters.');
      return;
    }
    if (!form.elements.email.validity.valid) {
      setMessage(message, 'Enter a valid email address.');
      return;
    }

    setButtonLoading(saveButton, true, 'Saving changes…');
    try {
      const { response, body } = await apiRequest('/profile', 'PUT', { fullName, email }, getToken());
      if (response.status === 401) {
        redirectForUnauthorized();
        return;
      }
      if (response.status === 404) {
        clearToken();
        window.location.replace('/login?account=deleted');
        return;
      }
      if (!response.ok) {
        setMessage(message, validationMessage(body, 'Unable to save your profile.'));
        return;
      }

      form.elements.fullName.value = body.data.fullName;
      form.elements.email.value = body.data.email;
      setMessage(message, 'Your profile has been updated.', 'success');
    } catch {
      setMessage(message, 'We could not reach the service. Check your connection and try again.');
    } finally {
      setButtonLoading(saveButton, false);
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (deleteButton.disabled) return;
    const confirmed = window.confirm('Delete your account permanently? This action cannot be undone.');
    if (!confirmed) return;

    clearMessage(deleteMessage);
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting…';
    try {
      const { response, body } = await apiRequest('/profile', 'DELETE', undefined, getToken());
      if (response.status === 401) {
        redirectForUnauthorized();
        return;
      }
      if (!response.ok) {
        if (response.status === 404) {
          clearToken();
          window.location.replace('/register?deleted=1');
          return;
        }
        setInlineMessage(deleteMessage, body?.message || 'Unable to delete your account.');
        return;
      }
      clearToken();
      window.location.replace('/register?deleted=1');
    } catch {
      setInlineMessage(deleteMessage, 'We could not reach the service. Check your connection and try again.');
    } finally {
      deleteButton.disabled = false;
      deleteButton.textContent = 'Delete account';
    }
  });
}

async function loadProfile(form, saveButton, message) {
  try {
    const { response, body } = await apiRequest('/profile', 'GET', undefined, getToken());
    if (response.status === 401) {
      redirectForUnauthorized();
      return;
    }
    if (response.status === 404) {
      clearToken();
      window.location.replace('/login?account=deleted');
      return;
    }
    if (!response.ok) {
      setMessage(message, body?.message || 'Unable to load your profile.');
      return;
    }

    const user = body?.data;
    if (!user || typeof user.fullName !== 'string' || typeof user.email !== 'string' || typeof user.id !== 'string') {
      setMessage(message, 'The server returned incomplete profile information.');
      return;
    }
    form.elements.fullName.value = user.fullName;
    form.elements.email.value = user.email;
    document.querySelector('#profile-user-id').textContent = user.id;
    form.elements.fullName.disabled = false;
    form.elements.email.disabled = false;
    saveButton.disabled = false;
  } catch {
    setMessage(message, 'We could not reach the service. Refresh to try again.');
  }
}
