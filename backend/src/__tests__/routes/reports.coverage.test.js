const request = require('supertest');
const express = require('express');
const { getDatabase } = require('../../database/init');
const fs = require('fs');
const path = require('path');

jest.mock('../../database/init');
jest.mock('fs');

// Mock csv-writer with controllable behavior
const mockWriteRecords = jest.fn();
jest.mock('csv-writer', () => ({
  createObjectCsvWriter: jest.fn(() => ({
    writeRecords: (...args) => mockWriteRecords(...args)
  }))
}));

// Store captured stream in global so mock factory can access it
global.__testCapturedStream = null;

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockImplementation(function(stream) {
        global.__testCapturedStream = stream;
      }),
      end: jest.fn().mockImplementation(function() {
        if (global.__testCapturedStream && !global.__testCapturedStream.writableEnded) {
          global.__testCapturedStream.end();
        }
      }),
      y: 100
    };
    global.__testPdfInstance = instance;
    return instance;
  });
});

jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = 'test@example.com';
    next();
  }
}));

const reportRoutes = require('../../routes/reports');

const app = express();
app.use(express.json());
app.use('/api/reports', reportRoutes);

describe('Report Routes - Coverage Enhancement', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      all: jest.fn(),
      get: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
    global.__testCapturedStream = null;
    global.__testPdfInstance = null;

    // Reset fs mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();
    fs.unlink = jest.fn((filePath, callback) => callback(null));

    mockWriteRecords.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reports/export/csv/:clientId - Success Path', () => {
    test('should successfully call csvWriter with work entries', async () => {
      const mockClient = { id: 1, name: 'Test Client' };
      const mockWorkEntries = [
        { date: '2024-01-01', hours: 5, description: 'Task 1', created_at: '2024-01-01T10:00:00' },
        { date: '2024-01-02', hours: 3.5, description: 'Task 2', created_at: '2024-01-02T11:00:00' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      mockWriteRecords.mockRejectedValue(new Error('Write failed'));

      const response = await request(app).get('/api/reports/export/csv/1');

      expect(response.status).toBe(500);
      expect(mockWriteRecords).toHaveBeenCalledWith(mockWorkEntries);
    });

    test('should handle CSV write error gracefully', async () => {
      const mockClient = { id: 1, name: 'Test Client' };
      const mockWorkEntries = [
        { date: '2024-01-01', hours: 5, description: 'Task 1', created_at: '2024-01-01T10:00:00' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      mockWriteRecords.mockRejectedValue(new Error('CSV write failed'));

      const response = await request(app).get('/api/reports/export/csv/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to generate CSV report' });
    });

    test('should handle client name with special characters in CSV filename', async () => {
      const mockClient = { id: 1, name: 'Client / Special & Name!' };
      const mockWorkEntries = [];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      mockWriteRecords.mockRejectedValue(new Error('fail'));

      await request(app).get('/api/reports/export/csv/1');

      const csvWriter = require('csv-writer');
      expect(csvWriter.createObjectCsvWriter).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.arrayContaining([
            expect.objectContaining({ id: 'date', title: 'Date' }),
            expect.objectContaining({ id: 'hours', title: 'Hours' }),
            expect.objectContaining({ id: 'description', title: 'Description' }),
            expect.objectContaining({ id: 'created_at', title: 'Created At' })
          ])
        })
      );
    });

    test('should create temp directory if it does not exist', async () => {
      const mockClient = { id: 1, name: 'Test Client' };
      const mockWorkEntries = [
        { date: '2024-01-01', hours: 5, description: 'Work', created_at: '2024-01-01' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      fs.existsSync.mockReturnValue(false);
      mockWriteRecords.mockRejectedValue(new Error('fail'));

      await request(app).get('/api/reports/export/csv/1');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    test('should use correct CSV writer path with sanitized client name', async () => {
      const mockClient = { id: 1, name: 'Acme Corp' };
      const mockWorkEntries = [
        { date: '2024-03-15', hours: 8, description: 'Development', created_at: '2024-03-15T09:00:00' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      mockWriteRecords.mockRejectedValue(new Error('fail'));

      await request(app).get('/api/reports/export/csv/1');

      const csvWriter = require('csv-writer');
      expect(csvWriter.createObjectCsvWriter).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining('Acme_Corp_report_')
        })
      );
    });

    test('should not create temp directory if it already exists', async () => {
      const mockClient = { id: 1, name: 'Client' };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      fs.existsSync.mockReturnValue(true);
      mockWriteRecords.mockRejectedValue(new Error('fail'));

      await request(app).get('/api/reports/export/csv/1');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/reports/export/pdf/:clientId - Success Path', () => {
    test('should generate PDF with work entries', async () => {
      const mockClient = { id: 1, name: 'Test Client' };
      const mockWorkEntries = [
        { hours: 5, description: 'Task 1', date: '2024-01-01', created_at: '2024-01-01' },
        { hours: 3, description: 'Task 2', date: '2024-01-02', created_at: '2024-01-02' },
        { hours: 2, description: null, date: '2024-01-03', created_at: '2024-01-03' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      const PDFDocument = require('pdfkit');

      const response = await request(app).get('/api/reports/export/pdf/1');

      expect(PDFDocument).toHaveBeenCalled();
      const pdf = global.__testPdfInstance;
      expect(pdf.pipe).toHaveBeenCalled();
      expect(pdf.fontSize).toHaveBeenCalledWith(20);
      expect(pdf.text).toHaveBeenCalledWith(
        'Time Report for Test Client',
        expect.objectContaining({ align: 'center' })
      );
      expect(pdf.fontSize).toHaveBeenCalledWith(14);
      expect(pdf.fontSize).toHaveBeenCalledWith(12);
      expect(pdf.end).toHaveBeenCalled();
    });

    test('should generate PDF with correct total hours', async () => {
      const mockClient = { id: 1, name: 'Client A' };
      const mockWorkEntries = [
        { hours: 2.5, description: 'Work 1', date: '2024-01-01', created_at: '2024-01-01' },
        { hours: 4.75, description: 'Work 2', date: '2024-01-02', created_at: '2024-01-02' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      await request(app).get('/api/reports/export/pdf/1');

      const pdf = global.__testPdfInstance;
      expect(pdf.text).toHaveBeenCalledWith('Total Hours: 7.25');
      expect(pdf.text).toHaveBeenCalledWith('Total Entries: 2');
    });

    test('should handle empty work entries for PDF', async () => {
      const mockClient = { id: 1, name: 'Empty Client' };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      await request(app).get('/api/reports/export/pdf/1');

      const pdf = global.__testPdfInstance;
      expect(pdf.text).toHaveBeenCalledWith('Total Hours: 0.00');
      expect(pdf.text).toHaveBeenCalledWith('Total Entries: 0');
      expect(pdf.end).toHaveBeenCalled();
    });

    test('should add page break when content exceeds page height', async () => {
      const mockClient = { id: 1, name: 'Big Report' };
      const mockWorkEntries = Array.from({ length: 5 }, (_, i) => ({
        hours: 1,
        description: `Entry ${i + 1}`,
        date: `2024-01-0${i + 1}`,
        created_at: `2024-01-0${i + 1}`
      }));

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      // Override PDFDocument to have y > 700 to trigger page break
      const PDFDocument = require('pdfkit');
      PDFDocument.mockImplementation(() => {
        const instance = {
          fontSize: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnThis(),
          moveDown: jest.fn().mockReturnThis(),
          moveTo: jest.fn().mockReturnThis(),
          lineTo: jest.fn().mockReturnThis(),
          stroke: jest.fn().mockReturnThis(),
          addPage: jest.fn().mockReturnThis(),
          pipe: jest.fn().mockImplementation(function(stream) {
            global.__testCapturedStream = stream;
          }),
          end: jest.fn().mockImplementation(function() {
            if (global.__testCapturedStream && !global.__testCapturedStream.writableEnded) {
              global.__testCapturedStream.end();
            }
          }),
          y: 750
        };
        global.__testPdfInstance = instance;
        return instance;
      });

      await request(app).get('/api/reports/export/pdf/1');

      const pdf = global.__testPdfInstance;
      expect(pdf.addPage).toHaveBeenCalled();
    });

    test('should add separator lines every 5 entries', async () => {
      const mockClient = { id: 1, name: 'Client' };
      const mockWorkEntries = Array.from({ length: 6 }, (_, i) => ({
        hours: 1,
        description: `Entry ${i + 1}`,
        date: '2024-01-01',
        created_at: '2024-01-01'
      }));

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      await request(app).get('/api/reports/export/pdf/1');

      const pdf = global.__testPdfInstance;
      expect(pdf.moveTo).toHaveBeenCalled();
      expect(pdf.stroke).toHaveBeenCalled();
    });

    test('should set correct response headers for PDF', async () => {
      const mockClient = { id: 1, name: 'My Client' };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/reports/export/pdf/1');

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('My_Client_report_');
    });

    test('should handle entries with null descriptions in PDF', async () => {
      const mockClient = { id: 1, name: 'Client' };
      const mockWorkEntries = [
        { hours: 3, description: null, date: '2024-01-01', created_at: '2024-01-01' }
      ];

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockWorkEntries);
      });

      await request(app).get('/api/reports/export/pdf/1');

      const pdf = global.__testPdfInstance;
      expect(pdf.text).toHaveBeenCalledWith(
        'No description', 230, expect.any(Number), { width: 300 }
      );
    });

    test('should generate correct filename with sanitized client name', async () => {
      const mockClient = { id: 1, name: 'Client/With:Special.Chars' };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockClient);
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/reports/export/pdf/1');

      expect(response.headers['content-disposition']).toContain('Client_With_Special_Chars_report_');
    });
  });
});
