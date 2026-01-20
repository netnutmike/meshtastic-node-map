import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import NavigationHeader from '../components/Layout/NavigationHeader';
import Footer from '../components/Layout/Footer';
import AboutContent from '../components/AboutContent';
import { MQTTMonitor } from '../components/MQTTMonitor';
import { openTopologyGraph } from '../store/slices/mapSlice';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);

  const handleOpenMQTTMonitor = () => {
    setMqttMonitorOpen(true);
  };

  const handleCloseMQTTMonitor = () => {
    setMqttMonitorOpen(false);
  };

  const handleOpenTopology = () => {
    // Navigate to map and open topology
    dispatch(openTopologyGraph());
    navigate('/');
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

      <Footer />
    </Box>
  );
};

export default AboutPage;
