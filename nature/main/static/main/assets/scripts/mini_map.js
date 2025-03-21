const miniMapContainer = document.getElementById("mini-map");
let miniMap;

function showMiniMap(lat, lon) {
    miniMapContainer.classList.remove("expanded");
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
        miniMapContainer.style.display = "block";

        if (!miniMap) {
            console.log(lat, lon)
            miniMap = L.map('mini-map', {
                attributionControl: false,
                zoomControl: false
            }).setView([lat, lon], 10);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(miniMap);

            L.marker([lat, lon]).addTo(miniMap);
        } else {
            miniMap.setView([lat, lon], 10);

            miniMap.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    miniMap.removeLayer(layer);
                }
            });

            L.marker([lat, lon]).addTo(miniMap);
        }
    } else {
        miniMapContainer.style.display = "none";
    }
}

function closeMiniMap() {
    miniMapContainer.classList.remove("expanded");
    miniMapContainer.style.display = "none";
    if (miniMap) {
        miniMap.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                miniMap.removeLayer(layer);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const toggleMapSize = document.getElementById("toggle-map-size");

    toggleMapSize.addEventListener("click", () => {
        miniMapContainer.classList.toggle("expanded");
    });
});
