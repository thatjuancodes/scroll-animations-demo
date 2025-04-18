import { useState, useEffect } from 'react';
import { throttle } from 'lodash';

export type ScrollData = {
  scrollY: number;
  scrollVelocity: number;
  scrollDirection: 'up' | 'down' | 'none';
  timestamp: number;
};

export function useScrollVelocity(throttleMs = 50): ScrollData {
  const [scrollData, setScrollData] = useState<ScrollData>({
    scrollY: 0,
    scrollVelocity: 0,
    scrollDirection: 'none',
    timestamp: Date.now(),
  });

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastTimestamp = Date.now();

    const handleScroll = throttle(() => {
      const currentScrollY = window.scrollY;
      const currentTimestamp = Date.now();
      const deltaTime = currentTimestamp - lastTimestamp;
      
      // Calculate velocity (pixels per millisecond)
      const rawVelocity = deltaTime > 0 ? (currentScrollY - lastScrollY) / deltaTime : 0;
      
      // Smooth the velocity calculation
      const smoothedVelocity = 0.8 * scrollData.scrollVelocity + 0.2 * rawVelocity;
      
      // Determine scroll direction
      const direction = 
        smoothedVelocity > 0.01 ? 'down' : 
        smoothedVelocity < -0.01 ? 'up' : 
        scrollData.scrollDirection;

      setScrollData({
        scrollY: currentScrollY,
        scrollVelocity: smoothedVelocity,
        scrollDirection: direction,
        timestamp: currentTimestamp,
      });

      lastScrollY = currentScrollY;
      lastTimestamp = currentTimestamp;
    }, throttleMs);

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollData.scrollDirection, scrollData.scrollVelocity, throttleMs]);

  return scrollData;
} 