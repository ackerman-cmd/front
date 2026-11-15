import { $, button, el, field, icon, validate } from './dom.js';
import { enableReorder } from './drag.js';
import { makeModal } from './modal.js';
import { makeWidget, readState, saveState, types, validValues } from './state.js';
import { renderWidget } from './widgets.js';

const state = readState();
const grid = $('#widgets');
const modal = makeModal($('#modal'));
const cards = new Map();
const chartRequests = new Map();
const addButton = $('#add');
const resetButton = $('#reset');
const toast = $('#toast');
let toastTimer;

function save() {
  const status = $('#storage-status');
  const message = saveState(state)
    ? 'Данные хранятся в этом браузере'
    : 'Изменения не удалось сохранить в браузере';
  if (message !== status.textContent) status.textContent = message;
}

function notify(message) {
  clearTimeout(toastTimer);
  toast.replaceChildren(el('span', '', message));
  toast.classList.add('visible');
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    toast.replaceChildren();
  }, 3000);
}

function focusCard(id, action) {
  return () => {
    const card = cards.get(id)?.node;
    const control = card?.querySelector(`[data-action="${action}"]`);
    return control && !control.closest('[hidden]')
      ? control
      : (card?.querySelector('[data-action="rename"]') ?? addButton);
  };
}

function syncTheme() {
  const dark = state.theme === 'dark';
  document.documentElement.dataset.theme = state.theme;
  $('#theme').setAttribute('aria-pressed', String(dark));
  $('meta[name="theme-color"]').content = dark ? '#181a1f' : '#eef2f0';
}

function syncGrid() {
  const ids = new Set(state.widgets.map(({ id }) => id));
  for (const [id, view] of cards) {
    if (ids.has(id)) continue;
    view.node.remove();
    cards.delete(id);
    chartRequests.delete(id);
  }
  state.widgets.forEach((widget, index) => {
    if (!cards.has(widget.id)) cards.set(widget.id, renderWidget(widget, actions, index, ids.size));
    const view = cards.get(widget.id);
    view.setPosition(index, ids.size);
    if (grid.children[index] !== view.node)
      grid.insertBefore(view.node, grid.children[index] ?? null);
  });
  $('#empty').hidden = ids.size !== 0;
  $('#reorder-tip').hidden = ids.size < 2;
  grid.hidden = ids.size === 0;
  resetButton.disabled = ids.size === 0;
  $('#widget-count').value = ids.size;
}

function typeTile(type, info) {
  const badge = el('span', 'type-icon');
  const names = el('span', 'type-names');
  badge.append(icon(type));
  names.append(el('strong', '', info.name), el('small', '', info.description));
  return [badge, names];
}

function renderQuickStart() {
  const list = $('#quick-start');
  for (const [type, info] of Object.entries(types)) {
    const item = el('li');
    const select = button('', `button button-secondary quick-tile widget-${type}`, () =>
      openAdd(type),
    );
    select.append(...typeTile(type, info));
    item.append(select);
    list.append(item);
  }
}

function openAdd(preselected = 'note') {
  const form = el('form', 'modal-stack');
  const group = el('fieldset', 'type-fieldset');
  const options = el('div', 'type-options');
  let selected;
  for (const [type, info] of Object.entries(types)) {
    const label = el('label', `type-option widget-${type}`);
    const input = el('input', 'sr-only');
    input.type = 'radio';
    input.name = 'widget-type';
    input.value = type;
    input.required = true;
    if (type === preselected) {
      input.checked = true;
      selected = input;
    }
    const tile = el('span', 'type-tile');
    tile.append(...typeTile(type, info));
    label.append(input, tile);
    options.append(label);
  }
  group.append(el('legend', 'field-label', 'Тип виджета'), options);
  const { wrapper, control } = field('Заголовок', 'title', {
    maxLength: 80,
    required: true,
    missing: 'Введите заголовок виджета.',
    placeholder: 'Например, План на неделю…',
  });
  const buttons = formButtons('Добавить виджет');
  form.append(group, wrapper, buttons);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = control.value.trim();
    if (!validate(control, title ? '' : 'Введите заголовок виджета.')) return;
    const widget = makeWidget(new FormData(form).get('widget-type'), title);
    state.widgets.push(widget);
    syncGrid();
    save();
    if (widget.type === 'chart') loadChart(widget);
    modal.close();
    notify('Виджет добавлен');
  });
  modal.open('Добавить виджет', form, preselected === 'note' ? selected : control);
}

function formButtons(submitLabel) {
  const container = el('div', 'form-actions');
  const submit = button(submitLabel, 'button button-primary');
  submit.type = 'submit';
  container.append(button('Отмена', 'button button-secondary', modal.close), submit);
  return container;
}

function openEditor({ heading, label, name, options, hint, onSave, restore }) {
  const form = el('form', 'modal-stack');
  const { wrapper, control, error } = field(label, name, options);
  if (hint) {
    const description = el('p', 'muted field-hint', hint);
    description.id = `${control.id}-hint`;
    control.setAttribute('aria-describedby', `${description.id} ${error.id}`);
    wrapper.insertBefore(description, error);
  }
  form.append(wrapper, formButtons('Сохранить'));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (onSave(control) === false) return;
    save();
    modal.close();
    notify('Изменения сохранены');
  });
  modal.open(heading, form, control, restore);
}

function move(id, targetId, after, restoreFocus = false) {
  const from = state.widgets.findIndex((widget) => widget.id === id);
  const target = state.widgets.findIndex((widget) => widget.id === targetId);
  if (from < 0 || target < 0 || from === target) return;
  const to = target + Number(after) - Number(from < target);
  if (to === from) return;
  const [widget] = state.widgets.splice(from, 1);
  state.widgets.splice(to, 0, widget);
  closeMoveMenus();
  syncGrid();
  save();
  if (restoreFocus) focusCard(id, 'move')().focus();
  notify(`Виджет перемещён на позицию ${to + 1}`);
}

function closeMoveMenus(except) {
  for (const { node } of cards.values()) if (node !== except) node.closeMoveMenu();
}

function fetchChartValues() {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => {
        if (Math.random() < 0.2) reject(new Error('Сбой загрузки'));
        else resolve([14, 23, 16, 34, 28, 39]);
      },
      500 + Math.floor(Math.random() * 501),
    );
  });
}

async function loadChart(widget) {
  const { id } = widget;
  if (chartRequests.get(id)?.status === 'loading' || widget.data.values) return;
  const retryFocused =
    document.activeElement === cards.get(id)?.node.querySelector('[data-action="retry-chart"]');
  const request = { status: 'loading' };
  chartRequests.set(id, request);
  cards.get(id)?.refresh();
  const anchor = focusCard(id, 'collapse')();
  if (retryFocused) anchor.focus();
  try {
    const values = await fetchChartValues();
    if (chartRequests.get(id) !== request) return;
    widget.data.values = values;
    chartRequests.delete(id);
    save();
  } catch {
    if (chartRequests.get(id) !== request) return;
    request.status = 'error';
  }
  cards.get(id)?.refresh();
  if (retryFocused && document.activeElement === anchor && !widget.collapsed) {
    focusCard(id, widget.data.values ? 'chart-data' : 'retry-chart')().focus();
  }
}

const actions = {
  save,
  notify,
  closeMoveMenus,
  chartStatus: (id) => chartRequests.get(id)?.status,
  loadChart,
  moveBy(id, direction) {
    const index = state.widgets.findIndex((widget) => widget.id === id);
    const target = state.widgets[index + direction];
    if (target) move(id, target.id, direction > 0, true);
  },
  rename(widget) {
    openEditor({
      heading: 'Изменить заголовок',
      label: 'Заголовок',
      name: 'title',
      options: { value: widget.title, required: true, maxLength: 80 },
      restore: focusCard(widget.id, 'rename'),
      onSave(control) {
        const title = control.value.trim();
        if (!validate(control, title ? '' : 'Введите заголовок виджета.')) return false;
        widget.title = title;
        cards.get(widget.id).rename();
        return true;
      },
    });
  },
  editNote(widget) {
    openEditor({
      heading: 'Редактировать заметку',
      label: 'Текст заметки',
      name: 'note',
      options: { value: widget.data.text, multiline: true, maxLength: 4000 },
      restore: focusCard(widget.id, 'edit-note'),
      onSave(control) {
        widget.data.text = control.value;
        cards.get(widget.id).refresh();
      },
    });
  },
  editChart(widget) {
    openEditor({
      heading: 'Изменить данные графика',
      label: 'Значения',
      name: 'values',
      hint: 'Введите от 1 до 12 чисел через запятую. Для дробной части используйте точку: 12, -3, 4.5.',
      options: { value: widget.data.values.join(', '), required: true, maxLength: 350 },
      restore: focusCard(widget.id, 'chart-data'),
      onSave(control) {
        const values = control.value.split(',').map((value) => {
          const token = value.trim();
          return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token) ? Number(token) : NaN;
        });
        if (
          !validate(
            control,
            validValues(values)
              ? ''
              : 'Введите до 12 чисел в диапазоне от −1 000 000 000 до 1 000 000 000.',
          )
        )
          return false;
        widget.data.values = values;
        cards.get(widget.id).refresh();
        return true;
      },
    });
  },
  remove(widget) {
    const index = state.widgets.indexOf(widget);
    const neighbor = state.widgets[index + 1] ?? state.widgets[index - 1];
    modal.confirm(
      'Удалить виджет?',
      `«${widget.title}» и его содержимое будут удалены.`,
      'Удалить виджет',
      () => {
        state.widgets.splice(index, 1);
        syncGrid();
        save();
        notify('Виджет удалён');
      },
      () =>
        cards.has(widget.id)
          ? focusCard(widget.id, 'remove')()
          : focusCard(neighbor?.id, 'rename')(),
    );
  },
};

$('#theme-icon').replaceWith(icon('theme'));
$('#theme').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  syncTheme();
  save();
});
addButton.addEventListener('click', () => openAdd());
$('#add-first').addEventListener('click', () => openAdd());
resetButton.addEventListener('click', () => {
  modal.confirm(
    'Сбросить дашборд?',
    'Все виджеты и их содержимое будут удалены. Тема сохранится.',
    'Сбросить дашборд',
    () => {
      state.widgets = [];
      syncGrid();
      save();
      notify('Дашборд сброшен');
    },
  );
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-grip], .move-menu')) closeMoveMenus();
});
enableReorder(grid, move);
renderQuickStart();
syncTheme();
syncGrid();
for (const widget of state.widgets)
  if (widget.type === 'chart' && !widget.data.values) loadChart(widget);
