import { useState } from 'react';
import { Link } from 'react-router-dom';
import atProtoService from '../services/atproto';

/**
 * Props for the Post component
 */
interface PostProps {
  post: any; // Post data from the AT Protocol
}

/**
 * Post Component
 * 
 * Displays a single post with its image, author information,
 * and interaction buttons (like, repost).
 */
const Post = ({ post }: PostProps) => {
  // Track if the current user has liked this post
  const [isLiked, setIsLiked] = useState(post.viewer?.like);
  // Track if the current user has reposted this post
  const [isReposted, setIsReposted] = useState(post.viewer?.repost);
  
  // Check if the post has an image attachment
  const hasImage = post.post?.embed?.$type === 'app.bsky.embed.images';
  
  // Get the first image if available
  const image = hasImage ? post.post.embed.images[0] : null;
  
  /**
   * Handle like button click
   * Toggles the like status of the post
   */
  const handleLike = async () => {
    try {
      if (isLiked) {
        // Unlike functionality would go here
        // For simplicity, we're just toggling the state
        setIsLiked(false);
      } else {
        // Call the AT Protocol service to like the post
        const success = await atProtoService.likePost(post.post.uri, post.post.cid);
        if (success) {
          setIsLiked(true);
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };
  
  /**
   * Handle repost button click
   * Toggles the repost status of the post
   */
  const handleRepost = async () => {
    try {
      if (isReposted) {
        // Unrepost functionality would go here
        // For simplicity, we're just toggling the state
        setIsReposted(false);
      } else {
        // Call the AT Protocol service to repost
        const success = await atProtoService.repostPost(post.post.uri, post.post.cid);
        if (success) {
          setIsReposted(true);
        }
      }
    } catch (error) {
      console.error('Error reposting:', error);
    }
  };
  
  return (
    <div className="post">
      {/* Post header with author information */}
      <div className="post-header">
        <img 
          src={post.author.avatar || 'https://place-hold.it/48x48'} 
          alt={`${post.author.displayName || post.author.handle}'s avatar`}
          className="post-avatar"
        />
        <div className="post-user-info">
          <Link to={`/profile/${post.author.handle}`}>
            <span className="post-user-name">{post.author.displayName || post.author.handle}</span>
            <span className="post-user-handle">@{post.author.handle}</span>
          </Link>
        </div>
      </div>
      
      {/* Post content - text and image */}
      <div className="post-content">
        <p>{post.post.record.text}</p>
        
        {/* Display image if available */}
        {hasImage && (
          <img 
            src={image.fullsize} 
            alt={image.alt || 'Post image'} 
            className="post-image"
          />
        )}
      </div>
      
      {/* Post interaction buttons */}
      <div className="post-actions">
        {/* Like button */}
        <div 
          className={`post-action ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <span className="post-action-icon">❤️</span>
          <span>{post.post.likeCount || 0}</span>
        </div>
        
        {/* Repost button */}
        <div 
          className={`post-action ${isReposted ? 'reposted' : ''}`}
          onClick={handleRepost}
        >
          <span className="post-action-icon">🔄</span>
          <span>{post.post.repostCount || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default Post; 