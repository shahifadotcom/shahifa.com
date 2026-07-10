/**
 * Human-like behavior & anti-ban safeguards for whatsapp-web.js.
 *
 * Guidelines this module enforces (based on WhatsApp Terms of Service and
 * community-observed ban triggers for unofficial clients):
 *
 *  1. Warm-up: new numbers must not blast messages. Daily caps grow slowly.
 *  2. Rate limits: per-minute, per-hour and per-day sending ceilings.
 *  3. Human delays: randomised typing time + jitter between sends.
 *  4. Presence: mark online -> open chat -> start typing -> send.
 *  5. Content variation: append invisible zero-width jitter so identical
 *     OTP templates never hit the wire byte-for-byte identical.
 *  6. Per-recipient cool-down to avoid hammering the same chat.
 *  7. Registration check: skip numbers that are not on WhatsApp so we do
 *     not accumulate "invalid recipient" signals.
 *  8. Serialized queue: at most one outbound message in flight.
 *  9. Backoff on failure to avoid retry-storms that WhatsApp flags.
 */

const STATE_FILE = require('path').join(__dirname, '.anti-ban-state.json');
const fs = require('fs');

// ---- Configurable limits ---------------------------------------------------

const LIMITS = {
    // Warm-up schedule: age-in-days -> messages/day cap.
    // Errs on the conservative side. Once past 30 days we allow the mature cap.
    warmup: [
        { day: 1, cap: 20 },
        { day: 3, cap: 40 },
        { day: 7, cap: 80 },
        { day: 14, cap: 150 },
        { day: 21, cap: 250 },
        { day: 30, cap: 400 },
    ],
    matureDailyCap: 800,      // Hard daily cap for a warmed number
    perHourCap: 80,           // Rolling 60-minute cap
    perMinuteCap: 4,          // Rolling 60-second cap
    perRecipientCooldownMs: 45 * 1000,   // Same chat: min gap between msgs

    // Human-like delays
    minGapMs: 6_000,          // Absolute min between two sends
    maxGapMs: 15_000,         // Cap so OTPs still land in time
    typingMinMs: 1_800,       // Show "typing…" for at least this
    typingMaxMs: 4_500,
    presenceMs: 800,          // Time we appear "online" before typing

    // Backoff on failures
    failureBackoffMs: 90_000,
    consecutiveFailureThreshold: 3,
};

// ---- Persistent state ------------------------------------------------------

function loadState() {
    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const s = JSON.parse(raw);
        return {
            firstSeenAt: s.firstSeenAt || Date.now(),
            sends: Array.isArray(s.sends) ? s.sends : [],   // [{ts, to}]
            lastFailureAt: s.lastFailureAt || 0,
            consecutiveFailures: s.consecutiveFailures || 0,
        };
    } catch {
        return { firstSeenAt: Date.now(), sends: [], lastFailureAt: 0, consecutiveFailures: 0 };
    }
}

let state = loadState();
let saveTimer = null;
function persist() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (_) {}
    }, 500);
}

function pruneOld() {
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    state.sends = state.sends.filter(s => s.ts >= dayAgo);
}

// ---- Utilities -------------------------------------------------------------

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(min + Math.random() * (max - min));

function accountAgeDays() {
    return Math.max(1, Math.floor((Date.now() - state.firstSeenAt) / (24 * 3600 * 1000)));
}

function currentDailyCap() {
    const age = accountAgeDays();
    for (const step of LIMITS.warmup) {
        if (age <= step.day) return step.cap;
    }
    return LIMITS.matureDailyCap;
}

function countIn(windowMs) {
    const cutoff = Date.now() - windowMs;
    return state.sends.reduce((n, s) => n + (s.ts >= cutoff ? 1 : 0), 0);
}

function lastSendTo(chatId) {
    for (let i = state.sends.length - 1; i >= 0; i--) {
        if (state.sends[i].to === chatId) return state.sends[i].ts;
    }
    return 0;
}

// Append invisible zero-width chars so identical templates differ on the wire.
function jitterContent(text) {
    if (!text) return text;
    const zw = ['\u200B', '\u200C', '\u200D', '\u2060'];
    const n = 1 + Math.floor(Math.random() * 3);
    let suffix = '';
    for (let i = 0; i < n; i++) suffix += zw[Math.floor(Math.random() * zw.length)];
    return text + suffix;
}

// ---- Rate-limit / policy checks -------------------------------------------

function preflight(chatId) {
    pruneOld();

    // Backoff after repeated failures
    if (state.consecutiveFailures >= LIMITS.consecutiveFailureThreshold) {
        const wait = state.lastFailureAt + LIMITS.failureBackoffMs - Date.now();
        if (wait > 0) {
            return { ok: false, code: 'BACKOFF', retryAfterMs: wait,
                message: `In safety backoff after ${state.consecutiveFailures} failures. Retry in ${Math.ceil(wait/1000)}s.` };
        }
    }

    if (countIn(24 * 3600 * 1000) >= currentDailyCap()) {
        return { ok: false, code: 'DAILY_CAP',
            message: `Daily cap reached (${currentDailyCap()} msgs, account age ${accountAgeDays()}d). Try again tomorrow.` };
    }
    if (countIn(3600 * 1000) >= LIMITS.perHourCap) {
        return { ok: false, code: 'HOURLY_CAP',
            message: `Hourly cap reached (${LIMITS.perHourCap}).` };
    }
    if (countIn(60 * 1000) >= LIMITS.perMinuteCap) {
        return { ok: false, code: 'MINUTE_CAP',
            message: `Sending too fast. Try again in a minute.` };
    }
    const last = lastSendTo(chatId);
    if (last && Date.now() - last < LIMITS.perRecipientCooldownMs) {
        const wait = LIMITS.perRecipientCooldownMs - (Date.now() - last);
        return { ok: false, code: 'RECIPIENT_COOLDOWN', retryAfterMs: wait,
            message: `Recipient cool-down. Wait ${Math.ceil(wait/1000)}s before re-sending.` };
    }
    return { ok: true };
}

// ---- Send queue (serialize + spacing) --------------------------------------

let queue = Promise.resolve();
let lastSendAt = 0;

function humanEnqueue(taskFn) {
    const run = async () => {
        const gap = rand(LIMITS.minGapMs, LIMITS.maxGapMs);
        const elapsed = Date.now() - lastSendAt;
        if (lastSendAt && elapsed < gap) await sleep(gap - elapsed);
        try {
            const result = await taskFn();
            lastSendAt = Date.now();
            return result;
        } catch (e) {
            lastSendAt = Date.now();
            throw e;
        }
    };
    const next = queue.then(run, run);
    queue = next.catch(() => {}); // don't kill the chain
    return next;
}

// ---- High-level: human-like send ------------------------------------------

/**
 * Send a message with human-like presence + typing + jitter, gated by
 * warm-up and rate-limit policy.
 *
 * @param {import('whatsapp-web.js').Client} client
 * @param {string} chatId  full JID e.g. "12345@c.us"
 * @param {string|object} content  text OR MessageMedia
 * @param {object} [options]  { caption }
 */
async function humanSend(client, chatId, content, options = {}) {
    const check = preflight(chatId);
    if (!check.ok) {
        const err = new Error(check.message);
        err.code = check.code;
        err.retryAfterMs = check.retryAfterMs;
        throw err;
    }

    // Confirm recipient exists on WhatsApp — reduces "invalid number" flags
    try {
        const numberId = await client.getNumberId(chatId.replace('@c.us', ''));
        if (!numberId) {
            const err = new Error('Recipient is not registered on WhatsApp');
            err.code = 'NOT_ON_WHATSAPP';
            throw err;
        }
    } catch (e) {
        if (e.code === 'NOT_ON_WHATSAPP') throw e;
        // If lookup itself fails we continue; not fatal
    }

    return humanEnqueue(async () => {
        const chat = await client.getChatById(chatId);

        // 1. Appear online
        try { await client.sendPresenceAvailable(); } catch (_) {}
        await sleep(LIMITS.presenceMs + rand(0, 400));

        // 2. Start typing
        try { await chat.sendStateTyping(); } catch (_) {}
        await sleep(rand(LIMITS.typingMinMs, LIMITS.typingMaxMs));

        // 3. Clear typing then send with content jitter
        try { await chat.clearState(); } catch (_) {}

        let sent;
        if (content && typeof content === 'object' && content.mimetype) {
            // MessageMedia
            const caption = options.caption ? jitterContent(options.caption) : undefined;
            sent = await client.sendMessage(chatId, content, caption ? { caption } : undefined);
        } else {
            sent = await client.sendMessage(chatId, jitterContent(String(content || '')));
        }

        // 4. Record
        state.sends.push({ ts: Date.now(), to: chatId });
        state.consecutiveFailures = 0;
        persist();

        return sent;
    });
}

function recordFailure() {
    state.consecutiveFailures += 1;
    state.lastFailureAt = Date.now();
    persist();
}

function metrics() {
    pruneOld();
    return {
        accountAgeDays: accountAgeDays(),
        dailyCap: currentDailyCap(),
        sentLast24h: countIn(24 * 3600 * 1000),
        sentLastHour: countIn(3600 * 1000),
        sentLastMinute: countIn(60 * 1000),
        consecutiveFailures: state.consecutiveFailures,
        limits: LIMITS,
    };
}

module.exports = { humanSend, recordFailure, metrics, preflight, jitterContent, LIMITS };
