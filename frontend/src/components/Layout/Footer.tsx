import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        Powered by{' '}
        <Link
          href="https://github.com/netnutmike/meshtastic-node-map"
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          color="primary"
        >
          Meshtastic Node Mapper
        </Link>
        {' • '}
        © {currentYear} Techtactile. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
