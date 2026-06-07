package fr.speciarium.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

/** Photo telle qu'affichée dans la grille / lightbox d'une ligne d'espèce. */
public record PhotoSummary(
    Long id,
    String thumbnail,
    String photo,
    Integer year,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    LocalDate date,
    String continent,
    String country,
    String region,
    String details,
    Double latitude,
    Double longitude,
    String numberPicture
) {}
