import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Save as SaveIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

interface TimesheetEntry {
  id?: number;
  client_id: number;
  client_name: string;
  hours: number;
  description: string | null;
  date: string;
}

interface TimesheetClient {
  id: number;
  name: string;
}

interface TimesheetResponse {
  weekStart: string;
  weekEnd: string;
  entries: TimesheetEntry[];
  clients: TimesheetClient[];
}

// Get Monday of the current week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDayHeader(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const endStr = end.toLocaleDateString('en-US', endOpts);
  return `${startStr} – ${endStr}`;
}

// Grid cell value: hours indexed by `${clientId}-${date}`
type GridData = Record<string, number>;

const TimesheetPage: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  // Local edits are stored as overrides keyed by `${clientId}-${date}`
  const [overrides, setOverrides] = useState<GridData>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const queryClient = useQueryClient();
  const weekStartStr = formatDate(weekStart);

  // Generate 7 day dates for the week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const { data, isLoading, isError } = useQuery<TimesheetResponse>({
    queryKey: ['timesheet', weekStartStr],
    queryFn: () => apiClient.getTimesheet(weekStartStr),
  });

  // Derive server grid from fetched data
  const serverGrid = useMemo<GridData>(() => {
    if (!data) return {};
    const g: GridData = {};
    for (const entry of data.entries) {
      const key = `${entry.client_id}-${entry.date}`;
      g[key] = (g[key] || 0) + entry.hours;
    }
    return g;
  }, [data]);

  // Merged grid: serverGrid + local overrides
  const grid = useMemo<GridData>(() => ({ ...serverGrid, ...overrides }), [serverGrid, overrides]);
  const dirty = Object.keys(overrides).length > 0;

  const clients = useMemo(() => data?.clients || [], [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const entries: { clientId: number; date: string; hours: number }[] = [];
      for (const client of clients) {
        for (const day of weekDays) {
          const dateStr = formatDate(day);
          const key = `${client.id}-${dateStr}`;
          const hours = grid[key] || 0;
          entries.push({ clientId: client.id, date: dateStr, hours });
        }
      }
      return apiClient.saveTimesheet(weekStartStr, entries);
    },
    onSuccess: () => {
      setOverrides({});
      queryClient.invalidateQueries({ queryKey: ['timesheet', weekStartStr] });
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      setSnackbar({ open: true, message: 'Timesheet saved successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to save timesheet', severity: 'error' });
    },
  });

  const handleCellChange = useCallback((clientId: number, dateStr: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0 || num > 24) return;
    setOverrides(prev => ({ ...prev, [`${clientId}-${dateStr}`]: num }));
  }, []);

  const goToPrevWeek = () => {
    setOverrides({});
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setOverrides({});
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const goToCurrentWeek = () => {
    setOverrides({});
    setWeekStart(getMonday(new Date()));
  };

  // Calculate totals
  const clientTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const client of clients) {
      let sum = 0;
      for (const day of weekDays) {
        sum += grid[`${client.id}-${formatDate(day)}`] || 0;
      }
      totals[client.id] = sum;
    }
    return totals;
  }, [grid, clients, weekDays]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of weekDays) {
      const dateStr = formatDate(day);
      let sum = 0;
      for (const client of clients) {
        sum += grid[`${client.id}-${dateStr}`] || 0;
      }
      totals[dateStr] = sum;
    }
    return totals;
  }, [grid, clients, weekDays]);

  const weekTotal = useMemo(
    () => Object.values(dayTotals).reduce((a, b) => a + b, 0),
    [dayTotals]
  );

  const isCurrentWeek = formatDate(getMonday(new Date())) === weekStartStr;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4">Timesheet</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Previous week">
            <IconButton onClick={goToPrevWeek}>
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ minWidth: 220, textAlign: 'center' }}>
            {formatWeekRange(weekStart)}
          </Typography>
          <Tooltip title="Next week">
            <IconButton onClick={goToNextWeek}>
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
          {!isCurrentWeek && (
            <Tooltip title="Go to current week">
              <IconButton onClick={goToCurrentWeek} color="primary">
                <TodayIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending || clients.length === 0}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load timesheet data.
        </Alert>
      )}

      {clients.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No clients found. Add clients first to start tracking time.
          </Typography>
          <Button variant="contained" href="/clients">
            Manage Clients
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 180, position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'primary.main' }}>
                  Client
                </TableCell>
                {weekDays.map(day => {
                  const isToday = formatDate(day) === formatDate(new Date());
                  return (
                    <TableCell
                      key={formatDate(day)}
                      align="center"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: 90,
                        backgroundColor: isToday ? 'primary.dark' : 'primary.main',
                      }}
                    >
                      {formatDayHeader(day)}
                    </TableCell>
                  );
                })}
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', minWidth: 80, backgroundColor: 'primary.main' }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client, idx) => (
                <TableRow
                  key={client.id}
                  sx={{ backgroundColor: idx % 2 === 0 ? 'grey.50' : 'white' }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 500,
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      backgroundColor: idx % 2 === 0 ? 'grey.50' : 'white',
                    }}
                  >
                    {client.name}
                  </TableCell>
                  {weekDays.map(day => {
                    const dateStr = formatDate(day);
                    const key = `${client.id}-${dateStr}`;
                    const val = grid[key] || 0;
                    const isToday = dateStr === formatDate(new Date());
                    return (
                      <TableCell key={dateStr} align="center" sx={{ p: 0.5 }}>
                        <TextField
                          type="number"
                          value={val || ''}
                          onChange={e => handleCellChange(client.id, dateStr, e.target.value)}
                          inputProps={{
                            min: 0,
                            max: 24,
                            step: 0.25,
                            style: { textAlign: 'center', padding: '6px 4px' },
                          }}
                          size="small"
                          variant="outlined"
                          sx={{
                            width: 70,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: isToday ? 'primary.50' : 'transparent',
                              '& fieldset': {
                                borderColor: isToday ? 'primary.light' : undefined,
                              },
                            },
                          }}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {(clientTotals[client.id] || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              <TableRow sx={{ backgroundColor: 'grey.200' }}>
                <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 1, backgroundColor: 'grey.200' }}>
                  Daily Total
                </TableCell>
                {weekDays.map(day => {
                  const dateStr = formatDate(day);
                  return (
                    <TableCell key={dateStr} align="center" sx={{ fontWeight: 'bold' }}>
                      {(dayTotals[dateStr] || 0).toFixed(2)}
                    </TableCell>
                  );
                })}
                <TableCell
                  align="center"
                  sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}
                >
                  {weekTotal.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Week summary */}
      {clients.length > 0 && (
        <Box mt={2} display="flex" justifyContent="flex-end" gap={3}>
          <Typography variant="body2" color="text.secondary">
            Total hours this week: <strong>{weekTotal.toFixed(2)}</strong>
          </Typography>
          {dirty && (
            <Typography variant="body2" color="warning.main">
              Unsaved changes
            </Typography>
          )}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TimesheetPage;
