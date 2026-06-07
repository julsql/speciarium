package fr.speciarium.dto;

import java.util.List;
import java.util.Set;

/**
 * Une "ligne" du tableau Espèces : une espèce, agrégée sur toutes ses photos
 * de la collection courante. Port direct de annotate_queryset + transform_entry
 * du Django.
 */
public record SpeciesRowDto(
    Long specieId,
    String latinName,
    String genus,
    String species,
    String frenchName,
    String kingdom,
    String classField,
    String orderField,
    String family,
    Integer minYear,
    Set<String> continents,
    Set<String> countries,
    Set<String> regions,
    int numberPicture,
    List<PhotoSummary> allPhotos
) {}
