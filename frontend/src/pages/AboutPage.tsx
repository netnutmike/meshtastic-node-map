import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NavigationHeader from '../components/Layout/NavigationHeader';
import AboutContent from '../components/AboutContent';
import { MQTTMonitor } from '../components/MQTTMonitor';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);

  const handleOpenMQTTMonitor = () => {
    setMqttMonitorOpen(true);
  };

  const handleCloseMQTTMonitor = () => {
    setMqttMonitorOpen(false);
  };

  const handleOpenTopology = () => {
    // Navigate to map and open topology
    navigate('/map');
  };

  return (
    <Box>
      <NavigationHeader 
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
        onOpenTopology={handleOpenTopology}
      />
      <AboutContent />
      
      {/* MQTT Monitor */}
      <MQTTMonitor 
        isVisible={mqttMonitorOpen}
        onClose={handleCloseMQTTMonitor}
      />
    </Box>
  );
};

export default AboutPage;