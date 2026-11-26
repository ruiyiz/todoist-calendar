import { format, isToday } from "date-fns";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { Project, Task } from "../server/todoist";
import { isDone, taskDateTime, taskKey, taskMinutes, ymd } from "../lib";
import { Droppable } from "./Droppable";
import { TaskCard } from "./TaskCard";
import { sortTasks } from "./MonthView";

export const HOUR_PX = 48;
const SLOT_MIN = 30;
const SLOTS = (24 * 60) / SLOT_MIN;

type Props = {
  days: Date[];
  byDay: Map<string, Task[]>;
  projects: Map<string, Project>;
};

type Placed = {
  task: Task;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

function layoutDay(tasks: Task[]): Placed[] {
  const items = tasks
    .map((task) => {
      const dt = taskDateTime(task)!;
      const start = dt.getHours() * 60 + dt.getMinutes();
      return {
        task,
        start,
        end: Math.min(start + Math.max(taskMinutes(task), 15), 1440),
      };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    cluster.forEach((p) => (p.lanes = lanes));
    out.push(...cluster);
    cluster = [];
  };
  for (const it of items) {
    if (it.start >= clusterEnd && cluster.length) flush();
    const laneEnds: number[] = [];
    cluster.forEach(
      (p) => (laneEnds[p.lane] = Math.max(laneEnds[p.lane] ?? 0, p.end)),
    );
    let lane = laneEnds.findIndex((e) => e <= it.start);
    if (lane === -1) lane = laneEnds.length;
    cluster.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

function useNowMinutes() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now.getHours() * 60 + now.getMinutes();
}

export function WeekView({ days, byDay, projects }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowMin = useNowMinutes();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: HOUR_PX * 7 });
  }, []);

  return (
    <div className="week" style={{ "--cols": days.length } as CSSProperties}>
      <div className="week__head">
        <div className="week__gutter" />
        {days.map((d) => (
          <div
            key={ymd(d)}
            className={["week__day", isToday(d) && "is-today"]
              .filter(Boolean)
              .join(" ")}
          >
            <span>{format(d, "EEE")}</span>
            <strong>{format(d, "d")}</strong>
          </div>
        ))}
      </div>
      <div className="week__allday">
        <div className="week__gutter week__label">all-day</div>
        {days.map((d) => {
          const key = ymd(d);
          const tasks = (byDay.get(key) ?? [])
            .filter((t) => isDone(t) || !t.due?.datetime)
            .sort(sortTasks);
          return (
            <Droppable
              key={key}
              target={{ kind: "allday", date: key }}
              className="week__allday-cell"
            >
              {tasks.map((t) => (
                <TaskCard
                  key={taskKey(t)}
                  task={t}
                  project={projects.get(t.project_id)}
                  compact
                />
              ))}
            </Droppable>
          );
        })}
      </div>
      <div className="week__scroll" ref={scrollRef}>
        <div className="week__grid" style={{ height: HOUR_PX * 24 }}>
          <div className="week__gutter week__hours">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ height: HOUR_PX }}>
                {h > 0 && <span>{String(h).padStart(2, "0")}:00</span>}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const key = ymd(d);
            const placed = layoutDay(
              (byDay.get(key) ?? []).filter(
                (t) => !isDone(t) && t.due?.datetime,
              ),
            );
            return (
              <div key={key} className="week__col">
                {Array.from({ length: SLOTS }, (_, i) => (
                  <Droppable
                    key={i}
                    target={{ kind: "slot", date: key, minutes: i * SLOT_MIN }}
                    className={["week__slot", i % 2 === 1 && "week__slot--half"]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ height: HOUR_PX / 2 }}
                  />
                ))}
                {placed.map(({ task, start, end, lane, lanes }) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={projects.get(task.project_id)}
                    showTime
                    compact={end - start < 45}
                    style={{
                      position: "absolute",
                      top: (start / 60) * HOUR_PX,
                      height: ((end - start) / 60) * HOUR_PX - 2,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  />
                ))}
                {isToday(d) && (
                  <div
                    className="week__now"
                    style={{ top: (nowMin / 60) * HOUR_PX }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
