import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid email or password.');
      }

      const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        credentials: 'include',
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();
        localStorage.setItem('current_user', JSON.stringify(userData));
      }

      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      const message = loginError instanceof Error 
        ? loginError.message 
        : 'Unable to connect to the server. Please try again later.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#007bb9] px-6 py-10 text-[#0F172A] antialiased">
      <div className="absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-[#006194]" />
      <div className="absolute -bottom-80 -right-32 h-[640px] w-[640px] rounded-full bg-[#0F172A] opacity-90" />
      <div className="absolute bottom-[-140px] left-[20%] h-[360px] w-[360px] rounded-full bg-[#38BDF8] opacity-55" />

      <div className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[32px] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-center bg-gradient-to-br from-[#38BDF8] via-[#007bb9] to-[#006194] px-6 py-8">
          <img
            alt="Smiling nurse in scrubs with a stethoscope"
            className="h-28 w-28 rounded-full border-4 border-white object-cover object-center shadow-lg"
            src="https://images.presentationgo.com/2025/07/female-nurse-blue-scrubs.jpg"
          />
        </div>

        <div className="px-8 py-8">
          <h2 className="mb-2 text-center text-3xl font-extrabold text-[#0F172A]">Welcome Back!</h2>
          <p className="mb-6 text-center text-sm text-[#707881]">Enter your username and password.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#707881]">
                person
              </span>
              <input
                id="username"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter Username"
                autoComplete="username"
                required
                className="h-12 w-full rounded-full border border-[#E2E8F0] bg-[#F1F5F9] pl-11 pr-4 text-sm text-[#0F172A] placeholder:text-[#707881] focus:border-[#0284C7] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0284C7]/15"
              />
            </div>

            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#707881]">
                lock
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter Password"
                autoComplete="current-password"
                required
                className="h-12 w-full rounded-full border border-[#E2E8F0] bg-[#F1F5F9] pl-11 pr-4 text-sm text-[#0F172A] placeholder:text-[#707881] focus:border-[#0284C7] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0284C7]/15"
              />
            </div>

            <div className="text-right">
              <a href="#" className="text-xs font-medium text-[#0F172A] no-underline hover:underline">
                Forget Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[50px] w-full rounded-full bg-gradient-to-r from-[#006194] to-[#38BDF8] text-base font-bold text-white shadow-[0_10px_22px_rgba(0,97,148,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(0,97,148,0.36)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
