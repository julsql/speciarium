package fr.speciarium.resource;

import fr.speciarium.model.AppUser;
import fr.speciarium.model.MapTiles;
import fr.speciarium.model.Theme;
import fr.speciarium.security.CurrentUser;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
public class ThemeResource {

    @Inject CurrentUser current;

    public record ThemeDto(Long id, String name, String description, String sheet, boolean active) {}
    public record MapTilesDto(Long id, String name, String description, String server, boolean active) {}

    @GET
    @Path("/themes")
    public List<ThemeDto> themes() {
        AppUser user = current.require();
        Long currentId = user.theme != null ? user.theme.id : null;
        return Theme.<Theme>listAll().stream()
            .map(t -> new ThemeDto(t.id, t.name, t.description, t.sheet, t.id.equals(currentId)))
            .toList();
    }

    @POST
    @Path("/themes/{id}/select")
    @Transactional
    public Response selectTheme(@PathParam("id") Long id) {
        AppUser user = current.require();
        Theme t = Theme.findById(id);
        if (t == null) throw new NotFoundException();
        user.theme = t;
        user.persist();
        return Response.noContent().build();
    }

    @GET
    @Path("/map-tiles")
    public List<MapTilesDto> mapTiles() {
        AppUser user = current.require();
        Long currentId = user.mapTiles != null ? user.mapTiles.id : null;
        return MapTiles.<MapTiles>listAll().stream()
            .map(m -> new MapTilesDto(m.id, m.name, m.description, m.server, m.id.equals(currentId)))
            .toList();
    }

    @POST
    @Path("/map-tiles/{id}/select")
    @Transactional
    public Response selectMapTiles(@PathParam("id") Long id) {
        AppUser user = current.require();
        MapTiles m = MapTiles.findById(id);
        if (m == null) throw new NotFoundException();
        user.mapTiles = m;
        user.persist();
        return Response.noContent().build();
    }
}
