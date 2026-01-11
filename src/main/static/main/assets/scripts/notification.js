document.addEventListener("DOMContentLoaded", () => {
    updateGlobalNotificationDot();
});

document.querySelectorAll(".notification-row").forEach(row => {
    row.addEventListener("mouseenter", () => {
        const notificationId = row.dataset.notificationId;
        markAsSeen(notificationId);
    });
});

function markAsSeen(id) {
    const row = document.querySelector(
        `.notification-row[data-notification-id="${id}"]`
    );

    if (!row || row.classList.contains("seen")) {
        return; // déjà vue → on ne fait rien
    }

    // Marquer immédiatement côté UI
    row.classList.add("seen");
    updateGlobalNotificationDot();

    // Appel backend
    fetch(row.dataset.seenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
        }
    })
}

function updateGlobalNotificationDot() {
    const hasUnseen = document.querySelector(
        ".notification-row:not(.seen)"
    );

    const globalDot = document.querySelector(
        ".notification-container > .notification .global-notification-unreed"
    );

    if (!globalDot) return;

    globalDot.style.display = hasUnseen ? "inline" : "none";
}
