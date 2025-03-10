import { useState, useEffect } from 'react';
import atProtoService from '../services/atproto';
import Post from '../components/Post';

// Import PDS_URL from the atproto service
const PDS_URL = 'http://localhost:3001';

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setIsLoading(true);
        const response = await atProtoService.getTimeline();
        
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
  }, []);

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
      <h1>Photo Feed</h1>
      
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