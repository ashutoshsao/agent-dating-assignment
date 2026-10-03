import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

const nav = [
  { to: "/", label: "People", end: true },
  { to: "/dates", label: "Dates" },
  { to: "/rankings", label: "Rankings" },
];

export function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <NavLink to="/" className="font-serif text-2xl leading-none">
            Proxy<span className="text-primary">.</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
