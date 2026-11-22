// A fast drop-in replacement for csv-reader 1.0.0: run(input) returns exactly csv-reader's
// {columns, rows, errors} for every input {text, header}, reading the text once, left to right.
// Same broken-row policy as the reference (BOM dropped; records end at LF or CRLF; empty lines are
// no records; stray CRs outside quotes dropped with stray_cr; quoted fields with "" escapes and
// CR/CRLF read as LF; quote junk appended with quote_junk; unterminated quotes re-read as unquoted
// with unterminated_quote; rows padded/cut to the first record's width with short_row/long_row).
// Written for speed: index scanning with slice extraction instead of per-character concatenation.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  // Field reader results, shared to avoid allocating a result object per field.
  let fValue = '';
  let fEnded = END;
  let fAdded = 0;

  // Reads unquoted characters onto `initial` up to the next comma or line break.
  // A CR not followed by LF is dropped (stray_cr). Sets fValue, fEnded, fAdded
  // (fAdded counts only the characters appended beyond `initial`).
  function readUnquoted(initial) {
    let value = initial;
    let seg = pos;
    let i = pos;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 44) {
        // ','
        value += text.slice(seg, i);
        pos = i + 1;
        fValue = value;
        fEnded = COMMA;
        fAdded = value.length - initial.length;
        return;
      }
      if (c === 10) {
        // LF
        value += text.slice(seg, i);
        pos = i + 1;
        line += 1;
        fValue = value;
        fEnded = LINE_BREAK;
        fAdded = value.length - initial.length;
        return;
      }
      if (c === 13) {
        // CR
        if (text.charCodeAt(i + 1) === 10) {
          value += text.slice(seg, i);
          pos = i + 2;
          line += 1;
          fValue = value;
          fEnded = LINE_BREAK;
          fAdded = value.length - initial.length;
          return;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        value += text.slice(seg, i);
        i += 1;
        seg = i;
        continue;
      }
      i += 1;
    }
    value += text.slice(seg, n);
    pos = n;
    fValue = value;
    fEnded = END;
    fAdded = value.length - initial.length;
  }

  // Reads a quoted field whose opening quote is at pos. Sets fValue and fEnded.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let parts = null;
    let seg = pos + 1;
    let i = seg;
    let closed = false;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        // '"'
        if (text.charCodeAt(i + 1) === 34) {
          if (parts === null) parts = [text.slice(seg, i), '"'];
          else parts.push(text.slice(seg, i), '"');
          i += 2;
          seg = i;
          continue;
        }
        i += 1;
        closed = true;
        break;
      }
      if (c === 13) {
        // CRLF and a lone CR inside quotes are each one LF.
        if (parts === null) parts = [text.slice(seg, i), '\n'];
        else parts.push(text.slice(seg, i), '\n');
        line += 1;
        i += text.charCodeAt(i + 1) === 10 ? 2 : 1;
        seg = i;
        continue;
      }
      if (c === 10) line += 1;
      i += 1;
    }
    if (!closed) {
      // The quote never closes: it is a literal character, and the text after it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      readUnquoted('"');
      return;
    }
    let value;
    if (parts === null) {
      value = text.slice(seg, i - 1);
    } else {
      parts.push(text.slice(seg, i - 1));
      value = parts.join('');
    }
    pos = i;
    if (pos >= n) {
      fValue = value;
      fEnded = END;
      return;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      fValue = value;
      fEnded = COMMA;
      return;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      fValue = value;
      fEnded = LINE_BREAK;
      return;
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      fValue = value;
      fEnded = LINE_BREAK;
      return;
    }
    // What follows the closing quote is appended as it stands, up to the next comma or line break.
    readUnquoted(value);
    if (fAdded > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted();
      else readUnquoted('');
      fields.push(fValue);
    } while (fEnded === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
