(function () {
  const API_BASE_URL = 'http://localhost:8000';
  const LOGIN_PAGE = '/medsync-login.html';

  function redirectToLogin() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    window.location.href = LOGIN_PAGE;
  }

  function decodeJwtPayload(token) {
    try {
      const payloadBase64 = token.split('.')[1];
      // JWTs use base64url -- convert to standard base64 before decoding
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (err) {
      return null;
    }
  }

  async function checkAuth() {
    const token = localStorage.getItem('access_token');

    if (!token) {
      redirectToLogin();
      return;
    }

    // Quick client-side expiry check first -- avoids a network call for
    // the common case of an obviously expired token.
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) {
      redirectToLogin();
      return;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowInSeconds) {
      redirectToLogin();
      return;
    }

    // Confirm the token is actually still valid server-side (catches
    // tampered/invalid-signature tokens a client-side check can't see),
    // and pull down fresh user info for the sidebar/shell to use.
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        redirectToLogin();
        return;
      }

      const user = await response.json();
      localStorage.setItem('current_user', JSON.stringify(user));
    } catch (err) {
      // Network/server unreachable -- don't lock the user out on a
      // temporary connectivity blip; the client-side expiry check above
      // already passed, so let them through and let subsequent API calls
      // surface a 401 if the token turns out to be genuinely bad.
    }
  }

  checkAuth();

  // Exposed globally so any page's logout button can call authGuard.logout()
  window.authGuard = {
    logout: async function () {
      const token = localStorage.getItem('access_token');
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        // Ignore network errors -- log out locally regardless.
      }
      redirectToLogin();
    },
  };
})();