/**
 * Configuration File
 * Contains global configuration settings for the frontend
 */

// Detect environment
const isProduction = window.location.hostname.includes('cosc360.ok.ubc.ca');

// Base URLs
const config = {
    // Base URL for the application
    baseUrl: isProduction 
        ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade'
        : '',
    
    // API endpoints
    apiUrl: isProduction 
        ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/api'
        : '/api',
    
    // Assets URLs
    assetsUrl: isProduction 
        ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/src/assets'
        : '/src/assets',
    
    // Uploads URL
    uploadsUrl: isProduction 
        ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/server/uploads'
        : '/server/uploads'
};

/**
 * Build a full API URL
 * @param {string} endpoint - API endpoint
 * @returns {string} Full API URL
 */
function apiUrl(endpoint) {
    return `${config.apiUrl}/${endpoint.replace(/^\//, '')}`;
}

/**
 * Build a full asset URL
 * @param {string} path - Asset path
 * @returns {string} Full asset URL
 */
function assetUrl(path) {
    return `${config.assetsUrl}/${path.replace(/^\//, '')}`;
}

/**
 * Build an image URL
 * @param {string} filename - Image filename
 * @returns {string} Full image URL
 */
function imageUrl(filename) {
    return assetUrl(`img/${filename}`);
}

/**
 * Build a style URL
 * @param {string} filename - CSS filename
 * @returns {string} Full CSS URL
 */
function styleUrl(filename) {
    return assetUrl(`css/${filename}`);
}

/**
 * Build a script URL
 * @param {string} filename - JS filename
 * @returns {string} Full JS URL
 */
function scriptUrl(filename) {
    return assetUrl(`js/${filename}`);
}

/**
 * Build an upload URL
 * @param {string} path - Upload path
 * @returns {string} Full upload URL
 */
function uploadUrl(path) {
    return `${config.uploadsUrl}/${path.replace(/^\//, '')}`;
}

/**
 * Navigate to a page
 * @param {string} path - Page path
 */
function navigateTo(path) {
    window.location.href = `${config.baseUrl}/${path.replace(/^\//, '')}`;
} 