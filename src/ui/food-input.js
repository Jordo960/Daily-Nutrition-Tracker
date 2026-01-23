import { store } from '../store.js';
import { USDAService } from '../api/usda.js';
import { PRESETS } from '../data/presets.js';

export const FoodInputUI = {
    init() {
        // Buttons
        document.getElementById('btn-search-food').addEventListener('click', () => this.openSearchModal());
        document.getElementById('btn-add-preset').addEventListener('click', () => this.openPresetModal());

        // Settings / Edit Goals (Adding this listener for the header date/title or a new button if we had one, 
        // for now let's attach secret access or just rely on a new button, 
        // actually let's make the dashboard cards clickable to edit goals)
        document.getElementById('dashboard').addEventListener('click', () => this.openGoalsModal());
    },

    openModal(contentHTML) {
        const container = document.getElementById('modal-container');
        container.innerHTML = `
            <div class="modal-overlay" id="active-modal">
                <div class="modal-content">
                    <button class="close-modal" id="btn-close-modal">&times;</button>
                    ${contentHTML}
                </div>
            </div>
        `;

        // Close handlers
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('active-modal').addEventListener('click', (e) => {
            if (e.target.id === 'active-modal') this.closeModal();
        });
    },

    closeModal() {
        const container = document.getElementById('modal-container');
        container.innerHTML = '';
    },

    openSearchModal() {
        this.openModal(`
            <h2>add Food</h2>
            <input type="text" id="food-search-input" class="search-input" placeholder="Search foods or presets... (e.g. Avocado)" autofocus>
            <div id="search-results-list" class="search-results"></div>
        `);

        const input = document.getElementById('food-search-input');
        const resultsList = document.getElementById('search-results-list');
        let debounceTimer;

        input.focus();

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value;
            if (query.length < 3) return;

            debounceTimer = setTimeout(async () => {
                resultsList.innerHTML = '<div style="color:var(--text-secondary)">Searching...</div>';

                // Local Search
                const qLower = query.toLowerCase();
                const customPresets = store.state.customPresets || [];
                const allPresets = [...PRESETS, ...customPresets];

                const localResults = allPresets.filter(p =>
                    p.name.toLowerCase().includes(qLower) ||
                    (p.description && p.description.toLowerCase().includes(qLower))
                );

                // Remote Search
                let remoteResults = [];
                try {
                    remoteResults = await USDAService.searchFoods(query);
                } catch (err) {
                    console.error('Remote search failed', err);
                }

                this.renderSearchResults([...localResults, ...remoteResults], resultsList);
            }, 500);
        });
    },

    renderSearchResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary)">No results found.</div>';
            return;
        }

        container.innerHTML = results.map((item, index) => {
            // Determine display text based on item type (Preset vs USDA)
            // Presets have 'description' as main secondary text, USDA has 'brand' + 'servingSize'
            // We can infer type by check properties or IDs.
            // USDA items have 'servingSize', Presets usually don't (unless added to desc).

            let subtext = '';
            if (item.servingSize) {
                // Assume USDA
                subtext = `${item.brand ? item.brand + ' | ' : ''} ${item.servingSize}`;
            } else {
                // Assume Preset
                subtext = item.description || 'Custom Preset';
            }

            return `
            <div class="search-result-item" data-index="${index}">
                <div style="font-weight:600">${item.name}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary)">
                    ${subtext}
                </div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">
                    <span style="color:var(--color-protein)">${Math.round(item.protein).toLocaleString()}p</span> • 
                    <span style="color:var(--color-fat)">${Math.round(item.fat).toLocaleString()}f</span> • 
                    <span style="color:var(--color-carbs)">${Math.round(item.carbs).toLocaleString()}c</span> • 
                    ${Math.round(item.calories).toLocaleString()} kcal
                </div>
            </div>
            `;
        }).join('');

        // Click handlers
        container.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const item = results[el.dataset.index];

                // If it's a preset (no id property or string id starting with 'preset-'), add directly
                // Actually, let's treat everything with a numeric ID as USDA for now.
                // Our presets use string IDs.
                const isUSDA = typeof item.id === 'number';

                if (isUSDA) {
                    this.openQuantityModal(item);
                } else {
                    store.addFoodItem(item);
                    this.closeModal();
                }
            });
        });
    },

    async openQuantityModal(summaryItem) {
        this.openModal(`
            <h2>Quantity</h2>
            <div style="color:var(--text-secondary); margin-bottom:1rem">${summaryItem.name}</div>
            <div id="quantity-loading">Loading details...</div>
            <div id="quantity-form" style="display:none">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:1rem;">
                    <div>
                        <label style="font-size:0.8rem; color:var(--text-secondary)">Amount</label>
                        <input type="number" id="qty-amount" class="search-input" value="1" min="0.1" step="0.1">
                    </div>
                    <div>
                        <label style="font-size:0.8rem; color:var(--text-secondary)">Unit</label>
                        <select id="qty-unit" class="search-input" style="padding:12px"></select>
                    </div>
                </div>
                
                <div class="macro-card" style="margin-bottom:1rem; padding:10px; text-align:center">
                    <div style="font-size:0.9rem; font-weight:600">
                        <span id="preview-calories">0</span> kcal
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; justify-content:center; gap:10px; margin-top:5px">
                        <span style="color:var(--color-protein)"><span id="preview-protein">0</span>p</span>
                        <span style="color:var(--color-fat)"><span id="preview-fat">0</span>f</span>
                        <span style="color:var(--color-carbs)"><span id="preview-carbs">0</span>c</span>
                    </div>
                </div>

                <button id="btn-add-qty" class="btn-primary" style="width:100%">Add Food</button>
            </div>
        `);

        // Fetch details
        const loading = document.getElementById('quantity-loading');
        loading.textContent = 'Loading details... (Step 1: Requesting)';

        let details = null;
        try {
            details = await USDAService.getFoodDetails(summaryItem.id);
            loading.textContent = 'Loading details... (Step 2: Response Received)';
        } catch (e) {
            loading.textContent = 'Loading details... (Step 2: Request Failed - ' + e.message + ')';
            console.error(e);
            return;
        }

        if (!details) {
            document.getElementById('quantity-loading').textContent = 'Error: API returned null details. Check console.';
            return;
        }
        document.getElementById('quantity-loading').textContent = 'Loading details... (Step 3: Processing)';

        const form = document.getElementById('quantity-form');
        const unitSelect = document.getElementById('qty-unit');
        const amountInput = document.getElementById('qty-amount');
        const btnAdd = document.getElementById('btn-add-qty');

        loading.style.display = 'none';
        form.style.display = 'block';

        // Populate units
        details.portions.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx; // We use index to reference the portion object
            opt.textContent = p.label;
            if (p.isDefault) opt.selected = true;
            unitSelect.appendChild(opt);
        });

        // Update preview function
        const updatePreview = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const portionIndex = parseInt(unitSelect.value);
            const portion = details.portions[portionIndex];

            // Scaling logic:
            // details has base nutrients (per 100g or per serving depending on baseGramWeight)
            // baseGramWeight tells us what the base values represent in grams
            // We calculate the multiplier:
            // totalGrams = amount * portion.gramWeight
            // multiplier = totalGrams / details.baseGramWeight

            const totalGrams = amount * portion.gramWeight;
            const multiplier = totalGrams / details.baseGramWeight;

            const p = Math.round(details.protein * multiplier);
            const f = Math.round(details.fat * multiplier);
            const c = Math.round(details.carbs * multiplier);
            const kcal = Math.round(details.calories * multiplier);

            document.getElementById('preview-protein').textContent = p;
            document.getElementById('preview-fat').textContent = f;
            document.getElementById('preview-carbs').textContent = c;
            document.getElementById('preview-calories').textContent = kcal;

            return {
                ...details,
                protein: p,
                fat: f,
                carbs: c,
                calories: kcal,
                servingSize: `${amount} ${portion.label}` // Update description to reflect chosen amount
            };
        };

        // Event listeners
        amountInput.addEventListener('input', updatePreview);
        unitSelect.addEventListener('change', updatePreview);
        amountInput.focus();
        amountInput.select();

        // Initial update
        updatePreview();

        // Add handler
        btnAdd.addEventListener('click', () => {
            const finalItem = updatePreview();
            store.addFoodItem(finalItem);
            this.closeModal();
        });

        // Allow Enter key to submit
        amountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                btnAdd.click();
            }
        });
    },

    openPresetModal() {
        const customPresets = store.state.customPresets || [];
        const allPresets = [...PRESETS, ...customPresets];

        this.openModal(`
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="margin:0">Quick Add</h2>
                <button id="btn-create-preset" class="btn-primary" style="font-size:0.8rem; padding:4px 8px;">+ New Preset</button>
            </div>
            <div class="search-results">
                ${allPresets.map((item, index) => {
            const isCustom = item.id.toString().startsWith('custom-');
            return `
                    <div class="search-result-item preset-item" data-index="${index}" style="position:relative; padding-right: 40px;">
                        <div style="font-weight:600">${item.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary)">${item.description}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">
                            <span style="color:var(--color-protein)">${Math.round(item.protein).toLocaleString()}p</span> • 
                            <span style="color:var(--color-fat)">${Math.round(item.fat).toLocaleString()}f</span> • 
                            <span style="color:var(--color-carbs)">${Math.round(item.carbs).toLocaleString()}c</span> • 
                            ${Math.round(item.calories).toLocaleString()} kcal
                        </div>
                        
                        ${isCustom ? `
                        <div class="preset-actions" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); display:flex; gap:8px;">
                            <button class="btn-icon edit-preset-btn" data-id="${item.id}" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color: var(--color-protein);" title="Edit">✎</button>
                            <button class="btn-icon delete-preset-btn" data-id="${item.id}" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color: #ff4d4d;" title="Delete">🗑</button>
                        </div>
                        ` : ''}
                    </div>
                `;
        }).join('')}
            </div>
        `);

        document.getElementById('btn-create-preset').addEventListener('click', () => {
            this.openCreatePresetModal();
        });

        // Add Item Handler
        document.querySelectorAll('.preset-item').forEach(el => {
            el.addEventListener('click', (e) => {
                // Ignore clicks on action buttons
                if (e.target.closest('.preset-actions')) return;

                const item = allPresets[el.dataset.index];
                store.addFoodItem(item);
                this.closeModal();
            });
        });

        // Edit Handler
        document.querySelectorAll('.edit-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const item = customPresets.find(p => p.id === id);
                if (item) this.openCreatePresetModal(item);
            });
        });

        // Delete Handler
        document.querySelectorAll('.delete-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this preset?')) {
                    store.deleteCustomPreset(btn.dataset.id);
                    this.openPresetModal(); // Refresh
                }
            });
        });
    },

    openCreatePresetModal(existingItem = null) {
        const title = existingItem ? 'Edit Preset' : 'Create New Preset';
        const nameVal = existingItem ? existingItem.name : '';
        const descVal = existingItem ? existingItem.description : '';
        const pVal = existingItem ? existingItem.protein : 0;
        const fVal = existingItem ? existingItem.fat : 0;
        const cVal = existingItem ? existingItem.carbs : 0;
        const calVal = existingItem ? existingItem.calories : 0;

        this.openModal(`
            <h2>${title}</h2>
            <div style="margin-bottom: 12px;">
                <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Name</label>
                <input type="text" id="preset-name" class="search-input" placeholder="e.g. My Favorite Salad" value="${nameVal}">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Description</label>
                <input type="text" id="preset-desc" class="search-input" placeholder="e.g. Lettuce + Chicken + Ranch" value="${descVal}">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="margin-bottom: 12px;">
                    <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Protein (g)</label>
                    <input type="number" id="preset-p" class="search-input" value="${pVal}">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Fat (g)</label>
                    <input type="number" id="preset-f" class="search-input" value="${fVal}">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Carbs (g)</label>
                    <input type="number" id="preset-c" class="search-input" value="${cVal}">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Calories</label>
                    <input type="number" id="preset-cal" class="search-input" value="${calVal}">
                </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:16px;">
                ${existingItem ? `<button id="btn-cancel-edit" class="btn-secondary" style="flex:1">Cancel</button>` : ''}
                <button id="btn-save-preset" class="btn-primary" style="flex:1">Save Preset</button>
            </div>
        `);

        if (existingItem) {
            document.getElementById('btn-cancel-edit').addEventListener('click', () => this.openPresetModal());
        }

        document.getElementById('btn-save-preset').addEventListener('click', () => {
            const name = document.getElementById('preset-name').value;
            const description = document.getElementById('preset-desc').value;
            const protein = parseFloat(document.getElementById('preset-p').value) || 0;
            const fat = parseFloat(document.getElementById('preset-f').value) || 0;
            const carbs = parseFloat(document.getElementById('preset-c').value) || 0;
            const calories = parseFloat(document.getElementById('preset-cal').value) || 0;

            if (!name) return; // Basic validation

            const presetData = {
                id: existingItem ? existingItem.id : 'custom-' + Date.now(),
                name,
                description,
                protein,
                fat,
                carbs,
                calories
            };

            if (existingItem) {
                store.updateCustomPreset(presetData);
            } else {
                store.addCustomPreset(presetData);
            }

            this.openPresetModal(); // Go back to list
        });
    },

    openGoalsModal() {
        const goals = store.state.goals;
        this.openModal(`
            <h2>Adjust Goals</h2>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">Update your daily macro targets.</p>
            
            <div style="margin-bottom: 12px;">
                <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Calories (kcal)</label>
                <input type="number" id="goal-cal-input" class="search-input" value="${goals.calories}">
            </div>

            <div style="margin-bottom: 12px;">
                <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Protein (g)</label>
                <input type="number" id="goal-p-input" class="search-input" value="${goals.protein}">
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Fat (g)</label>
                <input type="number" id="goal-f-input" class="search-input" value="${goals.fat}">
            </div>
            
            <div style="margin-bottom: 24px;">
                <label style="display:block; font-size: 0.8rem; margin-bottom: 4px;">Carbs (g)</label>
                <input type="number" id="goal-c-input" class="search-input" value="${goals.carbs}">
            </div>

            <button id="btn-save-goals" class="btn-primary" style="width:100%">Save Goals</button>
        `);

        document.getElementById('btn-save-goals').addEventListener('click', () => {
            const cal = parseFloat(document.getElementById('goal-cal-input').value) || 0;
            const p = parseFloat(document.getElementById('goal-p-input').value) || 0;
            const f = parseFloat(document.getElementById('goal-f-input').value) || 0;
            const c = parseFloat(document.getElementById('goal-c-input').value) || 0;

            store.updateGoals({ calories: cal, protein: p, fat: f, carbs: c });
            this.closeModal();
        });
    }
};
