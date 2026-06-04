import React, { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

function parseToken(token: string | null): { email: string; token: string } | { error: string } {
  if (!token) {
    return { error: 'No authentication token received.' };
  }
  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    const email = payload.email;
    if (!email) {
      return { error: 'Email not found in token.' };
    }
    return { email, token };
  } catch {
    return { error: 'Failed to process authentication token.' };
  }
}

const OidcCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const result = useMemo(() => parseToken(searchParams.get('token')), [searchParams]);

  useEffect(() => {
    if ('email' in result) {
      loginWithToken(result.token, result.email);
      navigate('/dashboard', { replace: true });
    }
  }, [result, loginWithToken, navigate]);

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        {'error' in result ? (
          <Alert severity="error">{result.error}</Alert>
        ) : (
          <>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Completing sign-in…</Typography>
          </>
        )}
      </Box>
    </Container>
  );
};

export default OidcCallbackPage;
