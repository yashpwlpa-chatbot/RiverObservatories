export interface ParsedImport { headers: string[]; rows: Record<string, string | number | null>[] }

function fromMatrix(matrix: unknown[][]): ParsedImport {
  const headers = (matrix[0] ?? []).map((cell) => String(cell ?? '').replace(/\s+/g, ' ').trim());
  if (!headers.some(Boolean)) throw new Error('The file needs a header row.');
  const rows = matrix.slice(1).filter((row) => row.some((cell) => cell != null && String(cell).trim() !== '')).map((row) => {
    const result: Record<string, string | number | null> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index];
      result[header] = value == null || value === '' ? null : value instanceof Date ? value.toISOString() : typeof value === 'number' ? value : String(value).trim();
    });
    return result;
  });
  if (!rows.length) throw new Error('The file has no data rows.');
  return { headers, rows };
}

function parseCsv(text: string): unknown[][] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const ch = source[index];
    if (quoted) {
      if (ch === '"' && source[index + 1] === '"') { cell += '"'; index++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[index + 1] === '\n') index++;
      row.push(cell); matrix.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('The CSV file has an unmatched quote.');
  if (cell || row.length) { row.push(cell); matrix.push(row); }
  return matrix;
}

export async function parseImportFile(file: File): Promise<ParsedImport> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Files must be 25 MB or smaller.');
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return fromMatrix(parseCsv(await file.text()));
  if (!name.endsWith('.xlsx')) throw new Error('Upload a .csv or .xlsx file. Convert older .xls files to .xlsx first.');
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer() as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook has no worksheet.');
  const matrix: unknown[][] = [];
  sheet.eachRow((row) => {
    const values: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      const raw = cell.value;
      values[column - 1] = raw instanceof Date ? raw : typeof raw === 'object' && raw !== null
        ? 'result' in raw ? raw.result : 'text' in raw ? raw.text : 'richText' in raw && Array.isArray(raw.richText) ? raw.richText.map((part: {text:string}) => part.text).join('') : null
        : raw;
    });
    matrix.push(values);
  });
  return fromMatrix(matrix);
}
