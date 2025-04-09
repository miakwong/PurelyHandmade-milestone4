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
  },
  
  get cssUrl() {
    return this.baseUrl + '/public/css';
  },
  
  get jsUrl() {
    return this.baseUrl + '/public/js';
  },
  
  get assetsUrl() {
    return this.baseUrl + '/public/assets';
  }
};

// 确保config对象在全局可用
window.config = config;

// Helper functions - General URL getters
function getApiUrl(endpoint) {
  return `${config.apiUrl}/${endpoint}`;
}

function getImageUrl(filename) {
  // If path is already a full URL (starts with http or /), return as is
  if (filename && (filename.startsWith('http') || filename.startsWith('/'))) {
    return filename;
  }
  
  // Handle null or undefined
  if (!filename) {
    return `${config.imagesUrl}/placeholder.jpg`;
  }
  
  // Extract just the filename if there's a path
  const justFilename = filename.split('/').pop();
  return `${config.imagesUrl}/${justFilename}`;
}

// Helper functions - Resource URL getters
function getCssUrl(filename) {
  return `${config.cssUrl}/${filename}`;
}

function getJsUrl(filename) {
  return `${config.jsUrl}/${filename}`;
}

function getAssetUrl(path) {
  return `${config.assetsUrl}/${path}`;
}

// Helper functions - Dynamic asset loading
function loadCss(filename) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = getCssUrl(filename);
  document.head.appendChild(link);
  return link;
}

function loadJs(filename, async = true) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getJsUrl(filename);
    script.async = async;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Failed to load script: ${filename}`));
    document.body.appendChild(script);
  });
}

// Helper functions - URL utilities
function getFullUrl(path) {
  // Handle absolute URLs
  if (path && (path.startsWith('http') || path.startsWith('/'))) {
    return path;
  }
  return `${config.baseUrl}/${path}`;
}

// Make helper functions globally available
window.getApiUrl = getApiUrl;
window.getImageUrl = getImageUrl;
window.getCssUrl = getCssUrl;
window.getJsUrl = getJsUrl;
window.getAssetUrl = getAssetUrl;
window.loadCss = loadCss;
window.loadJs = loadJs;
window.getFullUrl = getFullUrl; 