package fr.speciarium.resource;

import fr.speciarium.model.AppUser;
import fr.speciarium.model.UploadAction;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.security.DjangoPasswordHasher;
import fr.speciarium.security.SessionStore;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/profile")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ProfileResource {

    @Inject CurrentUser current;
    @Inject DjangoPasswordHasher hasher;
    @Inject SessionStore sessions;

    public static class UsernameRequest { public String username; }
    public static class EmailRequest { public String email; }
    public static class PasswordRequest {
        public String oldPassword;
        public String newPassword;
    }
    public static class DeleteRequest { public String password; }

    public record UploadHistoryDto(
        UUID uploadId,
        OffsetDateTime createdAt,
        int imagesUploaded,
        int imagesDeleted,
        int imagesChanged,
        Long collectionId,
        String collectionTitle
    ) {}

    @GET
    @Path("/uploads")
    public List<UploadHistoryDto> myUploads() {
        AppUser user = current.require();
        return UploadAction.<UploadAction>list(
            "user.id = ?1 order by createdAt desc", user.id)
            .stream().map(ua -> new UploadHistoryDto(
                ua.uploadId, ua.createdAt,
                ua.imagesUploaded, ua.imagesDeleted, ua.imagesChanged,
                ua.collection.id, ua.collection.title
            )).toList();
    }

    @PATCH
    @Path("/username")
    @Transactional
    public Response updateUsername(UsernameRequest req) {
        AppUser user = current.require();
        if (req.username == null || req.username.isBlank()) {
            return Response.status(400).entity(Map.of("error", "username_required")).build();
        }
        AppUser existing = AppUser.findByUsername(req.username);
        if (existing != null && !existing.id.equals(user.id)) {
            return Response.status(409).entity(Map.of("error", "username_taken")).build();
        }
        user.username = req.username;
        return Response.ok(Map.of("username", user.username)).build();
    }

    @PATCH
    @Path("/email")
    @Transactional
    public Response updateEmail(EmailRequest req) {
        AppUser user = current.require();
        if (req.email == null || req.email.isBlank()) {
            return Response.status(400).entity(Map.of("error", "email_required")).build();
        }
        AppUser existing = AppUser.findByEmail(req.email);
        if (existing != null && !existing.id.equals(user.id)) {
            return Response.status(409).entity(Map.of("error", "email_taken")).build();
        }
        user.email = req.email;
        return Response.ok(Map.of("email", user.email)).build();
    }

    @PATCH
    @Path("/password")
    @Transactional
    public Response updatePassword(PasswordRequest req) {
        AppUser user = current.require();
        if (!hasher.verify(req.oldPassword, user.password)) {
            return Response.status(400).entity(Map.of("error", "wrong_password")).build();
        }
        if (req.newPassword == null || req.newPassword.length() < 8) {
            return Response.status(400).entity(Map.of("error", "password_too_short")).build();
        }
        user.password = hasher.hash(req.newPassword);
        return Response.noContent().build();
    }

    @POST
    @Path("/delete")
    @Transactional
    public Response deleteAccount(DeleteRequest req) {
        AppUser user = current.require();
        if (!hasher.verify(req.password, user.password)) {
            return Response.status(400).entity(Map.of("error", "wrong_password")).build();
        }
        Long uid = user.id;
        if (current.getToken() != null) sessions.destroy(current.getToken());
        AppUser.deleteById(uid);
        return Response.noContent().build();
    }
}
