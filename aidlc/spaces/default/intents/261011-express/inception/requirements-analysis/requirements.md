# Requirements

## Intent analysis

Build a small browser task list one person can use on their own machine. The first version is the whole product they described: create, edit, complete, delete, filter, count, and an empty state, kept in the browser with unit tests for that behavior.

## Functional requirements

### FR1. Add a task

The system shall add a task when the person provides a title.

- **FR1.1** The system shall require a title. A title that is empty or only whitespace shall not create a task.
- **FR1.2** The system shall accept an optional description. A task with no description shall still be stored.
- **FR1.3** A new task shall start as pending.
- **FR1.4** A new task shall appear at the top of the list.

Given no tasks exist, when the person adds a title "Buy milk" and a description "2%", then the list shows that pending task and the count is 1.
Given the title field is empty or only spaces, when the person tries to add a task, then no task is stored and the count stays unchanged.

### FR2. Edit a task

The system shall let the person change a task's title and description after it is created.

- **FR2.1** The system shall save a new title and a new description, including clearing the description.
- **FR2.2** The system shall reject a save whose title is empty or only whitespace, and shall keep the previous title and description.

Given a task titled "Buy milk", when the person changes the title to "Buy oat milk" and the description to "1 litre", then the list shows the new title and description.
Given a task titled "Buy milk", when the person tries to save an empty title, then the task remains "Buy milk".

### FR3. Mark a task completed or pending

The system shall switch a task between pending and completed.

- **FR3.1** Marking a pending task completed shall show it as completed.
- **FR3.2** Marking a completed task pending shall show it as pending.

Given a pending task, when the person marks it completed, then it is completed.
Given that same task, when the person marks it pending, then it is pending again.

### FR4. Delete a task

The system shall remove a task as soon as the person deletes it.

- **FR4.1** The system shall not ask for confirmation before deleting.
- **FR4.2** A deleted task shall disappear from the list and from stored data.

Given one task, when the person deletes it, then the list has no tasks and the empty state is shown.

### FR5. Filter tasks

The system shall filter the list by All, Pending, and Completed.

- **FR5.1** All shall show every task. This filter shall be selected when the page loads.
- **FR5.2** Pending shall show only pending tasks.
- **FR5.3** Completed shall show only completed tasks.

Given two pending tasks and one completed task, when the person selects Pending, then only the two pending tasks are shown.
Given the same list, when the person selects Completed, then only the completed task is shown.
Given the same list, when the person selects All, then all three tasks are shown.

### FR6. Show a task count

The system shall show how many tasks match the current filter.

- **FR6.1** The count shall equal the number of tasks visible for All, Pending, or Completed.
- **FR6.2** The count shall change when a task is added, edited only if that does not change status, completed, deleted, or the filter changes. Editing title or description shall not change the count.

Given three tasks of which one is completed, when All is selected, then the count is 3.
Given the same tasks, when Pending is selected, then the count is 2.
Given the same tasks, when Completed is selected, then the count is 1.

### FR7. Empty state and no matching tasks

The system shall distinguish having no tasks from a filter that hides every task.

- **FR7.1** When there are zero tasks, the system shall show an empty state.
- **FR7.2** When tasks exist but the current filter matches none, the system shall show a short "no matching tasks" message and shall not show the empty state.

Given no tasks, when the page is shown, then the empty state is visible and the count is 0.
Given only pending tasks, when the person selects Completed, then "no matching tasks" is shown and the empty state is not shown.

### FR8. Keep tasks in this browser

The system shall store tasks in localStorage and restore them when the page is loaded again.

- **FR8.1** After a reload, the system shall show the same tasks, titles, descriptions, and completed or pending status.
- **FR8.2** The system shall not send tasks to a server.

Given a pending task and a completed task are stored, when the page is reloaded, then both tasks appear with the same text and status.

## Non-functional requirements

- **NFR1** The task list, filters, count, and empty or no-match message shall be usable at a viewport width of 320px and at a desktop width of 1280px, without the page scrolling sideways to reach those controls.
- **NFR2** Add, edit, complete, delete, and filter shall update the list without a full page reload, except for the reload that restores localStorage.
- **NFR3** Unit tests shall cover add, reject empty title, edit, reject empty edited title, toggle completed and pending, delete, each filter, the filtered count, the empty state, the no-match message, and restore after reload. Existing tests shall remain green.

## Constraints

- The first version is frontend-only. There is no account, API, or database.
- Persistence is localStorage in the browser where the page is open.
- The first version includes the behaviors in FR1–FR8 and the tests in NFR3.

## Assumptions

- **A1. Newest first.** A new task is inserted at the top. The person did not object when this was stated with the follow-up questions.
- **A2. Immediate delete.** Delete does not ask for confirmation. The person did not object when this was stated with the follow-up questions.
- **A3. One list.** There is a single task list. No projects, tags, due dates, or priorities.
- **A4. English UI.** Labels, the empty state, and the "no matching tasks" message are in English.

## Out of scope

- Signing in, multiple people, or syncing tasks across browsers or devices
- Due dates, priorities, tags, search, or more than one list
- A server, database, or installable backend
- Editing anything other than title, description, and completed or pending status

## Open questions

None. UI layout details and the implementation approach are decided in the code plan, within the constraints above.
