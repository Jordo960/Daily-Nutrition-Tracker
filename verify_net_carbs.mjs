
import { USDAService } from './src/api/usda.js';

// Mock Config if needed or ensure it's imported correctly in context
// We are verifying:
// 1. Fiber/SugarAlcohols extraction
// 2. Calculation logic (visual check via console)

console.log("Starting Net Carb Verification...");

async function verify() {
    // 1. Search for a fibrous food (e.g. Avocado or Raspberries)
    console.log("Searching for 'Avocado'...");
    const results = await USDAService.searchFoods("Avocado");

    if (results.length === 0) {
        console.error("No results found.");
        return;
    }

    const item = results[0];
    console.log(`Found: ${item.name} (ID: ${item.id})`);

    // Search list normalization check
    console.log(`[Search Item] Fiber: ${item.fiber}, Sugar Alcohols: ${item.sugarAlcohols}`);

    // 2. Details Fetch
    console.log("Fetching details...");
    const details = await USDAService.getFoodDetails(item.id);

    if (!details) {
        console.error("Details failed.");
        return;
    }

    console.log(`[Details] Base Fiber: ${details.fiber}, Base SA: ${details.sugarAlcohols}`);

    // 3. Scale Logic Simulation
    // Assume we choose 100g (multiplier 1 if baseGramWeight is 100) or check portions
    const portion = details.portions.find(p => p.isDefault) || details.portions[0];
    const amount = 1;

    const totalGrams = amount * portion.gramWeight;
    const multiplier = totalGrams / details.baseGramWeight;

    const fiber = Math.round((details.fiber || 0) * multiplier);
    const sa = Math.round((details.sugarAlcohols || 0) * multiplier);
    const carbs = Math.round(details.carbs * multiplier);
    const net = Math.max(0, carbs - fiber - sa);

    console.log(`\nCalculation Test for 1x ${portion.label} (${totalGrams}g):`);
    console.log(`Carbs: ${carbs}`);
    console.log(`Fiber: ${fiber}`);
    console.log(`Sugar Alc: ${sa}`);
    console.log(`EXPECTED Net Carbs: ${net}`);

    if (fiber > 0) {
        console.log("SUCCESS: Fiber detected.");
    } else {
        console.warn("WARNING: No fiber detected (might be food choice or extraction issue).");
    }
}

verify();
