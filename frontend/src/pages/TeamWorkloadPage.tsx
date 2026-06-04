import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import {
  type TeamListItem,
  type TeamWorkloadResponse,
  type TeamWorkloadBreakdownResponse,
  type MemberStatus,
  type TeamMemberWorkload,
  type MemberBreakdown,
} from '../types/api';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const statusColorMap: Record<MemberStatus, 'error' | 'warning' | 'success' | 'default'> = {
  overloaded: 'error',
  'at-risk': 'warning',
  'on-track': 'success',
  underutilized: 'default',
  unknown: 'default',
};

const TeamWorkloadPage: React.FC = () => {
  const { teamId: teamIdParam } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    teamIdParam ? parseInt(teamIdParam, 10) : 0
  );

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const startDate = formatDate(weekStart);
  const endDate = formatDate(weekEnd);

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.getTeams(),
  });

  const teams: TeamListItem[] = teamsData?.teams || [];

  const { data: workloadData, isLoading: workloadLoading, error: workloadError } = useQuery<TeamWorkloadResponse>({
    queryKey: ['teamWorkload', selectedTeamId, startDate, endDate],
    queryFn: () => apiClient.getTeamWorkload(selectedTeamId, startDate, endDate),
    enabled: selectedTeamId > 0,
  });

  const { data: breakdownData } = useQuery<TeamWorkloadBreakdownResponse>({
    queryKey: ['teamWorkloadBreakdown', selectedTeamId, startDate, endDate],
    queryFn: () => apiClient.getTeamWorkloadBreakdown(selectedTeamId, startDate, endDate),
    enabled: selectedTeamId > 0,
  });

  const shiftWeek = (direction: number) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  const summary = workloadData?.summary;
  const members: TeamMemberWorkload[] = workloadData?.members || [];
  const breakdown: MemberBreakdown[] = breakdownData?.breakdown || [];

  // If navigated with teamId param and it's not set yet, sync it
  React.useEffect(() => {
    if (teamIdParam && parseInt(teamIdParam, 10) !== selectedTeamId) {
      setSelectedTeamId(parseInt(teamIdParam, 10));
    }
  }, [teamIdParam, selectedTeamId]);

  const summaryCards = summary
    ? [
        {
          title: 'Total Hours',
          value: summary.totalTeamHours.toFixed(1),
          icon: <AccessTimeIcon />,
          color: '#1976d2',
        },
        {
          title: 'Utilization %',
          value: `${summary.teamUtilizationPct.toFixed(1)}%`,
          icon: <TrendingUpIcon />,
          color: '#388e3c',
        },
        {
          title: 'Overloaded',
          value: summary.overloadedCount,
          icon: <WarningIcon />,
          color: '#d32f2f',
        },
        {
          title: 'Underutilized',
          value: summary.underutilizedCount,
          icon: <TrendingDownIcon />,
          color: '#757575',
        },
      ]
    : [];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Team</InputLabel>
          <Select
            value={selectedTeamId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedTeamId(id);
              if (id > 0) navigate(`/teams/${id}/workload`, { replace: true });
            }}
            label="Team"
          >
            <MenuItem value={0}>Select a team...</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ minWidth: 220, textAlign: 'center' }}>
            {weekStart.toLocaleDateString()} — {weekEnd.toLocaleDateString()}
          </Typography>
          <IconButton onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {selectedTeamId === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a team to view workload data.</Typography>
        </Paper>
      )}

      {workloadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load workload data.
        </Alert>
      )}

      {workloadLoading && selectedTeamId > 0 && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryCards.map((stat, index) => (
            // @ts-expect-error - MUI Grid item prop type issue
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h5">{stat.value}</Typography>
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
      )}

      {/* Member Table */}
      {members.length > 0 && (
        <Paper sx={{ mb: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell align="right">Capacity</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Utilization</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Entries</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.email}>
                    <TableCell>
                      <Typography variant="subtitle2">{m.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {m.email}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{m.totalHours.toFixed(1)}</TableCell>
                    <TableCell align="right">{m.capacityHours.toFixed(1)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(m.utilizationPct ?? 0, 100)}
                          color={
                            statusColorMap[m.status] === 'default'
                              ? 'primary'
                              : statusColorMap[m.status]
                          }
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right' }}>
                          {m.utilizationPct !== null ? `${m.utilizationPct.toFixed(0)}%` : '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={m.status}
                        color={statusColorMap[m.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{m.entryCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Client Breakdown */}
      {breakdown.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Client Breakdown
          </Typography>
          {breakdown.map((mb) => (
            <Accordion key={mb.email}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  {mb.displayName} ({mb.clients.length} client{mb.clients.length !== 1 ? 's' : ''})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {mb.clients.length === 0 ? (
                  <Typography color="text.secondary">No work entries in this period.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Client</TableCell>
                        <TableCell align="right">Hours</TableCell>
                        <TableCell align="right">Entries</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mb.clients.map((c) => (
                        <TableRow key={c.clientId}>
                          <TableCell>{c.clientName}</TableCell>
                          <TableCell align="right">{c.hours.toFixed(1)}</TableCell>
                          <TableCell align="right">{c.entryCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TeamWorkloadPage;
