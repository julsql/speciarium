document.addEventListener('DOMContentLoaded', function () {
    const MAX_SELECTED = 5;
    const row = document.getElementById('compare-collections-row');
    const groupByInput = document.querySelector('input[name="group_by"]');
    if (!row || !groupByInput) {
        return;
    }

    const checkboxes = row.querySelectorAll('input[type="checkbox"][name="compare_collections"]');

    function syncVisibility() {
        const hasGroupBy = groupByInput.value.trim() !== '';
        row.style.display = hasGroupBy ? '' : 'none';
        if (!hasGroupBy) {
            checkboxes.forEach(cb => { cb.checked = false; });
        }
        refreshDisabledState();
    }

    function refreshDisabledState() {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const limitReached = checkedCount >= MAX_SELECTED;
        checkboxes.forEach(cb => {
            cb.disabled = limitReached && !cb.checked;
        });
    }

    groupByInput.addEventListener('input', syncVisibility);
    groupByInput.addEventListener('change', syncVisibility);

    checkboxes.forEach(cb => {
        cb.addEventListener('change', refreshDisabledState);
    });

    syncVisibility();
});
