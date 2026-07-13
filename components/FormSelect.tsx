"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

export function FormSelect({ name, label, options, value, placeholder, onChange, invalid = false, error = "" }: {
  name: string;
  label: string;
  options: readonly Option[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(index: number) {
    onChange(options[index].value);
    setActive(index);
    setOpen(false);
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + direction + options.length) % options.length);
      setOpen(true);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : options.length - 1);
      setOpen(true);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(active);
    }
  }

  return <div className={`form-select${open ? " is-open" : ""}${invalid ? " is-invalid" : ""}`} ref={root}>
    <span className="form-select__label" id={labelId}>{label}</span>
    <input type="hidden" name={name} value={value}/>
    <button type="button" className="form-select__trigger" aria-labelledby={`${labelId} ${listId}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-invalid={invalid} aria-describedby={error ? `${listId}-error` : undefined} onClick={()=>setOpen((current)=>!current)} onKeyDown={keyboard}>
      <span id={`${listId}-value`} className={selected ? "" : "is-placeholder"}>{selected?.label || placeholder}</span>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>
    </button>
    {open && <div className="form-select__menu" id={listId} role="listbox" aria-labelledby={labelId}>
      {options.map((option,index)=><button type="button" role="option" aria-selected={option.value===value} className={`${option.value===value?"is-selected ":""}${index===active?"is-active":""}`} key={option.value} onMouseEnter={()=>setActive(index)} onClick={()=>choose(index)}>
        <span>{option.label}</span>{option.value===value&&<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4.5 10 3.5 3.5 7.5-8"/></svg>}
      </button>)}
    </div>}
    {error && <span className="apply-field-error" id={`${listId}-error`} role="alert">{error}</span>}
  </div>;
}
