import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { TeamDashboardData, TopLogger, UpcomingDeadline, ActiveClient } from '../types/api';

const TeamDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useQuery<TeamDashboardData>({
    queryKey: ['teamDashboard'],
    queryFn: () => apiClient.getTeamDashboard(),
  });

  const topLoggers: TopLogger[] = data?.topLoggers || [];
  const upcomingDeadlines: UpcomingDeadline[] = data?.upcomingDeadlines || [];
  const activeClients: ActiveClient[] = data?.activeClients || [];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">Failed to load team dashboard data. Please try again later.</Alert>
      </Box>
    );
  }

  const summaryCards = [
    {
      title: 'Team Members Active',
      value: topLoggers.length,
      icon: <GroupIcon />,
      color: '#1976d2',
    },
    {
      title: 'Upcoming Deadlines',
      value: upcomingDeadlines.length,
      icon: <ScheduleIcon />,
      color: '#f57c00',
    },
    {
      title: 'Active Clients',
      value: activeClients.length,
      icon: <BusinessIcon />,
      color: '#388e3c',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Team Workload Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((stat, index) => (
          // @ts-expect-error - MUI Grid item prop type issue
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
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

      <Grid container spacing={3}>
        {/* Top Loggers This Week */}
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Loggers This Week
            </Typography>
            {topLoggers.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Team Member</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Entries</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topLoggers.map((logger, index) => (
                      <TableRow key={logger.user_email}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {index < 3 && (
                              <Chip
                                label={`#${index + 1}`}
                                size="small"
                                color={index === 0 ? 'primary' : 'default'}
                              />
                            )}
                            {logger.user_email}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={index === 0 ? 'bold' : 'normal'}>
                            {Number(logger.total_hours).toFixed(1)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{logger.entry_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No logged hours this week</Typography>
            )}
          </Paper>
        </Grid>

        {/* Most Active Clients */}
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Most Active Clients
            </Typography>
            {activeClients.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Entries</TableCell>
                      <TableCell align="right">Members</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeClients.map((client) => (
                      <TableRow key={client.client_id}>
                        <TableCell>{client.client_name}</TableCell>
                        <TableCell align="right">
                          {Number(client.total_hours).toFixed(1)}
                        </TableCell>
                        <TableCell align="right">{client.entry_count}</TableCell>
                        <TableCell align="right">{client.user_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No client activity this week</Typography>
            )}
          </Paper>
        </Grid>

        {/* Upcoming Deadlines */}
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Deadlines (Next 7 Days)
            </Typography>
            {upcomingDeadlines.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Team Member</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingDeadlines.map((deadline, index) => (
                      <TableRow key={`${deadline.user_email}-${deadline.date}-${index}`}>
                        <TableCell>
                          <Chip
                            label={new Date(deadline.date).toLocaleDateString()}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{deadline.user_email}</TableCell>
                        <TableCell>{deadline.client_name}</TableCell>
                        <TableCell align="right">{Number(deadline.hours).toFixed(1)}</TableCell>
                        <TableCell>{deadline.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No upcoming deadlines</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeamDashboardPage;
