package fr.speciarium.resource;

import fr.speciarium.model.AppUser;
import fr.speciarium.model.UploadAction;
import fr.speciarium.model.UploadSeen;
import fr.speciarium.security.CurrentUser;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/notifications")
@Produces(MediaType.APPLICATION_JSON)
public class NotificationResource {

    @Inject CurrentUser current;
    @PersistenceContext EntityManager em;

    public record NotificationDto(
        UUID uploadId,
        OffsetDateTime createdAt,
        int imagesUploaded,
        Long collectionId,
        String collectionTitle,
        String username,
        boolean seen
    ) {}

    @GET
    public List<NotificationDto> list() {
        AppUser user = current.require();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery(
            "select ua.uploadId, ua.createdAt, ua.imagesUploaded, " +
            "       ua.collection.id, ua.collection.title, ua.user.username, " +
            "       (select count(s) > 0 from UploadSeen s where s.upload = ua and s.user.id = :uid) " +
            "from UploadAction ua " +
            "where ua.imagesUploaded > 0 " +
            "  and ua.user.id <> :uid " +
            "  and exists (select 1 from CollectionAccount ca " +
            "              where ca.collection = ua.collection and ca.user.id = :uid) " +
            "order by ua.createdAt desc"
        ).setParameter("uid", user.id).getResultList();

        return rows.stream().map(r -> new NotificationDto(
            (UUID) r[0], (OffsetDateTime) r[1], ((Number) r[2]).intValue(),
            ((Number) r[3]).longValue(), (String) r[4], (String) r[5], (Boolean) r[6]
        )).toList();
    }

    @POST
    @Path("/{id}/seen")
    @Transactional
    public Response markSeen(@PathParam("id") UUID id) {
        AppUser user = current.require();
        UploadAction action = UploadAction.findById(id);
        if (action == null) throw new NotFoundException();
        long existing = UploadSeen.count("upload.uploadId = ?1 and user.id = ?2", id, user.id);
        if (existing == 0) {
            UploadSeen s = new UploadSeen();
            s.upload = action;
            s.user = user;
            s.persist();
        }
        return Response.noContent().build();
    }
}
