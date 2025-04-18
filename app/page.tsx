"use client";

import dynamic from 'next/dynamic';

// Use dynamic import to avoid SSR issues with the scroll animations
const ScrollAnimations = dynamic(() => import('./components/ScrollAnimations'), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <ScrollAnimations />
    </main>
  );
} 