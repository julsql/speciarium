const images = document.getElementById("data-carte");
const errorDiv = document.getElementById("error-carte");
const carteDiv = document.getElementById("carte");

window.onload = function () {
    const allImagesData = images?.dataset?.images;
    let data;
    if (allImagesData) {
        data = JSON.parse(allImagesData);
        showMap(data)
    }
}

function showMap(data) {
    if (typeof L === 'undefined' || !L) {
        console.error("Leaflet.js n'est pas chargé. Impossible d'afficher la carte.");
        carteDiv.style.display = "none";
        errorDiv.style.display = "block";
        errorDiv.innerText = "Le fond de carte n'a pas pu être chargé. Veuillez réessayer plus tard."
        return;
    }

    carteDiv.style.display = "block";
    errorDiv.style.display = "none";
    errorDiv.innerText = "";

    const carte = L.map('carte', {
        attributionControl: false,
        zoomControl: false
    }).setView([0, 0], 2);  // Vue initiale large

    L.tileLayer(mapTiles ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(carte);

    let bounds = L.latLngBounds();
    let groupedData = {};

    data.forEach(image => {
        const lat = image.latitude;
        const lon = image.longitude;
        console.log(lat, lon)

        if (!isNaN(lat) && !isNaN(lon)) {
            const key = `${lat},${lon}`;
            if (!groupedData[key]) {
                groupedData[key] = { lat, lon, labels: [] };
            }
            groupedData[key].labels.push(image.title);
        }
    })

    Object.values(groupedData).forEach(({ lat, lon, labels }) => {
        const marker = L.marker([lat, lon]).addTo(carte);
        bounds.extend(marker.getLatLng());

        // Créer une liste des labels pour le tooltip
        const tooltipContent = labels.map(label => `• ${label}`).join("<br>");

        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: "top",
            className: "custom-tooltip"
        });
        marker.on('click', function () {
            window.location.href = `/photos/?latitude=${lat}&longitude=${lon}`;
        });
    });

}
