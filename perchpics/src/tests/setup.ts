import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock fetch API
global.fetch = vi.fn();

// Mock FormData
global.FormData = class FormData {
  private data: Record<string, any> = {};
  
  append(key: string, value: any) {
    this.data[key] = value;
  }
  
  get(key: string) {
    return this.data[key] || null;
  }
  
  getAll(key: string) {
    return this.data[key] ? [this.data[key]] : [];
  }
  
  has(key: string) {
    return key in this.data;
  }
  
  delete(key: string) {
    delete this.data[key];
  }
  
  forEach(callback: (value: any, key: string) => void) {
    Object.entries(this.data).forEach(([key, value]) => callback(value, key));
  }
} as any; 