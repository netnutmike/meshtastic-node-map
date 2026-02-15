import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MapPage from '../pages/MapPage';
import AboutPage from '../pages/AboutPage';
import NodesPage from '../pages/NodesPage';
import NetworkInsightsPage from '../pages/NetworkInsightsPage';
import PacketsPage from '../pages/PacketsPage';
import LineOfSightPage from '../pages/LineOfSightPage';
import GatewayComparisonPage from '../pages/GatewayComparisonPage';
import DashboardPage from '../pages/DashboardPage';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Future routes will be added here */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/nodes" element={<NodesPage />} />
        <Route path="/insights" element={<NetworkInsightsPage />} />
        <Route path="/packets" element={<PacketsPage />} />
        <Route path="/line-of-sight" element={<LineOfSightPage />} />
        <Route path="/gateway-comparison" element={<GatewayComparisonPage />} />
        <Route path="/settings" element={<div>Settings Page - Coming Soon</div>} />
        <Route path="/tools" element={<div>Tools Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
};

export default AppRouter;