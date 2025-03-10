import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import atProtoService from '../services/atproto';
import Post from '../components/Post';

const Profile = () => {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!handle) return;
      
      try {
        setIsLoading(true);
        
        // Fetch profile data
        const profileData = await atProtoService.getProfile(handle);
        setProfile(profileData);
        
        // Fetch user's posts
        const userPosts = await atProtoService.getUserPosts(handle);
        
        // Filter to only show posts with images
        const postsWithImages = userPosts.filter(post => 
          post.post?.embed?.$type === 'app.bsky.embed.images'
        );
        
        setPosts(postsWithImages);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [handle]);

  if (isLoading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!profile) {
    return <div className="error">Profile not found</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-info">
          <img 
            src={profile.avatar || 'https://place-hold.it/80x80'} 
            alt={`${profile.displayName || profile.handle}'s avatar`}
            className="profile-avatar"
          />
          <div className="profile-details">
            <h1 className="profile-name">{profile.displayName || profile.handle}</h1>
            <div className="profile-handle">@{profile.handle}</div>
            {profile.description && (
              <div className="profile-bio">{profile.description}</div>
            )}
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-count">{profile.followersCount || 0}</span>
                <span className="profile-stat-label">followers</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-count">{profile.followsCount || 0}</span>
                <span className="profile-stat-label">following</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-count">{profile.postsCount || 0}</span>
                <span className="profile-stat-label">posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <h2>Photos</h2>
      
      {posts.length === 0 ? (
        <div className="empty-state">
          <p>No photos posted yet.</p>
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

export default Profile; 