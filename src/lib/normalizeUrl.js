export function toAbsoluteUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl);
  } catch {
    return null;
  }
}

export function normalizeUrl(url) {
  const clone = new URL(url.toString());
  clone.hash = "";
  clone.hostname = clone.hostname.toLowerCase();

  if ((clone.protocol === "https:" && clone.port === "443") || (clone.protocol === "http:" && clone.port === "80")) {
    clone.port = "";
  }

  // Treat trailing slash versions as one URL.
  if (clone.pathname.length > 1 && clone.pathname.endsWith("/")) {
    clone.pathname = clone.pathname.slice(0, -1);
  }

  return clone.toString();
}

export function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isSameSiteHost(a, b) {
  return normalizeHost(a) === normalizeHost(b);
}

export function isAllowedHost(hostname, rootHostname, strictHost = false) {
  const host = hostname.toLowerCase();
  const root = rootHostname.toLowerCase();

  if (strictHost) {
    return host === root || isSameSiteHost(host, root);
  }

  if (isSameSiteHost(host, root)) return true;

  const rootBase = normalizeHost(root);
  const hostBase = normalizeHost(host);
  return hostBase === rootBase || hostBase.endsWith(`.${rootBase}`);
}

export function isHtmlLikePath(url) {
  const pathname = url.pathname.toLowerCase();
  if (pathname === "/" || pathname.endsWith("/")) return true;

  // Keep common document-like extensions and extension-less paths.
  return !/\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|gz|mp4|mov|webm|mp3|css|js|json|xml|txt)$/i.test(
    pathname
  );
}
