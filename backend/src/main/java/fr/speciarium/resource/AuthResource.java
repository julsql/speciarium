package fr.speciarium.resource;

import fr.speciarium.dto.UserDto;
import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.model.CollectionAccount;
import fr.speciarium.model.MapTiles;
import fr.speciarium.model.Theme;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.security.DjangoPasswordHasher;
import fr.speciarium.security.SessionStore;
import io.quarkus.panache.common.Parameters;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Map;

@Path("/api/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject DjangoPasswordHasher hasher;
    @Inject SessionStore sessions;
    @Inject CurrentUser current;

    @ConfigProperty(name = "speciarium.session.cookie-name")
    String cookieName;

    @ConfigProperty(name = "speciarium.session.ttl-seconds", defaultValue = "2592000")
    int ttlSeconds;

    public static class LoginRequest {
        @NotBlank public String username;
        @NotBlank public String password;
    }

    public static class SignupRequest {
        @NotBlank public String username;
        @NotBlank public String email;
        @NotBlank public String password;
    }

    @POST
    @Path("/login")
    public Response login(LoginRequest req) {
        AppUser user = AppUser.findByUsername(req.username);
        if (user == null || !user.isActive || !hasher.verify(req.password, user.password)) {
            return Response.status(401).entity(Map.of("error", "invalid_credentials")).build();
        }
        return sessionResponse(user);
    }

    @POST
    @Path("/demo")
    @Transactional
    public Response demoLogin() {
        AppUser user = AppUser.find("isDemo", true).firstResult();
        if (user == null) {
            return Response.status(404).entity(Map.of("error", "no_demo_account")).build();
        }
        return sessionResponse(user);
    }

    @POST
    @Path("/signup")
    @Transactional
    public Response signup(SignupRequest req) {
        if (AppUser.findByUsername(req.username) != null) {
            return Response.status(409).entity(Map.of("error", "username_taken")).build();
        }
        if (AppUser.findByEmail(req.email) != null) {
            return Response.status(409).entity(Map.of("error", "email_taken")).build();
        }

        AppUser user = new AppUser();
        user.username = req.username;
        user.email = req.email;
        user.password = hasher.hash(req.password);
        user.mapTiles = MapTiles.find("name", "default").firstResult();
        user.theme = Theme.find("name", "default").firstResult();

        // Création de la collection initiale (équivalent main/core/backend/create_user)
        Collection collection = new Collection();
        collection.title = "Collection principale";
        collection.owner = user;
        user.persist();
        collection.persist();

        CollectionAccount link = new CollectionAccount();
        link.collection = collection;
        link.user = user;
        link.persist();

        user.currentCollection = collection;
        user.persist();

        return sessionResponse(user);
    }

    @POST
    @Path("/logout")
    public Response logout() {
        if (current.getToken() != null) sessions.destroy(current.getToken());
        return clearCookieResponse();
    }

    @GET
    @Path("/me")
    public Response me() {
        if (!current.isAuthenticated()) {
            return Response.status(401).build();
        }
        return Response.ok(UserDto.from(current.require())).build();
    }

    private Response sessionResponse(AppUser user) {
        String token = sessions.create(user.id);
        NewCookie cookie = new NewCookie.Builder(cookieName)
            .value(token)
            .path("/")
            .httpOnly(true)
            .sameSite(NewCookie.SameSite.LAX)
            .maxAge(ttlSeconds)
            .build();
        return Response.ok(UserDto.from(user)).cookie(cookie).build();
    }

    private Response clearCookieResponse() {
        NewCookie expire = new NewCookie.Builder(cookieName)
            .value("")
            .path("/")
            .maxAge(0)
            .build();
        return Response.noContent().cookie(expire).build();
    }
}
