import axios from 'axios';

const API_URL = 'http://localhost:3003/api';
const WALLET = '0x1764503803602b7tlna';

async function debug() {
    console.log('🔍 Debugging 500 Errors...');

    try {
        console.log('\n1. Testing GET /appointments/patient/:wallet');
        const res1 = await axios.get(`${API_URL}/appointments/patient/${WALLET}`);
        console.log('✅ Success:', res1.status);
    } catch (error) {
        console.log('❌ Error 1:', error.response?.status, error.response?.statusText);
        if (error.response?.data) {
            console.log('Details:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Message:', error.message);
        }
    }

    try {
        console.log('\n2. Testing GET /medical-records/:wallet');
        const res2 = await axios.get(`${API_URL}/medical-records/${WALLET}`);
        console.log('✅ Success:', res2.status);
    } catch (error) {
        console.log('❌ Error 2:', error.response?.status, error.response?.statusText);
        if (error.response?.data) {
            console.log('Details:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Message:', error.message);
        }
    }
}

debug();
