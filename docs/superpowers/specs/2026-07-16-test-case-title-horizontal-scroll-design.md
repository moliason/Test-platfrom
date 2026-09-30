# Test Case Title Horizontal Scroll Design

## Goal

On the test run's "Select Test Cases" table, show every test case title in full on one line. When the complete row is wider than the available table area, users can use a horizontal scrollbar at the bottom of the table to view the columns on the right.

## Scope

- Change only the test case selection table inside a test run.
- Keep the existing folder tree, selection controls, right-side detail pane, and resizable split pane behavior.
- Do not change the main test case management table or other tables.

## Layout And Interaction

- Remove the title's fixed maximum width and ellipsis truncation.
- Keep titles on one line with no wrapping.
- Allow the table's intrinsic width to grow to fit the complete title and all remaining columns.
- Keep the table inside its existing horizontally scrollable container.
- Show the browser's horizontal scrollbar at the bottom only when the table exceeds the available width.
- Scrolling horizontally must not change selected rows, filters, unsaved run edits, or the open detail pane.

## Edge Cases

- Short titles continue to use the available width without forcing unnecessary scrolling.
- Very long titles increase the table width instead of wrapping or overlapping adjacent columns.
- Existing title, tag, and comment buttons remain clickable after horizontal scrolling.

## Verification

- Add a component regression test that confirms the title no longer uses truncation or a fixed maximum width and remains on one line.
- Confirm the table has intrinsic minimum width while its parent remains horizontally scrollable.
- Run the complete Vitest suite and the production build.
- In the browser, verify a long title is fully rendered on one line, the bottom scrollbar appears, and selected rows remain selected after scrolling and opening details.
