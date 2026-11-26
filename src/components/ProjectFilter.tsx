import { useEffect, useRef, useState } from "react";
import type { Project } from "../server/todoist";
import { colorHex, orderedProjects } from "../lib";

type Props = {
  projects: Map<string, Project>;
  hidden: string[];
  onChange: (hidden: string[]) => void;
};

export function ProjectFilter({ projects, hidden, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = orderedProjects(projects);
  const hiddenSet = new Set(hidden);
  const shownCount = list.filter(
    ({ project }) => !hiddenSet.has(project.id),
  ).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(hiddenSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };
  const only = (id: string) =>
    onChange(list.map(({ project }) => project.id).filter((x) => x !== id));

  return (
    <div className="pfilter" ref={ref}>
      <button
        className={["toggle", hidden.length > 0 && "is-active"]
          .filter(Boolean)
          .join(" ")}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Projects {hidden.length > 0 ? `${shownCount}/${list.length}` : ""} ▾
      </button>
      {open && (
        <div className="pfilter__menu" role="menu">
          <div className="pfilter__actions">
            <button onClick={() => onChange([])}>All</button>
            <button
              onClick={() => onChange(list.map(({ project }) => project.id))}
            >
              None
            </button>
          </div>
          <div className="pfilter__list">
            {list.map(({ project, depth }) => (
              <label
                key={project.id}
                className="pfilter__item"
                style={{ paddingLeft: 8 + depth * 16 }}
              >
                <input
                  type="checkbox"
                  checked={!hiddenSet.has(project.id)}
                  onChange={() => toggle(project.id)}
                />
                <span
                  className="group__dot"
                  style={{ background: colorHex(project.color) }}
                />
                <span className="pfilter__name">{project.name}</span>
                <button
                  className="pfilter__only"
                  onClick={(e) => {
                    e.preventDefault();
                    only(project.id);
                  }}
                >
                  only
                </button>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
