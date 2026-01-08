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
    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600',
    'wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600',
    'maize': 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600',
    'cotton': 'https://images.unsplash.com/photo-1583769860203-301f5b87df9f?w=600',
    'jute': 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600',
    'watermelon': 'https://images.unsplash.com/photo-1587411768942-6b2d52f3e4f4?w=600',
    'muskmelon': 'https://images.unsplash.com/photo-1621583441131-e266d6b19c67?w=600',
    'apple': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600',
    'banana': 'https://images.unsplash.com/photo-1603833665858-e61d17a39224?w=600',
    'mango': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600',
    'grapes': 'https://images.unsplash.com/photo-1599819177272-feaa5ced296f?w=600',
    'orange': 'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?w=600',
    'papaya': 'https://images.unsplash.com/photo-1623944889288-cd147dbb517c?w=600',
    'coconut': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
    'pomegranate': 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600',
    'coffee': 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600',
    'chickpea': 'https://images.unsplash.com/photo-1626789073169-14a35598f73d?w=600',
    'lentil': 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?w=600',
    'blackgram': 'https://images.unsplash.com/photo-1535490810772-0e2e3e575ba8?w=600',
    'mungbean': 'https://images.unsplash.com/photo-1596040896157-cef8e0c82763?w=600',
    'mothbeans': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600',
    'pigeonpeas': 'https://images.unsplash.com/photo-1584242594003-f824c72b19f8?w=600',
    'kidneybeans': 'https://images.unsplash.com/photo-1580487831525-ccbb6fa2e90c?w=600'
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