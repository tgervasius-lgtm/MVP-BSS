const HEAD_ENTRIES = Object.freeze([
  Object.freeze({ tag: 'meta', key: 'name', value: 'theme-color', attributes: { content: '#0b1627' } }),
  Object.freeze({ tag: 'meta', key: 'name', value: 'mobile-web-app-capable', attributes: { content: 'yes' } }),
  Object.freeze({ tag: 'meta', key: 'name', value: 'apple-mobile-web-app-capable', attributes: { content: 'yes' } }),
  Object.freeze({ tag: 'meta', key: 'name', value: 'apple-mobile-web-app-status-bar-style', attributes: { content: 'black-translucent' } }),
  Object.freeze({ tag: 'meta', key: 'name', value: 'apple-mobile-web-app-title', attributes: { content: 'BSS Preview' } }),
  Object.freeze({ tag: 'link', key: 'rel', value: 'manifest', attributes: { href: 'manifest.webmanifest' } }),
  Object.freeze({ tag: 'link', key: 'rel', value: 'icon', attributes: { href: 'app-icon.svg', type: 'image/svg+xml' } }),
  Object.freeze({ tag: 'link', key: 'rel', value: 'apple-touch-icon', attributes: { href: 'app-icon-192.png', sizes: '192x192' } })
]);

function findEntry(documentRef, entry) {
  return documentRef.head?.querySelector?.(`${entry.tag}[${entry.key}="${entry.value}"]`) ?? null;
}

export function installMobileShell(documentRef = globalThis.document) {
  if (!documentRef?.head?.append || !documentRef?.createElement) return 0;
  let created = 0;

  for (const entry of HEAD_ENTRIES) {
    let element = findEntry(documentRef, entry);
    if (!element) {
      element = documentRef.createElement(entry.tag);
      element.setAttribute(entry.key, entry.value);
      documentRef.head.append(element);
      created += 1;
    }
    for (const [name, value] of Object.entries(entry.attributes)) {
      element.setAttribute(name, value);
    }
  }

  documentRef.documentElement?.classList?.add('app-shell-ready');
  return created;
}

export async function registerPreviewServiceWorker(navigatorRef = globalThis.navigator) {
  if (!navigatorRef?.serviceWorker?.register) return null;

  try {
    return await navigatorRef.serviceWorker.register('sw.js', {
      scope: './',
      updateViaCache: 'none'
    });
  } catch {
    return null;
  }
}

export { HEAD_ENTRIES };
