import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { BillingProfile } from '../types/api';

const BillingProfilePage: React.FC = () => {
  const [formDirty, setFormDirty] = useState<Record<string, string | number> | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['billingProfile'],
    queryFn: () => apiClient.getBillingProfile(),
  });

  const profile: BillingProfile | undefined = profileData?.profile;

  const defaultFormData = useMemo(() => ({
    companyName: profile?.companyName || '',
    billingAddress: profile?.billingAddress || '',
    phone: profile?.phone || '',
    defaultPaymentTermsDays: profile?.defaultPaymentTermsDays || 30,
    defaultTaxRate: String((profile?.defaultTaxRate || 0) * 100),
    defaultCurrency: profile?.defaultCurrency || 'USD',
    invoicePrefix: profile?.invoicePrefix || 'INV',
  }), [profile]);

  const formData = { ...defaultFormData, ...formDirty };

  const setFormData = (data: typeof defaultFormData) => {
    setFormDirty(data);
  };

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof apiClient.updateBillingProfile>[0]) =>
      apiClient.updateBillingProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingProfile'] });
      setSuccess('Billing profile updated successfully');
      setError('');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update billing profile');
      setSuccess('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    updateMutation.mutate({
      companyName: formData.companyName || undefined,
      billingAddress: formData.billingAddress || undefined,
      phone: formData.phone || undefined,
      defaultPaymentTermsDays: formData.defaultPaymentTermsDays,
      defaultTaxRate: parseFloat(formData.defaultTaxRate) / 100 || 0,
      defaultCurrency: formData.defaultCurrency || undefined,
      invoicePrefix: formData.invoicePrefix || undefined,
    });
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
      <Typography variant="h4" gutterBottom>Billing Profile</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Configure your company information and default invoice settings. These defaults will be used when creating new invoices.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 3, mt: 2 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>Company Information</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Company / Your Name"
                fullWidth
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12}>
              <TextField
                label="Billing Address"
                fullWidth
                multiline
                rows={3}
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>Invoice Defaults</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Invoice Prefix"
                fullWidth
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                helperText="e.g. INV, BILL"
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Default Payment Terms</InputLabel>
                <Select
                  value={formData.defaultPaymentTermsDays}
                  onChange={(e) => setFormData({ ...formData, defaultPaymentTermsDays: Number(e.target.value) })}
                  label="Default Payment Terms"
                >
                  <MenuItem value={0}>Due on Receipt</MenuItem>
                  <MenuItem value={15}>Net 15</MenuItem>
                  <MenuItem value={30}>Net 30</MenuItem>
                  <MenuItem value={45}>Net 45</MenuItem>
                  <MenuItem value={60}>Net 60</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Default Tax Rate (%)"
                fullWidth
                type="number"
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                value={formData.defaultTaxRate}
                onChange={(e) => setFormData({ ...formData, defaultTaxRate: e.target.value })}
              />
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              startIcon={updateMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={updateMutation.isPending}
            >
              Save Profile
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default BillingProfilePage;
