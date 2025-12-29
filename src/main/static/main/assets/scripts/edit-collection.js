document.addEventListener("DOMContentLoaded", () => {
    let activeEdit = null;

    function closeActiveEdit(save = false) {
        if (!activeEdit) return;

        const { li, input, originalTitle, editBtn, saveBtn } = activeEdit;

        if (save) {
            const newTitle = input.value.trim();
            if (newTitle) {
                const span = document.createElement("span");
                span.className = "collection-title";
                span.textContent = newTitle;
                input.replaceWith(span);
            }
        } else {
            const span = document.createElement("span");
            span.className = "collection-title";
            span.textContent = originalTitle;
            input.replaceWith(span);
        }

        saveBtn.replaceWith(editBtn);
        enableEdit(editBtn);

        activeEdit = null;
    }

    function enableEdit(button) {
        button.addEventListener("click", () => {
            closeActiveEdit(false);

            const li = button.closest("li");
            const titleSpan = li.querySelector(".collection-title");
            const collectionId = li.dataset.collectionId;
            const currentTitle = titleSpan.textContent.trim();

            const input = document.createElement("input");
            input.type = "text";
            input.value = currentTitle;
            input.className = "edit-title";

            const saveBtn = document.createElement("div");
            saveBtn.innerHTML = `<img src="${checkIconPath}" alt="save">`;
            saveBtn.className = "save-btn collection-icon";

            titleSpan.replaceWith(input);
            button.replaceWith(saveBtn);
            input.focus();

            activeEdit = {
                li,
                input,
                originalTitle: currentTitle,
                editBtn: button,
                saveBtn,
                collectionId
            };

            function save() {
                const newTitle = input.value.trim();
                if (!newTitle || newTitle === currentTitle) {
                    closeActiveEdit(false);
                    return;
                }

                fetch(updateCollectionNameUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken
                    },
                    body: JSON.stringify({
                        collection_id: collectionId,
                        new_title: newTitle
                    })
                })
                .then(res => res.json())
                .then(data => {
                        if (data.success) {
                            location.reload();
                        } else {
                            alert("Erreur lors de la mise à jour");
                            closeActiveEdit(false);
                        }
                    });
            }

            saveBtn.addEventListener("click", save);

            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                }
                if (e.key === "Escape") {
                    closeActiveEdit(false);
                }
            });
        });
    }

    document.querySelectorAll(".edit-btn").forEach(enableEdit);

    /* ================================= */
    /* AJOUT  ET SUPPRESSION UTILISATEUR */
    /* ================================= */

    // Ajout

    document.querySelectorAll(".add-user-btn").forEach(btn => {
        const ul = btn.closest(".user-allowed-list");
        const collectionId = ul.dataset.collectionId;

        btn.addEventListener("click", () => {
        if (document.querySelector(".add-user-form")) return;

        const li = document.createElement("li");
        li.className = "add-user-form";

        li.innerHTML = `
            <input type="text" placeholder="username" class="add-user-input">
            <img src="${checkIconPath}" alt="save" class="confirm-add-user collection-icon">
        `;

        btn.parentElement.before(li);

        const input = li.querySelector("input");
        const confirmBtn = li.querySelector(".confirm-add-user");
        input.focus();

        const submit = () => {
            const username = input.value.trim();
            if (!username) return;

            fetch(addUserToCollectionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({
                    collection_id: collectionId,
                    username: username
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error);
                }
            });
        };

        confirmBtn.addEventListener("click", submit);
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") li.remove();
        });
    });
    });

    // Suppression

    document.querySelectorAll(".remove-user-btn").forEach(btn => {
        const ul = btn.closest(".user-allowed-list");
        const collectionId = ul.dataset.collectionId;

        btn.addEventListener("click", () => {
            const username = btn.dataset.username;

            if (!confirm(`Supprimer @${username} ?`)) return;

            fetch(removeUserToCollectionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({
                    collection_id: collectionId,
                    username: username
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error);
                }
            });
        });
    });

    /* ==================== */
    /* AJOUT DE COLLECTIONS */
    /* ==================== */

    const addCollectionBtn = document.querySelector("#collection-title .select-button");

    addCollectionBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const ul = document.querySelector("#collections-list");

        if (ul.querySelector(".new-collection-input")) return;

        const li = document.createElement("li");
        li.classList.add("new-collection-input");
        li.innerHTML = `
            <input type="text" placeholder="Nom de la collection" class="collection-name-input">
            <img src="${checkIconPath}" alt="save" class="validate-collection-btn collection-icon">
        `;

        ul.appendChild(li);

        const input = li.querySelector(".collection-name-input");
        const validateBtn = li.querySelector(".validate-collection-btn");
        input.focus();

        const createCollection = () => {
            const newTitle = input.value.trim();
            if (!newTitle) return;

            fetch(createCollectionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({ title: newTitle })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error || "Erreur lors de la création");
                }
            })
            .catch(err => console.error(err));
        };

        validateBtn.addEventListener("click", createCollection);

        input.addEventListener("keypress", e => {
            if (e.key === "Enter") createCollection();
        });
    });
});
