// Helper for table rows that navigate on click but still let the user
// select/copy text. A drag-select ends with a mouseup that fires `click`
// on the row; if the resulting selection is non-empty, suppress the nav.
export function hasSelection() {
  const sel = window.getSelection();
  return !!(sel && sel.toString().length > 0);
}
