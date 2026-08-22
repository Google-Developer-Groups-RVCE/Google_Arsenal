const fs = require('fs');
const dotenv = require('dotenv');

const envContent = `
# Some comment
values below:
FIREBASE_ADMIN_CLIENT_EMAIL="test@example.com"
FIREBASE_ADMIN_PRIVATE_KEY="some-key"
`;

const parsed = dotenv.parse(envContent);
console.log("Parsed keys:", Object.keys(parsed));
