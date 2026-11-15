import { button, el, field, icon, iconButton, validate } from './dom.js';
import { renderChart } from './chart.js';
import { makeId, types } from './state.js';

const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 });

function note(widget, actions) {
  const content = el('div', 'widget-stack');
  const text = el(
    'p',
    `note-text${widget.data.text ? '' : ' muted'}`,
    widget.data.text || 'Здесь пока ничего нет.',
  );
  const edit = button('Редактировать заметку', 'button button-secondary', () =>
    actions.editNote(widget),
  );
  edit.dataset.action = 'edit-note';
  text.dir = 'auto';
  if (widget.data.text) text.tabIndex = 0;
  text.title = 'Двойной клик для редактирования';
  text.addEventListener('dblclick', () => actions.editNote(widget));
  content.append(text, edit);
  return content;
}

function counter(widget, actions) {
  const data = widget.data;
  const content = el('div', 'widget-stack');
  const controls = el('div', 'counter-controls');
  const value = el('output', 'counter-value', number.format(data.value));
  value.setAttribute('aria-label', 'Значение счётчика');

  function adjust(sign) {
    const next = data.value + sign * data.step;
    if (!Number.isSafeInteger(next)) return actions.notify('Достигнут предел счётчика');
    data.value = next;
    value.textContent = number.format(next);
    actions.save();
  }

  const minus = button('−', 'button button-secondary', () => adjust(-1));
  const plus = button('+', 'button button-secondary', () => adjust(1));
  minus.setAttribute('aria-label', 'Уменьшить счётчик');
  plus.setAttribute('aria-label', 'Увеличить счётчик');
  controls.append(minus, value, plus);

  const form = el('form', 'inline-form');
  const step = field('Шаг', 'step', { value: data.step, type: 'number', min: 1, required: true });
  const submit = button('Сохранить шаг');
  submit.type = 'submit';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = step.control.valueAsNumber;
    if (
      !validate(
        step.control,
        Number.isSafeInteger(next) && next > 0 ? '' : 'Введите положительное целое число.',
      )
    )
      return;
    data.step = next;
    actions.save();
    actions.notify('Шаг сохранён');
  });
  form.append(step.wrapper, submit);
  content.append(controls, form);
  return content;
}

function tasks(widget, actions) {
  const content = el('div', 'widget-stack');
  const form = el('form', 'inline-form');
  const input = field('Новая задача', 'task', {
    placeholder: 'Например, прочитать главу…',
    maxLength: 160,
    required: true,
  });
  const add = button('Добавить');
  add.type = 'submit';
  const list = el('ul', 'task-list');
  const empty = el('p', 'muted', 'Список пока пуст.');
  const data = widget.data;

  function updateEmpty() {
    empty.hidden = data.items.length > 0;
  }

  function row(item) {
    const li = el('li', 'task');
    const label = el('label', 'task-label');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.done;
    checkbox.name = 'completed';
    checkbox.addEventListener('change', () => {
      item.done = checkbox.checked;
      actions.save();
    });
    label.append(checkbox, el('bdi', '', item.text));
    const remove = iconButton('remove', `Удалить задачу: ${item.text}`, () => {
      const focus =
        li.nextElementSibling?.querySelector('button') ??
        li.previousElementSibling?.querySelector('button') ??
        input.control;
      data.items = data.items.filter(({ id }) => id !== item.id);
      li.remove();
      updateEmpty();
      actions.save();
      focus.focus();
    });
    li.append(label, remove);
    return li;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.control.value.trim();
    if (!validate(input.control, text ? '' : 'Введите название задачи.')) return;
    const item = { id: makeId(), text, done: false };
    data.items.push(item);
    list.append(row(item));
    updateEmpty();
    form.reset();
    actions.save();
    input.control.focus();
  });

  form.append(input.wrapper, add);
  list.append(...data.items.map(row));
  updateEmpty();
  content.append(form, empty, list);
  return content;
}

const bodies = { note, counter, tasks, chart: renderChart };

export function renderWidget(widget, actions, index, total) {
  const { id, type, title } = widget;
  const node = el('article', `widget widget-${type}`);
  node.dataset.id = id;
  node.setAttribute('aria-labelledby', `title-${id}`);
  const header = el('header', 'widget-header');
  const heading = el('h3', 'widget-title', title);
  heading.dir = 'auto';
  heading.id = `title-${id}`;
  const meta = el('div', 'widget-meta');
  const badge = el('span', 'type-icon');
  badge.append(icon(type));
  const names = el('div', 'widget-names');
  const typeLabel = el('p', 'type-label', types[type].name);
  names.append(typeLabel, heading);
  meta.append(badge, names);

  const body = el('div', 'widget-body');
  body.id = `body-${id}`;
  body.hidden = widget.collapsed;
  body.append(bodies[type](widget, actions));

  const toolbar = el('div', 'widget-actions');
  const rename = iconButton('edit', 'Изменить заголовок', () => actions.rename(widget));
  rename.dataset.action = 'rename';
  const collapse = iconButton(
    widget.collapsed ? 'expand' : 'collapse',
    widget.collapsed ? 'Развернуть виджет' : 'Свернуть виджет',
    () => {
      widget.collapsed = !widget.collapsed;
      syncCollapse();
      actions.save();
    },
  );
  collapse.dataset.action = 'collapse';
  collapse.setAttribute('aria-controls', body.id);
  function syncCollapse() {
    const label = widget.collapsed ? 'Развернуть виджет' : 'Свернуть виджет';
    collapse.replaceChildren(icon(widget.collapsed ? 'expand' : 'collapse'));
    collapse.setAttribute('aria-label', label);
    collapse.title = label;
    collapse.setAttribute('aria-expanded', String(!widget.collapsed));
    body.hidden = widget.collapsed;
  }
  syncCollapse();
  const remove = iconButton('remove', 'Удалить виджет', () => actions.remove(widget));
  remove.dataset.action = 'remove';
  remove.classList.add('remove-button');
  const menu = el('div', 'move-menu');
  menu.id = `move-${id}`;
  menu.hidden = true;
  const grip = iconButton('grip', 'Переместить виджет', () => setMoveOpen(menu.hidden));
  grip.dataset.grip = '';
  grip.dataset.action = 'move';
  grip.draggable = true;
  grip.classList.add('grip');
  grip.setAttribute('aria-controls', menu.id);
  grip.setAttribute('aria-describedby', 'reorder-help');
  grip.setAttribute('aria-expanded', 'false');
  function setMoveOpen(open) {
    if (open) actions.closeMoveMenus(node);
    menu.hidden = !open;
    grip.setAttribute('aria-expanded', String(open));
  }
  node.closeMoveMenu = () => setMoveOpen(false);
  node.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setMoveOpen(false);
      grip.focus();
    }
  });
  const previous = button('На одну позицию вперёд', 'button button-quiet', () =>
    actions.moveBy(id, -1),
  );
  const next = button('На одну позицию назад', 'button button-quiet', () => actions.moveBy(id, 1));
  menu.append(previous, next);
  const setPosition = (position, count) => {
    previous.disabled = position === 0;
    next.disabled = position === count - 1;
  };
  setPosition(index, total);
  toolbar.append(rename, collapse, remove, grip, menu);
  header.append(meta, toolbar);
  node.append(header, body);

  return {
    node,
    setPosition,
    rename() {
      heading.textContent = widget.title;
    },
    refresh() {
      body.replaceChildren(bodies[type](widget, actions));
    },
  };
}
