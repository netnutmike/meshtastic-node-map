import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Link as LinkIcon,
  Book as BookIcon,
  Forum as ForumIcon,
  Language as WebIcon,
  OpenInNew as ExternalLinkIcon,
} from '@mui/icons-material';
import { CustomLink, loadCustomLinks } from '../../services/config';

interface CustomLinksMenuProps {
  className?: string;
}

const getIconComponent = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'book':
      return BookIcon;
    case 'forum':
      return ForumIcon;
    case 'web':
    case 'website':
      return WebIcon;
    default:
      return ExternalLinkIcon;
  }
};

const CustomLinksMenu: React.FC<CustomLinksMenuProps> = ({ className }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomLinks = async () => {
      try {
        const links = await loadCustomLinks();
        setCustomLinks(links);
      } catch (error) {
        console.error('Failed to load custom links:', error);
        setCustomLinks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomLinks();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    handleClose();
  };

  // Don't render if no custom links are configured (Requirement 12.4)
  if (loading || customLinks.length === 0) {
    return null;
  }

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Custom Links">
        <IconButton
          color="inherit"
          aria-label="custom links"
          aria-controls={open ? 'custom-links-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : 'false'}
          onClick={handleClick}
          className={className}
        >
          <LinkIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        id="custom-links-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'custom-links-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {customLinks.map((link, index) => {
          const IconComponent = getIconComponent(link.icon);
          
          return (
            <MenuItem
              key={index}
              onClick={() => handleLinkClick(link.url)}
              sx={{ minWidth: 200 }}
            >
              <ListItemIcon>
                <IconComponent fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={link.name}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {link.description}
                  </Typography>
                }
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default CustomLinksMenu;