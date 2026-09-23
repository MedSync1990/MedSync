import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    const clockEl = document.getElementById('current-clock');
    if (clockEl) {
      const updateDeskClock = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        clockEl.textContent = timeString;
      };

      updateDeskClock();
      const intervalId = window.setInterval(updateDeskClock, 30000);
      return () => window.clearInterval(intervalId);
    }
  }, []);

  useEffect(() => {
    const sidebar = document.getElementById('app-sidebar');
    const shell = document.getElementById('app-shell');
    const topbar = document.getElementById('app-topbar');
    const btn = document.getElementById('sidebar-toggle-btn');

    if (!sidebar || !shell || !topbar || !btn) return;

    const EXPANDED = 260;
    const COLLAPSED = 72;
    let manual: 'expanded' | 'collapsed' | null = null;

    const isAutoCollapsedNow = () => window.matchMedia('(max-width: 1023px)').matches;

    const apply = () => {
      if (manual === null) {
        sidebar.style.width = '';
        shell.style.paddingLeft = '';
        topbar.style.left = '';
        sidebar.classList.remove('is-icon-only', 'is-expanded');
        btn.setAttribute('aria-pressed', String(isAutoCollapsedNow()));
        return;
      }

      const collapsed = manual === 'collapsed';
      const width = collapsed ? COLLAPSED : EXPANDED;
      sidebar.style.width = `${width}px`;
      shell.style.paddingLeft = `${width}px`;
      topbar.style.left = `${width}px`;
      sidebar.classList.toggle('is-icon-only', collapsed);
      sidebar.classList.toggle('is-expanded', !collapsed);
      btn.setAttribute('aria-pressed', String(collapsed));
    };

    btn.addEventListener('click', () => {
      const currentlyCollapsed = manual === 'collapsed' || (manual === null && isAutoCollapsedNow());
      manual = currentlyCollapsed ? 'expanded' : 'collapsed';
      apply();
    });

    apply();

    return () => {
      btn.removeEventListener('click', () => undefined);
    };
  }, []);

  useEffect(() => {
    const btn = document.getElementById('sync-queue-btn');
    const icon = document.getElementById('sync-icon');
    const countEl = document.getElementById('queue-count');
    const liveRegion = document.getElementById('queue-live-region');

    if (!btn || !countEl || !liveRegion || !icon) return;

    const handleSync = () => {
      icon.classList.add('animate-spin');
      btn.setAttribute('disabled', 'true');

      window.setTimeout(() => {
        const waiting = Math.floor(Math.random() * 8) + 1;
        countEl.textContent = `${waiting} waiting`;
        liveRegion.textContent = `Queue synced: ${waiting} patient${waiting === 1 ? '' : 's'} currently waiting.`;
        icon.classList.remove('animate-spin');
        btn.removeAttribute('disabled');
      }, 700);
    };

    btn.addEventListener('click', handleSync);
    return () => btn.removeEventListener('click', handleSync);
  }, []);

  return (
    <div className="min-h-screen bg-[#E9EEF5] text-[#0b1c30] antialiased">
      <style>{`
        @layer base {
          html, body { margin: 0; padding: 0; }
          body { overscroll-behavior: none; }
          main > :first-child { margin-top: 0 !important; }
          main > :last-child { margin-bottom: 0 !important; }
        }
        ::-webkit-scrollbar { display: none; }
        :focus-visible { outline: 2px solid #0284C7; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
        .content-shell { box-shadow: inset 1px 0 0 rgba(15, 23, 42, 0.06); }
        .topbar-shell { transition: box-shadow 150ms ease; }
        #app-sidebar { width: 260px; transition: width 200ms ease; }
        #app-shell { padding-left: 260px; transition: padding-left 200ms ease; }
        #app-topbar { left: 260px; transition: left 200ms ease; }
        @media (max-width: 1023px) {
          #app-sidebar { width: 72px; }
          #app-shell { padding-left: 72px; }
          #app-topbar { left: 72px; }
          #app-sidebar .sidebar-text,
          #app-sidebar .sidebar-group-label { display: none; }
        }
        #app-sidebar.is-icon-only .sidebar-text,
        #app-sidebar.is-icon-only .sidebar-group-label { display: none; }
        #app-sidebar.is-expanded .sidebar-text,
        #app-sidebar.is-expanded .sidebar-group-label { display: block !important; }
      `}</style>

      <aside id="app-sidebar" className="fixed left-0 top-0 z-50 flex h-full flex-col justify-between overflow-hidden bg-[#0F172A] shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#38BDF8]">
              <span className="material-symbols-outlined text-[22px]">local_hospital</span>
            </div>
            <div className="sidebar-text flex flex-col">
              <span className="text-[18px] font-semibold text-white">MedSync</span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-white/50">Healthcare System</span>
            </div>
          </div>

          <div className="flex-1 p-4">
            <div className="mb-6">
              <nav className="space-y-1" aria-label="Primary">
                <a href="#" aria-current="page" className="relative flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[#38BDF8]">
                  <span className="material-symbols-outlined text-[20px] text-[#38BDF8]">dashboard</span>
                  <span className="sidebar-text">Dashboard</span>
                </a>
              </nav>
            </div>

            <div className="mb-6">
              <div className="sidebar-group-label mb-2 px-4 text-[12px] uppercase tracking-wider text-white/40">Patients</div>
              <nav className="space-y-1" aria-label="Patients">
                <a href="#" className="group flex h-10 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-white">person_add</span>
                  <span className="sidebar-text">Register Patient</span>
                </a>
                <a href="#" className="group flex h-10 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-white">contact_page</span>
                  <span className="sidebar-text">Patient Directory</span>
                </a>
              </nav>
            </div>

            <div className="mb-6">
              <div className="sidebar-group-label mb-2 px-4 text-[12px] uppercase tracking-wider text-white/40">Appointments</div>
              <nav className="space-y-1" aria-label="Appointments">
                <a href="#" className="group flex h-10 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-white">event_available</span>
                  <span className="sidebar-text">Book Appointment</span>
                </a>
                <a href="#" className="group flex h-10 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-white">calendar_month</span>
                  <span className="sidebar-text">Manage Appointments</span>
                </a>
              </nav>
            </div>

            <div className="mb-6">
              <div className="sidebar-group-label mb-2 px-4 text-[12px] uppercase tracking-wider text-white/40">Billing &amp; Payments</div>
              <nav className="space-y-1" aria-label="Billing and payments">
                <a href="#" className="group flex h-10 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-white">receipt_long</span>
                  <span className="sidebar-text">Invoices</span>
                </a>
                <a href="#" className="group flex h-10 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-white">payments</span>
                  <span className="sidebar-text">Collect Payment</span>
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0F172A] p-4">
          <nav className="space-y-1" aria-label="Account">
            <a href="#" className="group flex h-9 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
              <span className="material-symbols-outlined text-[18px] text-white/50 group-hover:text-white">settings</span>
              <span className="sidebar-text">Settings</span>
            </a>
            <a href="#" className="group flex h-9 items-center gap-2 rounded-lg px-4 text-white/70 transition-all hover:bg-white/10 hover:text-white">
              <span className="material-symbols-outlined text-[18px] text-white/50 group-hover:text-white">help</span>
              <span className="sidebar-text">Help Center</span>
            </a>
            <a href="#" className="group flex h-9 items-center gap-2 rounded-lg px-4 text-rose-300 transition-all hover:bg-rose-500/10 hover:text-rose-200">
              <span className="material-symbols-outlined text-[18px] text-rose-300">logout</span>
              <span className="sidebar-text">Logout</span>
            </a>
          </nav>
        </div>
      </aside>

      <div id="app-shell">
        <header id="app-topbar" className="topbar-shell fixed right-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-6 backdrop-blur-md shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-4">
            <button id="sidebar-toggle-btn" type="button" aria-label="Toggle sidebar" aria-pressed="false" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#3f4850] transition-colors hover:bg-[#F1F5F9] hover:text-[#0b1c30]">
              <span className="material-symbols-outlined text-[20px]">menu_open</span>
            </button>
            <div className="hidden items-center gap-2 text-[#3f4850] md:flex">
              <span className="text-[18px] font-semibold text-[#0F172A]">MedSync</span>
              <span className="text-[#707881]">/</span>
              <span>Reception Desk</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-1.5 rounded-full border border-[#38BDF8]/30 bg-[#E0F2FE] px-3 py-1 text-[14px] font-semibold text-[#0369A1] lg:flex">
              <span className="material-symbols-outlined text-[14px]">apartment</span>
              <span>Colombo Central Branch</span>
            </div>
            <div className="hidden h-5 w-px bg-[#E2E8F0] lg:block" />
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Notifications, 1 unread" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#3f4850] transition-colors hover:bg-[#F1F5F9] hover:text-[#0b1c30]">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Toggle theme" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#3f4850] transition-colors hover:bg-[#F1F5F9] hover:text-[#0b1c30]">
                <span className="material-symbols-outlined text-[20px]">light_mode</span>
              </button>
            </div>
            <div className="h-5 w-px bg-[#E2E8F0]" />
            <div className="group flex items-center gap-3 pl-1">
              <div className="hidden flex-col text-right sm:flex">
                <span className="text-[16px] font-semibold text-[#0F172A] group-hover:text-[#006194]">Good morning, Sarah</span>
                <span className="mt-0.5 text-[14px] text-[#707881]">Receptionist · Colombo Central Branch</span>
              </div>
              <div className="relative flex items-center gap-1">
                <img alt="Profile photo of Sarah" className="h-8 w-8 rounded-full object-cover ring-2 ring-[#006194]/20" src="https://lh3.googleusercontent.com/aida/AEtjO1UPm4HIqPc1W2Y65YJx_yxzYAHERJFf3_-X65GsvCxTOQQ1inOEDRiHZEfkVkylhn-qm7fWHjIv7nF6AjefK6Qiz2lGNxehmhXjRt64nMIzQz7AEoccFb97Je4Ah1-qdXeeF36IUZBCJBRG7dvmGIaZ2QJY9jpx0W_gTQIItFWRoo1FJ6k2i5rm8Lho7aGj6nOOxKMqctzo-ieNcpglyhGz9Im7tfaCbM1ucgtaXLndm09DRHOSMR-EGp82snLCU4nOsJt9fuxooz4" />
                <span className="material-symbols-outlined text-[18px] text-[#707881] group-hover:text-[#0b1c30]">expand_more</span>
              </div>
            </div>
          </div>
        </header>

        <main className="content-shell relative min-h-screen w-full bg-[#E9EEF5] pt-[68px]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col space-y-6 px-4 py-6 md:px-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-[30px] font-semibold tracking-tight text-[#0F172A] md:text-[34px]">Good morning, Sarah</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-[14px] font-semibold text-[#047857]">
                    <span className="h-2 w-2 rounded-full bg-[#047857]" aria-hidden="true" />
                    Front Desk Active
                  </span>
                </div>
                <p className="flex items-center gap-2 text-[18px] text-[#3f4850]">
                  <span className="material-symbols-outlined text-[18px] text-[#006194]">location_on</span>
                  Colombo Central Branch · Receptionist Desk (Counter 02)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center rounded-xl bg-white px-3.5 py-2 text-[16px] text-[#3f4850] shadow-sm sm:flex">
                  <span className="material-symbols-outlined mr-2 text-[18px] text-[#006194]">schedule</span>
                  <span>
                    Colombo Time: <strong id="current-clock" className="ml-1 font-mono text-[#0F172A]">09:42 AM</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button id="sync-queue-btn" type="button" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[18px] font-semibold text-[#0F172A] shadow-sm transition-all hover:bg-[#F1F5F9] active:scale-[0.98]">
                    <span id="sync-icon" className="material-symbols-outlined text-[18px] text-[#006194]">sync</span>
                    <span>Sync Live Queue</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E0F2FE] px-3 py-2 text-[16px] font-semibold text-[#0369A1]" id="queue-status">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    <span id="queue-count">4 waiting</span>
                  </span>
                </div>
              </div>
            </div>

            <p className="sr-only" role="status" aria-live="polite" id="queue-live-region" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" className="group flex h-36 flex-col justify-between rounded-xl bg-gradient-to-br from-[#006194] to-[#007bb9] p-5 text-left text-white shadow-md transition-shadow hover:shadow-lg">
                <div className="flex w-full items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                    <span className="material-symbols-outlined text-[24px]">event_available</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-white/80 transition-transform group-hover:translate-x-1">arrow_forward</span>
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold leading-tight">Book Appointment</h2>
                  <p className="mt-1 text-[14px] text-white/80">Schedule OPD consultation</p>
                </div>
              </button>

              <button type="button" className="group flex h-36 flex-col justify-between rounded-xl bg-white p-5 text-left text-[#0F172A] shadow-sm transition-shadow hover:shadow-md">
                <div className="flex w-full items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#006194]">
                    <span className="material-symbols-outlined text-[24px]">person_add</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[#707881] transition-all group-hover:translate-x-1 group-hover:text-[#006194]">arrow_forward</span>
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#0F172A]">Register Patient</h2>
                  <p className="mt-1 text-[14px] text-[#707881]">Intake new patient record</p>
                </div>
              </button>

              <button type="button" className="group flex h-36 flex-col justify-between rounded-xl bg-white p-5 text-left text-[#0F172A] shadow-sm transition-shadow hover:shadow-md">
                <div className="flex w-full items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
                    <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[#707881] transition-all group-hover:translate-x-1 group-hover:text-[#006194]">arrow_forward</span>
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#0F172A]">Manage Appointments</h2>
                  <p className="mt-1 text-[14px] text-[#707881]">Reschedule or cancel appointments</p>
                </div>
              </button>

              <button type="button" className="group flex h-36 flex-col justify-between rounded-xl bg-white p-5 text-left text-[#0F172A] shadow-sm transition-shadow hover:shadow-md">
                <div className="flex w-full items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#047857]">
                    <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[#707881] transition-all group-hover:translate-x-1 group-hover:text-[#006194]">arrow_forward</span>
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#0F172A]">Collect Payment</h2>
                  <p className="mt-1 text-[14px] text-[#707881]">Record invoice counter settlement</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-7">
                <div>
                  <h2 className="text-[24px] font-bold text-[#0F172A]">Find a Patient</h2>
                  <p className="mt-1 text-[14px] text-[#707881]">Look up a record to check in, book, or take payment</p>
                </div>

                <label htmlFor="patient-lookup" className="relative mt-4 block">
                  <span className="sr-only">Enter NIC or Name</span>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#707881]">search</span>
                  <input id="patient-lookup" type="text" placeholder="Enter NIC or Name" className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] pl-10 pr-4 text-[18px] text-[#0F172A] placeholder:text-[#707881] focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20" />
                </label>

                <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] bg-[#F1F5F9]/40 px-4 py-8 text-center">
                  <span className="material-symbols-outlined mb-2 text-[32px] text-[#707881]">person_search</span>
                  <p className="text-[18px] font-semibold text-[#0F172A]">No patient selected yet</p>
                  <p className="mt-1 max-w-xs text-[14px] text-[#707881]">Search by NIC or name above to pull up a record, or register a new patient if this is their first visit.</p>
                  <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#006194] px-4 py-2 text-[18px] font-semibold text-[#006194] transition-colors hover:bg-[#E0F2FE]">
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Register Patient
                  </button>
                </div>
              </section>

              <aside className="rounded-xl bg-white p-5 shadow-sm lg:col-span-5">
                <div>
                  <h2 className="text-[18px] font-bold text-[#0F172A]">Desk Shortcuts</h2>
                  <p className="mt-1 text-[14px] text-[#707881]">Common tasks for Counter 02</p>
                </div>

                <ul className="mt-4 flex flex-col divide-y divide-[#E2E8F0]">
                  <li>
                    <a href="#" className="group flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0369A1]">
                        <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[18px] font-semibold text-[#0F172A] group-hover:text-[#006194]">View today&apos;s schedule</p>
                        <p className="text-[14px] text-[#707881]">Full appointment list by clinic and time</p>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-[#707881] transition-all group-hover:translate-x-0.5 group-hover:text-[#006194]">chevron_right</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="group flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[18px] font-semibold text-[#0F172A] group-hover:text-[#006194]">Open pending invoices</p>
                        <p className="text-[14px] text-[#707881]">Settle outstanding balances at the counter</p>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-[#707881] transition-all group-hover:translate-x-0.5 group-hover:text-[#006194]">chevron_right</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="group flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D1FAE5] text-[#047857]">
                        <span className="material-symbols-outlined text-[18px]">contact_page</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[18px] font-semibold text-[#0F172A] group-hover:text-[#006194]">Browse patient directory</p>
                        <p className="text-[14px] text-[#707881]">Search all registered patients</p>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-[#707881] transition-all group-hover:translate-x-0.5 group-hover:text-[#006194]">chevron_right</span>
                    </a>
                  </li>
                </ul>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
