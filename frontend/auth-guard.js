(function () {
  const API_BASE_URL = 'http://localhost:8000';
  const LOGIN_PAGE = '/medsync-login.html';

  function redirectToLogin() {
    sessionStorage.removeItem('current_user');
    window.location.href = LOGIN_PAGE;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function checkAuth() {
    // access_token is httpOnly -- JS can never read it, so the only way to
    // confirm the session is valid is to ask the server. The browser sends
    // the cookie automatically because of credentials: 'include'.
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        redirectToLogin();
        return;
      }

      const user = await response.json();
      // Convenience only, for things like showing the user's name later --
      // this is NOT the security boundary. The cookie is.
      sessionStorage.setItem('current_user', JSON.stringify(user));
    } catch (err) {
      redirectToLogin();
    }
  }

  checkAuth();

  // Exposed globally so any page's logout button can call authGuard.logout()
  window.authGuard = {
    logout: async function () {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': getCsrfToken() },
        });
      } catch (err) {
        // Ignore network errors -- log out locally regardless.
      }
      redirectToLogin();
    },
    getCsrfToken: getCsrfToken, // for other pages to attach to POST/PUT/PATCH/DELETE calls
  };
})();