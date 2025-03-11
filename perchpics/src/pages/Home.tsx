import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import atProtoService from '../services/atproto';

// PDS server is running on port 3002
const PDS_URL = 'http://localhost:3002';

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = () => {
      const loggedIn = atProtoService.isLoggedIn();
      setIsLoggedIn(loggedIn);
      return loggedIn;
    };

    const fetchTimeline = async () => {
      try {
        setIsLoading(true);
        
        // First check if user is logged in
        const loggedIn = checkLoginStatus();
        if (!loggedIn) {
          console.log('User not logged in, redirecting to login');
          navigate('/login');
          return;
        }
        
        console.log('Fetching timeline...');
        const response = await atProtoService.getTimeline();
        console.log('Timeline response:', response);
        
        if (response && response.photos) {
          setPosts(response.photos);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error('Error fetching timeline:', err);
        setError('Failed to load timeline. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [location.key, navigate]); // Re-fetch when location changes or navigate changes

  // Helper function to format the author name from DID
  const formatAuthorName = (did: string) => {
    if (did.startsWith('did:perchpics:')) {
      // Extract username from DID
      return did.replace('did:perchpics:', '');
    }
    return did;
  };

  if (isLoading) {
    return <div className="loading">Loading timeline...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Photo Feed</h1>
      </div>
      
      {posts.length === 0 ? (
        <div className="empty-state">
          <p>No photos in your timeline yet.</p>
          <p>Follow more users or upload your own photos!</p>
        </div>
      ) : (
        <div className="posts-container">
          {posts.map((photo) => (
            <div key={photo.id} className="post">
              <div className="post-header">
                <span className="post-author">@{formatAuthorName(photo.author_did)}</span>
              </div>
              <div className="post-image-container">
                <img 
                  src={`${PDS_URL}/blobs/${photo.blob_id}`} 
                  alt={photo.alt_text || photo.caption} 
                  className="post-image"
                />
              </div>
              <div className="post-content">
                <p className="post-caption">{photo.caption}</p>
                {photo.location && <p className="post-location">{photo.location}</p>}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="post-tags">
                    {photo.tags.map((tag: string) => (
                      <span key={tag} className="post-tag">#{tag}</span>
                    ))}
                  </div>
                )}
                <p className="post-date">{new Date(photo.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home; 