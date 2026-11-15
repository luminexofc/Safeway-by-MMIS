// Arrow / Home / End movement for a radiogroup, with roving focus.
// Used by the report wizard and the theme picker in settings.
export function onRadioKey(event, index, count, select) {
  const forward =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
  let next = index;
  if (forward) next = (index + forward + count) % count;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = count - 1;
  else return;
  event.preventDefault();
  select(next);
  event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[next]?.focus();
}
