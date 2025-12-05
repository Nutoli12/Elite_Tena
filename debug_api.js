// Native fetch in Node 18+
async function debugApi() {
    try {
        console.log('Fetching pending approvals...');
        const response = await fetch('http://localhost:3003/api/appointments/pending-approval?doctorWallet=0x1764894943291khtk9h');
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

debugApi();
