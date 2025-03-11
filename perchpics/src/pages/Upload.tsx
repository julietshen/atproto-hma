import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import perchPicsService from '../services/atproto';

/**
 * Upload Component
 * 
 * Allows users to upload photos to their PerchPics account.
 * Uses our custom PDS instead of the standard AT Protocol.
 */
const Upload = () => {
  // State for the selected image file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // State for the image preview URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // State for the post caption
  const [caption, setCaption] = useState('');
  // State for the image alt text (accessibility)
  const [altText, setAltText] = useState('');
  // State for tracking upload progress
  const [isUploading, setIsUploading] = useState(false);
  // State for error messages
  const [error, setError] = useState('');
  // State for success messages
  const [success, setSuccess] = useState('');
  
  // Reference to the hidden file input element
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hook for programmatic navigation
  const navigate = useNavigate();

  /**
   * Handle file selection from the file input
   * Validates file type and size, creates preview
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Validate that the file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    setSelectedFile(file);
    setError('');
    
    // Create a preview URL for the selected image
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle drag over event for the dropzone
   * Prevents default browser behavior
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Handle file drop event for the dropzone
   * Validates and processes the dropped file
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    
    if (!file) return;
    
    // Validate that the file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    setSelectedFile(file);
    setError('');
    
    // Create a preview URL for the dropped image
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle form submission
   * Uploads the image to our custom PDS
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that an image is selected
    if (!selectedFile) {
      setError('Please select an image to upload');
      return;
    }
    
    // Caption and alt text are now optional
    
    setIsUploading(true);
    setError('');
    setSuccess('');
    
    try {
      // Upload the image directly to our custom PDS
      const result = await perchPicsService.uploadImage(selectedFile, caption, altText);
      
      if (result) {
        setSuccess('Photo uploaded successfully!');
        
        // Reset the form after successful upload
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        setAltText('');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError('Failed to upload photo. Please try again.');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('An error occurred while uploading. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Trigger the hidden file input when the dropzone is clicked
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-container">
      <h1>Upload a Photo</h1>
      
      {/* Display error or success messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      <form className="upload-form" onSubmit={handleSubmit}>
        {/* Dropzone for image upload - handles both click and drag-and-drop */}
        <div 
          className="upload-dropzone"
          onClick={triggerFileInput}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className="upload-preview">
              <img src={previewUrl} alt="Preview" />
            </div>
          ) : (
            <div className="upload-placeholder">
              <p>Click or drag and drop an image here</p>
              <p className="upload-note">Max size: 5MB</p>
            </div>
          )}
          
          {/* Hidden file input triggered by clicking the dropzone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
        
        {/* Caption input */}
        <div className="form-group">
          <label htmlFor="caption">Caption (optional)</label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption for your photo..."
            rows={3}
            disabled={isUploading}
          />
        </div>
        
        {/* Alt text input for accessibility */}
        <div className="form-group">
          <label htmlFor="altText">Alt Text (optional, for accessibility)</label>
          <input
            type="text"
            id="altText"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe your image for people with visual impairments"
            disabled={isUploading}
          />
        </div>
        
        {/* Submit button - disabled during upload or if no file is selected */}
        <button type="submit" disabled={isUploading || !selectedFile}>
          {isUploading ? 'Uploading...' : 'Upload Photo'}
        </button>
      </form>
    </div>
  );
};

export default Upload; 