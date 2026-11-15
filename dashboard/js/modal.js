import { $, button, el } from './dom.js';

const focusable =
  'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';

export function makeModal(dialog) {
  const title = $('#modal-title', dialog);
  const body = $('#modal-body', dialog);
  let restoreFocus;
  let overlayPress = false;

  function close() {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove('modal-open');
    body.replaceChildren();
    const focus = restoreFocus?.();
    restoreFocus = null;
    focus?.focus();
  }
  $('[data-close]', dialog).addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('pointerdown', (event) => {
    overlayPress = event.target === dialog;
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && overlayPress) close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll(focusable)].filter(
      (node) => !node.closest('[hidden]') && (node.type !== 'radio' || node.checked),
    );
    const first = items.at(0);
    const last = items.at(-1);
    if (!first) return;
    const active = document.activeElement;
    if (
      event.shiftKey
        ? active === first || !items.includes(active)
        : active === last || !items.includes(active)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });

  function open(heading, content, initial, restore) {
    const previous = document.activeElement;
    restoreFocus =
      restore ??
      (() =>
        previous.isConnected && !previous.closest('[hidden]') && !previous.disabled
          ? previous
          : $('#add'));
    title.textContent = heading;
    body.replaceChildren(content);
    overlayPress = false;
    dialog.showModal();
    document.body.classList.add('modal-open');
    initial?.focus();
  }

  function confirm(heading, description, label, action, restore) {
    const content = el('div', 'modal-stack');
    const actions = el('div', 'form-actions');
    const cancel = button('Отмена', 'button button-secondary', close);
    actions.append(
      cancel,
      button(label, 'button button-danger', () => {
        action();
        close();
      }),
    );
    content.append(el('p', 'muted', description), actions);
    open(heading, content, cancel, restore);
  }

  return { open, close, confirm };
}
