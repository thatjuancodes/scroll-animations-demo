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

// Developer Controls Panel for adjusting parameters
const DevControlsPanel: React.FC<{
  downThreshold: number;
  setDownThreshold: (value: number) => void;
  upThreshold: number;
  setUpThreshold: (value: number) => void;
  bottomVelocityThreshold: number;
  setBottomVelocityThreshold: (value: number) => void;
  snapDuration: number;
  setSnapDuration: (value: number) => void;
  cooldownDuration: number;
  setCooldownDuration: (value: number) => void;
}> = ({
  downThreshold,
  setDownThreshold,
  upThreshold,
  setUpThreshold,
  bottomVelocityThreshold,
  setBottomVelocityThreshold,
  snapDuration,
  setSnapDuration,
  cooldownDuration,
  setCooldownDuration
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderRadius: '8px',
    padding: isExpanded ? '20px' : '10px',
    zIndex: 1001,
    width: isExpanded ? '300px' : 'auto',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    fontFamily: 'monospace',
    maxHeight: '80vh',
    overflowY: 'auto'
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'rgba(50, 120, 220, 0.6)',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: 'bold'
  };

  const controlGroupStyle: React.CSSProperties = {
    marginBottom: '15px',
    display: isExpanded ? 'block' : 'none'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '5px',
    fontSize: '12px',
    color: '#ccc'
  };

  const valueStyle: React.CSSProperties = {
    display: 'inline-block',
    minWidth: '50px',
    textAlign: 'right',
    marginLeft: '10px',
    color: '#61dafb',
    fontSize: '12px'
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#61dafb',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    marginTop: '2px'
  };

  const formatValue = (value: number, type: string): string => {
    if (type === 'percentage') {
      return `${(value * 100).toFixed(0)}%`;
    } else if (type === 'duration') {
      return `${value}ms`;
    } else {
      return value.toFixed(2);
    }
  };

  return (
    <div style={panelStyle}>
      <button 
        style={buttonStyle} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 'Hide Controls' : 'Show Controls'}
      </button>

      <div style={controlGroupStyle}>
        <h3 style={{fontSize: '14px', marginTop: '15px'}}>Scroll Animation Controls</h3>
        
        <div style={{marginTop: '20px'}}>
          <label style={labelStyle}>
            Down Threshold 
            <span style={valueStyle}>{formatValue(downThreshold, 'percentage')}</span>
          </label>
          <input 
            type="range" 
            min="0.5" 
            max="1" 
            step="0.01" 
            value={downThreshold} 
            onChange={(e) => setDownThreshold(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{marginTop: '15px'}}>
          <label style={labelStyle}>
            Up Threshold 
            <span style={valueStyle}>{formatValue(upThreshold, 'percentage')}</span>
          </label>
          <input 
            type="range" 
            min="0.5" 
            max="1" 
            step="0.01" 
            value={upThreshold} 
            onChange={(e) => setUpThreshold(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{marginTop: '15px'}}>
          <label style={labelStyle}>
            Bottom Velocity Threshold 
            <span style={valueStyle}>{formatValue(bottomVelocityThreshold, 'number')}</span>
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1" 
            value={bottomVelocityThreshold} 
            onChange={(e) => setBottomVelocityThreshold(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{marginTop: '15px'}}>
          <label style={labelStyle}>
            Snap Duration 
            <span style={valueStyle}>{formatValue(snapDuration, 'duration')}</span>
          </label>
          <input 
            type="range" 
            min="200" 
            max="2000" 
            step="100" 
            value={snapDuration} 
            onChange={(e) => setSnapDuration(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{marginTop: '15px'}}>
          <label style={labelStyle}>
            Cooldown Duration 
            <span style={valueStyle}>{formatValue(cooldownDuration, 'duration')}</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="2000" 
            step="100" 
            value={cooldownDuration} 
            onChange={(e) => setCooldownDuration(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>
      </div>
    </div>
  );
};

const ScrollAnimations: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Configuration state for animation parameters
  const [downThreshold, setDownThreshold] = useState(0.98);
  const [upThreshold, setUpThreshold] = useState(0.98);
  const [bottomVelocityThreshold, setBottomVelocityThreshold] = useState(1);
  const [snapDuration, setSnapDuration] = useState(1000);
  const [cooldownDuration, setCooldownDuration] = useState(1000);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });
  
  // Use our custom section locking hook with adjustable thresholds
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
    downThreshold,
    upThreshold,
    snapDuration,
    bottomVelocityThreshold,
    cooldownDuration,
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
      
      {/* Developer Controls Panel */}
      <DevControlsPanel
        downThreshold={downThreshold}
        setDownThreshold={setDownThreshold}
        upThreshold={upThreshold}
        setUpThreshold={setUpThreshold}
        bottomVelocityThreshold={bottomVelocityThreshold}
        setBottomVelocityThreshold={setBottomVelocityThreshold}
        snapDuration={snapDuration}
        setSnapDuration={setSnapDuration}
        cooldownDuration={cooldownDuration}
        setCooldownDuration={setCooldownDuration}
      />
      
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