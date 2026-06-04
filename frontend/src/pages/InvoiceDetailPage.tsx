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
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Payment as PaidIcon,
  Block as VoidIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Invoice, InvoiceLineItem } from '../types/api';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  sent: 'primary',
  paid: 'success',
  overdue: 'warning',
  void: 'error',
};

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => apiClient.getInvoice(Number(id)),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: number; status: string }) =>
      apiClient.updateInvoiceStatus(invoiceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceSummary'] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (invoiceId: number) => apiClient.deleteInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceSummary'] });
      navigate('/invoices');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to delete invoice');
    },
  });

  const invoice: Invoice | undefined = data?.invoice;
  const lineItems: InvoiceLineItem[] = data?.lineItems || [];

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const blob = await apiClient.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to download PDF');
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (!invoice) return;
    const confirmMsg = `Are you sure you want to mark this invoice as "${newStatus}"?`;
    if (window.confirm(confirmMsg)) {
      statusMutation.mutate({ invoiceId: invoice.id, status: newStatus });
    }
  };

  const handleDelete = () => {
    if (!invoice) return;
    if (window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) {
      deleteMutation.mutate(invoice.id);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/invoices')}>Back to Invoices</Button>
        <Alert severity="error" sx={{ mt: 2 }}>Invoice not found.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/invoices')}>Back</Button>
          <Typography variant="h4">{invoice.invoice_number}</Typography>
          <Chip label={invoice.status} color={statusColors[invoice.status] || 'default'} />
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<PdfIcon />} onClick={handleDownloadPdf}>PDF</Button>
          {invoice.status === 'draft' && (
            <>
              <Button variant="contained" startIcon={<SendIcon />} onClick={() => handleStatusChange('sent')}>
                Mark as Sent
              </Button>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
          {invoice.status === 'sent' && (
            <Button variant="contained" color="success" startIcon={<PaidIcon />} onClick={() => handleStatusChange('paid')}>
              Mark as Paid
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button variant="outlined" color="error" startIcon={<VoidIcon />} onClick={() => handleStatusChange('void')}>
              Void
            </Button>
          )}
          {invoice.status === 'draft' && (
            <Button variant="outlined" color="error" startIcon={<VoidIcon />} onClick={() => handleStatusChange('void')}>
              Void
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper sx={{ p: 4, mb: 3 }}>
        <Grid container spacing={4}>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">From</Typography>
            <Typography variant="body1" fontWeight="medium">{invoice.from_name || 'Not set'}</Typography>
            {invoice.from_address && (
              <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">{invoice.from_address}</Typography>
            )}
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">To</Typography>
            <Typography variant="body1" fontWeight="medium">{invoice.client_name}</Typography>
            {invoice.client_email && (
              <Typography variant="body2" color="text.secondary">{invoice.client_email}</Typography>
            )}
            {invoice.client_billing_address && (
              <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">{invoice.client_billing_address}</Typography>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">Issue Date</Typography>
            <Typography>{new Date(invoice.issue_date).toLocaleDateString()}</Typography>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
            <Typography>{new Date(invoice.due_date).toLocaleDateString()}</Typography>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">Payment Terms</Typography>
            <Typography>Net {invoice.payment_terms_days}</Typography>
          </Grid>
        </Grid>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Hours</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date || '-'}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell align="right">{item.hours.toFixed(2)}</TableCell>
                  <TableCell align="right">${item.rate.toFixed(2)}</TableCell>
                  <TableCell align="right">${item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={3} display="flex" flexDirection="column" alignItems="flex-end">
          <Box display="flex" justifyContent="space-between" width={250} mb={0.5}>
            <Typography variant="body1">Subtotal:</Typography>
            <Typography variant="body1">${invoice.subtotal.toFixed(2)}</Typography>
          </Box>
          {invoice.tax_rate > 0 && (
            <Box display="flex" justifyContent="space-between" width={250} mb={0.5}>
              <Typography variant="body1">Tax ({(invoice.tax_rate * 100).toFixed(2)}%):</Typography>
              <Typography variant="body1">${invoice.tax_amount.toFixed(2)}</Typography>
            </Box>
          )}
          <Divider sx={{ width: 250, my: 1 }} />
          <Box display="flex" justifyContent="space-between" width={250}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" fontWeight="bold">${invoice.total.toFixed(2)}</Typography>
          </Box>
        </Box>

        {invoice.notes && (
          <Box mt={3} pt={2} borderTop="1px solid #eee">
            <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
            <Typography variant="body2" whiteSpace="pre-line">{invoice.notes}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default InvoiceDetailPage;
