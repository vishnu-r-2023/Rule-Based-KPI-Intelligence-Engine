function PageLoader() {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-16">
      <div className="glass-card flex items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        Loading dashboard module...
      </div>
    </div>
  );
}

export default PageLoader;
