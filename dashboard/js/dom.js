export const $ = (selector, root = document) => root.querySelector(selector);

export function el(tag, className, label) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (label !== undefined) node.textContent = label;
  return node;
}

const icons = {
  note: '<path d="M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6"/>',
  counter: '<path d="M4 8h8 M8 4v8 M13 17h7"/>',
  tasks: '<path d="m3 7 2 2 3-4 M11 7h10 M3 15l2 2 3-4 M11 15h10"/>',
  chart: '<path d="M4 20h16 M6 16v-4 M12 16V4 M18 16V8"/>',
  warning:
    '<path d="M12 8v5m0 3h.01 M10.5 4.8 3 18a1 1 0 0 0 .9 1.5h16.2A1 1 0 0 0 21 18l-7.5-13.2a1.7 1.7 0 0 0-3 0Z"/>',
  theme: '<path d="M20 15.1A8.6 8.6 0 0 1 8.9 4 8.5 8.5 0 1 0 20 15.1Z"/>',
  grip: '<path d="M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01" stroke-width="3.2"/>',
  edit: '<path d="m15 5 4 4 M5 19l4-.8 11-11-3.2-3.2-11 11z"/>',
  collapse: '<path d="m6 15 6-6 6 6"/>',
  expand: '<path d="m6 9 6 6 6-6"/>',
  remove: '<path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 10v7 M14 10v7"/>',
};

export function icon(name) {
  const slot = el('span', 'icon-slot');
  slot.setAttribute('aria-hidden', 'true');
  slot.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">${icons[name]}</svg>`;
  return slot;
}

export function button(label, className = 'button button-secondary', handler) {
  const node = el('button', className, label);
  node.type = 'button';
  if (handler) node.addEventListener('click', handler);
  return node;
}

export function iconButton(name, label, handler) {
  const node = button('', 'icon-button', handler);
  node.setAttribute('aria-label', label);
  node.title = label;
  node.append(icon(name));
  return node;
}

let fieldSequence = 0;

export function field(label, name, options = {}) {
  const wrapper = el('div', 'field');
  const caption = el('label', 'field-label', label);
  const control = el(options.multiline ? 'textarea' : 'input');
  control.id = `field-${++fieldSequence}`;
  caption.htmlFor = control.id;
  control.name = name;
  control.autocomplete = 'off';
  control.value = options.value ?? '';
  if (options.type) control.type = options.type;
  if (options.maxLength) control.maxLength = options.maxLength;
  if (options.min !== undefined) control.min = options.min;
  if (options.required) control.required = true;
  if (options.placeholder) control.placeholder = options.placeholder;
  if (options.multiline) control.rows = 5;
  const error = el('p', 'field-error');
  error.id = `${control.id}-error`;
  error.hidden = true;
  control.setAttribute('aria-describedby', error.id);
  control.addEventListener('input', () => validate(control, ''));
  control.addEventListener('invalid', (event) => {
    event.preventDefault();
    const message = control.validity.valueMissing
      ? (options.missing ?? `Заполните поле «${label}».`)
      : (options.invalid ?? control.validationMessage);
    showError(control, message);
    control.focus();
  });
  wrapper.append(caption, control, error);
  return { wrapper, control, error };
}

function showError(control, message) {
  const error = document.getElementById(`${control.id}-error`);
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
  if (message) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
}

export function validate(control, message) {
  control.setCustomValidity(message);
  showError(control, message);
  if (message) control.focus();
  return !message;
}
