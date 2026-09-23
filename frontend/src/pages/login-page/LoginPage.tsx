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
    <div className="relative min-h-screen overflow-hidden bg-[#007bb9] px-6 py-10 text-[#0F172A] antialiased">
      <div className="absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-[#006194]" />
      <div className="absolute -bottom-80 -right-32 h-[640px] w-[640px] rounded-full bg-[#0F172A] opacity-90" />
      <div className="absolute bottom-[-140px] left-[20%] h-[360px] w-[360px] rounded-full bg-[#38BDF8] opacity-55" />

      <div className="relative z-10 mx-auto grid min-h-[500px] max-w-[900px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.28)] md:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#38BDF8] via-[#007bb9] to-[#006194] md:block">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(45deg, transparent 45%, #fff 45% 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, #fff 45% 55%, transparent 55%)',
              backgroundSize: '36px 36px',
              mixBlendMode: 'overlay',
            }}
          />
          <img
            alt="Smiling nurse in scrubs with a stethoscope"
            className="absolute bottom-0 left-0 h-full w-[60%] object-cover object-center"
            src="https://images.presentationgo.com/2025/07/female-nurse-blue-scrubs.jpg"
          />
          <div className="absolute right-4 top-10 z-10 w-[52%]">
            <p className="mb-1.5 font-serif text-4xl font-bold leading-none text-[#0F172A]">&ldquo;</p>
            <h1 className="text-[22px] font-extrabold uppercase tracking-[0.01em] text-[#0F172A]">
              Putting people first in every healthcare moment
            </h1>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <h2 className="mb-1 text-center text-3xl font-extrabold text-[#0F172A]">Welcome Back!</h2>
          <p className="mb-7 text-center text-sm text-[#707881]">Enter your username and password.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#707881]">
                mail
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

            <div className="text-center">
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

          <div className="my-4 flex items-center gap-3 text-[12px] font-semibold text-[#707881] before:flex-1 before:border-t before:border-[#E2E8F0] after:flex-1 after:border-t after:border-[#E2E8F0]">
            OR
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] text-sm font-semibold text-[#0F172A] transition hover:bg-[#E2E8F0]"
            >
              <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 14 24 14c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.2 5.2-6 6.6l6.2 5.2C38.9 37.4 44 31.2 44 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] text-sm font-semibold text-[#0F172A] transition hover:bg-[#E2E8F0]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"/>
              </svg>
              Facebook
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#0F172A]">
            Don&apos;t have account?{' '}
            <a href="#" className="font-bold text-[#006194] no-underline hover:underline">
              Register Now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
