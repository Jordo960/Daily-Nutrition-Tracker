
import { CONFIG } from './src/config.js';
import { USDAService } from './src/api/usda.js';

// Setup global Mocks/Context if needed
// Node 18 has fetch
console.log("Starting USDA Service Verification...");

async function runTest() {
    try {
        // 1. Search for 'Oreo' to get an ID (since previous ID might be stale or specific)
        console.log("Searching for 'Oreo'...");
        const searchResults = await USDAService.searchFoods("Oreo");
        if (searchResults.length === 0) {
            console.error("Search failed: No results found");
            return;
        }

        const firstItem = searchResults[0];
        console.log(`Found: ${firstItem.name} (ID: ${firstItem.id})`);

        // 2. Get Details
        console.log("Fetching details...");
        const details = await USDAService.getFoodDetails(firstItem.id);

        if (!details) {
            console.error("Details fetch failed");
            return;
        }

        console.log("Details fetched successfully.");
        console.log("Base Gram Weight:", details.baseGramWeight);
        console.log("Base Protein:", details.protein);
        console.log("Available Portions:", details.portions.map(p => p.label).join(", "));

        // 3. Test Scaling Logic
        console.log("\nTesting Scaling Logic...");

        // Scenario A: 2x '1g' (2g total)
        const amountA = 2;
        const portionIndexA = details.portions.findIndex(p => p.label === '1g');
        if (portionIndexA !== -1) {
            const portion = details.portions[portionIndexA];
            const totalGrams = amountA * portion.gramWeight;
            const multiplier = totalGrams / details.baseGramWeight;

            const p = Math.round(details.protein * multiplier);
            console.log(`Context: 2x 1g = ${totalGrams}g. Multiplier: ${multiplier.toFixed(4)}`);
            console.log(`Calculated Protein: ${p} (Expected: ~${(details.protein * multiplier).toFixed(2)})`);
        }

        // Scenario B: 1x Default Portion (e.g. 1 Serving)
        const portionIndexB = details.portions.findIndex(p => p.isDefault);
        if (portionIndexB !== -1) {
            const portion = details.portions[portionIndexB];
            const amountB = 1;
            const totalGrams = amountB * portion.gramWeight;
            const multiplier = totalGrams / details.baseGramWeight;
            const p = Math.round(details.protein * multiplier);

            console.log(`\nContext: 1x ${portion.label} = ${totalGrams}g. Multiplier: ${multiplier.toFixed(4)}`);
            console.log(`Calculated Protein: ${p} (Expected: ~${details.protein})`); // Should match base if base is per serving
        }

    } catch (e) {
        console.error("Test failed with exception:", e);
    }
}

runTest();
