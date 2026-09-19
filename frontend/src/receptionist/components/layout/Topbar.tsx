export default function Topbar() {
  return (
    <header id="app-topbar" className="fixed top-0 left-[260px] right-0 h-[68px] bg-surface-card/95 backdrop-blur-md border-b border-border-subtle z-40 px-space-lg flex items-center justify-between shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-space-md">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors" type="button">
          <span className="material-symbols-outlined text-[20px]">menu_open</span>
        </button>
        <div className="hidden md:flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
          <span className="text-brand-navy-deep font-headline-sm text-headline-sm">MedSync</span>
          <span className="text-outline">/</span>
          <span>Reception Desk</span>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-scheduled-bg border border-brand-teal-light/30 text-status-scheduled-text font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[14px]">apartment</span>
          <span>Colombo Central Branch</span>
        </div>
        <div className="h-5 w-px bg-border-subtle hidden lg:block"></div>
        <div className="flex items-center gap-1">
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors" type="button">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface-card"></span>
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors" type="button">
            <span className="material-symbols-outlined text-[20px]">light_mode</span>
          </button>
        </div>
        <div className="h-5 w-px bg-border-subtle"></div>
        <div className="flex items-center gap-space-sm pl-1 cursor-pointer group">
          <div className="hidden sm:flex flex-col text-right">
            <span className="font-label-md text-label-md text-brand-navy-deep leading-tight group-hover:text-primary transition-colors">Good morning, Sarah</span>
            <span className="font-body-sm text-body-sm text-outline leading-tight mt-0.5">Receptionist · Colombo Central Branch</span>
          </div>
          <div className="relative flex items-center gap-1">
            <img alt="Profile" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20" src="https://lh3.googleusercontent.com/aida/AEtjO1UPm4HIqPc1W2Y65YJx_yxzYAHERJFf3_-X65GsvCxTOQQ1inOEDRiHZEfkVkylhn-qm7fWHjIv7nF6AjefK6Qiz2lGNxehmhXjRt64nMIzQz7AEoccFb97Je4Ah1-qdXeeF36IUZBCJBRG7dvmGIaZ2QJY9jpx0W_gTQIItFWRoo1FJ6k2i5rm8Lho7aGj6nOOxKMqctzo-ieNcpglyhGz9Im7tfaCbM1ucgtaXLndm09DRHOSMR-EGp82snLCU4nOsJt9fuxooz4" />
            <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-on-surface transition-colors">expand_more</span>
          </div>
        </div>
      </div>
    </header>
  );
}
