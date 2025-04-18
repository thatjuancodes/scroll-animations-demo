import React from 'react';
import { motion } from 'framer-motion';

type ScrollIndicatorProps = {
  canExit: boolean;
  isSnapping: boolean;
  scrollVelocity: number;
  direction?: 'up' | 'down' | 'both';
};

const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({
  canExit,
  isSnapping,
  scrollVelocity,
  direction = 'both'
}) => {
  const absVelocity = Math.abs(scrollVelocity);
  
  // Different animation states
  const indicatorVariants = {
    idle: {
      scale: 1,
      opacity: 0.7,
      backgroundColor: 'rgba(150, 150, 150, 0.8)',
    },
    active: {
      scale: 1 + absVelocity * 0.2,
      opacity: 0.7 + absVelocity * 0.3,
      backgroundColor: `rgba(${100 + absVelocity * 155}, ${150 + absVelocity * 105}, ${255 - absVelocity * 155}, 0.8)`,
    },
    snapping: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      backgroundColor: 'rgba(100, 100, 255, 0.8)',
      transition: {
        repeat: Infinity,
        duration: 1
      }
    }
  };
  
  // Determine current animation state
  const currentState = isSnapping 
    ? 'snapping' 
    : absVelocity > 0.05 
      ? 'active' 
      : 'idle';
  
  // Only show relevant arrows based on direction
  const showUpArrow = direction === 'up' || direction === 'both';
  const showDownArrow = direction === 'down' || direction === 'both';
  
  return (
    <div className="scroll-indicator-container">
      <motion.div 
        className="scroll-indicator"
        variants={indicatorVariants}
        animate={currentState}
      >
        {showUpArrow && (
          <motion.div 
            className="arrow up"
            animate={{ 
              y: isSnapping ? 0 : [-3, 3, -3],
              opacity: isSnapping ? 0.5 : 1
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
        
        <div className="velocity-meter">
          <div 
            className="velocity-fill" 
            style={{ width: `${Math.min(100, absVelocity * 100 * 5)}%` }}
          />
        </div>
        
        {showDownArrow && (
          <motion.div 
            className="arrow down"
            animate={{ 
              y: isSnapping ? 0 : [3, -3, 3],
              opacity: isSnapping ? 0.5 : 1
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.div>
      
      <div className="scroll-status">
        {isSnapping ? (
          <span>Transitioning...</span>
        ) : (
          <span>Scroll {direction === 'both' ? 'up or down' : direction}</span>
        )}
      </div>
    </div>
  );
};

export default ScrollIndicator; 