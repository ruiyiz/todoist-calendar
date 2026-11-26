import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, startOfDay } from "date-fns";
import {
  completeTask,
  fetchCompleted,
  fetchProjects,
  reopenTask,
  fetchSections,
  fetchTasks,
  rescheduleTask,
  type Task,
} from "./server/todoist";
import { applyMove, ymd, type Move } from "./lib";

type TaskData = { scheduled: Task[]; unscheduled: Task[] };

export const tasksKey = ["tasks"] as const;
export const completedKey = ["completed"] as const;

export function useTasks(start: Date, end: Date) {
  // Todoist "due after/before" is exclusive, so pad by a day each side.
  const s = ymd(addDays(start, -1));
  const e = ymd(addDays(end, 1));
  return useQuery({
    queryKey: [...tasksKey, s, e],
    queryFn: () => fetchTasks({ data: { start: s, end: e } }),
    placeholderData: (prev) => prev,
  });
}

export function useSections() {
  return useQuery({
    queryKey: ["sections"],
    queryFn: () => fetchSections(),
    staleTime: 5 * 60_000,
  });
}

export function useCompleted(start: Date, end: Date, enabled: boolean) {
  const since = startOfDay(start).toISOString();
  const until = startOfDay(addDays(end, 1)).toISOString();
  return useQuery({
    queryKey: [...completedKey, since, until],
    queryFn: () => fetchCompleted({ data: { since, until } }),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => reopenTask({ data: { id: task.id } }),
    onMutate: async (task: Task) => {
      await qc.cancelQueries({ queryKey: completedKey });
      const snapshot = qc.getQueriesData<Task[]>({ queryKey: completedKey });
      qc.setQueriesData<Task[]>({ queryKey: completedKey }, (d) =>
        d?.filter(
          (t) => !(t.id === task.id && t.completed_at === task.completed_at),
        ),
      );
      return { snapshot };
    },
    onError: (_e, _t, ctx) =>
      ctx?.snapshot.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: completedKey });
      qc.invalidateQueries({ queryKey: tasksKey });
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60_000,
  });
}

function updateAllTaskCaches(
  qc: ReturnType<typeof useQueryClient>,
  fn: (d: TaskData) => TaskData,
) {
  qc.setQueriesData<TaskData>({ queryKey: tasksKey }, (d) => (d ? fn(d) : d));
}

function useOptimistic<V>(
  mutationFn: (v: V) => Promise<unknown>,
  patch: (d: TaskData, v: V) => TaskData,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: tasksKey });
      const snapshot = qc.getQueriesData<TaskData>({ queryKey: tasksKey });
      updateAllTaskCaches(qc, (d) => patch(d, v));
      return { snapshot };
    },
    onError: (_err, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tasksKey });
      qc.invalidateQueries({ queryKey: completedKey });
    },
  });
}

export type RescheduleVars = {
  task: Task;
  move: Move;
  durationMinutes?: number | null;
};

export function useReschedule() {
  return useOptimistic<RescheduleVars>(
    ({ task, move, durationMinutes }) =>
      rescheduleTask({ data: { id: task.id, ...move, durationMinutes } }),
    (d, { task, move, durationMinutes }) => {
      let moved = applyMove(task, move);
      if (durationMinutes !== undefined) {
        moved = {
          ...moved,
          duration: durationMinutes
            ? { amount: durationMinutes, unit: "minute" }
            : null,
        };
      }
      const scheduled = d.scheduled.filter((t) => t.id !== task.id);
      const unscheduled = d.unscheduled.filter((t) => t.id !== task.id);
      if (moved.due) scheduled.push(moved);
      else unscheduled.unshift(moved);
      return { scheduled, unscheduled };
    },
  );
}

export function useComplete() {
  return useOptimistic<Task>(
    (task) => completeTask({ data: { id: task.id } }),
    (d, task) => ({
      scheduled: d.scheduled.filter((t) => t.id !== task.id),
      unscheduled: d.unscheduled.filter((t) => t.id !== task.id),
    }),
  );
}
