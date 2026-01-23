import { store } from '../store.js';

export const DashboardUI = {
    init() {
        this.render();
        store.subscribe(() => this.update());
    },

    render() {
        const container = document.getElementById('dashboard');
        // Initial render of cards
        container.innerHTML = `
            ${this._createCard('calories', 'Calories', 'kcal')}
            ${this._createCard('protein', 'Protein', 'g')}
            ${this._createCard('fat', 'Fat', 'g')}
            ${this._createCard('carbs', 'Carbs', 'g')}
            ${this._createCard('fiber', 'Fiber', 'g')}
            ${this._createCard('sugar', 'Sugar', 'g')}
            ${this._createCard('net-carbs', 'Net Carbs', 'g')}
        `;
        this.update();
    },

    update() {
        const state = store.state;
        const consumed = store.getDailyStats(); // Uses selectedDate by default

        this._updateCard('calories', consumed.calories, state.goals.calories);
        this._updateCard('protein', consumed.protein, state.goals.protein);
        this._updateCard('fat', consumed.fat, state.goals.fat);
        this._updateCard('carbs', consumed.carbs, state.goals.carbs);
        this._updateCard('fiber', consumed.fiber, state.goals.fiber);
        this._updateCard('sugar', consumed.sugar, state.goals.sugar);

        const netCarbs = Math.max(0, consumed.carbs - (consumed.fiber || 0) - (consumed.sugarAlcohols || 0));
        // No explicit goal for Net Carbs in current schema, so might use Carbs goal as reference or hide progress ring?
        // Plan said: "ideally positioned near the Total Carbohydrates section for context."
        // Let's use the Total Carb goal as the denominator for now, or just show value.
        // If we want it to look like a macro card, we need a goal.
        // Let's assume Net Carb goal ~= Total Carb Goal for simpler visualization, or just 0 to hide ring if we wanted but _updateCard expects goal.
        // Better: let's track it against the standard Carb goal for context.
        this._updateCard('net-carbs', netCarbs, state.goals.carbs);
    },

    _createCard(type, label, unit) {
        return `
            <div class="macro-card ${type}">
                <div class="progress-ring">
                    <svg viewBox="0 0 40 40">
                        <circle class="progress-bg" cx="20" cy="20" r="16"></circle>
                        <circle id="ring-${type}" class="progress-value" cx="20" cy="20" r="16"></circle>
                    </svg>
                    <div class="macro-percentage" id="percent-${type}">0%</div>
                </div>
                <div class="macro-label">${label}</div>
                <div class="macro-amount">
                    <span id="val-${type}">0</span> / <span id="goal-${type}">0</span>
                </div>
                <div class="macro-unit">${unit}</div>
            </div>
        `;
    },

    _updateCard(type, current, goal) {
        const ring = document.getElementById(`ring-${type}`);
        const valEl = document.getElementById(`val-${type}`);
        const goalEl = document.getElementById(`goal-${type}`);
        const percentEl = document.getElementById(`percent-${type}`);

        if (!ring || !valEl || !goalEl) return;

        valEl.textContent = Math.round(current).toLocaleString();
        goalEl.textContent = goal.toLocaleString();

        // Calculate stroke offset
        // circle radius = 16, circumference = 2 * pi * 16 ≈ 100.5
        // We set stroke-dasharray to 100 in CSS for simplicity, so let's stick to %
        const percent = Math.min(1, current / goal);
        const offset = 100 - (percent * 100);

        ring.style.strokeDashoffset = offset;

        if (percentEl) {
            const rawPercent = goal > 0 ? Math.round((current / goal) * 100) : 0;
            percentEl.textContent = `${rawPercent}%`;
        }
    }
};
