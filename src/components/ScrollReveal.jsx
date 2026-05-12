import { useEffect, useState, useRef } from 'react';
import './ScrollReveal.css';

const ScrollReveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Apply delay before adding the visible class
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, delay * 1000);
          observer.disconnect();
          return () => clearTimeout(timer);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -80px 0px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={elementRef} className={`scroll-reveal ${isVisible ? 'is-visible' : ''}`}>
      {children}
    </div>
  );
};

export default ScrollReveal;