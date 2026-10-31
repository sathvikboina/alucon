import api from "./api";

// Behavioural signal collector for the feed recommender.
//
// Events are batched in memory and flushed every few seconds, when the batch
// fills, or when the tab is hidden. `fetch(..., { keepalive: true })` is used
// for the last flush because `navigator.sendBeacon` cannot attach the
// `x-auth-token` header this API expects.

const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 50;
const MAX_DWELL_SECONDS = 30;

const queue = [];
let flushTimer = null;
let flushing = false;

const sessionId = (() => {
  try {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (error) {
    // Fall through to the timestamp form.
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
})();

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushFeedEvents();
  }, FLUSH_INTERVAL_MS);
}

export function trackFeedEvent(event) {
  if (!event || !event.type) return;
  queue.push({
    ...event,
    sessionId,
    surface: event.surface || "feed",
  });

  if (queue.length >= MAX_BATCH) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushFeedEvents();
  } else {
    scheduleFlush();
  }
}

export async function flushFeedEvents({ keepalive = false } = {}) {
  if (flushing || queue.length === 0) return;
  flushing = true;

  const batch = queue.splice(0, MAX_BATCH);

  try {
    if (keepalive && typeof fetch !== "undefined") {
      const token = localStorage.getItem("token");
      await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/feed/events`,
        {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-auth-token": token } : {}),
          },
          body: JSON.stringify({ events: batch }),
        }
      );
    } else {
      await api.post("/api/feed/events", { events: batch });
    }
  } catch (error) {
    // Telemetry must never break the UI. A dropped batch is acceptable.
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush();
  }
}

export async function resetFeedRecommendations() {
  queue.length = 0;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await api.post("/api/feed/reset");
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushFeedEvents({ keepalive: true });
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    flushFeedEvents({ keepalive: true });
  });
}

/**
 * Watch feed cards for impressions and dwell time.
 *
 * - An impression is recorded once per post per session after it has been at
 *   least 50% visible for 800 ms (IntersectionObserver API).
 * - Dwell time is accumulated while the card is visible, capped at 30 s.
 *
 * Returns a cleanup function; it also flushes dwell for cards still on screen.
 */
export function observeFeed(container, { surface = "feed" } = {}) {
  if (
    !container ||
    typeof window === "undefined" ||
    typeof IntersectionObserver === "undefined"
  ) {
    return () => {};
  }

  const impressionTimers = new Map();
  const visibleSince = new Map();
  const seen = new Set();

  const finishDwell = (postId) => {
    if (!visibleSince.has(postId)) return;
    const seconds = (Date.now() - visibleSince.get(postId)) / 1000;
    visibleSince.delete(postId);
    if (seconds >= 2) {
      trackFeedEvent({
        type: "dwell",
        postId,
        value: Math.min(MAX_DWELL_SECONDS, Math.round(seconds)),
        surface,
      });
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        const postId = element.dataset.postId;
        if (!postId) return;
        const channel = element.dataset.channel || "";

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!seen.has(postId) && !impressionTimers.has(postId)) {
            impressionTimers.set(
              postId,
              setTimeout(() => {
                impressionTimers.delete(postId);
                if (seen.has(postId)) return;
                seen.add(postId);
                trackFeedEvent({
                  type: "impression",
                  postId,
                  channel,
                  surface,
                });
              }, 800)
            );
          }
          if (!visibleSince.has(postId)) {
            visibleSince.set(postId, Date.now());
          }
        } else {
          const timer = impressionTimers.get(postId);
          if (timer) {
            clearTimeout(timer);
            impressionTimers.delete(postId);
          }
          finishDwell(postId);
        }
      });
    },
    { threshold: [0, 0.5, 1] }
  );

  const attach = () => {
    container.querySelectorAll("[data-post-id]").forEach((element) => {
      observer.observe(element);
    });
  };

  attach();

  // Cards arrive asynchronously (redux fetch, tab switches), so watch the DOM
  // instead of relying on a single mount-time query.
  const mutations =
    typeof MutationObserver !== "undefined"
      ? new MutationObserver(attach)
      : null;
  mutations?.observe(container, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    mutations?.disconnect();
    impressionTimers.forEach((timer) => clearTimeout(timer));
    impressionTimers.clear();
    visibleSince.forEach((start, postId) => finishDwell(postId));
    visibleSince.clear();
  };
}
