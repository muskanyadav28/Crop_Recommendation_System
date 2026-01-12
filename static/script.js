// ================================
// Soil types by state mapping
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
    "Alluvial", "Coastal Sandy"
];

// ================================
// Crop Images Mapping
// ================================
const cropImages = {
    'rice': '/static/images/Rice.webp',
    'wheat': '/static/images/wheat.webp',
    'maize': '/static/images/maize.webp',
    'cotton': '/static/images/cotton.webp',
    'jute': '/static/images/jute.jpg',
    'watermelon': '/static/images/watermelon.avif',
    'muskmelon': '/static/images/muskmelon.webp',
    'apple': '/static/images/apple.avif',
    'banana': '/static/images/banana.avif',
    'mango': '/static/images/mango.avif',
    'grapes': '/static/images/grapes.avif',
    'orange': '/static/images/orange.webp',
    'papaya': '/static/images/papaya.avif',
    'coconut': '/static/images/coconut.avif',
    'pomegranate': '/static/images/pomegranate.avif',
    'coffee': '/static/images/coffee.avif',
    'chickpea': '/static/images/chickpea.avif',
    'lentil': '/static/images/lentil.avif',
    'blackgram': '/static/images/blackgram.avif',
    'mungbean': '/static/images/mungbean.jpeg',
    'mothbeans': '/static/images/mothbeans.jpeg',
    'pigeonpeas': '/static/images/pigeonpeas.jpeg',
    'kidneybeans': '/static/images/kidneybeans.jpeg'
};

// ================================
// DOM Elements
// ================================
const stateInput = document.querySelector('input[name="state"]');
const soilTypeSelect = document.querySelector('select[name="soil_type"]');
const form = document.getElementById('cropForm');

// ================================
// State → Soil Type Filter
// ================================
if (stateInput && soilTypeSelect) {
    stateInput.addEventListener('input', function() {
        updateSoilTypes(this.value.trim());
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
// Form Submission
// ================================
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {
        state: formData.get('state'),
        district: formData.get('district'),
        village: formData.get('village'),
        season: formData.get('season'),
        soil_type: formData.get('soil_type'),
        nitrogen: parseFloat(formData.get('nitrogen')),
        phosphorus: parseFloat(formData.get('phosphorus')),
        potassium: parseFloat(formData.get('potassium')),
        ph: parseFloat(formData.get('ph'))
    };
    
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get recommendations');
        }
        
        const result = await response.json();
        displayRecommendations(result);
        
        // Scroll to results
        setTimeout(() => {
            document.getElementById('results-section').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to get crop recommendations. ' + error.message);
    } finally {
        submitBtn.textContent = 'Submit';
        submitBtn.disabled = false;
    }
});

// ================================
// Display Recommendations
// ================================
function displayRecommendations(result) {
    // Update location and weather info
    document.getElementById('locationDisplay').textContent = 
        `${result.village}, ${result.district}, ${result.state}`;
    
    document.getElementById('temperatureDisplay').textContent = 
        `🌡️ ${result.temperature}°C`;
    
    document.getElementById('humidityDisplay').textContent = 
        `💧 Humidity: ${result.humidity}%`;
    
    document.getElementById('rainfallDisplay').textContent = 
        `🌧️ Rainfall: ${result.rainfall}mm`;
    
    // Clear and populate cards
    const cardsContainer = document.getElementById('cardsContainer');
    cardsContainer.innerHTML = '';
    
    result.recommendations.forEach((rec, index) => {
        const card = createCropCard(rec, index + 1);
        cardsContainer.appendChild(card);
    });
    
    // Show results section
    const resultsSection = document.getElementById('results-section');
    resultsSection.classList.remove('hidden');
}

// ================================
// Create Crop Card
// ================================
function createCropCard(recommendation, rank) {
    const card = document.createElement('div');
    card.className = 'crop-card';
    
    // Get crop image
    const cropKey = recommendation.crop.toLowerCase().replace(/ /g, '');
    const imageUrl = cropImages[cropKey] || 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600';
    
    // Calculate profit
    const profit = recommendation.expected_returns - recommendation.expected_cost;
    
    card.innerHTML = `
        <div class="rank-badge rank-${rank}">#${rank}</div>
        
        <div class="crop-image-container">
            <img src="${imageUrl}" alt="${recommendation.crop}" class="crop-image" loading="lazy">
        </div>
        
        <div class="crop-details">
            <div class="accuracy-badge">${Math.round(recommendation.accuracy)}%</div>
            
            <h3 class="crop-name">${recommendation.crop}</h3>
            
            <div class="crop-stats">
                <div class="stat-item">
                    Expected Cost : ₹${recommendation.expected_cost.toLocaleString('en-IN')}
                </div>
                <div class="stat-item">
                    Expected Returns : ₹${recommendation.expected_returns.toLocaleString('en-IN')}
                </div>
                <div class="stat-item profit-item">
                    Profit : ₹${profit.toLocaleString('en-IN')}
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// ================================
// Initialize
// ================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Crop Recommendation System Loaded');
});