import { useEffect } from 'react';

interface PageHeadOptions {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const [, key, name] = selector.match(/meta\[(name|property)="([^"]+)"\]/) || [];
    if (key && name) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePageHead({ title, description, path, noindex }: PageHeadOptions) {
  useEffect(() => {
    const url = `https://shahifa.com${path}`;
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setLink('canonical', url);
    if (noindex) {
      setMeta('meta[name="robots"]', 'content', 'noindex, nofollow');
    }
  }, [title, description, path, noindex]);
}
