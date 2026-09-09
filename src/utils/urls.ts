const BASE_URL = import.meta.env.BASE_URL;

function withoutLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}

export function assetUrl(source: string) {
  if (
    /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(source) ||
    source.startsWith(BASE_URL)
  ) {
    return source;
  }
  return `${BASE_URL}${withoutLeadingSlash(source)}`;
}

export function siteUrl(path: string) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) return path;
  return `${BASE_URL}${withoutLeadingSlash(path)}`;
}

export function routePath(pathname: string) {
  const basePath = new URL(BASE_URL, window.location.origin).pathname;
  if (basePath !== "/" && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

export function preloadImage(source: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().catch(() => {}).finally(finish);
      } else {
        finish();
      }
    };
    image.onerror = finish;
    image.src = source;
    if (image.complete) finish();
  });
}
