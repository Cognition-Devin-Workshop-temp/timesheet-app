import React, { useState } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiClient from '../api/client';
import { type WorkEntry } from '../types/api';

const calculateHoursFromSwipe = (inTime: string, inPeriod: string, outTime: string, outPeriod: string): number | null => {
  if (!inTime || !outTime) return null;
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return null;

  const inMinutes = (inH % 12) * 60 + inM + (inPeriod === 'PM' ? 720 : 0);
  const outMinutes = (outH % 12) * 60 + outM + (outPeriod === 'PM' ? 720 : 0);
  if (outMinutes <= inMinutes) return null;

  const diff = (outMinutes - inMinutes) / 60;
  return Math.round(diff * 100) / 100;
};

const WorkEntriesPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [formData, setFormData] = useState({
    clientId: 0,
    hours: '',
    description: '',
    date: new Date(),
    swipeIn: '',
    swipeInPeriod: 'AM',
    swipeOut: '',
    swipeOutPeriod: 'PM',
    isWfh: false,
  });
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const { data: workEntriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const createMutation = useMutation({
    mutationFn: (entryData: { clientId: number; hours: number; description?: string; date: string; swipeIn?: string; swipeOut?: string }) =>
      apiClient.createWorkEntry(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create work entry');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { clientId?: number; hours?: number; description?: string; date?: string; swipeIn?: string; swipeOut?: string } }) =>
      apiClient.updateWorkEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update work entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteWorkEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete work entry');
    },
  });

  const workEntries = workEntriesData?.workEntries || [];
  const clients = clientsData?.clients || [];

  const handleOpen = (entry?: WorkEntry) => {
    if (entry) {
      setEditingEntry(entry);
      let swipeIn = '', swipeInPeriod = 'AM', swipeOut = '', swipeOutPeriod = 'PM';
      if (entry.swipe_in) {
        const parts = entry.swipe_in.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
        if (parts) { swipeIn = parts[1]; swipeInPeriod = parts[2].toUpperCase(); }
      }
      if (entry.swipe_out) {
        const parts = entry.swipe_out.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
        if (parts) { swipeOut = parts[1]; swipeOutPeriod = parts[2].toUpperCase(); }
      }
      setFormData({
        clientId: entry.client_id,
        hours: entry.hours.toString(),
        description: entry.description || '',
        date: new Date(entry.date),
        swipeIn, swipeInPeriod, swipeOut, swipeOutPeriod,
        isWfh: !entry.swipe_in && !entry.swipe_out,
      });
    } else {
      setEditingEntry(null);
      setFormData({
        clientId: 0,
        hours: '',
        description: '',
        date: new Date(),
        swipeIn: '',
        swipeInPeriod: 'AM',
        swipeOut: '',
        swipeOutPeriod: 'PM',
        isWfh: false,
      });
    }
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEntry(null);
    setFormData({
      clientId: 0,
      hours: '',
      description: '',
      date: new Date(),
      swipeIn: '',
      swipeInPeriod: 'AM',
      swipeOut: '',
      swipeOutPeriod: 'PM',
      isWfh: false,
    });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }

    const hours = parseFloat(formData.hours);
    if (!hours || hours <= 0 || hours > 24) {
      setError('Hours must be between 0 and 24');
      return;
    }

    if (!formData.date) {
      setError('Please select a date');
      return;
    }

    const entryData: { clientId: number; hours: number; description?: string; date: string; swipeIn?: string; swipeOut?: string } = {
      clientId: formData.clientId,
      hours,
      description: formData.description || undefined,
      date: formData.date.toISOString().split('T')[0],
    };

    if (!formData.isWfh && formData.swipeIn && formData.swipeOut) {
      entryData.swipeIn = `${formData.swipeIn} ${formData.swipeInPeriod}`;
      entryData.swipeOut = `${formData.swipeOut} ${formData.swipeOutPeriod}`;
    } else {
      entryData.swipeIn = '';
      entryData.swipeOut = '';
    }

    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        data: entryData,
      });
    } else {
      createMutation.mutate(entryData);
    }
  };

  const handleDelete = (entry: WorkEntry) => {
    if (window.confirm(`Are you sure you want to delete this ${entry.hours} hour entry for ${entry.client_name}?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  if (entriesLoading || clientsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Work Entries</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Work Entry
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {clients.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You need to create at least one client before adding work entries.
            </Typography>
            <Button variant="contained" href="/clients">
              Create Client
            </Button>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Swipe In</TableCell>
                    <TableCell>Swipe Out</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workEntries.length > 0 ? (
                    workEntries.map((entry: WorkEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {entry.client_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(entry.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {entry.swipe_in ? (
                            <Typography variant="body2">{entry.swipe_in}</Typography>
                          ) : (
                            <Chip label="WFH" size="small" color="info" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.swipe_out ? (
                            <Typography variant="body2">{entry.swipe_out}</Typography>
                          ) : (
                            <Chip label="WFH" size="small" color="info" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${entry.hours} hours`} 
                            color="primary" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>
                          {entry.description ? (
                            <Typography variant="body2" color="text.secondary">
                              {entry.description}
                            </Typography>
                          ) : (
                            <Chip label="No description" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => handleOpen(entry)}
                            color="primary"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(entry)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          No work entries found. Add your first work entry to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingEntry ? 'Edit Work Entry' : 'Add New Work Entry'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Client</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: Number(e.target.value) })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {clients.map((client: { id: number; name: string }) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isWfh}
                    onChange={(e) => {
                      const isWfh = e.target.checked;
                      const newData = { ...formData, isWfh };
                      if (isWfh) {
                        newData.swipeIn = '';
                        newData.swipeOut = '';
                      }
                      setFormData(newData);
                    }}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                }
                label="Work From Home (manual hours)"
                sx={{ mt: 1, mb: 1 }}
              />

              {!formData.isWfh && (
                <>
                  <Box display="flex" gap={1} alignItems="center">
                    <TextField
                      margin="dense"
                      label="Swipe In Time"
                      placeholder="HH:MM"
                      value={formData.swipeIn}
                      onChange={(e) => {
                        const newData = { ...formData, swipeIn: e.target.value };
                        const calcHours = calculateHoursFromSwipe(e.target.value, formData.swipeInPeriod, formData.swipeOut, formData.swipeOutPeriod);
                        if (calcHours) newData.hours = calcHours.toString();
                        setFormData(newData);
                      }}
                      sx={{ flex: 1 }}
                      inputProps={{ maxLength: 5 }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                    <FormControl sx={{ minWidth: 80 }} margin="dense">
                      <Select
                        value={formData.swipeInPeriod}
                        onChange={(e) => {
                          const newData = { ...formData, swipeInPeriod: e.target.value };
                          const calcHours = calculateHoursFromSwipe(formData.swipeIn, e.target.value, formData.swipeOut, formData.swipeOutPeriod);
                          if (calcHours) newData.hours = calcHours.toString();
                          setFormData(newData);
                        }}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <MenuItem value="AM">AM</MenuItem>
                        <MenuItem value="PM">PM</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box display="flex" gap={1} alignItems="center">
                    <TextField
                      margin="dense"
                      label="Swipe Out Time"
                      placeholder="HH:MM"
                      value={formData.swipeOut}
                      onChange={(e) => {
                        const newData = { ...formData, swipeOut: e.target.value };
                        const calcHours = calculateHoursFromSwipe(formData.swipeIn, formData.swipeInPeriod, e.target.value, formData.swipeOutPeriod);
                        if (calcHours) newData.hours = calcHours.toString();
                        setFormData(newData);
                      }}
                      sx={{ flex: 1 }}
                      inputProps={{ maxLength: 5 }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                    <FormControl sx={{ minWidth: 80 }} margin="dense">
                      <Select
                        value={formData.swipeOutPeriod}
                        onChange={(e) => {
                          const newData = { ...formData, swipeOutPeriod: e.target.value };
                          const calcHours = calculateHoursFromSwipe(formData.swipeIn, formData.swipeInPeriod, formData.swipeOut, e.target.value);
                          if (calcHours) newData.hours = calcHours.toString();
                          setFormData(newData);
                        }}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <MenuItem value="AM">AM</MenuItem>
                        <MenuItem value="PM">PM</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </>
              )}

              <TextField
                margin="dense"
                label="Hours"
                type="number"
                fullWidth
                required
                inputProps={{ min: 0.01, max: 24, step: 0.01 }}
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                disabled={createMutation.isPending || updateMutation.isPending || (!formData.isWfh && !!formData.swipeIn && !!formData.swipeOut && calculateHoursFromSwipe(formData.swipeIn, formData.swipeInPeriod, formData.swipeOut, formData.swipeOutPeriod) !== null)}
              />

              <DatePicker
                label="Date"
                value={formData.date}
                onChange={(date) => date && setFormData({ ...formData, date })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    required: true,
                    disabled: createMutation.isPending || updateMutation.isPending,
                  },
                }}
              />

              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} disabled={createMutation.isPending || updateMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  editingEntry ? 'Update' : 'Create'
                )}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkEntriesPage;
