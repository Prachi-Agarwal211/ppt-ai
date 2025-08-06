'use client';
import { motion } from 'framer-motion';

/**
 * AnimatedCharacters Component
 * Animates text characters with a staggered effect.
 */
export const AnimatedCharacters = ({ text, className }) => {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.2 }
    }
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 12, stiffness: 100 }
    },
    hidden: {
      opacity: 0,
      y: 20
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ display: 'flex', justifyContent: 'center' }}
    >
      {text.split('').map((char, index) => (
        <motion.span variants={child} key={index}>
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.div>
  );
};
