import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import './MOTD.css';

interface MOTDConfig {
  enabled: boolean;
  title: string;
  message: string;
  dismissible: boolean;
}

interface MOTDProps {
  config: MOTDConfig;
}

// Simple hash function to detect MOTD content changes
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

const MOTD: React.FC<MOTDProps> = ({ config }) => {
  const [open, setOpen] = useState(false);
  const SESSION_KEY = 'motd_dismissed_session';
  const CONTENT_KEY = 'motd_content_hash';

  useEffect(() => {
    // Check if MOTD is enabled
    if (config.enabled) {
      // Generate hash of current MOTD content
      const currentHash = hashString(config.title + config.message);
      
      // Check if dismissed in this session
      const sessionDismissed = sessionStorage.getItem(SESSION_KEY);
      
      // Check if this is the same MOTD content as last time
      const lastContentHash = localStorage.getItem(CONTENT_KEY);
      
      // Show MOTD if:
      // 1. Not dismissed in this session, OR
      // 2. Content has changed (different hash)
      if (!sessionDismissed || lastContentHash !== currentHash) {
        setOpen(true);
        // Update the stored content hash
        localStorage.setItem(CONTENT_KEY, currentHash);
      }
    }
  }, [config.enabled, config.title, config.message]);

  const handleClose = () => {
    if (config.dismissible) {
      setOpen(false);
      // Mark as dismissed for this session only
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  };

  if (!config.enabled) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={config.dismissible ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      className="motd-dialog"
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="span">
            {config.title}
          </Typography>
          {config.dismissible && (
            <IconButton
              aria-label="close"
              onClick={handleClose}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
          {config.message}
        </Typography>
      </DialogContent>
      {config.dismissible && (
        <DialogActions>
          <Button onClick={handleClose} variant="contained" color="primary">
            Got it
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default MOTD;
