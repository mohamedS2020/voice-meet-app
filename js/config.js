// Configuration for different environments
const config = {
  development: {
    SERVER_URL: 'http://localhost:8080'
  },
  production: {
    // This will be your Railway app URL - update this after deployment
    SERVER_URL: 'https://your-server-name.railway.app'
  }
};

// Determine environment
const environment = window.location.hostname === 'localhost' ? 'development' : 'production';

// Export the appropriate config
window.CONFIG = config[environment];

console.log(`🌍 Environment: ${environment}`);
console.log(`🔗 Server URL: ${window.CONFIG.SERVER_URL}`);
