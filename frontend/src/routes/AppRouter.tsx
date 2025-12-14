import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MapPage from '../pages/MapPage';
import AboutPage from '../pages/AboutPage';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<MapPage />} />
        {/* Future routes will be added here */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/devices" element={<div>Devices Page - Coming Soon</div>} />
        <Route path="/settings" element={<div>Settings Page - Coming Soon</div>} />
        <Route path="/tools" element={<div>Tools Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
};

export default AppRouter;