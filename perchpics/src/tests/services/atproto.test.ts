import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import atProtoService from '../../services/atproto';

// Mock the fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PerchPicsService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset the fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    describe('register', () => {
      // Test 1: Normal expected input - successful registration
      it('should register a user successfully with valid credentials', async () => {
        // Mock successful registration response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'test-token',
            user: { did: 'did:test:123', username: 'testuser' }
          })
        });

        const result = await atProtoService.register('testuser', 'password123');
        
        // Verify the result
        expect(result).toBe(true);
        
        // Verify localStorage was updated
        expect(localStorage.getItem('perchpics_token')).toBe('test-token');
        expect(localStorage.getItem('perchpics_user')).toBe(JSON.stringify({ did: 'did:test:123', username: 'testuser' }));
        
        // Verify the fetch call
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: 'testuser', password: 'password123' })
        });
      });

      // Test 2: Edge case - username already exists
      it('should handle registration with an existing username', async () => {
        // Mock error response for existing username
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Username already exists'
          })
        });

        const result = await atProtoService.register('existinguser', 'password123');
        
        // Verify the result
        expect(result).toBe(false);
        
        // Verify localStorage was not updated
        expect(localStorage.getItem('perchpics_token')).toBeNull();
        expect(localStorage.getItem('perchpics_user')).toBeNull();
      });

      // Test 3: Invalid input - empty username
      it('should handle registration with empty username', async () => {
        // Mock error response for empty username
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Username is required'
          })
        });

        const result = await atProtoService.register('', 'password123');
        
        // Verify the result
        expect(result).toBe(false);
      });

      // Test 4: Invalid input - empty password
      it('should handle registration with empty password', async () => {
        // Mock error response for empty password
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Password is required'
          })
        });

        const result = await atProtoService.register('testuser', '');
        
        // Verify the result
        expect(result).toBe(false);
      });

      // Test 5: Edge case - network error
      it('should handle network errors during registration', async () => {
        // Mock network error
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await atProtoService.register('testuser', 'password123');
        
        // Verify the result
        expect(result).toBe(false);
      });
    });

    describe('login', () => {
      // Test 1: Normal expected input - successful login
      it('should log in a user successfully with valid credentials', async () => {
        // Mock successful login response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'test-token',
            user: { did: 'did:test:123', username: 'testuser' }
          })
        });

        const result = await atProtoService.login('testuser', 'password123');
        
        // Verify the result
        expect(result).toBe(true);
        
        // Verify localStorage was updated
        expect(localStorage.getItem('perchpics_token')).toBe('test-token');
        expect(localStorage.getItem('perchpics_user')).toBe(JSON.stringify({ did: 'did:test:123', username: 'testuser' }));
        
        // Verify the fetch call
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: 'testuser', password: 'password123' })
        });
      });

      // Test 2: Invalid input - incorrect credentials
      it('should handle login with incorrect credentials', async () => {
        // Mock error response for incorrect credentials
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Invalid username or password'
          })
        });

        const result = await atProtoService.login('testuser', 'wrongpassword');
        
        // Verify the result
        expect(result).toBe(false);
        
        // Verify localStorage was not updated
        expect(localStorage.getItem('perchpics_token')).toBeNull();
        expect(localStorage.getItem('perchpics_user')).toBeNull();
      });

      // Test 3: Invalid input - empty username
      it('should handle login with empty username', async () => {
        // Mock error response for empty username
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Username is required'
          })
        });

        const result = await atProtoService.login('', 'password123');
        
        // Verify the result
        expect(result).toBe(false);
      });

      // Test 4: Edge case - server error
      it('should handle server errors during login', async () => {
        // Mock server error
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Internal server error'
          })
        });

        const result = await atProtoService.login('testuser', 'password123');
        
        // Verify the result
        expect(result).toBe(false);
      });
    });

    describe('logout', () => {
      // Test 1: Normal expected input - successful logout
      it('should log out a user successfully', async () => {
        // Set up initial state with logged in user
        localStorage.setItem('perchpics_token', 'test-token');
        localStorage.setItem('perchpics_user', JSON.stringify({ did: 'did:test:123', username: 'testuser' }));
        
        // Call logout
        atProtoService.logout();
        
        // Verify localStorage was cleared
        expect(localStorage.getItem('perchpics_token')).toBeNull();
        expect(localStorage.getItem('perchpics_user')).toBeNull();
      });

      // Test 2: Edge case - logout when not logged in
      it('should handle logout when not logged in', async () => {
        // Ensure localStorage is empty
        localStorage.clear();
        
        // Call logout
        atProtoService.logout();
        
        // Verify localStorage is still empty
        expect(localStorage.getItem('perchpics_token')).toBeNull();
        expect(localStorage.getItem('perchpics_user')).toBeNull();
      });
    });

    describe('isLoggedIn', () => {
      // Test 1: Normal expected input - user is logged in
      it('should return true when user is logged in', async () => {
        // Set up initial state with logged in user
        localStorage.setItem('perchpics_token', 'test-token');
        localStorage.setItem('perchpics_user', JSON.stringify({ did: 'did:test:123', username: 'testuser' }));
        
        // Force a new instance to pick up the localStorage values
        const newService = new (atProtoService.constructor as any)();
        
        // Check if logged in
        expect(newService.isLoggedIn()).toBe(true);
      });

      // Test 2: Normal expected input - user is not logged in
      it('should return false when user is not logged in', async () => {
        // Ensure localStorage is empty
        localStorage.clear();
        
        // Force a new instance with empty localStorage
        const newService = new (atProtoService.constructor as any)();
        
        // Check if logged in
        expect(newService.isLoggedIn()).toBe(false);
      });

      // Test 3: Edge case - token exists but user data is missing
      it('should return false when token exists but user data is missing', async () => {
        // Set up inconsistent state
        localStorage.setItem('perchpics_token', 'test-token');
        localStorage.removeItem('perchpics_user');
        
        // Force a new instance to pick up the localStorage values
        const newService = new (atProtoService.constructor as any)();
        
        // Check if logged in
        expect(newService.isLoggedIn()).toBe(false);
      });
    });

    describe('getCurrentUserDid', () => {
      // Test 1: Normal expected input - user is logged in
      it('should return the user DID when logged in', async () => {
        // Set up initial state with logged in user
        localStorage.setItem('perchpics_token', 'test-token');
        localStorage.setItem('perchpics_user', JSON.stringify({ did: 'did:test:123', username: 'testuser' }));
        
        // Force a new instance to pick up the localStorage values
        const newService = new (atProtoService.constructor as any)();
        
        // Get the DID
        expect(newService.getCurrentUserDid()).toBe('did:test:123');
      });

      // Test 2: Normal expected input - user is not logged in
      it('should return undefined when not logged in', async () => {
        // Ensure localStorage is empty
        localStorage.clear();
        
        // Force a new instance with empty localStorage
        const newService = new (atProtoService.constructor as any)();
        
        // Get the DID
        expect(newService.getCurrentUserDid()).toBeUndefined();
      });
    });
  });
}); 