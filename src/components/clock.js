const ZONE = 'Europe/Amsterdam';

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const hourFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
});

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  weekday: 'short',
});

const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function statusFor(now) {
  const hour = Number(hourFormat.format(now));
  const day = DAYS[dayFormat.format(now)] ?? 1;

  if (hour >= 22 || hour < 8) return 'Most likely sleeping';
  if (day >= 1 && day <= 5 && hour >= 9 && hour < 16) return 'Most likely at school';
  return 'Probably building cool sh*t';
}

export function initClock() {
  const times = [...document.querySelectorAll('[data-time]')];
  const statuses = [...document.querySelectorAll('[data-status]')];
  if (!times.length && !statuses.length) return;

  const update = () => {
    const now = new Date();
    const time = timeFormat.format(now);
    const status = statusFor(now);

    times.forEach((node) => {
      node.textContent = time;
    });
    statuses.forEach((node) => {
      node.textContent = status;
    });
  };

  update();
  setInterval(update, 20000);
  document.addEventListener('visibilitychange', update);
}
