const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

console.log('Testing SMTP connection with settings:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
});

transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP Connection failed:', error);
    } else {
        console.log('SMTP Connection is ready to send messages!');
    }
    process.exit(0);
});
