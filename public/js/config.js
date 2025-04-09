// Configuration for PurelyHandmade application
const config = {
  // Detect environment
  production: window.location.hostname === 'cosc360.ok.ubc.ca',
  
  // Set URLs based on environment
  get baseUrl() {
    return this.production ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade' : '';
  },
  
  get apiUrl() {
    return this.production ? 'https://cosc360.ok.ubc.ca/server/api' : '/server/api';
  },
  
  get uploadsUrl() {
    return this.production ? 'https://cosc360.ok.ubc.ca/server/uploads' : '/server/uploads';
  },
  
  get imagesUrl() {
    return this.uploadsUrl + '/images';
  }
};

// 确保config对象在全局可用
window.config = config;

// Helper functions
function getApiUrl(endpoint) {
  return `${config.apiUrl}/${endpoint}`;
}

function getImageUrl(filename) {
  return `${config.imagesUrl}/${filename}`;
} 