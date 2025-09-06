
import 'dotenv/config';
import { processResults } from '@/services/results-service';

async function main() {
    try {
        console.log('Starting result processing script...');
        await processResults();
        console.log('Result processing script finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('An error occurred during the result processing script:', error);
        process.exit(1);
    }
}

main();
