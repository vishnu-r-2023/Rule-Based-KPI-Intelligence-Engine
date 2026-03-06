import { memo } from "react";
import { useTheme } from "../../context/ThemeContext";

function ThemeToggle({ variant = "default" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggleTheme}
      className={`flex items-center justify-center rounded-full transition-all hover:-translate-y-0.5 ${
        variant === "topbar"
          ? "topbar-icon-btn h-11 w-11"
          : "glass-card h-11 w-11 text-slate-600 hover:text-primary dark:text-slate-300"
      }`}
    >
      <span className="material-symbols-outlined text-xl">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}

export default memo(ThemeToggle);
