
import { USDAService } from './src/api/usda.js';

// Mock fetch if needed, but we want real network data
// Since I can't mock fetch easily in node without polyfill if not present, but modern node has fetch.
// We are in limited env. The user has 'test_serving.mjs' which probably works.
// Let's use a new file "debug_apple.mjs"

async function debugApple() {
    console.log("Searching for Apple...");
    const results = await USDAService.searchFoods("Apple, raw");
    if (results.length === 0) {
        console.log("No results found");
        return;
    }

    const firstApple = results[0];
    console.log(`Found: ${firstApple.name} (ID: ${firstApple.id})`);

    console.log("Fetching details...");
    const details = await USDAService.getFoodDetails(firstApple.id);

    console.log("\nPortions found:");
    details.portions.forEach(p => {
        console.log(`- Label: "${p.label}" | Grams: ${p.gramWeight} | Default: ${p.isDefault}`);
    });
}

debugApple();
