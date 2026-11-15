export const STORAGE_KEY = 'mai.interactive-dashboard';
export const VERSION = 1;

export const types = {
  note: { name: 'Заметка', description: 'Текст и идеи', defaults: () => ({ text: '' }) },
  counter: { name: 'Счётчик', description: 'Число и шаг', defaults: () => ({ value: 0, step: 1 }) },
  tasks: { name: 'Список задач', description: 'Дела и отметки', defaults: () => ({ items: [] }) },
  chart: { name: 'График', description: 'Столбцы и данные', defaults: () => ({ values: null }) },
};

const empty = () => ({ version: VERSION, theme: 'light', widgets: [] });
const asText = (value, size) => typeof value === 'string' && value.length <= size;
const idValid = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export const validValues = (values) =>
  Array.isArray(values) &&
  values.length >= 1 &&
  values.length <= 12 &&
  values.every((n) => Number.isFinite(n) && Math.abs(n) <= 1e9);
export const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function unique(items) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function validWidget(widget) {
  if (
    !widget ||
    !idValid(widget.id) ||
    !Object.hasOwn(types, widget.type) ||
    !asText(widget.title, 80) ||
    !widget.title.trim() ||
    typeof widget.collapsed !== 'boolean'
  )
    return false;
  const { data } = widget;
  if (!data || typeof data !== 'object') return false;
  switch (widget.type) {
    case 'note':
      return asText(data.text, 4000);
    case 'counter':
      return Number.isSafeInteger(data.value) && Number.isSafeInteger(data.step) && data.step > 0;
    case 'tasks':
      return (
        Array.isArray(data.items) &&
        data.items.every(
          (item) =>
            item &&
            idValid(item.id) &&
            asText(item.text, 160) &&
            item.text.trim() &&
            typeof item.done === 'boolean',
        ) &&
        unique(data.items)
      );
    case 'chart':
      return data.values === null || validValues(data.values);
    default:
      return false;
  }
}

export function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return empty();
    const state = JSON.parse(raw);
    if (
      state?.version !== VERSION ||
      !['light', 'dark'].includes(state.theme) ||
      !Array.isArray(state.widgets) ||
      !state.widgets.every(validWidget) ||
      !unique(state.widgets)
    )
      return empty();
    return state;
  } catch {
    return empty();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function makeWidget(type, title) {
  return { id: makeId(), type, title, collapsed: false, data: types[type].defaults() };
}
