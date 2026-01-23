import { CONFIG } from './config.js';

const STORAGE_KEY = 'nutrition_tracker_data_v2'; // Bump version

export class Store {
    constructor() {
        this.state = this._loadState();
        this.listeners = [];
    }

    _loadState() {
        const saved = localStorage.getItem(STORAGE_KEY);
        const today = this._getTodayStr();

        let state;

        if (saved) {
            const parsed = JSON.parse(saved);
            state = {
                ...parsed,
                selectedDate: today, // Always start on today
                logs: parsed.logs || {}, // Maps 'YYYY-MM-DD' -> [items]
                customPresets: parsed.customPresets || []
            };

            // Migration for v1 (if logs is empty but we have foodLog from v1, though key changed so clean slate for v2)
            // If we wanted to keep v1 data we'd need to read v1 key. For now, simple start.
            if (!state.logs[today]) state.logs[today] = [];

        } else {
            // Default state
            state = {
                goals: { ...CONFIG.DEFAULT_GOALS },
                selectedDate: today,
                logs: {
                    [today]: []
                },
                customPresets: [],
            };
        }

        // Ensure goals are valid
        ['protein', 'fat', 'carbs', 'fiber', 'sugar', 'calories'].forEach(key => {
            if (!Number.isFinite(state.goals[key])) state.goals[key] = CONFIG.DEFAULT_GOALS[key] || 0;
        });

        return state;
    }

    _saveState() {
        // We don't save selectedDate, usually
        const toSave = {
            goals: this.state.goals,
            logs: this.state.logs,
            customPresets: this.state.customPresets
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        this._notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state); // Initial call
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    _notify() {
        this.listeners.forEach(l => l(this.state));
    }

    _getTodayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Actions

    setDate(dateStr) {
        this.state.selectedDate = dateStr;
        // Ensure log array exists for this date
        if (!this.state.logs[dateStr]) {
            this.state.logs[dateStr] = [];
        }
        this._notify(); // Notify UI to update
    }

    updateGoals(newGoals) {
        this.state.goals = { ...this.state.goals, ...newGoals };
        this._saveState();
    }

    addFoodItem(foodItem) {
        const date = this.state.selectedDate;

        if (!this.state.logs[date]) {
            this.state.logs[date] = [];
        }

        const p = parseFloat(foodItem.protein) || 0;
        const f = parseFloat(foodItem.fat) || 0;
        const c = parseFloat(foodItem.carbs) || 0;
        const cal = parseFloat(foodItem.calories) || 0;

        this.state.logs[date].push({
            ...foodItem,
            protein: p,
            fat: f,
            carbs: c,
            fiber: parseFloat(foodItem.fiber) || 0,
            sugar: parseFloat(foodItem.sugar) || 0,
            sugarAlcohols: parseFloat(foodItem.sugarAlcohols) || 0,
            calories: cal,
            timestamp: Date.now() // unique ID
        });

        this._saveState();
    }

    removeFoodItem(timestamp) {
        const date = this.state.selectedDate;
        const log = this.state.logs[date];

        if (log) {
            const index = log.findIndex(item => item.timestamp === timestamp);
            if (index > -1) {
                log.splice(index, 1);
                this._saveState();
            }
        }
    }

    // Selectors

    getDailyStats(dateStr = this.state.selectedDate) {
        const log = this.state.logs[dateStr] || [];

        return log.reduce((acc, item) => {
            acc.protein += item.protein;
            acc.fat += item.fat;
            acc.carbs += item.carbs;
            acc.fiber += (item.fiber || 0);
            acc.sugar += (item.sugar || 0);
            acc.sugarAlcohols += (item.sugarAlcohols || 0);
            acc.calories += item.calories;
            return acc;
        }, { protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sugarAlcohols: 0, calories: 0 });
    }

    getCurrentLog() {
        return this.state.logs[this.state.selectedDate] || [];
    }

    getRemaining() {
        const consumed = this.getDailyStats();
        return {
            protein: this.state.goals.protein - consumed.protein,
            fat: this.state.goals.fat - consumed.fat,
            carbs: this.state.goals.carbs - consumed.carbs,
            calories: this.state.goals.calories - consumed.calories
        };
    }

    addCustomPreset(preset) {
        this.state.customPresets.push(preset);
        this._saveState();
    }

    updateCustomPreset(updatedPreset) {
        const index = this.state.customPresets.findIndex(p => p.id === updatedPreset.id);
        if (index !== -1) {
            this.state.customPresets[index] = updatedPreset;
            this._saveState();
        }
    }

    deleteCustomPreset(id) {
        this.state.customPresets = this.state.customPresets.filter(p => p.id !== id);
        this._saveState();
    }
}

export const store = new Store();
