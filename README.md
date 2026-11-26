# Todoist Calendar

A calendar for your Todoist tasks with drag and drop rescheduling. Month, two-month and week views,
a sidebar of unscheduled tasks, and changes that show up instantly while they sync to Todoist in the
background.

Built with [TanStack Start](https://tanstack.com/start), [TanStack Query](https://tanstack.com/query),
[dnd-kit](https://dndkit.com) and React 19. Your API token stays on the server: the browser talks only to
server functions, which proxy the [Todoist API v1](https://developer.todoist.com/api/v1/).

## Features

- **Three views:** month, two months side by side, and a week view with an all-day row and a time grid.
  The view, date and toggles live in the URL, so any view can be bookmarked.
- **Drag and drop rescheduling** between days, time slots and the unscheduled sidebar (see below).
  Updates are optimistic and roll back if Todoist rejects them.
- **Unscheduled sidebar** grouping tasks without a due date by project and section, with a text filter.
  Projects and sections collapse individually or all at once.
- **Resizable, collapsible sidebar.** Drag its right edge to resize (double-click resets the width).
  Hide it with the « button or the `[` key to give the calendar the full window; bring it back with
  » in the toolbar or `[` again. Width and collapse state are remembered in the browser.
- **Completed tasks** appear on the day they were completed and can be reopened.
- **Toolbar toggles** for completed tasks, weekends, and which projects show in the calendar.
- **Complete or reopen** a task by clicking its circle; open it in Todoist with the arrow.
- **Light and dark themes** that follow the system setting.
- **Mock mode** with in-memory sample data, for trying the app without a Todoist account.

## Getting started

Requires [Bun](https://bun.sh).

```sh
git clone https://github.com/ruiyiz/todoist-calendar.git
cd todoist-calendar
bun install
cp .env.example .env
```

Put your API token in `.env`. Find it in Todoist under Settings > Integrations > Developer.

```sh
TODOIST_API_TOKEN=your-token-here
```

Then start the dev server and open http://localhost:3000.

```sh
bun run dev
```

To try it without a token, run against sample data:

```sh
TODOIST_MOCK=1 bun run dev
```

## Scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `bun run dev`       | Dev server with hot reload on `127.0.0.1:3000` |
| `bun run build`     | Production build into `.output/`               |
| `bun run start`     | Serve the production build                     |
| `bun run typecheck` | Type check with `tsc`                          |

## Configuration

| Variable            | Description                                         |
| ------------------- | --------------------------------------------------- |
| `TODOIST_API_TOKEN` | Personal API token, required unless mock mode is on |
| `TODOIST_MOCK`      | Set to `1` to use in-memory sample data             |

## Drag and drop

| Drop target         | Effect                                                    |
| ------------------- | --------------------------------------------------------- |
| Month day cell      | Moves to that date, keeps time of day if the task has one |
| Week all-day row    | Moves to that date, clears the time                       |
| Week time grid      | Sets date and time (30 min slots, snapped to card top)    |
| Unscheduled sidebar | Clears the due date                                       |

Recurring tasks are not draggable, since setting a fixed date would drop the recurrence.

## Keyboard

| Key | Action               |
| --- | -------------------- |
| `[` | Show or hide sidebar |

## Project layout

```
src/
  routes/index.tsx     Calendar page: toolbar, views, drag and drop wiring
  components/          MonthView, WeekView, Sidebar, TaskCard, ProjectFilter, Droppable
  server/todoist.ts    Server functions that proxy the Todoist API
  server/mock.ts       Sample data for TODOIST_MOCK=1
  data.ts              TanStack Query hooks and optimistic updates
  lib.ts               Date ranges, drop target parsing, move resolution
  styles.css           All styles, themed with CSS custom properties
```

## Remote access

The dev server binds to `127.0.0.1` only. To reach it from your other devices, put it behind a private
network proxy such as Tailscale:

```sh
tailscale serve --bg --https 8444 3000
```

`vite.config.ts` already allows `*.ts.net` hosts. The app has no login of its own, and anyone who can
reach it acts with your Todoist token, so never expose it on a public network.
