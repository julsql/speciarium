package fr.speciarium.dto;

import fr.speciarium.model.Species;

public record SpeciesDto(
    Long id,
    String latinName,
    String genus,
    String species,
    String frenchName,
    String kingdom,
    String classField,
    String orderField,
    String family,
    long photoCount
) {
    public static SpeciesDto from(Species s, long photoCount) {
        return new SpeciesDto(
            s.id, s.latinName, s.genus, s.species, s.frenchName,
            s.kingdom, s.classField, s.orderField, s.family, photoCount
        );
    }
}
