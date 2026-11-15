export function enableReorder(grid, move) {
  let active = null;
  let dragged = null;
  let place = null;
  let touch = null;
  let skipClick = false;
  let raf = 0;

  function setPlace(card, after = false) {
    if (place && place.card === card && place.after === after) return;
    place?.card.classList.remove('insert-before', 'insert-after');
    place = card ? { card, after } : null;
    if (place) card.classList.add(after ? 'insert-after' : 'insert-before');
  }

  function inspect(x, y, element) {
    const card = element?.closest('.widget');
    if (card === dragged || !grid.contains(element)) return setPlace(null);
    if (card) {
      const rect = card.getBoundingClientRect();
      const horizontal = getComputedStyle(grid).gridTemplateColumns.split(' ').length > 1;
      return setPlace(
        card,
        horizontal ? x >= rect.left + rect.width / 2 : y >= rect.top + rect.height / 2,
      );
    }
    const candidates = [...grid.children]
      .filter((item) => item !== dragged)
      .map((item) => ({ item, rect: item.getBoundingClientRect() }));
    const nearest = candidates.reduce((best, candidate) => {
      const { rect } = candidate;
      const distance = Math.hypot(x - rect.left - rect.width / 2, y - rect.top - rect.height / 2);
      return !best || distance < best.distance ? { ...candidate, distance } : best;
    }, null);
    if (!nearest) return setPlace(null);
    const { rect } = nearest;
    return setPlace(
      nearest.item,
      y >= rect.bottom || (y >= rect.top && x >= rect.left + rect.width / 2),
    );
  }

  function start(card) {
    dragged = card;
    active = card.dataset.id;
    card.classList.add('dragging');
    grid.classList.add('reordering');
  }

  function stop(commit = false) {
    const target = place;
    const id = active;
    setPlace(null);
    dragged?.classList.remove('dragging');
    grid.classList.remove('reordering');
    dragged = null;
    active = null;
    if (commit && id && target) move(id, target.card.dataset.id, target.after);
  }

  grid.addEventListener('dragstart', (event) => {
    const handle = event.target.closest('[data-grip]');
    if (!handle || touch) return event.preventDefault();
    start(handle.closest('.widget'));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', active);
    if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(dragged, 32, 24);
  });
  grid.addEventListener('dragover', (event) => {
    if (!active || touch) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    inspect(event.clientX, event.clientY, event.target);
  });
  grid.addEventListener('dragleave', (event) => {
    if (!grid.contains(event.relatedTarget)) setPlace(null);
  });
  grid.addEventListener('drop', (event) => {
    if (!active || touch) return;
    event.preventDefault();
    inspect(event.clientX, event.clientY, event.target);
    stop(true);
  });
  grid.addEventListener('dragend', () => stop());

  function trackTouch() {
    if (!touch || !active) return;
    const { x, y } = touch;
    const edge = Math.min(86, innerHeight / 5);
    if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 5));
    else if (y > innerHeight - edge) window.scrollBy(0, Math.ceil((y - innerHeight + edge) / 5));
    inspect(x, y, document.elementFromPoint(x, y));
    raf = requestAnimationFrame(trackTouch);
  }

  grid.addEventListener(
    'touchstart',
    (event) => {
      const handle = event.target.closest('[data-grip]');
      if (!handle || touch || event.touches.length !== 1) return;
      const finger = event.changedTouches[0];
      touch = {
        id: finger.identifier,
        card: handle.closest('.widget'),
        startX: finger.clientX,
        startY: finger.clientY,
      };
    },
    { passive: true },
  );
  grid.addEventListener(
    'touchmove',
    (event) => {
      if (!touch) return;
      const finger = [...event.changedTouches].find((item) => item.identifier === touch.id);
      if (!finger) return;
      touch.x = finger.clientX;
      touch.y = finger.clientY;
      if (!active && Math.hypot(touch.x - touch.startX, touch.y - touch.startY) < 8) return;
      if (event.cancelable) event.preventDefault();
      if (!active) {
        start(touch.card);
        trackTouch();
      }
    },
    { passive: false },
  );

  function finishTouch(event, commit) {
    if (!touch || ![...event.changedTouches].some((finger) => finger.identifier === touch.id))
      return;
    if (active) {
      if (event.cancelable) event.preventDefault();
      skipClick = true;
      setTimeout(() => {
        skipClick = false;
      }, 400);
      if (commit) {
        const finger = [...event.changedTouches].find((item) => item.identifier === touch.id);
        inspect(
          finger.clientX,
          finger.clientY,
          document.elementFromPoint(finger.clientX, finger.clientY),
        );
      }
      stop(commit);
      cancelAnimationFrame(raf);
    }
    touch = null;
  }
  grid.addEventListener('touchend', (event) => finishTouch(event, true), { passive: false });
  grid.addEventListener('touchcancel', (event) => finishTouch(event, false));
  grid.addEventListener(
    'click',
    (event) => {
      if (skipClick && event.target.closest('[data-grip]')) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}
