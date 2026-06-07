package fr.speciarium.resource;

import fr.speciarium.dto.CollectionDto;
import fr.speciarium.model.*;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.service.CollectionService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

@Path("/api/collections")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CollectionResource {

    @Inject CurrentUser current;
    @Inject CollectionService collections;

    public static class TitleRequest { @NotBlank public String title; }
    public static class AddUserRequest {
        public Long collectionId;
        @NotBlank public String username;
    }

    @GET
    public List<CollectionDto> list() {
        AppUser user = current.require();
        List<Long> ids = CollectionAccount.<CollectionAccount>list("user.id", user.id)
            .stream().map(ca -> ca.collection.id).toList();
        if (ids.isEmpty()) return List.of();
        return Collection.<Collection>list("id in ?1 order by createdAt desc", ids)
            .stream().map(c -> {
                long photos = Photo.count("collection.id", c.id);
                long species = Photo.getEntityManager().createQuery(
                    "select count(distinct p.specie.id) from Photo p where p.collection.id = :c", Long.class)
                    .setParameter("c", c.id).getSingleResult();
                return CollectionDto.from(c, photos, species);
            }).toList();
    }

    @POST
    @Transactional
    public CollectionDto create(TitleRequest req) {
        AppUser user = current.require();
        Collection c = new Collection();
        c.title = req.title;
        c.owner = user;
        c.persist();
        CollectionAccount link = new CollectionAccount();
        link.collection = c;
        link.user = user;
        link.persist();
        return CollectionDto.from(c, 0, 0);
    }

    @POST
    @Path("/{id}/select")
    @Transactional
    public Response select(@PathParam("id") Long id) {
        AppUser user = current.require();
        Collection c = collections.requireAccessible(user, id);
        user.currentCollection = c;
        user.persist();
        return Response.noContent().build();
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    public CollectionDto rename(@PathParam("id") Long id, TitleRequest req) {
        AppUser user = current.require();
        Collection c = collections.requireAccessible(user, id);
        if (c.owner == null || !c.owner.id.equals(user.id)) {
            throw new ForbiddenException();
        }
        c.title = req.title;
        return CollectionDto.from(c,
            Photo.count("collection.id", c.id),
            Photo.getEntityManager().createQuery(
                "select count(distinct p.specie.id) from Photo p where p.collection.id = :c", Long.class)
                .setParameter("c", c.id).getSingleResult()
        );
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        AppUser user = current.require();
        Collection c = collections.requireAccessible(user, id);
        if (c.owner == null || !c.owner.id.equals(user.id)) {
            throw new ForbiddenException();
        }
        Photo.delete("collection.id", c.id);
        CollectionAccount.delete("collection.id", c.id);
        c.delete();
        return Response.noContent().build();
    }

    @POST
    @Path("/share")
    @Transactional
    public Response addUser(AddUserRequest req) {
        AppUser user = current.require();
        Collection c = collections.requireAccessible(user, req.collectionId);
        AppUser target = AppUser.findByUsername(req.username);
        if (target == null) return Response.status(404)
            .entity(Map.of("error", "user_not_found")).build();
        CollectionAccount link = new CollectionAccount();
        link.collection = c;
        link.user = target;
        link.persist();
        return Response.noContent().build();
    }
}
