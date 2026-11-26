import type { CSSProperties } from "react";
import { addDays, format, isSameMonth, isToday, isWeekend } from "date-fns";
import type { Project, Task } from "../server/todoist";
import {
  daysBetween,
  isDone,
  taskDateTime,
  taskKey,
  visibleRange,
  ymd,
} from "../lib";
import { Droppable } from "./Droppable";
import { TaskCard } from "./TaskCard";

type Props = {
  anchor: Date;
  title?: string;
  blankOutside?: boolean;
  dense?: boolean;
  weekends?: boolean;
  byDay: Map<string, Task[]>;
  projects: Map<string, Project>;
};

export function sortTasks(a: Task, b: Task) {
  if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
  const ta = taskDateTime(a)?.getTime() ?? -1;
  const tb = taskDateTime(b)?.getTime() ?? -1;
  if (ta !== tb) return ta - tb;
  return b.priority - a.priority;
}

export function MonthView({
  anchor,
  title,
  blankOutside,
  dense,
  weekends = true,
  byDay,
  projects,
}: Props) {
  const { start, end } = visibleRange("month", anchor);
  // Blank-padded grids always span 6 weeks so side-by-side months share row heights.
  const all = blankOutside
    ? daysBetween(start, addDays(start, 41))
    : daysBetween(start, end);
  const days = weekends ? all : all.filter((d) => !isWeekend(d));
  const cols = weekends ? 7 : 5;
  return (
    <div className="month-wrap">
      {title && <h2 className="month__title">{title}</h2>}
      <div className="month" style={{ "--cols": cols } as CSSProperties}>
        {days.slice(0, cols).map((d) => (
          <div key={d.toISOString()} className="month__dow">
            {format(d, "EEE")}
          </div>
        ))}
        {days.map((d) => {
          const key = ymd(d);
          if (blankOutside && !isSameMonth(d, anchor))
            return (
              <div key={key} className="month__cell is-outside is-blank" />
            );
          const tasks = (byDay.get(key) ?? []).slice().sort(sortTasks);
          return (
            <Droppable
              key={key}
              target={{ kind: "day", date: key }}
              className={[
                "month__cell",
                !isSameMonth(d, anchor) && "is-outside",
                isToday(d) && "is-today",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="month__date">{format(d, "d")}</div>
              <div className="month__tasks">
                {tasks.map((t) => (
                  <TaskCard
                    key={taskKey(t)}
                    task={t}
                    project={projects.get(t.project_id)}
                    showTime
                    dense={dense}
                  />
                ))}
              </div>
            </Droppable>
          );
        })}
      </div>
    </div>
  );
}
