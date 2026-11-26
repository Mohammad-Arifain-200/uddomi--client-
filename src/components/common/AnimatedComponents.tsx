'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'motion/react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutExpo function for modern spring-like deceleration
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(easeProgress * end);
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glareEffect?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  onClick,
  glareEffect = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawScale = useMotionValue(1);
  const springConfig = { stiffness: 300, damping: 20, mass: 0.5 };
  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);
  const scale = useSpring(rawScale, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (glareRef.current) {
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      glareRef.current.style.background = `radial-gradient(400px circle at ${xPercent}% ${yPercent}%, rgba(16, 185, 129, 0.18), transparent 60%)`;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    rawRotateX.set(((y - centerY) / centerY) * -5);
    rawRotateY.set(((x - centerX) / centerX) * 5);
  };

  const handleMouseEnter = () => {
    rawScale.set(1.02);
    if (glareRef.current) {
      glareRef.current.style.opacity = '1';
    }
  };

  const handleMouseLeave = () => {
    rawScale.set(1);
    rawRotateX.set(0);
    rawRotateY.set(0);
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        scale,
        transformStyle: 'preserve-3d',
      }}
      className={`relative overflow-hidden cursor-pointer ${className}`}
    >
      {glareEffect && (
        <div
          ref={glareRef}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute -inset-px z-10 transition-opacity duration-300 rounded-[inherit]"
        />
      )}
      {children}
    </motion.div>
  );
};
