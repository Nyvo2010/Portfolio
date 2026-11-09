import { site } from '../data.js';
import { replaceChildren } from '../lib/env.js';

const attrs = (href) =>
  href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';

// A hash link only means something on the page that owns the target. Everywhere
// else it points back to the homepage, so the same nav data works on the lab.
const resolve = (href) =>
  href.startsWith('#') && !document.querySelector(href) ? `/${href}` : href;

const render = (items) =>
  items
    .map((item) => {
      const href = resolve(item.href);
      return `<a class="hbtn" href="${href}"${attrs(href)}>${item.label}</a>`;
    })
    .join('');

export function initLinks() {
  document.querySelectorAll('[data-nav]').forEach((node) => {
    node.innerHTML = render(site.nav);
  });

  document.querySelectorAll('[data-footer-nav]').forEach((node) => {
    node.innerHTML = render(site.footerNav);
  });

  document.querySelectorAll('[data-social-list]').forEach((node) => {
    const items =
      node.dataset.socialList === 'header'
        ? site.socials.filter((item) => item.header !== false)
        : site.socials;
    node.innerHTML = render(items);
  });

  replaceChildren(
    document.querySelector('[data-menu-nav]'),
    site.nav.map((item) => {
      const link = document.createElement('a');
      link.className = 'hbtn';
      link.href = resolve(item.href);
      link.textContent = item.label;
      return link;
    }),
  );

  replaceChildren(
    document.querySelector('[data-menu-social]'),
    site.socials.map((item) => {
      const link = document.createElement('a');
      link.className = 'hbtn';
      link.href = item.href;
      link.textContent = item.label;
      if (item.href.startsWith('http')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      return link;
    }),
  );

  document.querySelectorAll('[data-mail]').forEach((node) => {
    node.href = `mailto:${site.email}`;
    if (node.hasAttribute('data-mail-text')) node.textContent = site.email;
  });
}
