import { useState, useEffect } from 'react';
import altitudeService from '../services/altitude';

/**
 * ModReview Component
 * 
 * Provides a UI for content moderation using the Altitude service.
 * Allows moderators to review content that has been flagged by the HMA (Hash Matching Algorithm).
 */
const ModReview = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQueue, setActiveQueue] = useState<string>('pending');
  const [stats, setStats] = useState<any>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    // Check if the Altitude service is available
    const checkAltitudeService = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const health = await altitudeService.checkHealth();
        if (health.status === 'healthy') {
          // Get moderation stats
          const modStats = await altitudeService.getStats();
          setStats(modStats);
        } else {
          setError('Altitude service is not responding correctly.');
        }
      } catch (err) {
        setError('Error connecting to Altitude service. Please try again later.');
        console.error('Altitude service error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAltitudeService();
  }, []);

  const handleQueueChange = (queue: string) => {
    setActiveQueue(queue);
  };

  const handleAction = async (action: string, id: string, notes?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let result;
      switch (action) {
        case 'approve':
          result = await altitudeService.approveContent(id, notes);
          break;
        case 'reject':
          result = await altitudeService.rejectContent(id, notes);
          break;
        case 'escalate':
          result = await altitudeService.escalateContent(id, notes);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      if (result.success) {
        // Refresh the stats after action
        const modStats = await altitudeService.getStats();
        setStats(modStats);
      } else {
        setError(`Failed to ${action} content: ${result.message}`);
      }
    } catch (err) {
      setError(`Error performing ${action} action. Please try again.`);
      console.error('Moderation action error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading moderation interface...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modreview-container">
        <h1>Content Moderation</h1>
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modreview-container">
      <h1>Hash Matching Algorithm Review</h1>
      
      <div className="moderation-stats">
        <h2>HMA Moderation Queue Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>
      
      <div className="queue-buttons">
        <button 
          className={`queue-button ${activeQueue === 'pending' ? 'active' : ''}`}
          onClick={() => handleQueueChange('pending')}
        >
          Pending
        </button>
        <button 
          className={`queue-button ${activeQueue === 'approved' ? 'active' : ''}`}
          onClick={() => handleQueueChange('approved')}
        >
          Approved
        </button>
        <button 
          className={`queue-button ${activeQueue === 'rejected' ? 'active' : ''}`}
          onClick={() => handleQueueChange('rejected')}
        >
          Rejected
        </button>
      </div>
      
      <div className="altitude-frame-container">
        <iframe 
          src={`${altitudeService.getAltitudeUrl()}/queue/${activeQueue}`} 
          title="Altitude Moderation Interface"
          allowFullScreen
        />
      </div>
      
      <div className="moderator-actions">
        <h3>Hash Match Review Actions</h3>
        <p>Use the interface above to review content flagged by the hash matching algorithm, or take direct actions below:</p>
        
        <div className="action-buttons">
          <button 
            className="action-button approve"
            onClick={() => handleAction('approve', '123', 'Approved by moderator - no match found')}
            disabled={activeQueue !== 'pending'}
          >
            Approve
          </button>
          <button 
            className="action-button reject"
            onClick={() => handleAction('reject', '123', 'Rejected - confirmed hash match')}
            disabled={activeQueue !== 'pending'}
          >
            Reject
          </button>
          <button 
            className="action-button escalate"
            onClick={() => handleAction('escalate', '123', 'Needs senior review - uncertain match')}
            disabled={activeQueue !== 'pending'}
          >
            Escalate
          </button>
        </div>
        
        <div className="notes-field">
          <textarea placeholder="Add moderator notes about the hash match review here..."></textarea>
        </div>
      </div>
    </div>
  );
};

export default ModReview; 