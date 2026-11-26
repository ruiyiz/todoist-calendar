# Todoist Calendar

Month, two-month and week calendar for Todoist tasks with drag and drop rescheduling.
Built on TanStack Start (server functions proxy the Todoist API so the token stays server side),
TanStack Router (view and date live in the URL), TanStack Query (optimistic updates), and dnd-kit.

## Setup

```sh
bun install
cp .env.example .env   # paste a token from Todoist > Settings > Integrations > Developer
bun run dev            # http://localhost:3000
```

`TODOIST_MOCK=1 bun run dev` runs against in-memory sample data (no token needed).

## Drag and drop

| Drop target         | Effect                                                    |
| ------------------- | --------------------------------------------------------- |
| Month day cell      | Moves to that date, keeps time of day if the task has one |
| Week all-day row    | Moves to that date, clears the time                       |
| Week time grid      | Sets date and time (30 min slots, snapped to card top)    |
| Unscheduled sidebar | Clears the due date                                       |

Click the circle to complete a task (or reopen a completed one), the arrow to open it in Todoist.
Recurring tasks are not draggable, since setting a fixed date would drop the recurrence.

## Other features

- Sidebar groups unscheduled tasks by project, then section; both collapse (state kept in localStorage).
- Drag the sidebar's right edge to resize it (double-click resets). Hide it with « or `[`, show it again with »
  in the toolbar or `[`. Width and hidden state are kept in localStorage.
- Toolbar toggles for completed tasks (placed on their completion date), weekends, and which projects
  appear in the calendar. Toggle state lives in the URL.

## Tailnet access

Vite binds `127.0.0.1:3000`. Publish it on the tailnet with
`/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https 8444 3000`.
