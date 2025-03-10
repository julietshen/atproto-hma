import { useState, useEffect } from 'react';
import atProtoService from '../services/atproto';
import Post from '../components/Post';

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setIsLoading(true);
        const timeline = await atProtoService.getTimeline();
        
        // Filter to only show posts with images
        const postsWithImages = timeline.filter(post => 
          post.post?.embed?.$type === 'app.bsky.embed.images'
        );
        
        setPosts(postsWithImages);
      } catch (err) {
        console.error('Error fetching timeline:', err);
        setError('Failed to load timeline. Please try again later.');
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
          {posts.map((post) => (
            <Post key={post.post.uri} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home; 