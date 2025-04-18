import { useEffect, useState, useRef, useCallback } from 'react';
import { useScrollVelocity } from './useScrollVelocity';

type Section = {
  id: string;
  element: HTMLElement;
  top: number;
  bottom: number;
  height: number;
};

type SectionLockOptions = {
  downThreshold?: number;  // Percentage threshold when scrolling down (0.0 to 1.0)
  upThreshold?: number;    // Percentage threshold when scrolling up (0.0 to 1.0)
  snapDuration?: number;   // Duration of the snapping animation in ms
  bottomVelocityThreshold?: number; // Minimum scroll velocity when at section bottom
  cooldownDuration?: number; // Cooldown period after animations in ms
};

export const useSectionLock = (
  sectionSelector: string,
  options: SectionLockOptions = {}
) => {
  // Default options
  const {
    downThreshold = 0.98,    // 98% by default when scrolling down
    upThreshold = 0.98,      // 98% by default when scrolling up
    snapDuration = 1000,     // 1 second animation by default
    bottomVelocityThreshold = 1,  // Minimum velocity required at section bottom
    cooldownDuration = 1000, // 1 second cooldown by default
  } = options;

  // Extract scroll velocity and direction
  const { scrollVelocity, scrollDirection } = useScrollVelocity(10);
  
  // Track the current active section
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Track if we're currently snapping between sections
  const [isSnapping, setIsSnapping] = useState(false);
  
  // Track if scrolling is disabled
  const [isScrollDisabled, setIsScrollDisabled] = useState(false);
  
  // Track if we're in the cooldown period
  const [inCooldown, setInCooldown] = useState(false);
  
  // Track scroll progress within the current section
  const [scrollProgress, setScrollProgress] = useState(0);

  // Store the current scroll position
  const [scrollY, setScrollY] = useState(0);
  
  // Last transition timestamp to prevent duplicate transitions
  const lastTransitionRef = useRef(0);
  
  // Store sections and their positions
  const sectionsRef = useRef<{ id: string; top: number; bottom: number; height: number }[]>([]);

  // Keep track of the current threshold based on scroll direction
  const [currentThreshold, setCurrentThreshold] = useState(downThreshold);
  
  // Determine the current section based on scroll position
  const determineActiveSection = useCallback(() => {
    const scrollPosition = window.scrollY;
    const viewportHeight = window.innerHeight;
    
    // Find which section we're currently in
    for (const section of sectionsRef.current) {
      if (scrollPosition >= section.top && scrollPosition < section.bottom) {
        // Only update if it's a different section
        if (activeSection !== section.id) {
          console.log(`Setting active section: ${section.id}`);
          setActiveSection(section.id);
        }
        
        // Calculate progress within this section based on scroll direction
        let sectionProgress;
        
        if (scrollDirection === 'down') {
          // When scrolling down, use the bottom of the viewport
          // Check if bottom of viewport is within section
          const viewportBottom = scrollPosition + viewportHeight;
          sectionProgress = (viewportBottom - section.top) / section.height;
        } else {
          // When scrolling up, use the top of the viewport (standard scrollPosition)
          sectionProgress = (scrollPosition - section.top) / section.height;
        }
        
        // Clamp the progress between 0 and 1
        sectionProgress = Math.max(0, Math.min(1, sectionProgress));
        setScrollProgress(sectionProgress);
        
        // Update the threshold based on scroll direction
        if (scrollDirection === 'up') {
          setCurrentThreshold(upThreshold);
        } else if (scrollDirection === 'down') {
          setCurrentThreshold(downThreshold);
        }
        
        return;
      }
    }
    
    // If we reach here, we're not in any section
    if (scrollPosition <= 0) {
      setActiveSection('intro');
      setScrollProgress(0);
    } else {
      setActiveSection(null);
      setScrollProgress(0);
    }
  }, [activeSection, scrollDirection, downThreshold, upThreshold]);

  // Snap to the target section with a smooth animation
  const snapToSection = useCallback((targetId: string) => {
    const currentTime = Date.now();
    // Prevent duplicate transitions (debounce)
    if (currentTime - lastTransitionRef.current < 500) {
      return;
    }
    
    lastTransitionRef.current = currentTime;
    
    // Find the target section
    const targetSection = sectionsRef.current.find(section => section.id === targetId);
    if (!targetSection) return;
    
    // Set snapping flag for visual feedback
    setIsSnapping(true);
    
    // Disable scrolling
    setIsScrollDisabled(true);

    // Scroll to the target section
    window.scrollTo({
      top: targetSection.top,
      behavior: 'smooth'
    });
    
    // Reset snapping after animation completes
    setTimeout(() => {
      setIsSnapping(false);
      
      // Start cooldown period
      setInCooldown(true);
      setTimeout(() => {
        setInCooldown(false);
        // Only re-enable scrolling after cooldown is complete
        setIsScrollDisabled(false);
      }, cooldownDuration);
      
    }, snapDuration);
    
  }, [snapDuration, cooldownDuration]);

  // Determine if we should snap to the next or previous section
  const checkForSectionTransition = useCallback(() => {
    if (!activeSection || isSnapping || inCooldown) return;
    
    // Get the current progress and relevant threshold
    const progressThreshold = scrollDirection === 'up' ? upThreshold : downThreshold;
    console.log(`Progress: ${scrollProgress.toFixed(2)}, Threshold: ${progressThreshold}, Direction: ${scrollDirection}, Velocity: ${Math.abs(scrollVelocity).toFixed(2)}, Cooldown: ${inCooldown}`);
    
    // Cannot exit the last section by scrolling down
    const lastSectionId = sectionsRef.current[sectionsRef.current.length - 1]?.id;
    if (activeSection === lastSectionId && scrollDirection === 'down') {
      return;
    }
    
    // Transition based on scroll direction and threshold
    if (scrollDirection === 'down' && scrollProgress >= downThreshold) {
      // Check if we're at the bottom part of the section
      const isNearSectionBottom = scrollProgress >= 0.95;
      
      // When near bottom of section, require a minimum velocity to transition
      if (isNearSectionBottom && Math.abs(scrollVelocity) < bottomVelocityThreshold) {
        return;
      }
      
      // When scrolling down and progress >= downThreshold, snap to next section
      const currentIndex = sectionsRef.current.findIndex(section => section.id === activeSection);
      if (currentIndex < sectionsRef.current.length - 1) {
        snapToSection(sectionsRef.current[currentIndex + 1].id);
      }
    } else if (scrollDirection === 'up' && scrollProgress >= upThreshold) {
      // When scrolling up and progress >= upThreshold (98%), snap to top of current section
      const currentSection = sectionsRef.current.find(section => section.id === activeSection);
      if (currentSection) {
        // Use snapToSection but with the current section ID to snap to its top
        window.scrollTo({
          top: currentSection.top,
          behavior: 'smooth'
        });
        
        // Apply the same snapping behavior as snapToSection
        const currentTime = Date.now();
        if (currentTime - lastTransitionRef.current < 500) {
          return;
        }
        
        lastTransitionRef.current = currentTime;
        setIsSnapping(true);
        setIsScrollDisabled(true);
        
        // Reset after animation completes
        setTimeout(() => {
          setIsSnapping(false);
          
          // Start cooldown period
          setInCooldown(true);
          setTimeout(() => {
            setInCooldown(false);
            // Only re-enable scrolling after cooldown is complete
            setIsScrollDisabled(false);
          }, cooldownDuration);
          
        }, snapDuration);
      }
    }
  }, [activeSection, isSnapping, inCooldown, scrollProgress, scrollDirection, scrollVelocity, snapToSection, downThreshold, upThreshold, snapDuration, cooldownDuration, bottomVelocityThreshold]);

  // Update sections on mount and window resize
  useEffect(() => {
    // Get all sections
    const getSections = () => {
      const sections = Array.from(document.querySelectorAll(sectionSelector));
      sectionsRef.current = sections.map(section => {
        const rect = section.getBoundingClientRect();
        const scrollTop = window.scrollY;
        return {
          id: section.id || 'unknown',
          top: rect.top + scrollTop,
          bottom: rect.bottom + scrollTop,
          height: rect.height
        };
      });
      console.log('Sections updated:', sectionsRef.current);
    };
    
    // Initialize
    getSections();
    
    // Handle scrolling
    const handleScroll = () => {
      setScrollY(window.scrollY);
      determineActiveSection();
    };
    
    // Update on resize
    const handleResize = () => {
      getSections();
      determineActiveSection();
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    // Initial check
    determineActiveSection();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [sectionSelector, determineActiveSection]);
  
  // Check for transitions whenever scroll position or velocity changes
  useEffect(() => {
    if (!isSnapping) {
      checkForSectionTransition();
    }
  }, [checkForSectionTransition, scrollProgress, scrollDirection, isSnapping]);

  // Disable native scrolling during transitions
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isScrollDisabled) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isScrollDisabled]);

  return {
    activeSection,
    isSnapping,
    inCooldown,
    canExitSection: !isSnapping && !inCooldown,
    isScrollDisabled,
    scrollProgress,
    scrollDirection,
    currentThreshold: scrollDirection === 'down' ? downThreshold : upThreshold,
    scrollY,
    scrollVelocity
  };
}; 