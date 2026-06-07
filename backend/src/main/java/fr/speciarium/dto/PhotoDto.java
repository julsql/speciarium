package fr.speciarium.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import fr.speciarium.model.Photo;

import java.time.LocalDate;
import java.util.UUID;

public record PhotoDto(
    Long id,
    Integer year,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    LocalDate date,
    Double latitude,
    Double longitude,
    String continent,
    String country,
    String region,
    String photo,
    String thumbnail,
    String hash,
    String details,
    Long speciesId,
    String latinName,
    String frenchName,
    UUID uploadActionId,
    String numberPicture
) {
    public static PhotoDto from(Photo p) {
        return new PhotoDto(
            p.id, p.year, p.date,
            p.latitude, p.longitude,
            p.continent, p.country, p.region,
            p.photo, p.thumbnail, p.hash, p.details,
            p.specie != null ? p.specie.id : null,
            p.specie != null ? p.specie.latinName : null,
            p.specie != null ? p.specie.frenchName : null,
            p.uploadAction != null ? p.uploadAction.uploadId : null,
            extractNumberPicture(p.thumbnail)
        );
    }

    private static String extractNumberPicture(String thumbnailPath) {
        if (thumbnailPath == null) return "";
        String name = thumbnailPath.substring(thumbnailPath.lastIndexOf('/') + 1);
        int dot = name.lastIndexOf('.');
        if (dot > 0) name = name.substring(0, dot);
        String[] parts = name.split(" ");
        return parts.length > 2 ? parts[parts.length - 1] : "";
    }
}
