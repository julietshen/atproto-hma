import { useState, useEffect } from 'react';
import atProtoService from '../services/atproto';
import Post from '../components/Post';

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setIsLoading(true);
        const timeline = await atProtoService.getTimeline();
        
        // Store the raw timeline data for debugging
        setDebugInfo(timeline);
        
        console.log('Timeline data:', timeline);
        
        if (!timeline || !Array.isArray(timeline.photos)) {
          setError('Invalid timeline data format');
          return;
        }
        
        // Map the photos to the expected format for the Post component
        const formattedPosts = timeline.photos.map(photo => ({
          post: {
            uri: photo.id,
            cid: photo.blob_id,
            record: {
              text: photo.caption
            },
            embed: {
              $type: 'app.bsky.embed.images',
              images: [{
                fullsize: `http://localhost:3001/blobs/${photo.blob_id}`,
                alt: photo.alt_text || ''
              }]
            },
            likeCount: 0,
            repostCount: 0
          },
          author: {
            did: photo.author_did,
            handle: photo.author_did.split(':')[2] || 'user',
            displayName: photo.author_did.split(':')[2] || 'User',
            avatar: null
          },
          viewer: {
            like: false,
            repost: false
          }
        }));
        
        setPosts(formattedPosts);
      } catch (err) {
        console.error('Error fetching timeline:', err);
        setError('Failed to load timeline. Please try again later.');
        setDebugInfo(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  if (isLoading) {
    return <div className="loading">Loading timeline...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">{error}</div>
        {debugInfo && (
          <div className="debug-info">
            <h3>Debug Information:</h3>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="home-container">
      <h1>Photo Feed</h1>
      
      {posts.length === 0 ? (
        <div className="empty-state">
          <p>No photos in your timeline yet.</p>
          <p>Follow more users or upload your own photos!</p>
          {debugInfo && (
            <div className="debug-info">
              <h3>Debug Information:</h3>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <Post key={post.post.uri} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home; 