import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, MotionValue, AnimatePresence } from 'framer-motion';
import { useScrollVelocity } from '../hooks/useScrollVelocity';
import { useSectionLock } from '../hooks/useSectionLock';
import ScrollIndicator from './ScrollIndicator';

type AnimatedCardProps = {
  index: number;
  color: string;
  scrollYProgress: MotionValue<number>;
  scrollVelocity: number;
  isActive: boolean;
};

const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  index, 
  color, 
  scrollYProgress, 
  scrollVelocity,
  isActive 
}) => {
  // Calculate opacity for simple fade-in effect
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, isActive ? 1 : 0.8, isActive ? 1 : 0.8, 0]
  );
  
  // Apply smooth transition to opacity changes
  const smoothOpacity = useSpring(opacity, {
    stiffness: 100,
    damping: 30
  });
  
  // Create a subtle y-offset for cards based on their index
  const yOffset = useTransform(
    scrollYProgress,
    [0, 1],
    [30, -30]
  );
  
  const y = useSpring(yOffset, { 
    stiffness: 60,
    damping: 20
  });
  
  return (
    <motion.div
      className={`card ${isActive ? 'active' : ''}`}
      style={{
        backgroundColor: color,
        opacity: smoothOpacity,
        y,
        transition: "box-shadow 0.3s ease"
      }}
    >
      <h2>Card {index + 1}</h2>
      <p>Scroll to animate!</p>
      {isActive && <span className="active-indicator">Active</span>}
    </motion.div>
  );
};

// Section transition overlay
const TransitionOverlay: React.FC<{ isSnapping: boolean; activeSection: string | null }> = ({ 
  isSnapping, 
  activeSection 
}) => {
  return (
    <AnimatePresence>
      {isSnapping && (
        <motion.div 
          className="transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="section-indicator"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeSection && (
              <span>Section {activeSection.replace('section', '').replace('intro', '1')}</span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Progress indicator showing how close we are to triggering a transition
const ScrollProgressIndicator: React.FC<{ 
  progress: number;
  currentThreshold: number;
  activeSection: string | null;
  scrollDirection: 'up' | 'down' | 'none';
  scrollVelocity: number;
  inCooldown: boolean;
}> = ({ progress, currentThreshold, activeSection, scrollDirection, scrollVelocity, inCooldown }) => {
  
  // Don't show at edges when scrolling in direction with no more sections
  if ((activeSection === 'intro' && scrollDirection === 'up') || 
      (activeSection === 'section4' && scrollDirection === 'down')) {
    return null;
  }
  
  const progressPercent = Math.min(100, Math.round(progress * 100));
  const thresholdPercent = Math.round(currentThreshold * 100);
  const isNearThreshold = progressPercent >= thresholdPercent - 10;
  const hasReachedThreshold = progressPercent >= thresholdPercent;
  const isAtSectionBottom = progress >= 0.95 && scrollDirection === 'down';
  const hasEnoughVelocity = Math.abs(scrollVelocity) >= 1;
  
  // Determine message based on position in page and scroll direction
  let message = `Scroll to ${thresholdPercent}% to transition`;
  
  if (inCooldown) {
    message = 'Cooldown active (1s) - transitions paused';
  } else if (isAtSectionBottom && !hasEnoughVelocity) {
    message = 'Scroll faster to transition at section bottom';
  } else if (hasReachedThreshold) {
    message = 'Release to trigger transition';
  }
  
  // Add direction to the message
  if (!inCooldown) {
    if (activeSection === 'intro') {
      message = `${message} down`;
    } else if (activeSection === 'section4') {
      message = `${message} up`;
    } else if (scrollDirection === 'up') {
      message = `${message} to top of current section`;
    } else {
      message = `${message} to next section`;
    }
  }
  
  const cssClass = `scroll-progress-indicator 
                    ${isNearThreshold ? 'near-threshold' : ''} 
                    ${hasReachedThreshold && (!isAtSectionBottom || hasEnoughVelocity) && !inCooldown ? 'at-threshold' : ''} 
                    ${inCooldown ? 'cooldown' : ''}`;
  
  return (
    <div className={cssClass}>
      <div className="progress-text">
        {scrollDirection === 'up' ? 'Scrolling up' : 'Scrolling down'}: {progressPercent}%
      </div>
      {isAtSectionBottom && (
        <div className="velocity-text">
          Velocity: {Math.abs(scrollVelocity).toFixed(2)} {hasEnoughVelocity ? '✓' : '✗'}
        </div>
      )}
      {inCooldown && (
        <div className="cooldown-text">
          Cooldown Active - Scrolling Locked
        </div>
      )}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
        <div className="threshold-marker" style={{ left: `${thresholdPercent}%` }}></div>
      </div>
      <div className="threshold-text">
        {message} {!inCooldown && `(Threshold: ${thresholdPercent}%)`}
      </div>
    </div>
  );
};

const ScrollAnimations: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });
  
  // Use our custom section locking hook with direction-specific thresholds
  const { 
    activeSection, 
    isSnapping, 
    inCooldown,
    canExitSection,
    isScrollDisabled,
    scrollProgress,
    scrollDirection,
    currentThreshold,
    scrollY,
    scrollVelocity
  } = useSectionLock('.scroll-section', {
    downThreshold: 0.98,   // 98% for scrolling down
    upThreshold: 0.98,     // 98% for scrolling up
    snapDuration: 1000,    // Animation duration
    bottomVelocityThreshold: 1, // Minimum velocity when at section bottom
    cooldownDuration: 1000, // 1 second cooldown after transitions
  });
  
  // Determine scroll indicator direction based on active section
  const getScrollDirection = () => {
    switch (activeSection) {
      case 'intro':
        return 'down';
      case 'section4':
        return 'up';
      default:
        return 'both';
    }
  };
  
  const colors = [
    '#FF5757', '#FF914D', '#FFDE59', 
    '#A8E05F', '#5CD2E6', '#AB83F6', 
    '#FF6FA9', '#5F70E0', '#44D492'
  ];
  
  // Fixed debugging panel to display scroll metrics
  const debugPanel = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px',
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    borderRadius: '8px',
    zIndex: 1000,
    fontFamily: 'monospace',
    fontSize: '14px',
    pointerEvents: 'none'
  };
  
  return (
    <div ref={containerRef} className={`scroll-container ${isScrollDisabled ? 'scroll-locked' : ''}`}>
      <div style={debugPanel as React.CSSProperties}>
        <div>ScrollY: {Math.round(scrollY)}</div>
        <div>Velocity: {scrollVelocity.toFixed(4)}</div>
        <div>Direction: {scrollDirection}</div>
        <div>Active Section: {activeSection || 'None'}</div>
        <div>Progress Edge: {scrollDirection === 'down' ? 'Bottom of viewport' : 'Top of viewport'}</div>
        <div>Section Progress: {Math.round(scrollProgress * 100)}%</div>
        <div>Threshold: {Math.round(currentThreshold * 100)}%</div>
        <div>At Bottom: {scrollProgress >= 0.95 ? `Yes (min vel: 1.0)` : 'No'}</div>
        <div>Snapping: {isSnapping ? 'Yes' : 'No'}</div>
        <div>Cooldown: {inCooldown ? 'Yes (scrolling locked)' : 'No'}</div>
        <div>Scroll Locked: {isScrollDisabled ? 'Yes' : 'No'}</div>
      </div>
      
      <ScrollIndicator 
        canExit={canExitSection}
        isSnapping={isSnapping}
        scrollVelocity={scrollVelocity}
        direction={getScrollDirection()}
      />
      
      <ScrollProgressIndicator 
        progress={scrollProgress}
        currentThreshold={currentThreshold}
        activeSection={activeSection}
        scrollDirection={scrollDirection}
        scrollVelocity={scrollVelocity}
        inCooldown={inCooldown}
      />
      
      <TransitionOverlay 
        isSnapping={isSnapping} 
        activeSection={activeSection} 
      />
      
      <section id="intro" className="scroll-section hero">
        <h1>Scroll Animation Demo</h1>
        <p>Direction-based transitions</p>
        <div className="instruction">
          <p>Progress tracks viewport edges and transitions at 98% in both directions</p>
        </div>
      </section>
      
      <section id="section1" className="scroll-section cards-container">
        {colors.map((color, index) => (
          <AnimatedCard
            key={index}
            index={index}
            color={color}
            scrollYProgress={scrollYProgress}
            scrollVelocity={scrollVelocity}
            isActive={activeSection === 'section1'}
          />
        ))}
      </section>
      
      <section id="section2" className="scroll-section spacer">
        <h2>Keep scrolling</h2>
        <p>Progress based on viewport edge that's entering each section</p>
      </section>
      
      <section id="section3" className="scroll-section cards-container reversed">
        {[...colors].reverse().map((color, index) => (
          <AnimatedCard
            key={`rev-${index}`}
            index={index + colors.length}
            color={color}
            scrollYProgress={scrollYProgress}
            scrollVelocity={scrollVelocity}
            isActive={activeSection === 'section3'}
          />
        ))}
      </section>
      
      <section id="section4" className="scroll-section end-section">
        <h2>End of Demo</h2>
        <p>Scroll back up to see the effects again!</p>
      </section>
    </div>
  );
};

export default ScrollAnimations; 