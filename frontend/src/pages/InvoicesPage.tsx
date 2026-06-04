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
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { type Invoice, type InvoiceSummary } from '../types/api';
import CreateInvoiceDialog from './CreateInvoiceDialog';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  sent: 'primary',
  paid: 'success',
  overdue: 'warning',
  void: 'error',
};

const InvoicesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<number>(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, clientFilter],
    queryFn: () => apiClient.getInvoices({
      status: statusFilter || undefined,
      clientId: clientFilter || undefined,
    }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['invoiceSummary'],
    queryFn: () => apiClient.getInvoiceSummary(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceSummary'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete invoice');
    },
  });

  const invoices: Invoice[] = invoicesData?.invoices || [];
  const summary: InvoiceSummary | undefined = summaryData?.summary;
  const clients = clientsData?.clients || [];

  const handleDownloadPdf = async (invoice: Invoice) => {
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

  const handleDelete = (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Invoices</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Create Invoice
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Outstanding</Typography>
                <Typography variant="h5">${summary.totalOutstanding.toFixed(2)}</Typography>
                <Typography variant="body2" color="text.secondary">{summary.outstandingCount} invoice(s)</Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Total Paid</Typography>
                <Typography variant="h5" color="success.main">${summary.totalPaidThisMonth.toFixed(2)}</Typography>
                <Typography variant="body2" color="text.secondary">{summary.paidCount} invoice(s)</Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Overdue</Typography>
                <Typography variant="h5" color="warning.main">{summary.overdueCount}</Typography>
                <Typography variant="body2" color="text.secondary">${summary.overdueAmount.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="void">Void</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Client</InputLabel>
            <Select
              value={clientFilter}
              onChange={(e) => setClientFilter(Number(e.target.value))}
              label="Client"
            >
              <MenuItem value={0}>All Clients</MenuItem>
              {clients.map((c: { id: number; name: string }) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((inv: Invoice) => (
                  <TableRow key={inv.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{inv.invoice_number}</Typography>
                    </TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell>{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">${inv.total.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={inv.status} color={statusColors[inv.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton size="small" onClick={() => handleDownloadPdf(inv)}>
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      {inv.status === 'draft' && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(inv)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No invoices found. Create your first invoice to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CreateInvoiceDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
};

export default InvoicesPage;
