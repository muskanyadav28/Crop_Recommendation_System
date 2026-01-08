document.addEventListener("DOMContentLoaded", function () {



const stateSelect = document.querySelector('select[name="state"]');
const districtSelect = document.querySelector('select[name="district"]');
const villageSelect = document.querySelector('select[name="village"]');

// Load states
fetch("https://countriesnow.space/api/v0.1/countries/states", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ country: "India" })
})
.then(res => res.json())
.then(data => {
  data.data.states.forEach(state => {
    const option = document.createElement("option");
    option.value = state.name;
    option.textContent = state.name;
    stateSelect.appendChild(option);
  });
})
.catch(err => console.error("State load error:", err));

// Load districts when state changes
stateSelect.addEventListener("change", () => {
  districtSelect.innerHTML = `<option value="">District</option>`;
//   villageSelect.innerHTML = `<option value="">Village</option>`;

  if (!stateSelect.value) return;

  fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      country: "India",
      state: stateSelect.value
    })
  })
  .then(res => res.json())
  .then(data => {
    data.data.forEach(district => {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });
  })
  .catch(err => console.error("District load error:", err));
});


// this is for final submittion and showing recommendaded crops
document.getElementById("cropForm").addEventListener("submit", function (e) {
    e.preventDefault();

    // Example recommendation (replace with ML / backend later)
    // add this to the backend later
    const recommendations = [
      { name: "Wheat", desc: "Best for rabi season and loamy soil." },
      { name: "Rice", desc: "Needs high water and warm climate." },
      { name: "Maize", desc: "Grows well in fertile, well-drained soil." }
    ];

    document.getElementById("crop1").textContent = recommendations[0].name;
    document.getElementById("desc1").textContent = recommendations[0].desc;

    document.getElementById("crop2").textContent = recommendations[1].name;
    document.getElementById("desc2").textContent = recommendations[1].desc;

    document.getElementById("crop3").textContent = recommendations[2].name;
    document.getElementById("desc3").textContent = recommendations[2].desc;
     


    
    // Show and scroll to result
    const resultSection = document.getElementById("resultSection");
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth" });
  });

});


