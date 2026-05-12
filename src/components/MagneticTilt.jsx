import { useState, useEffect, useRef } from 'react';
import './MagneticTilt.css';

const MagneticTilt = ({ children, tiltAmount = 5, glareAmount = 0.2 }) => {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate tilt based on mouse position
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const tiltX = ((mouseY - centerY) / centerY) * tiltAmount;
    const tiltY = ((centerX - mouseX) / centerX) * tiltAmount;
    
    setX(tiltY);
    setY(tiltX);
  };

  const handleMouseLeave = () => {
    setX(0);
    setY(0);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseenter', handleMouseEnter);
    
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <div 
      ref={ref}
      className={`magnetic-tilt ${isHovered ? 'hovered' : ''}`}
      style={{
        transform: `rotateX(${y}deg) rotateY(${x}deg)`,
        transition: isHovered ? 'none' : 'transform 0.5s ease'
      }}
    >
      <div className="magnetic-glare" />
      {children}
    </div>
  );
};

export default MagneticTilt;