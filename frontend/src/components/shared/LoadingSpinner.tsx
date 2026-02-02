/**
 * LoadingSpinner Component
 * Consistent loading state indicator
 * Requirements: 43.14
 */

import React from 'react';
import { Box, CircularProgress, Typography, Stack } from '@mui/material';

export interface LoadingSpinnerProps {
  message?: string;
  size?: number | 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  overlay?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
  overlay = false,
  color = 'primary'
}) => {
  // Convert size string to number
  const spinnerSize = typeof size === 'string'
    ? size === 'small' ? 24 : size === 'large' ? 64 : 40
    : size;

  const content = (
    <Stack
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{
        minHeight: fullScreen ? '100vh' : '200px',
        width: '100%'
      }}
    >
      <CircularProgress size={spinnerSize} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Stack>
  );

  if (overlay) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999
        }}
      >
        <Box
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 2,
            padding: 4,
            boxShadow: 3
          }}
        >
          {content}
        </Box>
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;
