import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { WorkEntry } from '../types/api';

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
}

const steps = ['Select Client & Range', 'Review Line Items', 'Invoice Details'];

const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [rateOverride, setRateOverride] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: workEntriesData, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['uninvoicedEntries', selectedClientId, dateFrom, dateTo],
    queryFn: () => apiClient.getUninvoicedWorkEntries(selectedClientId, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    enabled: selectedClientId > 0 && activeStep >= 1,
  });

  const { data: profileData } = useQuery({
    queryKey: ['billingProfile'],
    queryFn: () => apiClient.getBillingProfile(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createInvoice>[0]) => apiClient.createInvoice(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceSummary'] });
      handleReset();
      onClose();
      if (data.invoice?.id) {
        navigate(`/invoices/${data.invoice.id}`);
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create invoice');
    },
  });

  const clients = clientsData?.clients || [];
  const uninvoicedEntries: WorkEntry[] = workEntriesData?.workEntries || [];
  const selectedClient = clients.find((c: { id: number }) => c.id === selectedClientId);
  const profile = profileData?.profile;

  const effectiveRate = rateOverride ? parseFloat(rateOverride) : (selectedClient?.hourly_rate || 0);
  const selectedEntries = uninvoicedEntries.filter((e: WorkEntry) => selectedEntryIds.includes(e.id));
  const subtotal = selectedEntries.reduce((sum: number, e: WorkEntry) => sum + e.hours * effectiveRate, 0);
  const taxAmount = subtotal * (parseFloat(taxRate) || 0);
  const total = subtotal + taxAmount;

  const handleReset = () => {
    setActiveStep(0);
    setSelectedClientId(0);
    setDateFrom('');
    setDateTo('');
    setSelectedEntryIds([]);
    setRateOverride('');
    setPaymentTerms(30);
    setTaxRate('0');
    setNotes('');
    setError('');
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedClientId) {
        setError('Please select a client');
        return;
      }
      setError('');
      refetchEntries();
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (selectedEntryIds.length === 0) {
        setError('Please select at least one work entry');
        return;
      }
      if (!effectiveRate) {
        setError('Please set an hourly rate (client rate or override)');
        return;
      }
      setError('');
      if (profile) {
        setPaymentTerms(profile.defaultPaymentTermsDays || 30);
        setTaxRate(String(profile.defaultTaxRate || 0));
      }
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setActiveStep(Math.max(0, activeStep - 1));
  };

  const handleSubmit = () => {
    setError('');
    createMutation.mutate({
      clientId: selectedClientId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      paymentTermsDays: paymentTerms,
      taxRate: parseFloat(taxRate) || 0,
      notes: notes || undefined,
      rateOverride: rateOverride ? parseFloat(rateOverride) : undefined,
      includeWorkEntryIds: selectedEntryIds,
    });
  };

  const toggleEntry = (id: number) => {
    setSelectedEntryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEntryIds.length === uninvoicedEntries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(uninvoicedEntries.map((e: WorkEntry) => e.id));
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Invoice</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Client</InputLabel>
              <Select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(Number(e.target.value));
                  setSelectedEntryIds([]);
                }}
                label="Client"
              >
                <MenuItem value={0}>Select a client...</MenuItem>
                {clients.map((c: { id: number; name: string; hourly_rate: number | null }) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} {c.hourly_rate ? `($${c.hourly_rate}/hr)` : '(no rate)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box display="flex" gap={2}>
              <TextField
                label="Date From"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <TextField
                label="Date To"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Box>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Box display="flex" gap={2} mb={2} alignItems="center">
              <TextField
                label="Rate Override ($/hr)"
                type="number"
                size="small"
                inputProps={{ min: 0, step: 0.01 }}
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                helperText={selectedClient?.hourly_rate ? `Client rate: $${selectedClient.hourly_rate}/hr` : 'No client rate set'}
                sx={{ width: 220 }}
              />
              <Typography variant="body2" color="text.secondary">
                Effective rate: <strong>${effectiveRate.toFixed(2)}/hr</strong>
              </Typography>
            </Box>

            {entriesLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : uninvoicedEntries.length === 0 ? (
              <Alert severity="info">No uninvoiced work entries found for this client and date range.</Alert>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedEntryIds.length === uninvoicedEntries.length && uninvoicedEntries.length > 0}
                            indeterminate={selectedEntryIds.length > 0 && selectedEntryIds.length < uninvoicedEntries.length}
                            onChange={toggleAll}
                          />
                        </TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Hours</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uninvoicedEntries.map((entry: WorkEntry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedEntryIds.includes(entry.id)}
                              onChange={() => toggleEntry(entry.id)}
                            />
                          </TableCell>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>{entry.description || 'No description'}</TableCell>
                          <TableCell align="right">{entry.hours.toFixed(2)}</TableCell>
                          <TableCell align="right">${(entry.hours * effectiveRate).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={2} textAlign="right">
                  <Typography variant="subtitle1">
                    Selected: {selectedEntries.length} entries | Subtotal: <strong>${subtotal.toFixed(2)}</strong>
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Box display="flex" gap={2} mb={2}>
              <FormControl fullWidth>
                <InputLabel>Payment Terms</InputLabel>
                <Select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(Number(e.target.value))}
                  label="Payment Terms"
                >
                  <MenuItem value={0}>Due on Receipt</MenuItem>
                  <MenuItem value={15}>Net 15</MenuItem>
                  <MenuItem value={30}>Net 30</MenuItem>
                  <MenuItem value={45}>Net 45</MenuItem>
                  <MenuItem value={60}>Net 60</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Tax Rate (%)"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                value={(parseFloat(taxRate) * 100).toFixed(2)}
                onChange={(e) => setTaxRate(String(parseFloat(e.target.value) / 100))}
              />
            </Box>
            <TextField
              label="Notes / Payment Instructions"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Invoice Summary</Typography>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Client:</Typography>
                <Typography variant="body2" fontWeight="medium">{selectedClient?.name}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Line items:</Typography>
                <Typography variant="body2">{selectedEntries.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
              </Box>
              {parseFloat(taxRate) > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Tax ({(parseFloat(taxRate) * 100).toFixed(2)}%):</Typography>
                  <Typography variant="body2">${taxAmount.toFixed(2)}</Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="space-between" mt={1} pt={1} borderTop="1px solid #eee">
                <Typography variant="subtitle1">Total:</Typography>
                <Typography variant="subtitle1" fontWeight="bold">${total.toFixed(2)}</Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < 2 ? (
          <Button variant="contained" onClick={handleNext}>Next</Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Save as Draft'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
