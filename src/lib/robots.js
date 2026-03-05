import { toAbsoluteUrl } from "./normalizeUrl.js";

function parseRobotsForWildcard(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  const wildcardRules = [];
  let activeForWildcard = false;

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      activeForWildcard = value === "*";
      continue;
    }

    if (activeForWildcard && key === "disallow") {
      wildcardRules.push(value);
    }
  }

  return wildcardRules;
}

export async function getRobotsRules(rootUrl) {
  const robotsUrl = toAbsoluteUrl(rootUrl, "/robots.txt");
  if (!robotsUrl) return [];

  try {
    const response = await fetch(robotsUrl.toString(), {
      headers: { "User-Agent": "llms-txt-generator/1.0" }
    });

    if (!response.ok) return [];
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/plain")) {
      // Some sites omit content type; still parse as text anyway.
    }

    const text = await response.text();
    return parseRobotsForWildcard(text);
  } catch {
    return [];
  }
}

export function isBlockedByRobots(url, disallowRules) {
  if (!disallowRules.length) return false;

  return disallowRules.some((rule) => {
    if (!rule) return false;
    if (rule === "/") return true;
    return url.pathname.startsWith(rule);
  });
}
