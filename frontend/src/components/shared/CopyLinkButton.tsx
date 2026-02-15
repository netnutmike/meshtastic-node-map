/**
 * CopyLinkButton - Reusable button component for copying shareable links
 * Requirements: 44.12, 44.13, 44.14, 44.15
 * 
 * Provides a button that copies the current URL with all filters to clipboard.
 * Shows visual feedback on successful copy.
 */

import React, { useState } from 'react';
import { urlStateManager } from '../../utils/UrlStateManager';

interface CopyLinkButtonProps {
  /**
   * Button variant style
   * @default 'outline-primary'
   */
  variant?: 'primary' | 'secondary' | 'outline-primary' | 'outline-secondary' | 'link';
  
  /**
   * Button size
   * @default 'sm'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Custom button text
   * @default 'Copy Link'
   */
  text?: string;
  
  /**
   * Show icon in button
   * @default true
   */
  showIcon?: boolean;
  
  /**
   * Custom CSS class
   */
  className?: string;
  
  /**
   * Callback when link is copied
   */
  onCopy?: (url: string) => void;
  
  /**
   * Callback when copy fails
   */
  onError?: (error: Error) => void;
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  variant = 'outline-primary',
  size = 'sm',
  text = 'Copy Link',
  showIcon = true,
  className = '',
  onCopy,
  onError,
}) => {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopyLink = async () => {
    if (copying) return;

    setCopying(true);

    try {
      const success = await urlStateManager.copyUrlToClipboard();
      
      if (success) {
        setCopied(true);
        
        // Get the URL that was copied
        const url = urlStateManager.getCurrentUrl();
        
        // Call success callback
        if (onCopy) {
          onCopy(url);
        }

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        throw new Error('Failed to copy to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      
      // Call error callback
      if (onError) {
        onError(error as Error);
      }
      
      // Show error state briefly
      setCopied(false);
    } finally {
      setCopying(false);
    }
  };

  const buttonClass = `btn btn-${variant} btn-${size} ${className}`;
  
  return (
    <button
      type="button"
      className={buttonClass}
      onClick={handleCopyLink}
      disabled={copying}
      title={copied ? 'Link copied!' : 'Copy shareable link to clipboard'}
    >
      {showIcon && (
        <i
          className={`bi ${
            copied ? 'bi-check-circle-fill' : copying ? 'bi-hourglass-split' : 'bi-link-45deg'
          } me-1`}
        />
      )}
      {copied ? 'Copied!' : copying ? 'Copying...' : text}
    </button>
  );
};

/**
 * Icon-only version of CopyLinkButton for compact layouts
 */
export const CopyLinkIconButton: React.FC<
  Omit<CopyLinkButtonProps, 'text' | 'showIcon'>
> = (props) => {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopyLink = async () => {
    if (copying) return;

    setCopying(true);

    try {
      const success = await urlStateManager.copyUrlToClipboard();
      
      if (success) {
        setCopied(true);
        
        const url = urlStateManager.getCurrentUrl();
        
        if (props.onCopy) {
          props.onCopy(url);
        }

        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        throw new Error('Failed to copy to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      
      if (props.onError) {
        props.onError(error as Error);
      }
    } finally {
      setCopying(false);
    }
  };

  const buttonClass = `btn btn-${props.variant || 'outline-primary'} btn-${
    props.size || 'sm'
  } ${props.className || ''}`;

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={handleCopyLink}
      disabled={copying}
      title={copied ? 'Link copied!' : 'Copy shareable link to clipboard'}
      aria-label={copied ? 'Link copied' : 'Copy link'}
    >
      <i
        className={`bi ${
          copied ? 'bi-check-circle-fill' : copying ? 'bi-hourglass-split' : 'bi-link-45deg'
        }`}
      />
    </button>
  );
};

export default CopyLinkButton;
