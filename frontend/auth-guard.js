(function () {
  const API_BASE_URL = 'http://localhost:8000';
  const LOGIN_PAGE = '/medsync-login.html';

  function redirectToLogin() {
    localStorage.removeItem('current_user');
    window.location.href = LOGIN_PAGE;
  }

  async function checkAuth() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
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

  window.authGuard = {
    logout: async function () {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (err) {
        // Ignore network errors -- log out locally regardless.
      }
      redirectToLogin();
    },
    getCsrfToken: getCsrfToken, // for other pages to attach to POST/PUT/PATCH/DELETE calls
  };
})();