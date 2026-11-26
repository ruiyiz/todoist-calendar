import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as mock from "./mock";

const API = "https://api.todoist.com/api/v1";

export type Due = {
  date: string;
  datetime?: string | null;
  string?: string;
  is_recurring: boolean;
  timezone?: string | null;
};

export type Task = {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id: string | null;
  parent_id?: string | null;
  child_order: number;
  priority: number;
  labels: string[];
  due: Due | null;
  duration: { amount: number; unit: "minute" | "day" } | null;
  checked: boolean;
  completed_at?: string | null;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  parent_id?: string | null;
  child_order: number;
  inbox_project?: boolean;
};

export type Section = {
  id: string;
  project_id: string;
  name: string;
  section_order: number;
};

const MOCK = process.env.TODOIST_MOCK === "1";

function token() {
  const t = process.env.TODOIST_API_TOKEN;
  if (!t) throw new Error("TODOIST_API_TOKEN is not set. Add it to .env");
  return t;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Todoist ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function paginate<T>(
  path: string,
  params: Record<string, string> = {},
  key: "results" | "items" = "results",
) {
  const out: T[] = [];
  let cursor: string | null = null;
  do {
    const qs = new URLSearchParams({ ...params, limit: "200" });
    if (cursor) qs.set("cursor", cursor);
    const page: Record<typeof key, T[]> & { next_cursor: string | null } =
      await api(`${path}?${qs}`);
    out.push(...page[key]);
    cursor = page.next_cursor;
  } while (cursor);
  return out;
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const fetchTasks = createServerFn({ method: "GET" })
  .validator(z.object({ start: dateStr, end: dateStr }))
  .handler(async ({ data }) => {
    if (MOCK) {
      const live = mock.tasks.filter((t) => !t.checked);
      return {
        scheduled: live.filter((t) => t.due),
        unscheduled: live.filter((t) => !t.due),
      };
    }
    const [scheduled, unscheduled] = await Promise.all([
      paginate<Task>("/tasks/filter", {
        query: `due after: ${data.start} & due before: ${data.end}`,
      }),
      paginate<Task>("/tasks/filter", { query: "no date" }),
    ]);
    return { scheduled, unscheduled };
  });

export const fetchProjects = createServerFn({ method: "GET" }).handler(() =>
  MOCK ? mock.projects : paginate<Project>("/projects"),
);

export const fetchSections = createServerFn({ method: "GET" }).handler(() =>
  MOCK ? mock.sections : paginate<Section>("/sections"),
);

export const rescheduleTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      date: dateStr.nullable(),
      datetime: z.string().nullable(),
      durationMinutes: z.number().int().positive().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = {};
    if (data.datetime) body.due_datetime = data.datetime;
    else if (data.date) body.due_date = data.date;
    else body.due_string = "no date";
    if (data.durationMinutes !== undefined) {
      body.duration = data.durationMinutes;
      body.duration_unit = data.durationMinutes ? "minute" : null;
    }
    if (MOCK) return mockReschedule(data);
    return api<Task>(`/tasks/${data.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  });

export const fetchCompleted = createServerFn({ method: "GET" })
  .validator(
    z.object({ since: z.string().datetime(), until: z.string().datetime() }),
  )
  .handler(async ({ data }) => {
    if (MOCK) return mock.tasks.filter((t) => t.checked);
    return paginate<Task>(
      "/tasks/completed/by_completion_date",
      { since: data.since, until: data.until },
      "items",
    );
  });

export const reopenTask = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    if (MOCK) {
      const t = mock.tasks.find((x) => x.id === data.id);
      if (t) {
        t.checked = false;
        t.completed_at = null;
      }
      return { ok: true };
    }
    await api(`/tasks/${data.id}/reopen`, { method: "POST" });
    return { ok: true };
  });

export const completeTask = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    if (MOCK) {
      const t = mock.tasks.find((x) => x.id === data.id);
      if (t) {
        t.checked = true;
        t.completed_at = new Date().toISOString();
      }
      return { ok: true };
    }
    await api(`/tasks/${data.id}/close`, { method: "POST" });
    return { ok: true };
  });

function mockReschedule(data: {
  id: string;
  date: string | null;
  datetime: string | null;
  durationMinutes?: number | null;
}) {
  const t = mock.tasks.find((x) => x.id === data.id);
  if (!t) throw new Error("not found");
  t.due = data.date
    ? {
        ...(t.due ?? { is_recurring: false }),
        date: data.date,
        datetime: data.datetime,
      }
    : null;
  if (data.durationMinutes !== undefined)
    t.duration = data.durationMinutes
      ? { amount: data.durationMinutes, unit: "minute" }
      : null;
  return t;
}
