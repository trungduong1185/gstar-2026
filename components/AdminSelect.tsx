"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export function AdminSelect({ name, label, options, value, onChange, labels = {} }: { name: string; label: string; options: readonly string[]; value: string; onChange: (value: string) => void; labels?: Readonly<Record<string, string>> }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.indexOf(value)));
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(option: string) { onChange(option); setActive(options.indexOf(option)); setOpen(false); }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + direction + options.length) % options.length;
      setActive(next); setOpen(true);
    }
    if ((event.key === "Enter" || event.key === " ") && open) { event.preventDefault(); choose(options[active]); }
  }

  return <div className={`admin-select${open ? " is-open" : ""}`} ref={root}>
    <span className="admin-select__label">{label}</span>
    <input type="hidden" name={name} value={value} />
    <button type="button" className="admin-select__trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((current) => !current)} onKeyDown={keyboard}><span>{labels[value] || value}</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button>
    {open && <div className="admin-select__menu" id={listId} role="listbox" aria-label={label}>{options.map((option, index) => <button type="button" role="option" aria-selected={option === value} className={`${option === value ? "is-selected " : ""}${index === active ? "is-active" : ""}`} key={option} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}><span>{labels[option] || option}</span>{option === value && <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg>}</button>)}</div>}
  </div>;
}
