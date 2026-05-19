/** CONFIG **/
const SHEET_NAME = 'Submissions'; // rename if needed
const MAX_TEXT_LEN = 8000;        // safety guard for very long posts
const REQUIRE_SECRET = false;      // set false to disable shared-secret check

function doPost(e) {
  try {
    if (!e) {
      return json({ ok: false, error: 'empty_request' }, 400);
    }

    const body = parseBody(e);

    // Optional shared-secret (recommended for public endpoints)
    if (REQUIRE_SECRET) {
      const secret = PropertiesService.getScriptProperties().getProperty('FORM_SECRET');
      if (!secret || body.secret !== secret) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      return json({ ok: false, error: 'missing_spreadsheet' }, 500);
    }

    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
    if (!sheet) {
      return json({ ok: false, error: 'missing_sheet' }, 500);
    }

    // Pull fields (either provided explicitly or embedded in the text)
    const rawText = String(body.text || '').slice(0, MAX_TEXT_LEN).trim();
    let email = (body.email ? String(body.email) : extractEmail(rawText)) || '';
    let phone = (body.phone ? String(body.phone) : extractPhone(rawText)) || '';

    // Normalize / validate
    email = isValidEmail(email) ? email.trim() : '';
    const normalizedPhone = normalizePhone(phone); // may return ''

    // Basic guard: require at least some text OR an email to be useful
    if (!rawText && !email) {
      return json({ ok: false, error: 'missing_text_or_email' }, 400);
    }

    const source = String(body.source || 'Website').trim();
    const now = new Date();

    // Append row: Timestamp | Raw Text | Email | Phone (raw) | Phone (normalized) | Source
    const lock = LockService.getDocumentLock();
    let hasLock = false;
    try {
      lock.waitLock(5000);
      hasLock = true;
      sheet.appendRow([now, rawText, email, phone, normalizedPhone, source]);
    } finally {
      if (hasLock) {
        lock.releaseLock();
      }
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

/** Helpers **/

function json(obj, code) {
  const out = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  if (typeof code === 'number') {
    if (typeof out.setResponseCode === 'function') {
      out.setResponseCode(code);
    } else if (typeof out.setStatusCode === 'function') {
      out.setStatusCode(code);
    }
  }
  return out;
}

function parseBody(e) {
  if (!e) return {};

  const { postData, parameter } = e;
  if (postData && typeof postData.contents === 'string') {
    const type = String(postData.type || '').toLowerCase();
    const contents = postData.contents;

    if (!type || type.indexOf('json') !== -1) {
      try {
        return JSON.parse(contents || '{}') || {};
      } catch (err) {
        return { text: contents || '', parseError: String(err && err.message ? err.message : err) };
      }
    }

    if (type.indexOf('x-www-form-urlencoded') !== -1) {
      // e.parameter already holds parsed form fields
      return parameter || {};
    }

    if (type.indexOf('text/plain') !== -1 && contents) {
      // Try JSON first, fall back to treating it as the raw text submission
      try {
        return JSON.parse(contents);
      } catch (err) {
        return { text: contents };
      }
    }

    // Unknown content-type, return raw text to preserve data
    return { text: contents };
  }

  if (parameter && Object.keys(parameter).length) {
    return parameter;
  }

  return {};
}

function isValidEmail(s) {
  if (!s) return false;
  // Reasonable email pattern (kept simple on purpose)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function extractEmail(text) {
  if (!text) return '';
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : '';
}

function extractPhone(text) {
  if (!text) return '';
  // Looks for common phone formats, including intl with +, spaces, dashes, parentheses
  const match = text.match(/(?:\+?\d[\s-().]*){7,15}\d/g);
  if (!match) return '';
  // Choose the first plausible match
  return match[0].trim();
}

function normalizePhone(input) {
  if (!input) return '';
  // Keep leading + and digits only
  let cleaned = input.replace(/[^\d+]/g, '');
  // If it has multiple '+' or '+' not at start, strip all but a leading one
  cleaned = cleaned.replace(/\+/g, (m, idx) => (idx === 0 ? '+' : ''));
  // Heuristic: if exactly 10 digits and no country code, assume US (+1)
  const justDigits = cleaned.replace(/\D/g, '');
  if (!cleaned.startsWith('+') && justDigits.length === 10) {
    return '+1' + justDigits;
  }
  // If it looks like an E.164 (+ then 8–15 digits), keep it; else return digits as-is
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  if (/^\d{7,15}$/.test(justDigits)) return justDigits; // fallback
  return '';
}
