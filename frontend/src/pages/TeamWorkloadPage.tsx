import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Drawer,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  NavigateBefore,
  NavigateNext,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type {
  TeamWorkloadResponse,
  MemberBreakdownResponse,
  TeamMemberWorkload,
  WorkloadStatus,
} from '../types/api';

type Order = 'asc' | 'desc';
type OrderBy = 'displayName' | 'totalHours' | 'capacity' | 'utilizationPct' | 'status';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getStatusColor(status: WorkloadStatus): 'error' | 'success' | 'warning' {
  switch (status) {
    case 'overloaded':
      return 'error';
    case 'healthy':
      return 'success';
    case 'underloaded':
      return 'warning';
  }
}

const TeamWorkloadPage: React.FC = () => {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('totalHours');

  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = formatDate(monday);
  const endDate = formatDate(sunday);

  const {
    data: workloadData,
    isLoading,
    error,
  } = useQuery<TeamWorkloadResponse>({
    queryKey: ['teamWorkload', startDate, endDate],
    queryFn: () => apiClient.getTeamWorkload(startDate, endDate),
    enabled: user?.role === 'manager',
  });

  const { data: breakdownData, isLoading: breakdownLoading } =
    useQuery<MemberBreakdownResponse>({
      queryKey: ['memberBreakdown', selectedEmail, startDate, endDate],
      queryFn: () => apiClient.getMemberBreakdown(selectedEmail!, startDate, endDate),
      enabled: !!selectedEmail,
    });

  if (user?.role !== 'manager') {
    return (
      <Box>
        <Alert severity="info">
          You need manager access to view the Team Workload Dashboard.
        </Alert>
      </Box>
    );
  }

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedMembers = [...(workloadData?.members || [])].sort((a, b) => {
    const getValue = (m: TeamMemberWorkload) => {
      switch (orderBy) {
        case 'displayName':
          return (m.displayName || m.email).toLowerCase();
        case 'totalHours':
          return m.totalHours;
        case 'capacity':
          return m.capacity;
        case 'utilizationPct':
          return m.utilizationPct ?? -1;
        case 'status':
          return m.status;
        default:
          return 0;
      }
    };
    const aVal = getValue(a);
    const bVal = getValue(b);
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });

  const summaryCards = workloadData
    ? [
        {
          title: 'Team Total Hours',
          value: workloadData.summary.teamTotalHours.toFixed(2),
          color: '#1976d2',
        },
        {
          title: 'Team Average Hours',
          value: workloadData.summary.teamAvgHours.toFixed(2),
          color: '#388e3c',
        },
        {
          title: 'Overloaded Members',
          value: workloadData.summary.overloadedCount,
          color: '#f57c00',
        },
      ]
    : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Team Workload
      </Typography>

      {/* Week Picker */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => setWeekOffset((o) => o - 1)}>
          <NavigateBefore />
        </IconButton>
        <Typography variant="h6">
          {monday.toLocaleDateString()} &ndash; {sunday.toLocaleDateString()}
        </Typography>
        <IconButton onClick={() => setWeekOffset((o) => o + 1)}>
          <NavigateNext />
        </IconButton>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load team workload data.
        </Alert>
      )}

      {workloadData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {summaryCards.map((stat, index) => (
              // @ts-expect-error - MUI Grid item prop type issue
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
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
                        <GroupsIcon />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Member Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'displayName'}
                      direction={orderBy === 'displayName' ? order : 'asc'}
                      onClick={() => handleSort('displayName')}
                    >
                      Member
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'totalHours'}
                      direction={orderBy === 'totalHours' ? order : 'asc'}
                      onClick={() => handleSort('totalHours')}
                    >
                      Hours
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'capacity'}
                      direction={orderBy === 'capacity' ? order : 'asc'}
                      onClick={() => handleSort('capacity')}
                    >
                      Capacity
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'utilizationPct'}
                      direction={orderBy === 'utilizationPct' ? order : 'asc'}
                      onClick={() => handleSort('utilizationPct')}
                    >
                      Util%
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMembers.map((member) => (
                  <TableRow
                    key={member.email}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedEmail(member.email)}
                  >
                    <TableCell>{member.displayName || member.email}</TableCell>
                    <TableCell align="right">{member.totalHours.toFixed(2)}</TableCell>
                    <TableCell align="right">{member.capacity}</TableCell>
                    <TableCell align="right">
                      {member.utilizationPct !== null
                        ? `${member.utilizationPct.toFixed(1)}%`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.status}
                        color={getStatusColor(member.status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Breakdown Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Member Breakdown</Typography>
            <IconButton onClick={() => setSelectedEmail(null)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {breakdownLoading && <CircularProgress />}

          {breakdownData && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                {breakdownData.member.displayName || breakdownData.member.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {breakdownData.member.totalHours} / {breakdownData.member.capacity} hours
              </Typography>

              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Entries</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {breakdownData.breakdown.map((entry) => (
                      <TableRow key={entry.clientId}>
                        <TableCell>{entry.clientName}</TableCell>
                        <TableCell>{entry.department || '—'}</TableCell>
                        <TableCell align="right">{entry.hours}</TableCell>
                        <TableCell align="right">{entry.entries}</TableCell>
                      </TableRow>
                    ))}
                    {breakdownData.breakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No entries for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default TeamWorkloadPage;
