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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { type TeamListItem, type TeamMember } from '../types/api';

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');

  // Manage members dialog
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberDisplayName, setMemberDisplayName] = useState('');
  const [memberCapacity, setMemberCapacity] = useState('40');

  // Edit member dialog
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCapacity, setEditCapacity] = useState('40');

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.getTeams(),
  });

  const { data: teamDetailData } = useQuery({
    queryKey: ['teamDetail', selectedTeamId],
    queryFn: () => apiClient.getTeam(selectedTeamId!),
    enabled: selectedTeamId !== null && membersOpen,
  });

  const teams: TeamListItem[] = teamsData?.teams || [];
  const teamMembers: TeamMember[] = teamDetailData?.members || [];
  const selectedTeam = teamDetailData?.team;

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.createTeam({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setCreateOpen(false);
      setTeamName('');
      setError('');
    },
    onError: () => setError('Failed to create team'),
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: number) => apiClient.deleteTeam(teamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
    onError: () => setError('Failed to delete team'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; email: string; displayName: string; weeklyCapacityHours: number }) =>
      apiClient.addTeamMember(data.teamId, { email: data.email, displayName: data.displayName, weeklyCapacityHours: data.weeklyCapacityHours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDetail', selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setAddMemberOpen(false);
      setMemberEmail('');
      setMemberDisplayName('');
      setMemberCapacity('40');
      setError('');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; email: string }) =>
      apiClient.removeTeamMember(data.teamId, data.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDetail', selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || 'Failed to remove member');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; email: string; displayName: string; weeklyCapacityHours: number }) =>
      apiClient.updateTeamMember(data.teamId, data.email, { displayName: data.displayName, weeklyCapacityHours: data.weeklyCapacityHours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDetail', selectedTeamId] });
      setEditMemberOpen(false);
      setError('');
    },
    onError: () => setError('Failed to update member'),
  });

  const handleCreateTeam = () => {
    if (!teamName.trim()) return;
    createMutation.mutate(teamName.trim());
  };

  const handleOpenMembers = (teamId: number) => {
    setSelectedTeamId(teamId);
    setMembersOpen(true);
    setError('');
  };

  const handleAddMember = () => {
    if (!memberEmail.trim() || !memberDisplayName.trim() || !selectedTeamId) return;
    addMemberMutation.mutate({
      teamId: selectedTeamId,
      email: memberEmail.trim(),
      displayName: memberDisplayName.trim(),
      weeklyCapacityHours: parseFloat(memberCapacity) || 40,
    });
  };

  const handleOpenEditMember = (member: TeamMember) => {
    setEditMemberEmail(member.email);
    setEditDisplayName(member.displayName);
    setEditCapacity(String(member.weeklyCapacityHours));
    setEditMemberOpen(true);
  };

  const handleUpdateMember = () => {
    if (!selectedTeamId) return;
    updateMemberMutation.mutate({
      teamId: selectedTeamId,
      email: editMemberEmail,
      displayName: editDisplayName.trim(),
      weeklyCapacityHours: parseFloat(editCapacity) || 40,
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Teams</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create Team
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {teams.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">
            No teams yet. Create your first team to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Team Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <Typography variant="subtitle1">{team.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={team.myRole}
                      color={team.myRole === 'manager' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{team.memberCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Workload">
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/teams/${team.id}/workload`)}
                      >
                        <BarChartIcon />
                      </IconButton>
                    </Tooltip>
                    {team.myRole === 'manager' && (
                      <>
                        <Tooltip title="Manage Members">
                          <IconButton onClick={() => handleOpenMembers(team.id)}>
                            <GroupIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Team">
                          <IconButton
                            color="error"
                            onClick={() => {
                              if (window.confirm(`Delete team "${team.name}"?`)) {
                                deleteMutation.mutate(team.id);
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Team</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained" disabled={!teamName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTeam ? `Members — ${selectedTeam.name}` : 'Team Members'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button startIcon={<PersonAddIcon />} variant="outlined" onClick={() => setAddMemberOpen(true)}>
              Add Member
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Capacity (h/wk)</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamMembers.map((m) => (
                  <TableRow key={m.email}>
                    <TableCell>{m.displayName}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.weeklyCapacityHours}</TableCell>
                    <TableCell>
                      <Chip label={m.role} color={m.role === 'manager' ? 'primary' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Member">
                        <IconButton size="small" onClick={() => handleOpenEditMember(m)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {m.role !== 'manager' && (
                        <Tooltip title="Remove Member">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (selectedTeamId && window.confirm(`Remove ${m.displayName}?`)) {
                                removeMemberMutation.mutate({ teamId: selectedTeamId, email: m.email });
                              }
                            }}
                          >
                            <PersonRemoveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Display Name"
            fullWidth
            value={memberDisplayName}
            onChange={(e) => setMemberDisplayName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Weekly Capacity (hours)"
            type="number"
            fullWidth
            value={memberCapacity}
            onChange={(e) => setMemberCapacity(e.target.value)}
            inputProps={{ min: 0, max: 168, step: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained" disabled={!memberEmail.trim() || !memberDisplayName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberOpen} onClose={() => setEditMemberOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            value={editMemberEmail}
            disabled
          />
          <TextField
            autoFocus
            margin="dense"
            label="Display Name"
            fullWidth
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Weekly Capacity (hours)"
            type="number"
            fullWidth
            value={editCapacity}
            onChange={(e) => setEditCapacity(e.target.value)}
            inputProps={{ min: 0, max: 168, step: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMemberOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateMember} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamsPage;
