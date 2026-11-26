import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { addMonths, addWeeks, format, isWeekend, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { z } from "zod";
import type { Task } from "../server/todoist";
import {
  daysBetween,
  parseDropId,
  resolveMove,
  taskDateTime,
  taskDay,
  visibleRange,
  ymd,
  type DropTarget,
  type View,
} from "../lib";
import {
  useCompleted,
  useProjects,
  useReschedule,
  useSections,
  useTasks,
} from "../data";
import { MonthView } from "../components/MonthView";
import { WeekView } from "../components/WeekView";
import { Sidebar } from "../components/Sidebar";
import { TaskCard } from "../components/TaskCard";
import { ProjectFilter } from "../components/ProjectFilter";

const search = z.object({
  view: z.enum(["month", "month2", "week"]).default("month").catch("month"),
  weekends: z.boolean().default(true).catch(true),
  hidden: z.array(z.string()).optional().catch(undefined),
  completed: z.boolean().default(true).catch(true),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: search,
  ssr: false,
  component: CalendarPage,
});

// Time slots live in a scroll container; ignore any that are scrolled out of view.
// For visible slots, snap by the dragged card's top edge instead of the pointer,
// so the card lands where it visually sits.
const collision: CollisionDetection = (args) => {
  const kindOf = (id: string | number) =>
    (
      args.droppableContainers.find((c) => c.id === id)?.data.current as
        DropTarget | undefined
    )?.kind;
  const view = document.querySelector(".week__scroll")?.getBoundingClientRect();
  const visible = (y: number) => !view || (y >= view.top && y < view.bottom);
  const pointer = args.pointerCoordinates;
  const hits = pointerWithin(args).filter(
    (h) => kindOf(h.id) !== "slot" || (pointer && visible(pointer.y)),
  );
  if (!hits[0] || kindOf(hits[0].id) !== "slot" || !pointer) return hits;
  const y = Math.max(args.collisionRect.top + 4, view?.top ?? -Infinity);
  for (const c of args.droppableContainers) {
    const r = args.droppableRects.get(c.id);
    if (!r || (c.data.current as DropTarget | undefined)?.kind !== "slot")
      continue;
    if (
      pointer.x >= r.left &&
      pointer.x < r.right &&
      y >= r.top &&
      y < r.bottom
    )
      return [{ id: c.id }];
  }
  return hits;
};

function sameMove(task: Task, date: string | null, datetime: string | null) {
  if (taskDay(task) !== date) return false;
  const cur = taskDateTime(task)?.getTime() ?? null;
  const next = datetime ? new Date(datetime).getTime() : null;
  return cur === next;
}

function CalendarPage() {
  const { view, date, weekends, hidden, completed } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const anchor = date ? parseISO(date) : new Date();
  const { start, end } = visibleRange(view, anchor);
  const days = useMemo(
    () => daysBetween(start, end),
    [start.getTime(), end.getTime()],
  );

  const tasksQ = useTasks(start, end);
  const projectsQ = useProjects();
  const sectionsQ = useSections();
  const completedQ = useCompleted(start, end, completed);
  const reschedule = useReschedule();
  const [active, setActive] = useState<Task | null>(null);

  const projects = useMemo(
    () => new Map((projectsQ.data ?? []).map((p) => [p.id, p])),
    [projectsQ.data],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    const hiddenSet = new Set(hidden);
    for (const t of tasksQ.data?.scheduled ?? []) {
      if (hiddenSet.has(t.project_id)) continue;
      const k = taskDay(t);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    if (completed) {
      for (const t of completedQ.data ?? []) {
        if (hiddenSet.has(t.project_id) || !t.completed_at) continue;
        const k = ymd(new Date(t.completed_at));
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(t);
      }
    }
    return m;
  }, [tasksQ.data, completedQ.data, completed, hidden]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const go = (
    next: Partial<{
      view: View;
      date: string;
      weekends: boolean;
      hidden: string[] | undefined;
      completed: boolean;
    }>,
  ) => navigate({ search: (prev) => ({ ...prev, ...next }) });
  const step = (dir: 1 | -1) =>
    go({
      date: ymd(
        view === "week" ? addWeeks(anchor, dir) : addMonths(anchor, dir),
      ),
    });

  const onDragStart = (e: DragStartEvent) =>
    setActive((e.active.data.current?.task as Task) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const task = e.active.data.current?.task as Task | undefined;
    if (!task || !e.over) return;
    const target = parseDropId(e.over.id);
    const move = resolveMove(task, target);
    if (sameMove(task, move.date, move.datetime)) return;
    reschedule.mutate({ task, move });
  };

  const title =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : view === "month2"
        ? `${format(anchor, "MMMM")} – ${format(addMonths(anchor, 1), "MMMM yyyy")}`
        : `${format(start, "MMM d")} – ${format(end, start.getMonth() === end.getMonth() ? "d, yyyy" : "MMM d, yyyy")}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="app">
        <Sidebar
          tasks={tasksQ.data?.unscheduled ?? []}
          projects={projects}
          sections={sectionsQ.data ?? []}
        />
        <main className="main">
          <header className="toolbar">
            <div className="toolbar__nav">
              <button onClick={() => go({ date: ymd(new Date()) })}>
                Today
              </button>
              <button aria-label="Previous" onClick={() => step(-1)}>
                ‹
              </button>
              <button aria-label="Next" onClick={() => step(1)}>
                ›
              </button>
              <h1>{title}</h1>
              {(tasksQ.isFetching ||
                completedQ.isFetching ||
                reschedule.isPending) && <span className="spinner" />}
            </div>
            <div className="toolbar__right">
              <ProjectFilter
                projects={projects}
                hidden={hidden ?? []}
                onChange={(h) => go({ hidden: h.length ? h : undefined })}
              />
              <button
                className={["toggle", completed && "is-active"]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={completed}
                onClick={() => go({ completed: !completed })}
              >
                Completed
              </button>
              <button
                className={["toggle", weekends && "is-active"]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={weekends}
                onClick={() => go({ weekends: !weekends })}
              >
                Weekends
              </button>
              <div className="segmented">
                {(["month", "month2", "week"] as const).map((v) => (
                  <button
                    key={v}
                    className={v === view ? "is-active" : ""}
                    onClick={() => go({ view: v })}
                  >
                    {{ month: "Month", month2: "2 Months", week: "Week" }[v]}
                  </button>
                ))}
              </div>
            </div>
          </header>
          {tasksQ.error && (
            <div className="error">{String(tasksQ.error.message)}</div>
          )}
          {completedQ.error && (
            <div className="error">
              Completed tasks: {completedQ.error.message}
            </div>
          )}
          {reschedule.error && (
            <div className="error">
              Update failed: {reschedule.error.message}
            </div>
          )}
          {view === "month" ? (
            <MonthView
              anchor={anchor}
              weekends={weekends}
              byDay={byDay}
              projects={projects}
            />
          ) : view === "month2" ? (
            <div className="months">
              {[anchor, addMonths(anchor, 1)].map((m) => (
                <MonthView
                  key={ymd(m)}
                  anchor={m}
                  title={format(m, "MMMM yyyy")}
                  blankOutside
                  weekends={weekends}
                  dense
                  byDay={byDay}
                  projects={projects}
                />
              ))}
            </div>
          ) : (
            <WeekView
              days={weekends ? days : days.filter((d) => !isWeekend(d))}
              byDay={byDay}
              projects={projects}
            />
          )}
        </main>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <TaskCard
            task={active}
            project={projects.get(active.project_id)}
            overlay
            showTime
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
