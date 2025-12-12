# Implementation Plan

## Overview

This implementation plan converts the Meshtastic Node Mapper design into a series of incremental coding tasks. Each task builds on previous work and focuses on delivering working functionality that can be tested and validated. The plan prioritizes core mapping and visualization features first, then adds advanced analytics and management capabilities.

## Task List

- [x] 1. Project setup and infrastructure foundation
  - Initialize Node.js/TypeScript project structure for both frontend and backend
  - Set up Docker Compose configuration with PostgreSQL, Redis, and Mosquitto services
  - Create external directories for configuration files and logs
  - Configure development environment with hot reloading and debugging
  - Set up package.json files with all required dependencies
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 1.1 Write property test for Docker Compose deployment
  - **Property 1: Container service availability**
  - **Validates: Requirements 9.1**

- [x] 2. Database schema and core data models
  - Design and implement PostgreSQL database schema using Prisma ORM
  - Create TypeScript interfaces for Node, Position, TelemetryReading, Message, and Network entities
  - Implement database migrations and seeding scripts
  - Set up TimescaleDB extension for time-series data optimization
  - Create database connection utilities and error handling
  - _Requirements: 13.1, 3.3, 3.4, 3.5_

- [x] 2.1 Write property test for data model validation
  - **Property 9: MQTT message processing round-trip**
  - **Validates: Requirements 13.5**

- [x] 2.2 Write unit tests for database operations
  - Create unit tests for CRUD operations on all entities
  - Test database connection handling and error scenarios
  - Validate schema migrations and data integrity
  - _Requirements: 13.1_

- [ ] 3. MQTT service implementation
  - Implement MQTT client connection to Mosquitto broker
  - Create Meshtastic protobuf message parsing and validation
  - Build message routing and topic subscription management
  - Implement real-time data streaming to database
  - Add connection recovery and error handling logic
  - _Requirements: 13.1, 13.5_

- [ ] 3.1 Write property test for MQTT message parsing
  - **Property 9: MQTT message processing round-trip**
  - **Validates: Requirements 13.5**

- [ ] 3.2 Write unit tests for MQTT service
  - Test MQTT connection establishment and recovery
  - Validate message parsing for different Meshtastic message types
  - Test error handling for malformed messages
  - _Requirements: 13.1, 13.5_

- [ ] 4. Basic REST API implementation
  - Create Express.js server with TypeScript configuration
  - Implement RESTful endpoints for nodes, positions, and telemetry data
  - Add request validation and error handling middleware
  - Implement basic authentication and rate limiting
  - Create API documentation with OpenAPI/Swagger
  - _Requirements: 28.1, 28.4, 21.4_

- [ ] 4.1 Write property test for API data consistency
  - **Property 10: Data storage and interface updates**
  - **Validates: Requirements 13.1, 13.2**

- [ ] 4.2 Write unit tests for API endpoints
  - Test all CRUD operations for each entity type
  - Validate request/response formats and error codes
  - Test authentication and authorization logic
  - _Requirements: 28.1, 21.4_

- [ ] 5. Frontend project setup and basic map implementation
  - Initialize React project with TypeScript and modern tooling
  - Set up Leaflet.js for interactive mapping functionality
  - Implement basic map component with OpenStreetMap tiles
  - Create responsive layout with navigation header
  - Add basic routing and state management (Redux/Zustand)
  - _Requirements: 1.1, 6.1, 6.2, 14.1, 14.2_

- [ ] 5.1 Write property test for map initialization
  - **Property 1: Node rendering with position data**
  - **Validates: Requirements 1.2**

- [ ] 6. Node visualization on map
  - Implement node rendering as colored dots based on connection status
  - Create node clustering for high-density areas
  - Add real-time position updates and smooth animations
  - Implement zoom controls and map interaction handlers
  - Add support for multiple map tile sources
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 8.1_

- [ ] 6.1 Write property test for node status color coding
  - **Property 2: Node status color coding**
  - **Validates: Requirements 1.3, 1.4, 1.5**

- [ ] 6.2 Write property test for node positioning
  - **Property 1: Node rendering with position data**
  - **Validates: Requirements 1.2**

- [ ] 7. Node hover popups and basic information display
  - Create hover popup component with node information
  - Implement popup content with all required fields (name, status, hardware, etc.)
  - Add action buttons for detailed view and neighbor visualization
  - Style popup for mobile responsiveness and accessibility
  - Handle popup positioning and collision detection
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 7.1 Write property test for hover popup content
  - **Property 3: Hover popup content completeness**
  - **Validates: Requirements 2.1**

- [ ] 7.2 Write property test for hover popup buttons
  - **Property 4: Hover popup required buttons**
  - **Validates: Requirements 2.2, 2.3, 2.4**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Node details panel implementation
  - Create comprehensive node details panel/modal component
  - Implement tabbed interface for different information sections
  - Add device details section with ID, hardware, firmware information
  - Create LoRa configuration display with region and channel data
  - Implement position coordinates display with formatting
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9.1 Write property test for details panel content
  - **Property 6: Details panel comprehensive content**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 10. Telemetry visualization and historical data
  - Implement Chart.js integration for telemetry graphs
  - Create device metrics section with battery, voltage, and utilization charts
  - Add environmental metrics with temperature, humidity, and pressure graphs
  - Implement configurable time range selection for historical data
  - Display current real-time values alongside historical charts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 10.1 Write property test for device telemetry display
  - **Property 7: Device telemetry visualization**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 10.2 Write property test for environmental telemetry display
  - **Property 8: Environmental telemetry visualization**
  - **Validates: Requirements 4.4, 4.5**

- [ ] 11. Neighbor visualization and network topology
  - Implement neighbor relationship visualization with directional arrows
  - Create network topology graph component using D3.js or similar
  - Add interactive neighbor selection and highlighting
  - Implement signal strength visualization with color-coded connections
  - Add topology filtering and layout options
  - _Requirements: 2.5, 15.2, 15.3, 15.4, 15.5_

- [ ] 11.1 Write property test for neighbor visualization
  - **Property 5: Neighbor visualization arrows**
  - **Validates: Requirements 2.5**

- [ ] 12. Real-time updates and WebSocket implementation
  - Implement WebSocket server for real-time data streaming
  - Create client-side WebSocket connection with reconnection logic
  - Add real-time node position and status updates
  - Implement efficient data diffing to minimize update payloads
  - Add connection status indicators and offline mode handling
  - _Requirements: 13.2, 28.2_

- [ ] 12.1 Write property test for real-time updates
  - **Property 10: Data storage and interface updates**
  - **Validates: Requirements 13.1, 13.2**

- [ ] 13. Search and filtering functionality
  - Implement node search with autocomplete functionality
  - Create advanced filtering by hardware type, role, and status
  - Add geographic area filtering with map drawing tools
  - Implement time-based filtering for last seen and position updates
  - Create filter combination logic and result count display
  - _Requirements: 6.3, 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 13.1 Write unit tests for search and filtering
  - Test search functionality with various query types
  - Validate filter combinations and result accuracy
  - Test geographic area filtering logic
  - _Requirements: 6.3, 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 14. Settings and configuration management
  - Create settings panel with user preference controls
  - Implement local storage for persistent user settings
  - Add configuration options for node age limits and display preferences
  - Create temperature format selection and map defaults
  - Implement settings reset functionality with default values
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 14.1 Write unit tests for settings management
  - Test settings persistence and retrieval
  - Validate default value restoration
  - Test setting validation and error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15. Age-based node filtering and display logic
  - Implement node age calculation and filtering logic
  - Create "Show All" toggle to override age filtering
  - Add visual indicators for node age and connection status
  - Implement automatic node hiding based on configured thresholds
  - Add age-based styling and opacity effects
  - _Requirements: 7.1, 13.4_

- [ ] 15.1 Write property test for age-based filtering
  - **Property 11: Age-based node filtering**
  - **Validates: Requirements 13.4**

- [ ] 16. Map options and layer management
  - Implement map tile source selection (OpenStreetMap, satellite, etc.)
  - Create node display mode toggles (All, Routers, Clustered, None)
  - Add overlay management for legend, neighbors, and position history
  - Implement view mode switching (Nodes, Node Types, Bandwidth Utilization)
  - Create map options panel with intuitive controls
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 16.1 Write unit tests for map layer management
  - Test tile source switching functionality
  - Validate overlay toggle behavior
  - Test view mode transitions and data display
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 17. Message history and communication tracking
  - Implement message storage and retrieval system
  - Create message history display with filtering and search
  - Add message type categorization (Sent, Received, Gated)
  - Implement message routing path visualization
  - Create message export functionality
  - _Requirements: 3.2, 15.1, 19.3_

- [ ] 17.1 Write unit tests for message management
  - Test message storage and retrieval operations
  - Validate message filtering and search functionality
  - Test routing path calculation and display
  - _Requirements: 3.2, 15.1, 19.3_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. About page and customizable content
  - Create about page with application information and version display
  - Implement configurable content sections for custom information
  - Add version tracking and display from package.json
  - Create responsive layout for about page content
  - Implement navigation and routing for about page
  - _Requirements: 6.4, 10.4, 12.2_

- [ ] 19.1 Write unit tests for about page
  - Test version display and content rendering
  - Validate configurable content sections
  - Test responsive layout and navigation
  - _Requirements: 6.4, 10.4, 12.2_

- [ ] 20. Custom links and navigation enhancements
  - Implement custom links configuration from YAML
  - Create custom links menu with hover descriptions
  - Add external link handling with new tab opening
  - Implement conditional display based on configuration
  - Style custom links for consistent navigation experience
  - _Requirements: 12.3, 12.4_

- [ ] 20.1 Write unit tests for custom links
  - Test custom links configuration loading
  - Validate link display and interaction behavior
  - Test conditional visibility logic
  - _Requirements: 12.3, 12.4_

- [ ] 21. MQTT monitoring tool
  - Create MQTT traffic monitoring interface
  - Implement real-time message display with filtering
  - Add message type breakdown and statistics
  - Create message content inspection and debugging tools
  - Implement traffic rate monitoring and alerts
  - _Requirements: 11.1_

- [ ] 21.1 Write unit tests for MQTT monitoring
  - Test message capture and display functionality
  - Validate filtering and statistics calculations
  - Test real-time update performance
  - _Requirements: 11.1_

- [ ] 22. Statistics and analytics reporting
  - Implement comprehensive network statistics calculation
  - Create detailed reports for nodes, messages, and network utilization
  - Add breakdown by message type, encryption status, and routing method
  - Implement node type analysis and distribution charts
  - Create exportable reports in multiple formats
  - _Requirements: 11.2, 19.1, 19.2_

- [ ] 22.1 Write unit tests for statistics generation
  - Test statistics calculation accuracy
  - Validate report generation and formatting
  - Test data aggregation and filtering logic
  - _Requirements: 11.2, 19.1, 19.2_

- [ ] 23. Network utilization analysis
  - Implement channel utilization tracking and analysis
  - Create utilization heatmaps and geographic overlays
  - Add capacity planning tools and recommendations
  - Implement performance trend analysis and forecasting
  - Create utilization alerts and threshold monitoring
  - _Requirements: 11.3, 11.4, 17.1, 17.2, 17.3_

- [ ] 23.1 Write unit tests for utilization analysis
  - Test utilization calculation algorithms
  - Validate heatmap generation and overlay display
  - Test capacity planning recommendations
  - _Requirements: 11.3, 11.4, 17.1, 17.2, 17.3_

- [ ] 24. Authentication and user management
  - Implement JWT-based authentication system
  - Create user registration and login interfaces
  - Add role-based access control (Admin, Operator, Viewer)
  - Implement password reset and account management
  - Create user session management and security controls
  - _Requirements: 21.1, 21.2, 21.3_

- [ ] 24.1 Write unit tests for authentication
  - Test user authentication and authorization flows
  - Validate JWT token generation and validation
  - Test role-based permission enforcement
  - _Requirements: 21.1, 21.2, 21.3_

- [ ] 25. API security and rate limiting
  - Implement API key management system
  - Add rate limiting per user and endpoint
  - Create API usage analytics and monitoring
  - Implement request validation and sanitization
  - Add security logging and audit trails
  - _Requirements: 21.4, 21.5, 28.1, 28.3_

- [ ] 25.1 Write unit tests for API security
  - Test rate limiting enforcement
  - Validate API key authentication
  - Test input validation and sanitization
  - _Requirements: 21.4, 21.5, 28.1, 28.3_

- [ ] 26. Data export and backup functionality
  - Implement data export in multiple formats (CSV, JSON, KML)
  - Create automated backup and restore utilities
  - Add selective data export with filtering options
  - Implement report generation and scheduling
  - Create data sharing and public URL generation
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 26.1 Write unit tests for data export
  - Test export functionality for all supported formats
  - Validate data filtering and selection logic
  - Test backup and restore operations
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 27. Mobile optimization and offline capabilities
  - Implement responsive design for mobile devices
  - Add location services integration for mobile users
  - Create offline data caching and synchronization
  - Implement touch-friendly controls and gestures
  - Add mobile-specific features and optimizations
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 14.3, 14.4_

- [ ] 27.1 Write unit tests for mobile features
  - Test responsive layout and touch interactions
  - Validate offline functionality and data sync
  - Test location services integration
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 14.3, 14.4_

- [ ] 28. Advanced analytics and machine learning
  - Implement predictive analytics for node failure detection
  - Create anomaly detection algorithms for network behavior
  - Add performance optimization recommendations
  - Implement trend analysis and forecasting models
  - Create intelligent alerting based on ML insights
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 28.1 Write unit tests for analytics algorithms
  - Test predictive model accuracy and performance
  - Validate anomaly detection sensitivity
  - Test recommendation engine logic
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 29. Multi-network support and federation
  - Implement multiple MQTT broker connections
  - Create network segmentation and access controls
  - Add cross-network analytics and data federation
  - Implement network selection and filtering interfaces
  - Create multi-tenant data isolation and security
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 29.1 Write unit tests for multi-network features
  - Test multiple broker connection management
  - Validate network isolation and security
  - Test cross-network data aggregation
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 30. Coverage analysis and network planning
  - Implement radio range calculation and visualization
  - Create coverage gap analysis and optimization tools
  - Add terrain integration for line-of-sight modeling
  - Implement deployment simulation and planning features
  - Create network optimization recommendations
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [ ] 30.1 Write unit tests for coverage analysis
  - Test range calculation algorithms
  - Validate coverage gap detection
  - Test deployment simulation accuracy
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [ ] 31. Documentation and deployment preparation
  - Create comprehensive user documentation
  - Write developer documentation and API guides
  - Prepare installation and deployment guides
  - Set up automated testing and CI/CD pipelines
  - Create Docker production configurations
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 31.1 Write integration tests for full system
  - Test complete user workflows end-to-end
  - Validate Docker deployment and configuration
  - Test system performance under load
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 32. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.
  - Validate all requirements are implemented and tested
  - Perform final system integration testing
  - Prepare for production deployment