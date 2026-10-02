import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const handleConfirmLogout = () => {
    logout();
    setIsLoggedOut(true);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#007bb9] px-6 py-10 text-[#0F172A] antialiased">
      <div className="absolute -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-[#006194]" />
      <div className="absolute -bottom-80 -right-32 h-[640px] w-[640px] rounded-full bg-[#0F172A] opacity-90" />
      <div className="absolute bottom-[-140px] left-[20%] h-[360px] w-[360px] rounded-full bg-[#38BDF8] opacity-55" />

      <div className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[32px] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-center bg-gradient-to-br from-[#38BDF8] via-[#007bb9] to-[#006194] px-6 py-8">
          <img
            alt="MedSync Logo"
            className="h-28 w-28 rounded-full border-4 border-white object-cover object-center shadow-lg"
            src="/logo.jpg"
          />
        </div>

        <div className="px-8 py-10 text-center">
          {isLoggedOut ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#E0F2FE]">
                <span className="material-symbols-outlined text-4xl text-[#0284C7]">
                  check_circle
                </span>
              </div>
              
              <h2 className="mb-3 text-3xl font-extrabold text-[#0F172A]">Logged Out</h2>
              <p className="mb-8 text-sm text-[#707881]">
                You have been successfully logged out of your MedSync account. Have a great day!
              </p>

              <button
                onClick={() => navigate('/login', { replace: true })}
                className="h-[50px] w-full rounded-full bg-gradient-to-r from-[#006194] to-[#38BDF8] text-base font-bold text-white shadow-[0_10px_22px_rgba(0,97,148,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(0,97,148,0.36)]"
              >
                Login Again
              </button>
            </>
          ) : (
            <>
              <p className="mb-8 text-sm text-[#707881]">
                Are you sure you want to log out of your account? You will need to log in again to access the portal.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmLogout}
                  className="h-[50px] w-full rounded-full bg-rose-500 text-base font-bold text-white shadow-[0_10px_22px_rgba(244,63,94,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(244,63,94,0.36)]"
                >
                  Yes, Log Out
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="h-[50px] w-full rounded-full border-2 border-[#E2E8F0] bg-white text-base font-bold text-[#0F172A] transition hover:-translate-y-0.5 hover:bg-[#F8FAFC]"
                >
                  No, Go Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logout;