import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import apiClient from '../api/client';

const CHART_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#689f38', '#fbc02d', '#5d4037', '#455a64'];

type PeriodOption = { label: string; granularity: 'weekly' | 'monthly'; periods: number };

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Last 4 Weeks', granularity: 'weekly', periods: 4 },
  { label: 'Last 12 Weeks', granularity: 'weekly', periods: 12 },
  { label: 'Last 6 Months', granularity: 'monthly', periods: 6 },
  { label: 'Last 12 Months', granularity: 'monthly', periods: 12 },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState(1); // default: Last 12 Weeks

  const granularity = PERIOD_OPTIONS[selectedPeriod].granularity;
  const periods = PERIOD_OPTIONS[selectedPeriod].periods;

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: workEntriesData } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  const { data: dashboardData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboardStats', granularity, periods],
    queryFn: () => apiClient.getDashboardStats(granularity, periods),
  });

  const clients = clientsData?.clients || [];
  const workEntries = workEntriesData?.workEntries || [];

  const totalHours = workEntries.reduce((sum: number, entry: { hours: number }) => sum + entry.hours, 0);
  const recentEntries = workEntries.slice(0, 5);

  const statsCards = [
    {
      title: 'Total Clients',
      value: clients.length,
      icon: <BusinessIcon />,
      color: '#1976d2',
      action: () => navigate('/clients'),
    },
    {
      title: 'Total Work Entries',
      value: workEntries.length,
      icon: <AssignmentIcon />,
      color: '#388e3c',
      action: () => navigate('/work-entries'),
    },
    {
      title: 'Total Hours',
      value: totalHours.toFixed(2),
      icon: <AssessmentIcon />,
      color: '#f57c00',
      action: () => navigate('/reports'),
    },
  ];

  // Prepare bar chart data: each item is { periodLabel, [clientName]: hours, ... }
  const barChartData = (dashboardData?.series || []).map(
    (item: { periodLabel: string; clients: Record<string, number>; total: number }) => ({
      periodLabel: item.periodLabel,
      ...item.clients,
    })
  );

  // Prepare pie chart data
  const pieChartData = Object.entries(dashboardData?.totals || {}).map(
    ([name, value]) => ({ name, value: value as number })
  );

  const clientNames: string[] = dashboardData?.clients || [];

  const handlePeriodChange = (_: React.MouseEvent<HTMLElement>, newValue: number | null) => {
    if (newValue !== null) {
      setSelectedPeriod(newValue);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          // @ts-expect-error - MUI Grid item prop type issue
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={stat.action}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: stat.color,
                      borderRadius: 1,
                      p: 1,
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Period selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={selectedPeriod}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          {PERIOD_OPTIONS.map((option, idx) => (
            <ToggleButton key={idx} value={idx}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Charts section */}
      {chartsLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Box>
      ) : barChartData.length === 0 ? (
        <Paper sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No data to display</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Hours by Client
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {clientNames.map((clientName, idx) => (
                    <Bar
                      key={clientName}
                      dataKey={clientName}
                      stackId="hours"
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Total Hours Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieChartData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={3}>
              <Typography variant="h6">Recent Work Entries</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-entries')}
                sx={{ flexShrink: 0 }}
              >
                Add Entry
              </Button>
            </Box>
            {recentEntries.length > 0 ? (
              recentEntries.map((entry: { id: number; client_name: string; hours: number; date: string; description?: string }) => (
                <Box key={entry.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle1">{entry.client_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.hours} hours - {new Date(entry.date).toLocaleDateString()}
                  </Typography>
                  {entry.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {entry.description}
                    </Typography>
                  )}
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No work entries yet</Typography>
            )}
          </Paper>
        </Grid>

        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/clients')}
                fullWidth
              >
                Add Client
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-entries')}
                fullWidth
              >
                Add Work Entry
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => navigate('/reports')}
                fullWidth
              >
                View Reports
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
