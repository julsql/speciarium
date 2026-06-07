package fr.speciarium.dto;

import java.util.List;
import java.util.Map;

/**
 * Tableau pivot pour comparer plusieurs collections sur le même groupement.
 * - `columns` : liste ordonnée { id, label } des collections comparées
 *   (la première étant toujours la collection courante)
 * - `rows` : pour chaque valeur de groupement, le nombre pour chaque collection
 *   (clé = "collection_<id>") + une ligne "Total en commun" en première position.
 */
public record ComparisonResult(
    List<Column> columns,
    List<Map<String, Object>> rows
) {
    public record Column(Long id, String label) {}
}
