import { useState } from 'react';
import './CheckIn.css';

interface CheckInProps {
  onNavigate?: (page: string) => void;
}

export default function CheckIn({ onNavigate }: CheckInProps) {
  const [entry, setEntry] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (entry.trim() === '') return;
    
    setIsAnalyzing(true);
    
    setTimeout(() => {
      setIsAnalyzing(false);
      alert("AI Analysis Complete! (Backend integration coming soon)");
    }, 2500);
  };

  return (
    <section className="checkin-section">
      <div className="checkin-container">
        
        <div className="checkin-header">
          <div className="ai-badge">
            <span className="pulse-dot"></span> Secure & Private
          </div>
        </div>

        <div className="textarea-wrapper">
          <textarea 
            className="journal-input"
            placeholder="Today I've been feeling..."
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            disabled={isAnalyzing}
          ></textarea>
          
          <div className="glow-border"></div>
        </div>

        <div className="checkin-footer">
          <span className="word-count">
            {entry.split(' ').filter(word => word !== '').length} words
          </span>
          
          <button 
            className={`analyze-btn ${isAnalyzing ? 'analyzing' : ''}`}
            onClick={handleAnalyze}
            disabled={isAnalyzing || entry.trim() === ''}
          >
            {isAnalyzing ? 'Analyzing Neural Patterns...' : 'Analyze My Mind'}
          </button>
        </div>

      </div>
    </section>
  );
}
