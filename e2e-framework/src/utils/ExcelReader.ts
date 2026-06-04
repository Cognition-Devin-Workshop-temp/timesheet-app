import * as ExcelJS from 'exceljs';
import * as path from 'path';

export interface TestDataRow {
  [key: string]: string | number | boolean | null;
}

export class ExcelReader {
  private workbook: ExcelJS.Workbook;
  private filePath: string;

  constructor(fileName: string) {
    this.workbook = new ExcelJS.Workbook();
    this.filePath = path.resolve(process.cwd(), 'testdata', fileName);
  }

  /**
   * Read all rows from a specific sheet as an array of key-value objects.
   * The first row is treated as headers.
   */
  async getSheetData(sheetName: string): Promise<TestDataRow[]> {
    await this.workbook.xlsx.readFile(this.filePath);
    const worksheet = this.workbook.getWorksheet(sheetName);

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in ${this.filePath}`);
    }

    const data: TestDataRow[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value ?? '');
        });
      } else {
        const rowData: TestDataRow = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value as string | number | boolean | null;
          }
        });
        data.push(rowData);
      }
    });

    return data;
  }

  /**
   * Read a specific row by index (0-based, excluding header).
   */
  async getRowData(sheetName: string, rowIndex: number): Promise<TestDataRow> {
    const allData = await this.getSheetData(sheetName);
    if (rowIndex >= allData.length) {
      throw new Error(
        `Row index ${rowIndex} out of bounds. Sheet "${sheetName}" has ${allData.length} data rows.`
      );
    }
    return allData[rowIndex];
  }

  /**
   * Read rows filtered by a column value.
   */
  async getFilteredData(
    sheetName: string,
    columnName: string,
    value: string | number | boolean
  ): Promise<TestDataRow[]> {
    const allData = await this.getSheetData(sheetName);
    return allData.filter((row) => row[columnName] === value);
  }

  /**
   * Get all sheet names in the workbook.
   */
  async getSheetNames(): Promise<string[]> {
    await this.workbook.xlsx.readFile(this.filePath);
    const names: string[] = [];
    this.workbook.eachSheet((worksheet) => {
      names.push(worksheet.name);
    });
    return names;
  }
}
