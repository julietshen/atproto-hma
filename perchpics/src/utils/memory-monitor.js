/**
 * Memory Monitor Utility
 * 
 * This module provides a simple way to monitor memory usage of the Node.js process.
 * It can be used to detect memory leaks and other memory-related issues.
 */

// Monitor memory usage at regular intervals
function startMemoryMonitor(intervalMs = 30000, logThresholdMB = 100) {
  console.log('Starting memory monitor...');
  
  // Initial snapshot
  logMemoryUsage();
  
  // Set up interval to log memory usage
  const intervalId = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    // Only log if memory usage is above threshold
    if (heapUsedMB > logThresholdMB) {
      logMemoryUsage();
    }
  }, intervalMs);
  
  // Clean up interval on process exit
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log('Memory monitor stopped');
    process.exit(0);
  });
  
  return {
    stop: () => {
      clearInterval(intervalId);
      console.log('Memory monitor stopped');
    },
    logNow: logMemoryUsage
  };
}

// Log current memory usage
function logMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  
  console.log('\n=== MEMORY USAGE ===');
  console.log(`RSS: ${formatMemory(memoryUsage.rss)} (Resident Set Size - total memory allocated)`);
  console.log(`Heap Total: ${formatMemory(memoryUsage.heapTotal)} (Total size of allocated heap)`);
  console.log(`Heap Used: ${formatMemory(memoryUsage.heapUsed)} (Actual memory used in the heap)`);
  console.log(`External: ${formatMemory(memoryUsage.external)} (Memory used by C++ objects bound to JS)`);
  console.log(`Array Buffers: ${formatMemory(memoryUsage.arrayBuffers)} (Memory used by ArrayBuffers and SharedArrayBuffers)`);
  console.log('====================\n');
  
  return memoryUsage;
}

// Format memory size to human-readable format
function formatMemory(bytes) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } else {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}

// Export functions
export { startMemoryMonitor, logMemoryUsage }; 