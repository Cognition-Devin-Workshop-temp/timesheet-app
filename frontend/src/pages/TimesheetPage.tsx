import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isToday,
  isSameDay,
} from 'date-fns';
import apiClient from '../api/client';
import { type Client, type WorkEntry } from '../types/api';

interface CellValue {
  hours: number;
  entryId: number | null;
  description: string | null;
}

const TimesheetPage: React.FC = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [editingCell, setEditingCell] = useState<{ clientId: number; dayIndex: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: weekEnd }),
    [currentWeekStart, weekEnd]
  );

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: workEntriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  const clients: Client[] = useMemo(() => clientsData?.clients || [], [clientsData]);
  const allWorkEntries: WorkEntry[] = useMemo(() => workEntriesData?.workEntries || [], [workEntriesData]);

  const weekEntries = useMemo(() => {
    const startStr = format(currentWeekStart, 'yyyy-MM-dd');
    const endStr = format(weekEnd, 'yyyy-MM-dd');
    return allWorkEntries.filter((entry) => {
      const d = entry.date.split('T')[0];
      return d >= startStr && d <= endStr;
    });
  }, [allWorkEntries, currentWeekStart, weekEnd]);

  const grid = useMemo(() => {
    const map = new Map<string, CellValue>();
    for (const entry of weekEntries) {
      const dateStr = entry.date.split('T')[0];
      const key = `${entry.client_id}_${dateStr}`;
      const existing = map.get(key);
      if (existing) {
        existing.hours += entry.hours;
      } else {
        map.set(key, {
          hours: entry.hours,
          entryId: entry.id,
          description: entry.description,
        });
      }
    }
    return map;
  }, [weekEntries]);

  const getCellValue = useCallback(
    (clientId: number, day: Date): CellValue => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return grid.get(`${clientId}_${dateStr}`) || { hours: 0, entryId: null, description: null };
    },
    [grid]
  );

  const getRowTotal = useCallback(
    (clientId: number): number =>
      weekDays.reduce((sum, day) => sum + getCellValue(clientId, day).hours, 0),
    [weekDays, getCellValue]
  );

  const getColumnTotal = useCallback(
    (day: Date): number =>
      clients.reduce((sum, client) => sum + getCellValue(client.id, day).hours, 0),
    [clients, getCellValue]
  );

  const grandTotal = useMemo(
    () => clients.reduce((sum, client) => sum + getRowTotal(client.id), 0),
    [clients, getRowTotal]
  );

  const createMutation = useMutation({
    mutationFn: (data: { clientId: number; hours: number; date: string; description?: string }) =>
      apiClient.createWorkEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      setEditingCell(null);
      setError('');
    },
    onError: () => setError('Failed to save entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { hours?: number } }) =>
      apiClient.updateWorkEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      setEditingCell(null);
      setError('');
    },
    onError: () => setError('Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteWorkEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      setEditingCell(null);
      setError('');
    },
    onError: () => setError('Failed to delete entry'),
  });

  const handleCellClick = (clientId: number, dayIndex: number) => {
    const cell = getCellValue(clientId, weekDays[dayIndex]);
    setEditingCell({ clientId, dayIndex });
    setEditValue(cell.hours > 0 ? cell.hours.toString() : '');
  };

  const handleCellSave = (clientId: number, dayIndex: number) => {
    const day = weekDays[dayIndex];
    const dateStr = format(day, 'yyyy-MM-dd');
    const cell = getCellValue(clientId, day);
    const newHours = parseFloat(editValue);

    if (editValue === '' || newHours === 0) {
      if (cell.entryId) {
        deleteMutation.mutate(cell.entryId);
      } else {
        setEditingCell(null);
      }
      return;
    }

    if (isNaN(newHours) || newHours < 0 || newHours > 24) {
      setError('Hours must be between 0 and 24');
      return;
    }

    if (cell.entryId) {
      updateMutation.mutate({ id: cell.entryId, data: { hours: newHours } });
    } else {
      createMutation.mutate({ clientId, hours: newHours, date: dateStr });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, clientId: number, dayIndex: number) => {
    if (e.key === 'Enter') {
      handleCellSave(clientId, dayIndex);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellSave(clientId, dayIndex);
      const nextDayIndex = e.shiftKey ? dayIndex - 1 : dayIndex + 1;
      if (nextDayIndex >= 0 && nextDayIndex < 7) {
        setTimeout(() => handleCellClick(clientId, nextDayIndex), 100);
      } else {
        const clientIndex = clients.findIndex((c) => c.id === clientId);
        const nextClientIndex = e.shiftKey ? clientIndex - 1 : clientIndex + 1;
        if (nextClientIndex >= 0 && nextClientIndex < clients.length) {
          const nextClient = clients[nextClientIndex];
          const nextDay = e.shiftKey ? 6 : 0;
          setTimeout(() => handleCellClick(nextClient.id, nextDay), 100);
        }
      }
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setEditingCell(null);
    setCurrentWeekStart((prev) => (direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)));
  };

  const goToCurrentWeek = () => {
    setEditingCell(null);
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isCurrentWeek = isSameDay(
    currentWeekStart,
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  if (clientsLoading || entriesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Weekly Timesheet</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Previous week">
            <IconButton onClick={() => navigateWeek('prev')}>
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          <Chip
            label={`${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
            color={isCurrentWeek ? 'primary' : 'default'}
            variant={isCurrentWeek ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, fontSize: '0.9rem', px: 1 }}
          />
          <Tooltip title="Next week">
            <IconButton onClick={() => navigateWeek('next')}>
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {clients.length === 0 ? (
        <Alert severity="info">
          No clients found. Add clients first from the Clients page to start tracking time.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'grey.100',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    minWidth: 180,
                  }}
                >
                  Client / Project
                </TableCell>
                {weekDays.map((day) => (
                  <TableCell
                    key={day.toISOString()}
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: isToday(day) ? 'primary.light' : 'grey.100',
                      color: isToday(day) ? 'primary.contrastText' : 'text.primary',
                      minWidth: 80,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" display="block" sx={{ fontWeight: 700 }}>
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {format(day, 'MMM d')}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{ fontWeight: 700, backgroundColor: 'grey.200', minWidth: 70 }}
                >
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} hover>
                  <TableCell
                    sx={{
                      fontWeight: 500,
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'background.paper',
                      zIndex: 1,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Tooltip title={client.description || ''} placement="right">
                      <span>{client.name}</span>
                    </Tooltip>
                  </TableCell>
                  {weekDays.map((day, dayIndex) => {
                    const cell = getCellValue(client.id, day);
                    const isEditing =
                      editingCell?.clientId === client.id && editingCell?.dayIndex === dayIndex;

                    return (
                      <TableCell
                        key={day.toISOString()}
                        align="center"
                        onClick={() => !isEditing && handleCellClick(client.id, dayIndex)}
                        sx={{
                          cursor: 'pointer',
                          p: 0.5,
                          backgroundColor: isToday(day) ? 'action.hover' : 'transparent',
                          '&:hover': {
                            backgroundColor: 'action.selected',
                          },
                          transition: 'background-color 0.15s',
                        }}
                      >
                        {isEditing ? (
                          <TextField
                            autoFocus
                            size="small"
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(client.id, dayIndex)}
                            onKeyDown={(e) => handleKeyDown(e, client.id, dayIndex)}
                            inputProps={{
                              min: 0,
                              max: 24,
                              step: 0.25,
                              style: { textAlign: 'center', padding: '6px 4px', width: '50px' },
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'background.paper' } }}
                          />
                        ) : (
                          <Tooltip title={cell.description || 'Click to enter hours'}>
                            <Box
                              sx={{
                                minHeight: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 1,
                                fontWeight: cell.hours > 0 ? 600 : 400,
                                color: cell.hours > 0 ? 'text.primary' : 'text.disabled',
                                fontSize: '0.875rem',
                              }}
                            >
                              {cell.hours > 0 ? cell.hours : '-'}
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      backgroundColor: 'grey.50',
                      borderLeft: '2px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {getRowTotal(client.id) > 0 ? getRowTotal(client.id) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'grey.200',
                    zIndex: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  Daily Total
                </TableCell>
                {weekDays.map((day) => {
                  const dayTotal = getColumnTotal(day);
                  return (
                    <TableCell
                      key={day.toISOString()}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        backgroundColor: isToday(day) ? 'primary.light' : 'grey.200',
                        color: isToday(day) ? 'primary.contrastText' : 'text.primary',
                        fontSize: '0.875rem',
                      }}
                    >
                      {dayTotal > 0 ? dayTotal : '-'}
                    </TableCell>
                  );
                })}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '1rem',
                    borderLeft: '2px solid',
                    borderColor: 'divider',
                  }}
                >
                  {grandTotal > 0 ? grandTotal : 0}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}

      <Box mt={2}>
        <Typography variant="caption" color="text.secondary">
          Click any cell to enter hours. Use Tab to move between cells. Press Enter to save or Escape to cancel.
        </Typography>
      </Box>
    </Box>
  );
};

export default TimesheetPage;
