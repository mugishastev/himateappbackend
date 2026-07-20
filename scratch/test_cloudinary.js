const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Testing Cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
});

// Ping or upload a dummy base64 to test
cloudinary.api.ping()
    .then(result => {
        console.log('Cloudinary connection successful:', result);
        process.exit(0);
    })
    .catch(error => {
        console.error('Cloudinary connection failed:', error);
        process.exit(1);
    });
