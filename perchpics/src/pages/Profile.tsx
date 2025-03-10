import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import atProtoService from '../services/atproto';

// Import PDS_URL from the atproto service
const PDS_URL = 'http://localhost:3001';

const Profile = () => {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Fetch profile data - we're using the current user's profile
        // since that's what the getProfile method returns
        const profileData = await atProtoService.getProfile();
        setProfile(profileData);
        
        if (profileData && profileData.did) {
          // Fetch user's posts using the DID from the profile
          const userPosts = await atProtoService.getUserPosts(profileData.did);
          setPosts(userPosts);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
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
            alt={`${profile.displayName || formatAuthorName(profile.did)}'s avatar`}
            className="profile-avatar"
          />
          <div className="profile-details">
            <h1 className="profile-name">{profile.displayName || formatAuthorName(profile.did)}</h1>
            <div className="profile-handle">@{formatAuthorName(profile.did)}</div>
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
                <span className="profile-stat-count">{posts.length || 0}</span>
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

export default Profile; 