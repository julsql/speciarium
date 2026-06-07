package fr.speciarium.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import fr.speciarium.model.Collection;

import java.time.OffsetDateTime;

public record CollectionDto(
    Long id,
    String title,
    Long ownerId,
    String ownerUsername,
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    OffsetDateTime createdAt,
    long photoCount,
    long speciesCount
) {
    public static CollectionDto from(Collection c, long photos, long species) {
        return new CollectionDto(
            c.id, c.title,
            c.owner != null ? c.owner.id : null,
            c.owner != null ? c.owner.username : null,
            c.createdAt, photos, species
        );
    }
}
