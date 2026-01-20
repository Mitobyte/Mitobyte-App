// Script to generate VAPID keys for push notifications
import webpush from 'web-push';

console.log('Generating VAPID keys...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated:\n');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);

console.log('\n\n=== Setup Instructions ===\n');
console.log('1. Copy the PUBLIC KEY above');
console.log('2. Update src/services/pushNotifications.js:');
console.log('   Replace the PUBLIC_VAPID_KEY value with your public key\n');
console.log('3. Add the PRIVATE KEY as a Cloudflare Pages secret:');
console.log('   wrangler pages secret put VAPID_PRIVATE_KEY\n');
console.log('4. Add the PUBLIC KEY as a Cloudflare Pages secret:');
console.log('   wrangler pages secret put VAPID_PUBLIC_KEY\n');
console.log('5. Update wrangler.toml to include the environment variables\n');
console.log('IMPORTANT: Keep the private key secret! Never commit it to version control.');
