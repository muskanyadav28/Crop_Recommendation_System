// ================================
// Soil types by state
// ================================
const soilTypesByState = {
    "Andhra Pradesh": ["Black Soil", "Red Soil", "Alluvial", "Clay", "Sandy Loam"],
    "Telangana": ["Black Soil", "Red Soil", "Clay Loam", "Sandy"],
    "Tamil Nadu": ["Red Soil", "Black Soil", "Alluvial", "Coastal Sandy"],
    "Karnataka": ["Red Soil", "Black Soil", "Loamy", "Clay Loam"],
    "Maharashtra": ["Black Soil", "Red Soil", "Alluvial", "Clay"],
    "Gujarat": ["Black Soil", "Alluvial", "Sandy", "Coastal Sandy"],
    "Rajasthan": ["Sandy", "Sandy Loam", "Alluvial", "Red Soil"],
    "Punjab": ["Alluvial", "Loamy", "Sandy Loam", "Clay Loam"],
    "Haryana": ["Alluvial", "Loamy", "Sandy Loam", "Clay"],
    "Uttar Pradesh": ["Alluvial", "Loamy", "Clay Loam", "Sandy"],
    "Madhya Pradesh": ["Black Soil", "Red Soil", "Alluvial", "Clay Loam"],
    "West Bengal": ["Alluvial", "Red Soil", "Coastal Sandy", "Clay"],
    "Bihar": ["Alluvial", "Loamy", "Clay", "Sandy Loam"],
    "Odisha": ["Red Soil", "Alluvial", "Coastal Sandy", "Black Soil"],
    "Jharkhand": ["Red Soil", "Alluvial", "Clay", "Sandy Loam"],
    "Chhattisgarh": ["Red Soil", "Black Soil", "Alluvial", "Clay Loam"],
    "Kerala": ["Red Soil", "Coastal Sandy", "Alluvial", "Clay"],
    "Assam": ["Alluvial", "Red Soil", "Clay", "Sandy Loam"]
};

const allSoilTypes = [
    "Clay", "Sandy", "Loamy", "Sandy Loam",
    "Clay Loam", "Black Soil", "Red Soil",
    "Alluvial", "Coastal Sandy", "Loam"
];

// ================================
// State → Soil filter
// ================================
const stateInput = document.querySelector('input[name="state"]');
const soilTypeSelect = document.querySelector('select[name="soil_type"]');

if (stateInput) {
    stateInput.addEventListener('input', () => {
        updateSoilTypes(stateInput.value.trim());
    });
}

function updateSoilTypes(state) {
    soilTypeSelect.innerHTML = '<option value="">Select Soil</option>';
    const soilTypes = soilTypesByState[state] || allSoilTypes;

    soilTypes.forEach(soil => {
        const option = document.createElement('option');
        option.value = soil.toLowerCase().replace(/ /g, '_');
        option.textContent = soil;
        soilTypeSelect.appendChild(option);
    });
}

// ================================
// Form submit
// ================================
const form = document.getElementById('cropForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
        state: formData.get('state'),
        district: formData.get('district'),
        village: formData.get('village'),
        season: formData.get('season'),
        soil_type: formData.get('soil_type'),
        nitrogen: Number(formData.get('nitrogen')),
        phosphorus: Number(formData.get('phosphorus')),
        potassium: Number(formData.get('potassium')),
        ph: Number(formData.get('ph'))
    };

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to get recommendations');

        const result = await response.json();
        displayRecommendations(result);

        document.querySelector('.results-section')
            .scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        alert(err.message || 'Something went wrong');
    } finally {
        submitBtn.textContent = 'Submit';
        submitBtn.disabled = false;
    }
});

// ================================
// Display results
// ================================
function displayRecommendations(result) {
    document.getElementById('location-display').textContent =
        `${result.village}, ${result.district}, ${result.state}`;

    document.getElementById('temperature').textContent =
        `Temperature: ${result.temperature}°C`;

    document.getElementById('humidity').textContent =
        `Humidity: ${result.humidity}%`;

    document.getElementById('rainfall').textContent =
        `Rainfall: ${result.rainfall}mm`;

    const container = document.getElementById('cropCardsContainer');
    container.innerHTML = '';

    result.recommendations.forEach((rec, index) => {
        container.appendChild(createCropCard(rec, index + 1));
    });

    const resultsSection = document.querySelector('.results-section');
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('show');
}

// ================================
// Crop Card
// ================================
function createCropCard(recommendation, rank) {
    const card = document.createElement('div');
    card.className = 'crop-card';

    card.innerHTML = `
        <div class="rank-badge rank-${rank}">#${rank}</div>

        <div class="crop-details">
            <div class="accuracy-badge">
                ${Math.round(recommendation.accuracy)}%
            </div>

            <h3 class="crop-name">${recommendation.crop}</h3>

            <div class="crop-stats">
                <div class="stat-item">
                    Expected Cost: ₹${recommendation.expected_cost.toLocaleString()}
                </div>
                <div class="stat-item">
                    Expected Returns: ₹${recommendation.expected_returns.toLocaleString()}
                </div>
            </div>
        </div>
    `;

    return card;
}

