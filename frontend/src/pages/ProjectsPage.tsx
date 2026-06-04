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
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  createFilterOptions,
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
import { type Project, type Client } from '../types/api';

interface ClientOption {
  id: number;
  name: string;
  inputValue?: string;
}

const filter = createFilterOptions<ClientOption>();

const statusColors: Record<string, 'success' | 'default' | 'warning'> = {
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
    newClientName: '',
    startDate: new Date(),
    status: 'active' as string,
  });
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const createClientMutation = useMutation({
    mutationFn: (clientData: { name: string }) =>
      apiClient.createClient(clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (projectData: { name: string; description?: string; clientId: number; startDate: string; status?: string }) =>
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
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; clientId?: number; startDate?: string; status?: string } }) =>
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
        newClientName: '',
        startDate: new Date(project.start_date),
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        clientId: 0,
        newClientName: '',
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
      newClientName: '',
      startDate: new Date(),
      status: 'active',
    });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.clientId && !formData.newClientName) {
      setError('Please select or enter a client');
      return;
    }

    if (!formData.startDate) {
      setError('Please select a start date');
      return;
    }

    const submitProject = (clientId: number) => {
      const projectData = {
        name: formData.name,
        description: formData.description,
        clientId,
        startDate: formData.startDate.toISOString().split('T')[0],
        status: formData.status,
      };

      if (editingProject) {
        updateMutation.mutate({ id: editingProject.id, data: projectData });
      } else {
        createMutation.mutate(projectData);
      }
    };

    if (formData.newClientName && !formData.clientId) {
      createClientMutation.mutate(
        { name: formData.newClientName },
        {
          onSuccess: (data) => {
            submitProject(data.client.id);
          },
          onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Failed to create client');
          },
        }
      );
    } else {
      submitProject(formData.clientId);
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Projects</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {projects.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No projects yet. Click "Add Project" to create one.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project: Project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.description || '—'}</TableCell>
                  <TableCell>{project.client_name || '—'}</TableCell>
                  <TableCell>{new Date(project.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={project.status}
                      color={statusColors[project.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpen(project)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(project)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              label="Project Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Autocomplete
              freeSolo
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              options={clients as ClientOption[]}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                if (option.inputValue) return option.inputValue;
                return option.name;
              }}
              value={clients.find((c: Client) => c.id === formData.clientId) || null}
              onChange={(_event, newValue) => {
                if (typeof newValue === 'string') {
                  setFormData({ ...formData, clientId: 0, newClientName: newValue });
                } else if (newValue && newValue.inputValue) {
                  setFormData({ ...formData, clientId: 0, newClientName: newValue.inputValue });
                } else if (newValue) {
                  setFormData({ ...formData, clientId: newValue.id, newClientName: '' });
                } else {
                  setFormData({ ...formData, clientId: 0, newClientName: '' });
                }
              }}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);
                const { inputValue } = params;
                const isExisting = options.some((option) => inputValue === option.name);
                if (inputValue !== '' && !isExisting) {
                  filtered.push({ id: 0, name: `Add "${inputValue}"`, inputValue });
                }
                return filtered;
              }}
              renderOption={(props, option) => {
                const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
                return <li key={key} {...rest}>{option.name}</li>;
              }}
              renderInput={(params) => (
                <TextField {...params} label="Client" margin="dense" required fullWidth />
              )}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(newValue) => setFormData({ ...formData, startDate: newValue || new Date() })}
                slotProps={{ textField: { fullWidth: true, margin: 'dense', required: true } }}
              />
            </LocalizationProvider>
            <FormControl fullWidth margin="dense">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on-hold">On Hold</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingProject ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProjectsPage;
