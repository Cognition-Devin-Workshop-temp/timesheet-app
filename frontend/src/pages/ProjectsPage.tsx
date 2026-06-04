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
import { type Project, type ProjectStatus } from '../types/api';

const statusColors: Record<ProjectStatus, 'success' | 'default' | 'warning'> = {
  active: 'success',
  completed: 'default',
  'on-hold': 'warning',
};

const ProjectsPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: 0,
    startDate: new Date(),
    status: 'active' as ProjectStatus,
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const createMutation = useMutation({
    mutationFn: (projectData: { name: string; description?: string; clientId: number; startDate: string; status?: ProjectStatus }) =>
      apiClient.createProject(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create project');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; clientId?: number; startDate?: string; status?: ProjectStatus } }) =>
      apiClient.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete project');
    },
  });

  const projects = projectsData?.projects || [];
  const clients = clientsData?.clients || [];

  const handleOpen = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        clientId: project.client_id,
        startDate: new Date(project.start_date),
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        clientId: 0,
        startDate: new Date(),
        status: 'active',
      });
    }
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      clientId: 0,
      startDate: new Date(),
      status: 'active',
    });
    setError('');
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = 'Project name is required';
    } else if (trimmedName.length > 255) {
      errors.name = 'Project name must be 255 characters or less';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description must be 1000 characters or less';
    }

    if (!formData.clientId) {
      errors.clientId = 'Please select a client';
    }

    if (!formData.startDate) {
      errors.startDate = 'Please select a start date';
    } else if (isNaN(formData.startDate.getTime())) {
      errors.startDate = 'Please enter a valid date';
    }

    const validStatuses: ProjectStatus[] = ['active', 'completed', 'on-hold'];
    if (!validStatuses.includes(formData.status)) {
      errors.status = 'Please select a valid status';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    const projectData = {
      name: formData.name.trim(),
      description: formData.description || undefined,
      clientId: formData.clientId,
      startDate: formData.startDate.toISOString().split('T')[0],
      status: formData.status,
    };

    if (editingProject) {
      updateMutation.mutate({
        id: editingProject.id,
        data: projectData,
      });
    } else {
      createMutation.mutate(projectData);
    }
  };

  const handleDelete = (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      deleteMutation.mutate(project.id);
    }
  };

  if (projectsLoading || clientsLoading) {
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
          <Typography variant="h4">Projects</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Project
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
              You need to create at least one client before adding projects.
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
                    <TableCell>Name</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.length > 0 ? (
                    projects.map((project: Project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {project.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {project.client_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(project.start_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.status}
                            color={statusColors[project.status]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {project.description ? (
                            <Typography variant="body2" color="text.secondary">
                              {project.description}
                            </Typography>
                          ) : (
                            <Chip label="No description" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => handleOpen(project)}
                            color="primary"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(project)}
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
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          No projects found. Create your first project to get started.
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
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Project Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name || `${formData.name.trim().length}/255`}
                inputProps={{ maxLength: 255 }}
              />
              <FormControl fullWidth margin="dense" required error={!!fieldErrors.clientId}>
                <InputLabel>Client</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => {
                    setFormData({ ...formData, clientId: Number(e.target.value) });
                    if (fieldErrors.clientId) setFieldErrors({ ...fieldErrors, clientId: '' });
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {clients.map((client: { id: number; name: string }) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.clientId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {fieldErrors.clientId}
                  </Typography>
                )}
              </FormControl>
              <Box sx={{ mt: 1, mb: 0.5 }}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData({ ...formData, startDate: newValue });
                      if (fieldErrors.startDate) setFieldErrors({ ...fieldErrors, startDate: '' });
                    }
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'dense',
                      required: true,
                      error: !!fieldErrors.startDate,
                      helperText: fieldErrors.startDate,
                    },
                  }}
                />
              </Box>
              <FormControl fullWidth margin="dense" error={!!fieldErrors.status}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => {
                    setFormData({ ...formData, status: e.target.value as ProjectStatus });
                    if (fieldErrors.status) setFieldErrors({ ...fieldErrors, status: '' });
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="on-hold">On Hold</MenuItem>
                </Select>
                {fieldErrors.status && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {fieldErrors.status}
                  </Typography>
                )}
              </FormControl>
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: '' });
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                error={!!fieldErrors.description}
                helperText={fieldErrors.description || `${formData.description.length}/1000`}
                inputProps={{ maxLength: 1000 }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingProject
                    ? 'Update'
                    : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ProjectsPage;
