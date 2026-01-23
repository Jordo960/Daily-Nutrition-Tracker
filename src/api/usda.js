import { CONFIG } from '../config.js';

export const USDAService = {
    async searchFoods(query) {
        if (!query || query.length < 3) return [];

        const url = `${CONFIG.USDA_API_BASE_URL}/foods/search?api_key=${CONFIG.USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API Request Failed');
            const data = await response.json();
            return data.foods.map(food => this._normalizeFood(food));
        } catch (error) {
            console.error('USDA API Error:', error);
            return [];
        }
    },

    async getFoodDetails(fdcId) {
        const url = `${CONFIG.USDA_API_BASE_URL}/food/${fdcId}?api_key=${CONFIG.USDA_API_KEY}`;
        try {
            // Add timeout
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);

            if (!response.ok) throw new Error('API Request Failed');
            const data = await response.json();
            return this._normalizeFoodDetails(data);
        } catch (error) {
            console.error('USDA Details Error:', error);
            return null;
        }
    },

    _normalizeFood(food) {
        // Simple normalization for search lists AND details
        // Note: Search results have nutrientId/value. Details have nutrient.id/amount.
        const getNutrient = (id) => {
            const n = food.foodNutrients.find(x => {
                const nId = x.nutrientId || (x.nutrient ? x.nutrient.id : null);
                return nId === id;
            });

            if (!n) return 0;
            const val = (n.value !== undefined) ? n.value : n.amount;
            return (val !== undefined) ? val : 0;
        };

        return {
            id: food.fdcId,
            name: food.description,
            brand: food.brandOwner,
            protein: getNutrient(1003),
            fat: getNutrient(1004),
            carbs: getNutrient(1005),
            calories: getNutrient(1008) || getNutrient(2047) || 0,
            servingSize: food.servingSize ? `${food.servingSize} ${food.servingSizeUnit}` : '100g'
        };
    },

    _normalizeFoodDetails(food) {
        // Detailed normalization including portions
        const base = this._normalizeFood(food);

        // Calculate base gram weight
        // If servingSize is present, that's the base (usually in grams for USDA branded)
        // If not, it's 100g (Foundation/Legacy defaults)
        let baseGramWeight = 100;
        if (food.servingSize && (food.servingSizeUnit === 'g' || food.servingSizeUnit === 'ml')) {
            baseGramWeight = food.servingSize;
        }

        let portions = [];

        // 1. Always add standard 100g option (base for USDA data)
        portions.push({
            label: '100g',
            gramWeight: 100,
            isDefault: !food.servingSize
        });

        // 2. Add "1g" option for precision
        portions.push({
            label: '1g',
            gramWeight: 1,
            isDefault: false
        });

        // 3. Add Branded serving size if available
        if (food.servingSize) {
            portions.push({
                label: `1 Serving (${food.servingSize} ${food.servingSizeUnit})`,
                gramWeight: food.servingSize, // USDA Branded servingSize is usually the gram weight equivalent of the unit
                isDefault: true
            });
        }

        // 4. Add Survey/SR Legacy portion measures
        if (food.foodPortions) {
            food.foodPortions.forEach(p => {
                // e.g. "1 cup" or "1 tablespoon"
                let unit = p.measureUnit?.name || '';

                // Filter out "undetermined" unit names but KEEP the portion if it has a description
                if (unit === 'undetermined' || unit === 'Undetermined') {
                    unit = '';
                }

                // Fix USDA data typos
                if (unit && unit.toLowerCase() === 'medoum') unit = 'medium';

                const label = p.portionDescription || p.modifier || unit || 'Serving';
                const amount = p.amount || 1;

                // Construct a readable label
                let displayLabel = p.disseminationText || `${amount} ${unit}`;

                if (!unit && !p.disseminationText) {
                    // If unit was likely 'undetermined' (now empty), try to use description/modifier
                    displayLabel = p.portionDescription || p.modifier || 'Serving';

                    // Fix typos
                    displayLabel = displayLabel.replace(/medoum/gi, 'medium');

                    if (p.modifier && p.portionDescription && !p.portionDescription.includes(p.modifier)) {
                        let cleanModifier = p.modifier.replace(/medoum/gi, 'medium');
                        displayLabel += ` (${cleanModifier})`;
                    }
                } else {
                    // Standard case
                    // Fix typos in display label
                    displayLabel = displayLabel.replace(/medoum/gi, 'medium');

                    if (p.modifier) {
                        const cleanModifier = p.modifier.replace(/medoum/gi, 'medium');
                        // Avoid duplication if modifier is already in the label
                        if (!displayLabel.includes(cleanModifier)) {
                            displayLabel += ` (${cleanModifier})`;
                        }
                    }
                }

                portions.push({
                    label: displayLabel,
                    gramWeight: p.gramWeight,
                    isDefault: false
                });
            });
        }

        return {
            ...base,
            baseGramWeight,
            portions
        };
    }
};
