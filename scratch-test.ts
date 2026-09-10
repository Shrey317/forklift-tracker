import { parseScannedQrContent } from './src/lib/qr-parse.ts';

console.log('Test 1:', parseScannedQrContent('http://localhost:3000/forklift/some-token'));
console.log('Test 2:', parseScannedQrContent('http://192.168.1.10:3000/forklift/another-token'));
console.log('Test 3:', parseScannedQrContent('/forklift/just-path-token'));
console.log('Test 4:', parseScannedQrContent('some-token'));
