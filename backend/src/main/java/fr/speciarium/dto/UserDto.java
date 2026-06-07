package fr.speciarium.dto;

import fr.speciarium.model.AppUser;

public record UserDto(
    Long id,
    String username,
    String email,
    boolean isDemo,
    boolean isStaff,
    Long currentCollectionId,
    String themeName,
    String mapTilesServer
) {
    public static UserDto from(AppUser u) {
        return new UserDto(
            u.id,
            u.username,
            u.email,
            u.isDemo,
            u.isStaff,
            u.currentCollection != null ? u.currentCollection.id : null,
            u.theme != null ? u.theme.name : null,
            u.mapTiles != null ? u.mapTiles.server : null
        );
    }
}
