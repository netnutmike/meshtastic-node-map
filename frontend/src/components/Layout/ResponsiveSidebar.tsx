import React, { useState, useEffect, useRef } from 'react';

interface ResponsiveSidebarProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

/**
 * ResponsiveSidebar Component
 * 
 * Implements responsive sidebar behavior:
 * - Desktop: Fixed sidebar on right side, slides horizontally
 * - Mobile: Bottom sheet, slides vertically
 * 
 * Requirements: 36.5, 36.7
 */
export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  children,
  defaultCollapsed = false,
  onToggle
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle toggle
  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !sidebarRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const deltaY = currentYRef.current - startYRef.current;

    // Only allow downward swipe
    if (deltaY > 0) {
      sidebarRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !sidebarRef.current) return;
    const deltaY = currentYRef.current - startYRef.current;

    // If swiped down more than 100px, collapse
    if (deltaY > 100) {
      setCollapsed(true);
      onToggle?.(true);
    }

    // Reset transform
    sidebarRef.current.style.transform = '';
  };

  return (
    <>
      <div
        ref={sidebarRef}
        className={`responsive-sidebar ${collapsed ? 'collapsed' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isMobile && (
          <div className="responsive-sidebar-header">
            <h5 className="mb-0">Details</h5>
            <button
              className="btn-icon"
              onClick={handleToggle}
              aria-label="Close sidebar"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        )}
        <div className="responsive-sidebar-content">
          {children}
        </div>
      </div>

      <button
        className="responsive-sidebar-toggle btn btn-primary btn-icon"
        onClick={handleToggle}
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        aria-expanded={!collapsed}
      >
        <i className={`bi bi-${collapsed ? 'chevron-left' : 'chevron-right'}`}></i>
      </button>
    </>
  );
};

export default ResponsiveSidebar;
