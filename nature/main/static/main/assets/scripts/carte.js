const images = document.getElementById("data-carte");

window.onload = function () {
    const allImagesData = images?.dataset?.images;
    let data;
    if (allImagesData) {
        data = JSON.parse(allImagesData);
        showMap(data)
    }
}

function showMap(data) {
    const carte = L.map('carte', {
        attributionControl: false,
        zoomControl: false
    }).setView([0, 0], 2);  // Vue initiale large

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(carte);

    let bounds = L.latLngBounds();
    let groupedData = {};

    data.forEach(image => {
        const lat = image.latitude;
        const lon = image.longitude;

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
