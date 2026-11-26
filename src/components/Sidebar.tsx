import { useEffect, useMemo, useState } from "react";
import type { Project, Section, Task } from "../server/todoist";
import { colorHex, orderedProjects } from "../lib";
import { Droppable } from "./Droppable";
import { TaskCard } from "./TaskCard";

type Props = {
  tasks: Task[];
  projects: Map<string, Project>;
  sections: Section[];
};

type Group = {
  project: Project | undefined;
  path: string;
  loose: Task[];
  sections: { section: Section; tasks: Task[] }[];
  count: number;
};

function buildGroups(
  tasks: Task[],
  projects: Map<string, Project>,
  sections: Section[],
) {
  const byProject = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!byProject.has(t.project_id)) byProject.set(t.project_id, []);
    byProject.get(t.project_id)!.push(t);
  }
  const sectionsByProject = new Map<string, Section[]>();
  for (const s of sections) {
    if (!sectionsByProject.has(s.project_id))
      sectionsByProject.set(s.project_id, []);
    sectionsByProject.get(s.project_id)!.push(s);
  }
  const byOrder = (a: Task, b: Task) => a.child_order - b.child_order;

  const make = (
    project: Project | undefined,
    path: string,
    list: Task[],
  ): Group => {
    const secs = (project ? (sectionsByProject.get(project.id) ?? []) : [])
      .slice()
      .sort((a, b) => a.section_order - b.section_order);
    const known = new Set(secs.map((s) => s.id));
    return {
      project,
      path,
      loose: list
        .filter((t) => !t.section_id || !known.has(t.section_id))
        .sort(byOrder),
      sections: secs
        .map((section) => ({
          section,
          tasks: list.filter((t) => t.section_id === section.id).sort(byOrder),
        }))
        .filter((s) => s.tasks.length),
      count: list.length,
    };
  };

  const groups: Group[] = [];
  for (const { project, path } of orderedProjects(projects)) {
    const list = byProject.get(project.id);
    if (list?.length) groups.push(make(project, path, list));
    byProject.delete(project.id);
  }
  const orphans = [...byProject.values()].flat();
  if (orphans.length) groups.push(make(undefined, "Other", orphans));
  return groups;
}

const COLLAPSED_KEY = "sidebar-collapsed";

export function Sidebar({ tasks, projects, sections }: Props) {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved) setCollapsed(new Set(JSON.parse(saved)));
    } catch {}
  }, []);
  const needle = q.trim().toLowerCase();
  const sectionName = useMemo(
    () => new Map(sections.map((s) => [s.id, s.name])),
    [sections],
  );

  const shown = needle
    ? tasks.filter((t) =>
        [
          t.content,
          projects.get(t.project_id)?.name,
          t.section_id && sectionName.get(t.section_id),
        ].some((v) => v && v.toLowerCase().includes(needle)),
      )
    : tasks;
  const groups = useMemo(
    () => buildGroups(shown, projects, sections),
    [shown, projects, sections],
  );

  const update = (fn: (next: Set<string>) => void) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      fn(next);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  const toggle = (key: string) =>
    update((next) => (next.has(key) ? next.delete(key) : next.add(key)));

  const sectionKeys = groups.flatMap((g) =>
    g.sections.map(({ section }) => `s:${section.id}`),
  );
  const allSectionsCollapsed =
    sectionKeys.length > 0 && sectionKeys.every((k) => collapsed.has(k));
  const toggleAllSections = () =>
    update((next) =>
      sectionKeys.forEach((k) =>
        allSectionsCollapsed ? next.delete(k) : next.add(k),
      ),
    );

  const card = (t: Task) => (
    <TaskCard
      key={t.id}
      task={t}
      project={projects.get(t.project_id)}
      hideProject
    />
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__head">
        <h2>Unscheduled</h2>
        <span className="count">{tasks.length}</span>
        {sectionKeys.length > 0 && !needle && (
          <button className="link" onClick={toggleAllSections}>
            {allSectionsCollapsed ? "Expand sections" : "Collapse sections"}
          </button>
        )}
      </div>
      <input
        className="sidebar__search"
        placeholder="Filter tasks, projects, sections"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Droppable target={{ kind: "unscheduled" }} className="sidebar__list">
        {groups.map((g) => {
          const key = g.project?.id ?? "other";
          const open = !!needle || !collapsed.has(key);
          return (
            <section key={key} className="group">
              <button
                className="group__head"
                onClick={() => toggle(key)}
                aria-expanded={open}
              >
                <span className="group__chevron">{open ? "▾" : "▸"}</span>
                <span
                  className="group__dot"
                  style={{ background: colorHex(g.project?.color) }}
                />
                <span className="group__name">{g.path}</span>
                <span className="count">{g.count}</span>
              </button>
              {open && (
                <div className="group__body">
                  {g.loose.map(card)}
                  {g.sections.map(({ section, tasks }) => {
                    const sKey = `s:${section.id}`;
                    const sOpen = !!needle || !collapsed.has(sKey);
                    return (
                      <div key={section.id} className="group__section">
                        <button
                          className="group__section-name"
                          onClick={() => toggle(sKey)}
                          aria-expanded={sOpen}
                        >
                          <span className="group__chevron">
                            {sOpen ? "▾" : "▸"}
                          </span>
                          <span className="group__name">{section.name}</span>
                          <span className="count">{tasks.length}</span>
                        </button>
                        {sOpen && tasks.map(card)}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {groups.length === 0 && (
          <p className="empty">Drop here to clear a due date.</p>
        )}
      </Droppable>
    </aside>
  );
}
