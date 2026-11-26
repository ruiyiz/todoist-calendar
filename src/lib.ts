import {
  addDays,
  addMinutes,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Project, Task } from "./server/todoist";

export type View = "month" | "month2" | "week";

export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const WEEK_OPTS = { weekStartsOn: 1 as const };

export function visibleRange(view: View, anchor: Date) {
  if (view === "week") {
    const start = startOfWeek(anchor, WEEK_OPTS);
    return { start, end: addDays(start, 6) };
  }
  return {
    start: startOfWeek(startOfMonth(anchor), WEEK_OPTS),
    end: endOfWeek(
      endOfMonth(view === "month2" ? addMonths(anchor, 1) : anchor),
      WEEK_OPTS,
    ),
  };
}

export function daysBetween(start: Date, end: Date) {
  const out: Date[] = [];
  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function taskDateTime(t: Task): Date | null {
  return t.due?.datetime ? new Date(t.due.datetime) : null;
}

export function taskDay(t: Task): string | null {
  if (!t.due) return null;
  const dt = taskDateTime(t);
  return dt ? ymd(dt) : t.due.date.slice(0, 10);
}

export const isDone = (t: Task) => !!t.completed_at;
export const taskKey = (t: Task) =>
  isDone(t) ? `done:${t.id}:${t.completed_at}` : t.id;

export function taskMinutes(t: Task): number {
  if (!t.duration) return 30;
  return t.duration.unit === "day"
    ? t.duration.amount * 1440
    : t.duration.amount;
}

export type DropTarget =
  | { kind: "day"; date: string }
  | { kind: "allday"; date: string }
  | { kind: "slot"; date: string; minutes: number }
  | { kind: "unscheduled" };

export const dropId = (t: DropTarget) => JSON.stringify(t);
export const parseDropId = (id: string | number) =>
  JSON.parse(String(id)) as DropTarget;

export type Move = { date: string | null; datetime: string | null };

export function resolveMove(task: Task, target: DropTarget): Move {
  switch (target.kind) {
    case "unscheduled":
      return { date: null, datetime: null };
    case "allday":
      return { date: target.date, datetime: null };
    case "slot":
      return {
        date: target.date,
        datetime: addMinutes(
          parseISO(target.date),
          target.minutes,
        ).toISOString(),
      };
    case "day": {
      const dt = taskDateTime(task);
      if (!dt) return { date: target.date, datetime: null };
      const mins = dt.getHours() * 60 + dt.getMinutes();
      return {
        date: target.date,
        datetime: addMinutes(parseISO(target.date), mins).toISOString(),
      };
    }
  }
}

export function applyMove(task: Task, move: Move): Task {
  if (!move.date) return { ...task, due: null };
  return {
    ...task,
    due: {
      ...(task.due ?? { is_recurring: false }),
      date: move.date,
      datetime: move.datetime,
    },
  };
}

const COLORS: Record<string, string> = {
  berry_red: "#b8255f",
  red: "#db4035",
  orange: "#ff9933",
  yellow: "#fad000",
  olive_green: "#afb83b",
  lime_green: "#7ecc49",
  green: "#299438",
  mint_green: "#6accbc",
  teal: "#158fad",
  sky_blue: "#14aaf5",
  light_blue: "#96c3eb",
  blue: "#4073ff",
  grape: "#884dff",
  violet: "#af38eb",
  lavender: "#eb96eb",
  magenta: "#e05194",
  salmon: "#ff8d85",
  charcoal: "#808080",
  grey: "#b8b8b8",
  taupe: "#ccac93",
};
export const colorHex = (name?: string) => COLORS[name ?? ""] ?? "#808080";

export const PRIORITY_COLOR: Record<number, string> = {
  4: "#d1453b",
  3: "#eb8909",
  2: "#246fe0",
  1: "#9d988f",
};

export function orderedProjects(projects: Map<string, Project>) {
  const kids = new Map<string | null, Project[]>();
  for (const p of projects.values()) {
    const parent =
      p.parent_id && projects.has(p.parent_id) ? p.parent_id : null;
    if (!kids.has(parent)) kids.set(parent, []);
    kids.get(parent)!.push(p);
  }
  const out: { project: Project; path: string; depth: number }[] = [];
  const walk = (parent: string | null, prefix: string, depth: number) => {
    const list = (kids.get(parent) ?? []).sort(
      (a, b) =>
        Number(!!b.inbox_project) - Number(!!a.inbox_project) ||
        a.child_order - b.child_order,
    );
    for (const p of list) {
      const path = prefix ? `${prefix} › ${p.name}` : p.name;
      out.push({ project: p, path, depth });
      walk(p.id, path, depth + 1);
    }
  };
  walk(null, "", 0);
  return out;
}
