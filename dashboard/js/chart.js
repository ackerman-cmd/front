import { button, el, icon } from './dom.js';

const decimal = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 15 });
const scientific = new Intl.NumberFormat('ru-RU', {
  notation: 'scientific',
  maximumSignificantDigits: 15,
});
const formatValue = (value) =>
  value !== 0 && Math.abs(value) < 1e-6 ? scientific.format(value) : decimal.format(value);

function plot(values) {
  const chart = el('div', 'chart');
  const visual = el('div', 'plot');
  const readings = el('ol', 'chart-values');
  readings.setAttribute('aria-label', 'Значения столбцов');
  visual.setAttribute('aria-hidden', 'true');
  const high = Math.max(0, ...values);
  const low = Math.min(0, ...values);
  const range = high - low || 1;
  const baseline = high === low ? 100 : (high / range) * 100;
  visual.style.setProperty('--baseline', `${baseline}%`);
  visual.style.setProperty('--columns', values.length);
  for (const [index, value] of values.entries()) {
    const col = el('div', 'plot-column');
    const bar = el('span', value === 0 ? 'bar zero' : value < 0 ? 'bar negative' : 'bar');
    const position = index + 1;
    const top = Math.max(0, baseline - (Math.max(0, value) / range) * 100);
    bar.style.top = `${top}%`;
    if (value !== 0) bar.style.height = `${(Math.abs(value) / range) * 100}%`;
    bar.title = `${position}: ${formatValue(value)}`;
    col.append(bar, el('span', 'plot-index', String(position)));
    visual.append(col);
    const reading = el('li', 'chart-reading');
    const label = el('span', 'chart-reading-index', String(position));
    label.setAttribute('aria-hidden', 'true');
    reading.append(label, el('bdi', '', formatValue(value)));
    readings.append(reading);
  }
  chart.append(visual, readings);
  return chart;
}

function chartStatus(status) {
  const feedback = el('div', 'chart-feedback');
  const message = el('p', status === 'error' ? 'error-text' : 'loading');
  message.setAttribute('role', 'status');
  if (status === 'error') {
    message.append(icon('warning'), 'Не удалось загрузить значения графика. Повторите попытку.');
  } else {
    const skeleton = el('div', 'chart-skeleton');
    skeleton.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) skeleton.append(el('span'));
    feedback.append(skeleton);
    message.textContent = 'Загрузка графика…';
  }
  feedback.append(message);
  return feedback;
}

export function renderChart(widget, actions) {
  const content = el('div', 'widget-stack');
  const status = actions.chartStatus(widget.id);
  if (widget.data.values) {
    const edit = button('Изменить данные', 'button button-secondary', () =>
      actions.editChart(widget),
    );
    edit.dataset.action = 'chart-data';
    content.append(plot(widget.data.values), edit);
  } else if (status === 'error') {
    const retry = button('Повторить', 'button button-secondary', () => actions.loadChart(widget));
    retry.dataset.action = 'retry-chart';
    content.append(chartStatus('error'), retry);
  } else {
    content.append(chartStatus('loading'));
  }
  return content;
}
