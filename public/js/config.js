// Configuration for PurelyHandmade application
const config = {
  // Detect environment
  production: window.location.hostname === 'cosc360.ok.ubc.ca',
  
  // Set URLs based on environment
  get baseUrl() {
    return this.production ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade' : '';
  },
  
  get apiUrl() {
    return this.baseUrl + '/server/api';
  },
  
  get uploadsUrl() {
    return this.baseUrl + '/server/uploads';
  },
  
  get imagesUrl() {
    return this.uploadsUrl + '/images';
  }
};

// Helper functions
function getApiUrl(endpoint) {
  return `${config.apiUrl}/${endpoint}`;
}

function getImageUrl(filename) {
  return `${config.imagesUrl}/${filename}`;
} 