import React from 'react';
import { Box } from '@mui/material';
import NavigationHeader from '../components/Layout/NavigationHeader';
import AboutContent from '../components/AboutContent';

const AboutPage: React.FC = () => {
  return (
    <Box>
      <NavigationHeader />
      <AboutContent />
    </Box>
  );
};

export default AboutPage;