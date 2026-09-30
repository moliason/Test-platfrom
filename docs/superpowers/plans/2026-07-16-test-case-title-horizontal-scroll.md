# Test Case Title Horizontal Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show test case titles completely on one line in the test run selection table and expose overflowing columns through a bottom horizontal scrollbar.

**Architecture:** Keep the existing `RunEditor` horizontal overflow container. Make `TestCaseSelector` use its content's intrinsic table width and remove title truncation, so normal browser overflow produces the bottom scrollbar without adding new state or custom controls.

**Tech Stack:** React 19, Next.js 14, HeroUI Table, Tailwind CSS, Vitest, happy-dom

---

### Task 1: Intrinsic Table Width And Full Single-Line Titles

**Files:**
- Modify: `frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.test.tsx`
- Modify: `frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.tsx:162-178`
- Modify: `frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.tsx:322-344`

- [ ] **Step 1: Extend the table mock and write the failing layout assertions**

Update the mocked `Table` so its table classes are observable:

```tsx
Table: ({
  children,
  classNames,
}: {
  children?: React.ReactNode;
  classNames?: { table?: string[] };
}) =>
  ReactModule.createElement(
    'div',
    {
      'data-testid': 'case-table',
      'data-table-classes': classNames?.table?.join(' ') ?? '',
    },
    children
  ),
```

In the existing title-and-tag test, add assertions after locating `titleAction`:

```tsx
expect(titleAction.className).toContain('whitespace-nowrap');
expect(titleAction.className).not.toContain('truncate');
expect(titleAction.className).not.toContain('max-w-24');

const table = container.querySelector('[data-testid="case-table"]') as HTMLElement;
expect(table.dataset.tableClasses).toContain('w-max');
expect(table.dataset.tableClasses).toContain('min-w-full');
```

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

Run:

```powershell
npx vitest run "frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.test.tsx"
```

Expected: FAIL because the title still contains `max-w-24 truncate` and the table has no intrinsic-width classes.

- [ ] **Step 3: Remove title truncation and enable intrinsic table width**

Change the title button classes to:

```tsx
className="block whitespace-nowrap text-left text-medium text-primary hover:underline hover:opacity-80 active:opacity-disabled transition-opacity underline-offset-4 dark:text-white"
```

Add the table width classes to the existing `classNames` object:

```tsx
table: ['w-max', 'min-w-full'],
```

Keep `RunEditor`'s existing `w-9/12 overflow-x-auto` container unchanged; it supplies the requested bottom scrollbar only when content overflows.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
npx vitest run "frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.test.tsx"
```

Expected: 1 test file and 2 tests pass.

- [ ] **Step 5: Commit the implementation**

```powershell
git add -- "frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.tsx" "frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/TestCaseSelector.test.tsx"
git commit -m "fix: show full test case titles with horizontal scroll"
```

### Task 2: Regression And Browser Verification

**Files:**
- Verify: `frontend/src/app/[locale]/projects/[projectId]/runs/[runId]/RunEditor.tsx:618`

- [ ] **Step 1: Run the complete automated test suite**

Run:

```powershell
npx vitest run
```

Expected: all test files and tests pass with zero failures.

- [ ] **Step 2: Run whitespace and production build checks**

Run:

```powershell
git diff --check
docker compose build --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine unittcms
```

Expected: `git diff --check` reports no whitespace errors and the Docker build exits with code 0.

- [ ] **Step 3: Restart the local service with the new image**

Run:

```powershell
docker compose up -d --no-build
docker compose logs --tail 80 unittcms
```

Expected: migrations complete and the service reports `Ready on http://localhost:8000`.

- [ ] **Step 4: Verify the requested interaction in the browser**

Open a test run containing a long case title and confirm:

1. The complete title renders on one line with no ellipsis.
2. A horizontal scrollbar appears at the bottom when the row exceeds the table viewport.
3. Dragging the scrollbar right reveals the columns on the right.
4. Selected rows remain selected after horizontal scrolling and opening the right-side details.
5. Browser console errors remain empty.
