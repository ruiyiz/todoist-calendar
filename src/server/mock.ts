import { addDays, format } from "date-fns";
import type { Project, Section, Task } from "./todoist";

const d = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const at = (offset: number, hm: string) => `${d(offset)}T${hm}:00`;

export const projects: Project[] = [
  {
    id: "p1",
    name: "Inbox",
    color: "charcoal",
    child_order: 0,
    inbox_project: true,
  },
  { id: "p2", name: "Work", color: "blue", child_order: 1 },
  { id: "p3", name: "Home", color: "green", child_order: 2 },
  {
    id: "p4",
    name: "Garden",
    color: "lime_green",
    child_order: 0,
    parent_id: "p3",
  },
];

export const sections: Section[] = [
  { id: "s1", project_id: "p2", name: "Reading", section_order: 1 },
  { id: "s2", project_id: "p2", name: "Admin", section_order: 2 },
];

const base = {
  description: "",
  labels: [],
  checked: false,
  duration: null,
  section_id: null,
  child_order: 0,
};
export const tasks: Task[] = [
  {
    ...base,
    id: "t1",
    content: "Write quarterly review",
    project_id: "p2",
    priority: 4,
    due: { date: d(0), datetime: at(0, "10:00"), is_recurring: false },
    duration: { amount: 90, unit: "minute" },
  },
  {
    ...base,
    id: "t2",
    content: "Pay electricity bill",
    project_id: "p3",
    priority: 3,
    due: { date: d(1), is_recurring: false },
  },
  {
    ...base,
    id: "t3",
    content: "Team standup",
    project_id: "p2",
    priority: 1,
    due: {
      date: d(0),
      datetime: at(0, "09:30"),
      is_recurring: true,
      string: "every weekday at 9:30",
    },
  },
  {
    ...base,
    id: "t4",
    content: "Call dentist",
    project_id: "p1",
    priority: 2,
    due: { date: d(3), is_recurring: false },
  },
  {
    ...base,
    id: "t5",
    content: "Plan weekend trip",
    project_id: "p3",
    priority: 1,
    due: null,
  },
  {
    ...base,
    id: "t6",
    content: "Read design doc",
    project_id: "p2",
    section_id: "s1",
    priority: 2,
    due: null,
  },
  {
    ...base,
    id: "t8",
    content: "Expense report",
    project_id: "p2",
    section_id: "s2",
    priority: 1,
    due: null,
  },
  {
    ...base,
    id: "t9",
    content: "Sketch roadmap",
    project_id: "p2",
    priority: 3,
    due: null,
  },
  {
    ...base,
    id: "t10",
    content: "Prune roses",
    project_id: "p4",
    priority: 1,
    due: null,
  },
  {
    ...base,
    id: "t12",
    content: "Submit timesheet",
    project_id: "p2",
    priority: 2,
    due: { date: d(-1), is_recurring: false },
    checked: true,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    ...base,
    id: "t11",
    content: "Sort mail",
    project_id: "p1",
    priority: 1,
    due: null,
  },
  {
    ...base,
    id: "t7",
    content: "1:1 with manager",
    project_id: "p2",
    priority: 1,
    due: { date: d(2), datetime: at(2, "14:00"), is_recurring: false },
    duration: { amount: 30, unit: "minute" },
  },
];
