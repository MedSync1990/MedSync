export default function HelpCenter() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-lg px-space-sm py-space-lg md:px-space-md">
      <header>
        <h1 className="font-display-lg text-display-lg text-brand-navy-deep">Help Center</h1>
        <p className="mt-1 font-body-md text-on-surface-variant">
          Quick guidance for common MedSync tasks and urgent support.
        </p>
      </header>

      <section
        aria-labelledby="emergency-title"
        className="flex flex-col gap-4 rounded-xl border border-rose-300 bg-rose-50 p-space-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-rose-700" aria-hidden="true">
            emergency
          </span>
          <div>
            <h2 id="emergency-title" className="font-headline-sm text-rose-900">Medical emergency?</h2>
            <p className="mt-1 text-sm text-rose-900">Call 1990 for ambulance assistance in Sri Lanka.</p>
          </div>
        </div>
        <a
          href="tel:1990"
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-rose-700 px-4 font-semibold text-white hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 sm:self-auto"
          aria-label="Call the 1990 ambulance service"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">call</span>
          Call 1990
        </a>
      </section>

      <section aria-labelledby="about-help-title" className="max-w-3xl">
        <h2 id="about-help-title" className="font-headline-md text-brand-navy-deep">How we can help</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          MedSync brings patient records, appointments, consultations, and billing together in one place. Use the sidebar to find the tools available to your role, or contact our support team for help with your account or the application.
        </p>
      </section>

      <aside className="flex items-start gap-3 border-t border-border-subtle pt-space-md">
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">lock</span>
        <p className="text-sm leading-6 text-on-surface-variant">
          Confirm the patient&apos;s identity before changing a record. Never share your sign-in, and log out on shared devices.
        </p>
      </aside>

      <section aria-labelledby="contact-title" className="border-t border-border-subtle pt-space-md">
        <h2 id="contact-title" className="font-headline-sm text-brand-navy-deep">Contact support</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
          <a className="inline-flex items-center gap-2 text-primary hover:underline" href="mailto:hello@medsync.com">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>
            hello@medsync.com
          </a>
          <a className="inline-flex items-center gap-2 text-primary hover:underline" href="tel:+94771234321">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
            +94771234321
          </a>
        </div>
      </section>
    </div>
  );
}