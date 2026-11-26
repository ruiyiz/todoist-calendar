import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import type { CSSProperties } from "react";
import type { Project, Task } from "../server/todoist";
import {
  PRIORITY_COLOR,
  colorHex,
  isDone,
  taskDateTime,
  taskKey,
} from "../lib";
import { useComplete, useReopen } from "../data";

type Props = {
  task: Task;
  project?: Project;
  compact?: boolean;
  showTime?: boolean;
  style?: CSSProperties;
  overlay?: boolean;
  hideProject?: boolean;
  dense?: boolean;
};

export function TaskCard({
  task,
  project,
  compact,
  showTime,
  style,
  overlay,
  hideProject,
  dense,
}: Props) {
  const done = isDone(task);
  const recurring = !!task.due?.is_recurring;
  const canDrag = !done && !recurring && !overlay;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: done ? taskKey(task) : task.id,
    data: { task },
    disabled: !canDrag,
  });
  const complete = useComplete();
  const reopen = useReopen();
  const dt = taskDateTime(task);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={[
        "task",
        compact && "task--compact",
        dense && "task--dense",
        isDragging && "task--ghost",
        overlay && "task--overlay",
        recurring && "task--locked",
        done && "task--done",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        { "--project": colorHex(project?.color), ...style } as CSSProperties
      }
      title={
        done
          ? `${task.content}\nCompleted ${new Date(task.completed_at!).toLocaleString()}. Click the circle to reopen.`
          : recurring
            ? `${task.content}\nRecurring (${task.due?.string}). Reschedule in Todoist.`
            : task.content
      }
    >
      <button
        className="task__check"
        style={{ borderColor: PRIORITY_COLOR[task.priority] }}
        aria-label={done ? "Reopen task" : "Complete task"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => (done ? reopen.mutate(task) : complete.mutate(task))}
      />
      <div className="task__body">
        <span className="task__title">{task.content}</span>
        {!compact && !dense && (
          <span className="task__meta">
            {showTime && dt && <span>{format(dt, "HH:mm")}</span>}
            {recurring && <span aria-label="recurring">↻</span>}
            {project && !hideProject && (
              <span className="task__project">{project.name}</span>
            )}
          </span>
        )}
      </div>
      <a
        className="task__open"
        href={`https://app.todoist.com/app/task/${task.id}`}
        target="_blank"
        rel="noreferrer"
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Open in Todoist"
      >
        ↗
      </a>
    </div>
  );
}
