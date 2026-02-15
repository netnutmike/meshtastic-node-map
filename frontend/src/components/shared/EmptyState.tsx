/**
 * EmptyState Component
 * Consistent empty state display with customizable messaging
 * Requirements: 43.15
 */

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: 'inbox' | 'search' | 'error' | 'info' | React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  minHeight?: number | string;
}

const ICON_MAP = {
  inbox: InboxIcon,
  search: SearchOffIcon,
  error: ErrorOutlineIcon,
  info: InfoOutlinedIcon
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  minHeight = 300
}) => {
  // Render icon
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    const IconComponent = ICON_MAP[icon as keyof typeof ICON_MAP] || InboxIcon;
    return (
      <IconComponent
        sx={{
          fontSize: 64,
          color: 'text.disabled',
          mb: 2
        }}
      />
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: minHeight,
        padding: 4,
        textAlign: 'center'
      }}
    >
      {renderIcon()}
      
      <Typography
        variant="h6"
        color="text.secondary"
        gutterBottom
        sx={{ fontWeight: 500 }}
      >
        {title}
      </Typography>

      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 400, mb: 3 }}
        >
          {message}
        </Typography>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <Stack direction="row" spacing={2}>
          {actionLabel && onAction && (
            <Button
              variant="contained"
              onClick={onAction}
              size="medium"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outlined"
              onClick={onSecondaryAction}
              size="medium"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default EmptyState;
