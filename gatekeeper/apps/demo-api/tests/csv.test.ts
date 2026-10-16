import { describe, expect, it } from 'vitest';
import { escapeCsvField, formatCsv, formatCsvRow } from '../src/csv.js';

describe('CSV Escaping Utility (RFC 4180)', () => {
  describe('escapeCsvField', () => {
    it('returns simple strings and numbers as-is without extra quotes', () => {
      expect(escapeCsvField('hello')).toBe('hello');
      expect(escapeCsvField(12345)).toBe('12345');
      expect(escapeCsvField(true)).toBe('true');
    });

    it('returns empty string for null and undefined', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('encloses strings containing commas in quotes', () => {
      expect(escapeCsvField('Doe, Jane')).toBe('"Doe, Jane"');
      expect(escapeCsvField('Security, Audit, Financial')).toBe('"Security, Audit, Financial"');
    });

    it('escapes inner double quotes by doubling them', () => {
      expect(escapeCsvField('Alice "The Boss" Smith')).toBe('"Alice ""The Boss"" Smith"');
      expect(escapeCsvField('He said: "Hello World"')).toBe('"He said: ""Hello World"""');
    });

    it('escapes strings containing newlines and carriage returns', () => {
      expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      expect(escapeCsvField('First\r\nSecond')).toBe('"First\r\nSecond"');
    });

    it('quotes strings with leading or trailing whitespace', () => {
      expect(escapeCsvField('  padded  ')).toBe('"  padded  "');
    });

    it('correctly handles combinations of commas, quotes, and newlines', () => {
      const complex = 'Item 1, with "special" notes:\n- Note A\n- Note B';
      const escaped = escapeCsvField(complex);
      expect(escaped).toBe('"Item 1, with ""special"" notes:\n- Note A\n- Note B"');
    });
  });

  describe('formatCsvRow and formatCsv', () => {
    it('formats an array of cells into a comma-separated row', () => {
      const row = formatCsvRow(['101', 'Alice, CEO', 'alice@corp.dev', 'He said "hi"']);
      expect(row).toBe('101,"Alice, CEO",alice@corp.dev,"He said ""hi"""');
    });

    it('generates multi-line CSV with CRLF endings', () => {
      const headers = ['ID', 'Name', 'Summary'];
      const data = [
        ['1', 'Report A', 'Simple text'],
        ['2', 'Report B, with comma', 'Contains "quotes" and\nline breaks'],
      ];

      const csv = formatCsv(headers, data);
      expect(csv).toBe(
        'ID,Name,Summary\r\n' +
          '1,Report A,Simple text\r\n' +
          '2,"Report B, with comma","Contains ""quotes"" and\nline breaks"\r\n',
      );
    });
  });
});
