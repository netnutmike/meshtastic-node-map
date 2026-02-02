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

- [x] 3. MQTT service implementation
  - Implement MQTT client connection to Mosquitto broker
  - Create Meshtastic protobuf message parsing and validation
  - Build message routing and topic subscription management
  - Implement real-time data streaming to database
  - Add connection recovery and error handling logic
  - _Requirements: 13.1, 13.5_

- [x] 3.1 Write property test for MQTT message parsing
  - **Property 9: MQTT message processing round-trip**
  - **Validates: Requirements 13.5**

- [x] 3.2 Write unit tests for MQTT service
  - Test MQTT connection establishment and recovery
  - Validate message parsing for different Meshtastic message types
  - Test error handling for malformed messages
  - _Requirements: 13.1, 13.5_

- [x] 4. Basic REST API implementation
  - Create Express.js server with TypeScript configuration
  - Implement RESTful endpoints for nodes, positions, and telemetry data
  - Add request validation and error handling middleware
  - Implement basic authentication and rate limiting
  - Create API documentation with OpenAPI/Swagger
  - _Requirements: 28.1, 28.4, 21.4_

- [x] 4.1 Write property test for API data consistency
  - **Property 10: Data storage and interface updates**
  - **Validates: Requirements 13.1, 13.2**

- [x] 4.2 Write unit tests for API endpoints
  - Test all CRUD operations for each entity type
  - Validate request/response formats and error codes
  - Test authentication and authorization logic
  - _Requirements: 28.1, 21.4_

- [x] 5. Frontend project setup and basic map implementation
  - Initialize React project with TypeScript and modern tooling
  - Set up Leaflet.js for interactive mapping functionality
  - Implement basic map component with OpenStreetMap tiles
  - Create responsive layout with navigation header
  - Add basic routing and state management (Redux/Zustand)
  - _Requirements: 1.1, 6.1, 6.2, 14.1, 14.2_

- [x] 5.1 Write property test for map initialization
  - **Property 1: Node rendering with position data**
  - **Validates: Requirements 1.2**

- [x] 6. Node visualization on map
  - Implement node rendering as colored dots based on connection status
  - Create node clustering for high-density areas
  - Add real-time position updates and smooth animations
  - Implement zoom controls and map interaction handlers
  - Add support for multiple map tile sources
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 8.1_

- [x] 6.1 Write property test for node status color coding
  - **Property 2: Node status color coding**
  - **Validates: Requirements 1.3, 1.4, 1.5**

- [x] 6.2 Write property test for node positioning
  - **Property 1: Node rendering with position data**
  - **Validates: Requirements 1.2**

- [x] 7. Node hover popups and basic information display
  - Create hover popup component with node information
  - Implement popup content with all required fields (name, status, hardware, etc.)
  - Add action buttons for detailed view and neighbor visualization
  - Style popup for mobile responsiveness and accessibility
  - Handle popup positioning and collision detection
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7.1 Write property test for hover popup content
  - **Property 3: Hover popup content completeness**
  - **Validates: Requirements 2.1**

- [x] 7.2 Write property test for hover popup buttons
  - **Property 4: Hover popup required buttons**
  - **Validates: Requirements 2.2, 2.3, 2.4**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Node details panel implementation
  - Create comprehensive node details panel/modal component
  - Implement tabbed interface for different information sections
  - Add device details section with ID, hardware, firmware information
  - Create LoRa configuration display with region and channel data
  - Implement position coordinates display with formatting
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9.1 Write property test for details panel content
  - **Property 6: Details panel comprehensive content**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 10. Telemetry visualization and historical data
  - Implement Chart.js integration for telemetry graphs
  - Create device metrics section with battery, voltage, and utilization charts
  - Add environmental metrics with temperature, humidity, and pressure graphs
  - Implement configurable time range selection for historical data
  - Display current real-time values alongside historical charts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10.1 Write property test for device telemetry display
  - **Property 7: Device telemetry visualization**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 10.2 Write property test for environmental telemetry display
  - **Property 8: Environmental telemetry visualization**
  - **Validates: Requirements 4.4, 4.5**

- [x] 11. Neighbor visualization and network topology
  - Implement neighbor relationship visualization with directional arrows
  - Create network topology graph component using D3.js or similar
  - Add interactive neighbor selection and highlighting
  - Implement signal strength visualization with color-coded connections
  - Add topology filtering and layout options
  - _Requirements: 2.5, 15.2, 15.3, 15.4, 15.5_

- [x] 11.1 Write property test for neighbor visualization
  - **Property 5: Neighbor visualization arrows**
  - **Validates: Requirements 2.5**

- [x] 12. Real-time updates and WebSocket implementation
  - Implement WebSocket server for real-time data streaming
  - Create client-side WebSocket connection with reconnection logic
  - Add real-time node position and status updates
  - Implement efficient data diffing to minimize update payloads
  - Add connection status indicators and offline mode handling
  - _Requirements: 13.2, 28.2_

- [x] 12.1 Write property test for real-time updates
  - **Property 10: Data storage and interface updates**
  - **Validates: Requirements 13.1, 13.2**

- [x] 13. Search and filtering functionality
  - Implement node search with autocomplete functionality
  - Create advanced filtering by hardware type, role, and status
  - Add geographic area filtering with map drawing tools
  - Implement time-based filtering for last seen and position updates
  - Create filter combination logic and result count display
  - _Requirements: 6.3, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 13.1 Write unit tests for search and filtering
  - Test search functionality with various query types
  - Validate filter combinations and result accuracy
  - Test geographic area filtering logic
  - _Requirements: 6.3, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 14. Settings and configuration management
  - Create settings panel with user preference controls
  - Implement local storage for persistent user settings
  - Add configuration options for node age limits and display preferences
  - Create temperature format selection and map defaults
  - Implement settings reset functionality with default values
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14.1 Write unit tests for settings management
  - Test settings persistence and retrieval
  - Validate default value restoration
  - Test setting validation and error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Age-based node filtering and display logic
  - Implement node age calculation and filtering logic
  - Create "Show All" toggle to override age filtering
  - Add visual indicators for node age and connection status
  - Implement automatic node hiding based on configured thresholds
  - Add age-based styling and opacity effects
  - _Requirements: 7.1, 13.4_

- [x] 15.1 Write property test for age-based filtering
  - **Property 11: Age-based node filtering**
  - **Validates: Requirements 13.4**

- [x] 16. Map options and layer management
  - Implement map tile source selection (OpenStreetMap, satellite, etc.)
  - Create node display mode toggles (All, Routers, Clustered, None)
  - Add overlay management for legend, neighbors, and position history
  - Implement view mode switching (Nodes, Node Types, Bandwidth Utilization)
  - Create map options panel with intuitive controls
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 16.1 Write unit tests for map layer management
  - Test tile source switching functionality
  - Validate overlay toggle behavior
  - Test view mode transitions and data display
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 17. Message history and communication tracking
  - Implement message storage and retrieval system
  - Create message history display with filtering and search
  - Add message type categorization (Sent, Received, Gated)
  - Implement message routing path visualization
  - Create message export functionality
  - _Requirements: 3.2, 15.1, 19.3_

- [x] 17.1 Write unit tests for message management
  - Test message storage and retrieval operations
  - Validate message filtering and search functionality
  - Test routing path calculation and display
  - _Requirements: 3.2, 15.1, 19.3_

- [x] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. About page and customizable content
  - Create about page with application information and version display
  - Implement configurable content sections for custom information
  - Add version tracking and display from package.json
  - Create responsive layout for about page content
  - Implement navigation and routing for about page
  - _Requirements: 6.4, 10.4, 12.2_

- [x] 19.1 Write unit tests for about page
  - Test version display and content rendering
  - Validate configurable content sections
  - Test responsive layout and navigation
  - _Requirements: 6.4, 10.4, 12.2_

- [x] 20. Custom links and navigation enhancements
  - Implement custom links configuration from YAML
  - Create custom links menu with hover descriptions
  - Add external link handling with new tab opening
  - Implement conditional display based on configuration
  - Style custom links for consistent navigation experience
  - _Requirements: 12.3, 12.4_

- [x] 20.1 Write unit tests for custom links
  - Test custom links configuration loading
  - Validate link display and interaction behavior
  - Test conditional visibility logic
  - _Requirements: 12.3, 12.4_

- [x] 21. MQTT monitoring tool
  - Create MQTT traffic monitoring interface
  - Implement real-time message display with filtering
  - Add message type breakdown and statistics
  - Create message content inspection and debugging tools
  - Implement traffic rate monitoring and alerts
  - _Requirements: 11.1_

- [x] 21.1 Write unit tests for MQTT monitoring
  - Test message capture and display functionality
  - Validate filtering and statistics calculations
  - Test real-time update performance
  - _Requirements: 11.1_

- [x] 22. Statistics and analytics reporting
  - Implement comprehensive network statistics calculation
  - Create detailed reports for nodes, messages, and network utilization
  - Add breakdown by message type, encryption status, and routing method
  - Implement node type analysis and distribution charts
  - Create exportable reports in multiple formats
  - _Requirements: 11.2, 19.1, 19.2_

- [x] 22.1 Write unit tests for statistics generation
  - Test statistics calculation accuracy
  - Validate report generation and formatting
  - Test data aggregation and filtering logic
  - _Requirements: 11.2, 19.1, 19.2_

- [x] 23. Network utilization analysis
  - Implement channel utilization tracking and analysis
  - Create utilization heatmaps and geographic overlays
  - Add capacity planning tools and recommendations
  - Implement performance trend analysis and forecasting
  - Create utilization alerts and threshold monitoring
  - _Requirements: 11.3, 11.4, 17.1, 17.2, 17.3_

- [x] 23.1 Write unit tests for utilization analysis
  - Test utilization calculation algorithms
  - Validate heatmap generation and overlay display
  - Test capacity planning recommendations
  - _Requirements: 11.3, 11.4, 17.1, 17.2, 17.3_

- [x] 24. Authentication and user management
  - Implement JWT-based authentication system
  - Create user registration and login interfaces
  - Add role-based access control (Admin, Operator, Viewer)
  - Implement password reset and account management
  - Create user session management and security controls
  - _Requirements: 21.1, 21.2, 21.3_

- [x] 24.1 Write unit tests for authentication
  - Test user authentication and authorization flows
  - Validate JWT token generation and validation
  - Test role-based permission enforcement
  - _Requirements: 21.1, 21.2, 21.3_

- [x] 25. API security and rate limiting
  - Implement API key management system
  - Add rate limiting per user and endpoint
  - Create API usage analytics and monitoring
  - Implement request validation and sanitization
  - Add security logging and audit trails
  - _Requirements: 21.4, 21.5, 28.1, 28.3_

- [x] 25.1 Write unit tests for API security
  - Test rate limiting enforcement
  - Validate API key authentication
  - Test input validation and sanitization
  - _Requirements: 21.4, 21.5, 28.1, 28.3_

- [x] 26. Data export and backup functionality
  - Implement data export in multiple formats (CSV, JSON, KML)
  - Create automated backup and restore utilities
  - Add selective data export with filtering options
  - Implement report generation and scheduling
  - Create data sharing and public URL generation
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 26.1 Write unit tests for data export
  - Test export functionality for all supported formats
  - Validate data filtering and selection logic
  - Test backup and restore operations
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 27. Mobile optimization and offline capabilities
  - Implement responsive design for mobile devices
  - Add location services integration for mobile users
  - Create offline data caching and synchronization
  - Implement touch-friendly controls and gestures
  - Add mobile-specific features and optimizations
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 14.3, 14.4_

- [x] 27.1 Write unit tests for mobile features
  - Test responsive layout and touch interactions
  - Validate offline functionality and data sync
  - Test location services integration
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 14.3, 14.4_

- [x] 28. Advanced analytics and machine learning
  - Implement predictive analytics for node failure detection
  - Create anomaly detection algorithms for network behavior
  - Add performance optimization recommendations
  - Implement trend analysis and forecasting models
  - Create intelligent alerting based on ML insights
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [x] 28.1 Write unit tests for analytics algorithms
  - Test predictive model accuracy and performance
  - Validate anomaly detection sensitivity
  - Test recommendation engine logic
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [x] 29. Multi-network support and federation
  - Implement multiple MQTT broker connections
  - Create network segmentation and access controls
  - Add cross-network analytics and data federation
  - Implement network selection and filtering interfaces
  - Create multi-tenant data isolation and security
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [x] 29.1 Write unit tests for multi-network features
  - Test multiple broker connection management
  - Validate network isolation and security
  - Test cross-network data aggregation
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [x] 30. Coverage analysis and network planning
  - Implement radio range calculation and visualization
  - Create coverage gap analysis and optimization tools
  - Add terrain integration for line-of-sight modeling
  - Implement deployment simulation and planning features
  - Create network optimization recommendations
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [x] 30.1 Write unit tests for coverage analysis
  - Test range calculation algorithms
  - Validate coverage gap detection
  - Test deployment simulation accuracy
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  - **Status: COMPLETED** - Backend route tests (16/16 passing), Frontend component structure tests (5/5 passing)

- [x] 31. Documentation and deployment preparation
  - Create comprehensive user documentation
  - Write developer documentation and API guides
  - Prepare installation and deployment guides
  - Set up automated testing and CI/CD pipelines
  - Create Docker production configurations
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 31.1 Write integration tests for full system
  - Test complete user workflows end-to-end
  - Validate Docker deployment and configuration
  - Test system performance under load
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 32. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.
  - Validate all requirements are implemented and tested
  - Perform final system integration testing
  - Prepare for production deployment


---

## New Feature Implementation Tasks

The following tasks implement new features. These tasks build upon the existing foundation to add advanced network visualization, analytics, and user experience enhancements.

**Reference Documentation:**
- `docs/NETWORK_MAP_IMPLEMENTATION.md` - Implementation details for network map
- `docs/FEATURE_ROADMAP.md` - Complete feature roadmap
- `docs/DASHBOARD_AND_FEATURES_ANALYSIS.md` - Dashboard specifications
- `docs/UI_UX_BEST_PRACTICES.md` - UI/UX implementation patterns

### Phase 1: Network Map with RF Links (Priority 1.0)

- [x] 33. Implement RF link detection backend services
  - Create TracerouteLinkService to extract RF hops from TRACEROUTE_APP packets
  - Create PacketLinkService to detect 0-hop packets (hop_start = hop_limit)
  - Implement link aggregation and bidirectional merging
  - Add success rate calculation: min(100, max(10, packet_count * 10))
  - Create database indexes for performance optimization
  - _Requirements: 34.1, 34.2, 34.3, 34.11, 34.12, 34.13, 34.14_

- [x] 33.1 Write property test for RF link detection
  - **Property: RF link extraction from traceroutes**
  - **Validates: Requirements 34.1, 34.2, 34.3**

- [x] 33.2 Write unit tests for link services
  - Test traceroute parsing and hop extraction
  - Validate 0-hop packet detection logic
  - Test link aggregation and statistics calculation
  - _Requirements: 34.1, 34.2, 34.3, 34.11, 34.12, 34.13_

- [x] 34. Create RF links API endpoint
  - Implement GET /api/map/links endpoint with time range parameter
  - Add caching layer with 5-minute TTL
  - Implement query optimization with time window limits
  - Return both traceroute_links and packet_links arrays
  - Add filtering by hours parameter (default 24, max 336/14 days)
  - _Requirements: 34.10, 34.15_

- [x] 34.1 Write unit tests for links API
  - Test endpoint response format and data structure
  - Validate time range filtering
  - Test caching behavior
  - _Requirements: 34.10, 34.15_

- [x] 35. Implement RF link visualization on map
  - Update NetworkMap component to fetch and display RF links
  - Draw solid lines for traceroute links, dashed for packet links
  - Implement color coding by success rate (green/yellow/red)
  - Add link popups with detailed information
  - Create toggle controls for link type visibility
  - _Requirements: 34.4, 34.5, 34.6, 34.7_

- [x] 35.1 Write unit tests for link visualization
  - Test link rendering with different types and success rates
  - Validate popup content and interaction
  - Test toggle controls functionality
  - _Requirements: 34.4, 34.5, 34.6, 34.7_

- [x] 36. Implement hop depth filtering
  - Create BFS algorithm to compute nodes within N hops
  - Add hop depth selector UI (1, 2, 3, or all hops)
  - Filter visible nodes and links based on hop depth
  - Update map display when hop depth changes
  - Optimize performance for large networks
  - _Requirements: 34.8, 34.9_

- [x] 36.1 Write property test for hop depth calculation
  - **Property: BFS hop depth calculation correctness**
  - **Validates: Requirements 34.8, 34.9**

### Phase 2: Theme Support (Priority 1.1)

- [x] 37. Implement DarkModeToggle class
  - Create theme management class with localStorage persistence
  - Implement three-state toggle: light → dark → auto
  - Add system preference detection with prefers-color-scheme
  - Dispatch themeChanged custom event on theme changes
  - Update meta theme-color for mobile browsers
  - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7, 35.10_

- [x] 37.1 Write unit tests for theme management
  - Test theme preference storage and retrieval
  - Validate theme cycling logic
  - Test system preference detection
  - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7_

- [x] 38. Integrate theme support in components
  - Update Chart.js charts to use theme-aware colors
  - Switch Leaflet map tiles between light/dark
  - Add CSS custom properties for theme-aware styling
  - Listen for themeChanged events in all components
  - Test theme switching across all pages
  - _Requirements: 35.8, 35.9, 35.11_

- [x] 38.1 Write unit tests for theme integration
  - Test chart color updates on theme change
  - Validate map tile layer switching
  - Test CSS custom property application
  - _Requirements: 35.8, 35.9, 35.11_

- [x] 39. Add theme toggle to navigation
  - Create theme toggle button component
  - Add icon indicators for current mode (sun/moon/circle-half)
  - Position toggle in navigation header
  - Add tooltip explaining theme modes
  - Test accessibility and keyboard navigation
  - _Requirements: 35.12_

- [x] 39.1 Write unit tests for theme toggle UI
  - Test button rendering and icon display
  - Validate click interaction and theme cycling
  - Test accessibility features
  - _Requirements: 35.12_

### Phase 3: Mobile Responsiveness (Priority 1.2)

- [x] 40. Implement responsive layout system
  - Add responsive breakpoints and CSS media queries
  - Implement mobile-first base styles with font scaling
  - Create responsive sidebar (side on desktop, bottom sheet on mobile)
  - Add touch-friendly control sizing (44x44px minimum)
  - Test on multiple device sizes and orientations
  - _Requirements: 36.1, 36.4, 36.5, 36.6, 36.7, 36.13_

- [x] 40.1 Write unit tests for responsive behavior
  - Test breakpoint detection and layout changes
  - Validate sidebar positioning on different screen sizes
  - Test touch target sizing
  - _Requirements: 36.1, 36.4, 36.5, 36.6, 36.7_

- [x] 41. Convert action buttons to icon-only format
  - Replace text buttons with icon buttons + tooltips
  - Ensure 44x44px minimum touch target size
  - Implement button groups for multiple actions
  - Add dropdown menus for additional actions (>3-4 items)
  - Test on mobile devices for usability
  - _Requirements: 36.2, 36.3, 36.11, 36.12_

- [x] 41.1 Write unit tests for icon buttons
  - Test button rendering and tooltip display
  - Validate touch target sizing
  - Test dropdown menu functionality
  - _Requirements: 36.2, 36.3, 36.11, 36.12_

- [x] 42. Optimize tables for mobile
  - Hide less important columns on mobile with .hide-mobile class
  - Reduce font size and padding on small screens
  - Prevent iOS zoom with 16px minimum font size on inputs
  - Implement horizontal scroll with sticky actions column
  - Consider card layout alternative for very small screens
  - _Requirements: 36.8, 36.9, 36.10_

- [x] 42.1 Write unit tests for mobile table optimization
  - Test column hiding on mobile breakpoints
  - Validate font size and padding adjustments
  - Test input font size for iOS
  - _Requirements: 36.8, 36.9, 36.10_

- [x] 43. Optimize map for mobile
  - Implement touch-friendly map controls
  - Add larger tap targets for map interactions
  - Optimize marker clustering for touch
  - Test gesture support (pinch zoom, pan)
  - Ensure smooth performance on mobile devices
  - _Requirements: 36.14, 36.15_

- [x] 43.1 Write unit tests for mobile map features
  - Test touch interaction handling
  - Validate gesture support
  - Test performance on simulated mobile devices
  - _Requirements: 36.14, 36.15_

### Phase 4: Dashboard Enhancements (Priority 1.3)

- [x] 44. Implement dashboard statistics API
  - Create GET /api/analytics/dashboard endpoint
  - Implement single optimized SQL query for all statistics
  - Calculate 6 metric cards: Total Nodes, Active Nodes, Gateway Diversity, Protocol Diversity, Total Messages, Success Rate
  - Add 60-second caching with Redis
  - Return data for all 7 charts
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.13, 37.14_

- [x] 44.1 Write unit tests for dashboard API
  - Test statistics calculation accuracy
  - Validate caching behavior
  - Test query performance
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.13, 37.14_

- [x] 45. Create dashboard metric cards
  - Implement 6 metric card components
  - Add color-coding based on thresholds
  - Display network coverage percentage for Active Nodes
  - Format large numbers with commas
  - Update cards in real-time
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

- [x] 45.1 Write unit tests for metric cards
  - Test card rendering and data display
  - Validate color-coding logic
  - Test number formatting
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

- [x] 46. Implement dashboard charts
  - Create Network Activity Trends line chart (7 days)
  - Create Node Activity Distribution doughnut chart
  - Create Gateway Activity Distribution bar chart
  - Create Signal Quality Distribution bar chart
  - Create Message Routing Patterns doughnut chart
  - Create Protocol Usage pie chart (24h)
  - Create Most Active Nodes table
  - _Requirements: 37.6, 37.7, 37.8, 37.9, 37.10, 37.11, 37.12_

- [x] 46.1 Write unit tests for dashboard charts
  - Test chart data processing and rendering
  - Validate chart configuration and options
  - Test theme-aware color updates
  - _Requirements: 37.6, 37.7, 37.8, 37.9, 37.10, 37.11, 37.12, 37.15_

### Phase 5: Advanced Packet Analysis (Priority 2.1)

- [x] 47. Implement packet grouping functionality
  - Add "Group by Packet ID" toggle to packets page
  - Implement grouping by (mesh_packet_id, from_node_id, to_node_id, portnum, portnum_name)
  - Calculate aggregated statistics: gateway count, RSSI/SNR ranges, hop ranges, reception count
  - Format relay node counts (e.g., "0x12, 0x34*2, 0x56*3")
  - Optimize performance with in-memory grouping
  - _Requirements: 38.1, 38.2, 38.3, 38.4_

- [x] 47.1 Write unit tests for packet grouping
  - Test grouping logic and aggregation
  - Validate statistics calculation
  - Test relay node formatting
  - _Requirements: 38.1, 38.2, 38.3, 38.4_

- [x] 48. Implement advanced packet filters
  - Add time range filters (start_time, end_time)
  - Create searchable node pickers for From/To/Exclude filters
  - Add gateway picker with searchable dropdown
  - Implement port number filter dropdown
  - Add hop count filter (Any, Direct, 1, 2, 3, 4+)
  - Add RSSI/SNR range filters
  - Add primary channel filter
  - Add "Exclude gateway self messages" checkbox
  - _Requirements: 38.5, 38.6, 38.7, 38.8, 38.9, 38.10, 38.11, 38.12_

- [x] 48.1 Write unit tests for packet filters
  - Test each filter type independently
  - Validate filter combination logic
  - Test filter state persistence
  - _Requirements: 38.5, 38.6, 38.7, 38.8, 38.9, 38.10, 38.11, 38.12_

- [x] 49. Implement TEXT_MESSAGE_APP decoding
  - Decode and display text message content in packets table
  - Handle different text encodings
  - Sanitize message content for display
  - Add message content search functionality
  - Test with various message formats
  - _Requirements: 38.13_

- [x] 49.1 Write unit tests for message decoding
  - Test text message decoding
  - Validate content sanitization
  - Test search functionality
  - _Requirements: 38.13_

### Phase 6: Distance Calculation (Priority 2.2)

- [x] 50. Implement Haversine distance calculation
  - Create DistanceCalculationService with Haversine formula
  - Use Earth radius of 6371.0 km
  - Add distance calculation to neighbor relationships
  - Implement location history caching for performance
  - Add distance formatting with appropriate precision
  - _Requirements: 39.1, 39.2, 39.3, 39.13, 39.14_

- [x] 50.1 Write property test for distance calculation
  - **Property: Haversine formula correctness**
  - **Validates: Requirements 39.1, 39.2**

- [x] 50.2 Write unit tests for distance service
  - Test distance calculation accuracy
  - Validate location history caching
  - Test distance formatting
  - _Requirements: 39.1, 39.2, 39.3, 39.13, 39.14_

- [x] 51. Implement longest links analysis
  - Create GET /api/links/longest endpoint
  - Filter by minimum distance (default 1km) and SNR (default -20dB)
  - Pre-fetch location history for performance
  - Calculate distances for all RF hops
  - Display table with distance, signal quality, and hop count
  - Add age warnings for stale location data
  - _Requirements: 39.4, 39.5, 39.6, 39.7, 39.8, 39.9_

- [x] 51.1 Write unit tests for longest links
  - Test filtering logic
  - Validate distance calculations
  - Test age warning display
  - _Requirements: 39.4, 39.5, 39.6, 39.7, 39.8, 39.9_

- [x] 52. Add distance display to map
  - Show distance labels on RF link lines (optional toggle)
  - Display distance in neighbor popups
  - Calculate total path distance for multi-hop routes
  - Add distance vs signal quality scatter plots
  - Test performance with many links
  - _Requirements: 39.10, 39.11, 39.15_

- [x] 52.1 Write unit tests for distance display
  - Test distance label rendering
  - Validate multi-hop distance calculation
  - Test scatter plot generation
  - _Requirements: 39.10, 39.11, 39.15_

### Phase 7: Line of Sight Analysis (Priority 2.3)

- [x] 53. Implement line-of-sight analysis tool
  - Create LineOfSight page component
  - Add two searchable node picker dropdowns
  - Calculate straight-line distance between selected nodes
  - Draw line on map connecting the nodes
  - Query historical packet data for connectivity
  - Display signal quality statistics if connectivity exists
  - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6_

- [x] 53.1 Write unit tests for line-of-sight tool
  - Test node selection and distance calculation
  - Validate historical connectivity queries
  - Test signal quality statistics display
  - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6_

- [x] 54. Add elevation profile support
  - Integrate with elevation API (Open-Elevation or USGS)
  - Display elevation profile chart between nodes
  - Calculate first Fresnel zone clearance
  - Highlight potential terrain obstructions
  - Make elevation data optional/configurable
  - _Requirements: 40.7, 40.11, 40.12_

- [x] 54.1 Write unit tests for elevation profile
  - Test elevation data fetching
  - Validate Fresnel zone calculation
  - Test obstruction detection
  - _Requirements: 40.7, 40.11, 40.12_

- [x] 55. Add line-of-sight URL parameters and integration
  - Support ?from=X&to=Y URL parameters for pre-loading
  - Add "Line of Sight" button to link popups on map
  - Calculate bearing/azimuth for antenna alignment
  - Generate shareable URLs
  - Add to tools dropdown menu
  - _Requirements: 40.8, 40.9, 40.10, 40.13, 40.14, 40.15_

- [x] 55.1 Write unit tests for LOS integration
  - Test URL parameter handling
  - Validate map integration
  - Test bearing calculation
  - _Requirements: 40.8, 40.9, 40.10, 40.13, 40.14, 40.15_

### Phase 8: Gateway Comparison (Priority 2.4)

- [x] 56. Implement gateway comparison backend
  - Create GET /api/gateways/compare endpoint
  - Find common packets with INNER JOIN on (mesh_packet_id, from_node_id, hop_limit)
  - Filter packets within 30 seconds of each other
  - Calculate signal quality differences (RSSI, SNR)
  - Compute statistics (average, min, max, std dev)
  - Cache gateway statistics for 5 minutes
  - _Requirements: 41.2, 41.3, 41.4, 41.9, 41.14_

- [x] 56.1 Write unit tests for gateway comparison
  - Test common packet detection
  - Validate statistics calculations
  - Test caching behavior
  - _Requirements: 41.2, 41.3, 41.4, 41.9, 41.14_

- [x] 57. Create gateway comparison UI
  - Add two searchable gateway picker dropdowns
  - Display scatter plots (RSSI and SNR comparisons)
  - Show timeline chart of signal quality over time
  - Display histogram of signal differences
  - Show detailed packet table with differences
  - _Requirements: 41.1, 41.5, 41.6, 41.7, 41.8, 41.10_

- [x] 57.1 Write unit tests for comparison UI
  - Test gateway selection
  - Validate chart rendering
  - Test table display
  - _Requirements: 41.1, 41.5, 41.6, 41.7, 41.8, 41.10_

- [x] 58. Add comparison filters and export
  - Implement time range filters
  - Add source node filter
  - Display gateway statistics (packet count, avg signal, unique sources)
  - Add CSV export functionality
  - Test with large datasets
  - _Requirements: 41.11, 41.12, 41.13, 41.15_

- [x] 58.1 Write unit tests for comparison features
  - Test filtering functionality
  - Validate export format
  - Test performance with large datasets
  - _Requirements: 41.11, 41.12, 41.13, 41.15_

### Phase 9: Data Retention (Priority 3.1)

- [x] 59. Implement data retention configuration
  - Add retention policies to config/app.yml
  - Support different retention periods per data type
  - Add enabled/disabled flag
  - Configure batch size and vacuum threshold
  - Load configuration on service start
  - _Requirements: 42.1, 42.2, 42.9_

- [x] 59.1 Write unit tests for retention config
  - Test configuration loading
  - Validate policy parsing
  - Test default values
  - _Requirements: 42.1, 42.2, 42.9_

- [x] 60. Create data cleanup job
  - Implement hourly cron job for automatic cleanup
  - Delete messages older than retention period
  - Preserve traceroute packets (longer retention)
  - Keep node_info records even without recent data
  - Batch delete operations (1000 records at a time)
  - Run VACUUM after large deletions
  - _Requirements: 42.3, 42.4, 42.5, 42.6, 42.10, 42.11_

- [x] 60.1 Write unit tests for cleanup job
  - Test deletion logic for each data type
  - Validate batch processing
  - Test VACUUM execution
  - _Requirements: 42.3, 42.4, 42.5, 42.6, 42.10, 42.11_

- [x] 61. Add cleanup monitoring and controls
  - Log cleanup statistics (records deleted, space freed)
  - Add admin button for manual cleanup trigger
  - Implement optional archive-before-delete
  - Add disk space monitoring and alerts
  - Create audit trail for cleanup operations
  - _Requirements: 42.7, 42.8, 42.12, 42.13, 42.14, 42.15_

- [x] 61.1 Write unit tests for cleanup monitoring
  - Test logging functionality
  - Validate manual trigger
  - Test archive functionality
  - _Requirements: 42.7, 42.8, 42.12, 42.13, 42.14_

### Phase 10: Reusable Components (Priority 3.2)

- [x] 62. Create NodePicker component
  - Implement searchable dropdown with autocomplete
  - Add debounced search (300ms)
  - Cache node list client-side
  - Display node name, hex ID, hardware, packet count
  - Support keyboard navigation
  - _Requirements: 43.1, 43.2, 43.3, 43.4_

- [x] 62.1 Write unit tests for NodePicker
  - Test search and filtering
  - Validate debouncing
  - Test keyboard navigation
  - _Requirements: 43.1, 43.2, 43.3, 43.4_

- [x] 63. Create GatewayPicker component
  - Implement similar to NodePicker for gateways
  - Convert between hex IDs and decimal node IDs
  - Show gateway packet counts
  - Fallback to API if not in cache
  - _Requirements: 43.5_

- [x] 63.1 Write unit tests for GatewayPicker
  - Test gateway selection
  - Validate ID conversion
  - Test API fallback
  - _Requirements: 43.5_

- [x] 64. Create ModernTable component
  - Implement lightweight table with pagination
  - Add client-side sorting
  - Support customizable columns with render functions
  - Add debounced search (300ms)
  - Integrate URL state management
  - _Requirements: 43.6, 43.7, 43.8, 43.9_

- [x] 64.1 Write unit tests for ModernTable
  - Test pagination and sorting
  - Validate column rendering
  - Test search functionality
  - _Requirements: 43.6, 43.7, 43.8, 43.9_

- [x] 65. Create shared utility components
  - Implement FilterStore with Proxy for reactive state
  - Create SignalQualityBadge component
  - Create TimeRangePicker component
  - Create LoadingSpinner component
  - Create EmptyState component
  - _Requirements: 43.10, 43.11, 43.12, 43.13, 43.14, 43.15_

- [x] 65.1 Write unit tests for utility components
  - Test FilterStore reactivity
  - Validate badge color coding
  - Test time range selection
  - _Requirements: 43.10, 43.11, 43.12, 43.13, 43.14, 43.15_

### Phase 11: URL State Management (Priority 3.3)

- [x] 66. Implement UrlStateManager utility
  - Create utility for syncing filters to URL
  - Use URLSearchParams and history.replaceState()
  - Debounce URL updates by 300ms
  - Support array parameters
  - Validate and sanitize URL parameters
  - _Requirements: 44.1, 44.2, 44.6, 44.7, 44.8, 44.9_

- [x] 66.1 Write unit tests for UrlStateManager
  - Test URL parameter encoding/decoding
  - Validate debouncing
  - Test array parameter handling
  - _Requirements: 44.1, 44.2, 44.6, 44.7, 44.8, 44.9_

- [x] 67. Integrate URL state across pages
  - Restore filter state from URL on page load
  - Update URL when filters change
  - Remove null/empty parameters from URL
  - Support browser back/forward navigation
  - Test bookmark and sharing functionality
  - _Requirements: 44.3, 44.4, 44.5, 44.10, 44.11_

- [x] 67.1 Write unit tests for URL state integration
  - Test state restoration on load
  - Validate browser navigation
  - Test bookmark functionality
  - _Requirements: 44.3, 44.4, 44.5, 44.10, 44.11_

- [x] 68. Add shareable link functionality
  - Create "Copy Link" button for filtered views
  - Generate shareable URLs with all filters
  - Ensure exact reproduction of filter state
  - Handle complex nested objects and arrays
  - Test across all pages (packets, nodes, map)
  - _Requirements: 44.12, 44.13, 44.14, 44.15_

- [x] 68.1 Write unit tests for shareable links
  - Test link generation
  - Validate state reproduction
  - Test complex filter scenarios
  - _Requirements: 44.12, 44.13, 44.14, 44.15_

### Phase 12: Final Integration and Testing

- [x] 69. Integration testing for New features
  - Test complete RF link visualization workflow
  - Validate theme switching across all components
  - Test mobile responsiveness on real devices
  - Verify dashboard statistics accuracy
  - Test packet filtering and grouping end-to-end
  - Validate distance calculations and longest links
  - Test line-of-sight analysis workflow
  - Verify gateway comparison functionality
  - Test data retention and cleanup
  - Validate reusable components integration
  - Test URL state management across pages

- [x] 69.1 Write integration tests for user workflows
  - Test complete user journeys for each feature
  - Validate cross-feature interactions
  - Test performance under load
  - Verify mobile user experience

- [x] 70. Documentation and deployment
  - Update user documentation with new features
  - Create feature guides for RF link visualization
  - Document theme customization options
  - Add mobile usage guide
  - Update API documentation
  - Create deployment guide for new features
  - Update configuration examples

- [x] 71. Final checkpoint - New features complete
  - Ensure all New feature tests pass
  - Validate all requirements are implemented
  - Perform final system integration testing
  - Prepare release notes and changelog
