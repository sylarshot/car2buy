import { type PropsWithChildren } from "react";

export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={[
        "rounded-2xl border border-black/10 bg-white p-5 shadow-sm",
        "dark:border-white/10 dark:bg-zinc-950",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function FieldLabel({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={[
        "text-sm font-medium text-zinc-900 dark:text-zinc-100",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function Hint({ children }: PropsWithChildren) {
  return <div className="text-xs text-zinc-500 dark:text-zinc-400">{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-zinc-900 outline-none",
        "focus:ring-2 focus:ring-zinc-900/10",
        "dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-white/10",
        className,
      ].join(" ")}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-zinc-900 outline-none",
        "focus:ring-2 focus:ring-zinc-900/10",
        "dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-white/10",
        className,
      ].join(" ")}
    />
  );
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
) {
  const { className = "", variant = "primary", ...rest } = props;
  const base =
    "h-10 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      : variant === "secondary"
        ? "border border-black/10 bg-white text-zinc-900 hover:bg-black/[.04] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-white/10"
        : "text-zinc-900 hover:bg-black/[.04] dark:text-zinc-100 dark:hover:bg-white/10";
  return <button {...rest} className={[base, styles, className].join(" ")} />;
}

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/[.06] px-2.5 py-1 text-xs font-medium text-zinc-900 dark:bg-white/10 dark:text-zinc-100">
      {children}
    </span>
  );
}

