package fr.speciarium.security;

import fr.speciarium.model.AppUser;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@Provider
@RequestScoped
@RegisterForReflection
public class CurrentUser implements ContainerRequestFilter {

    @Inject
    SessionStore sessions;

    @ConfigProperty(name = "speciarium.session.cookie-name")
    String cookieName;

    private AppUser user;
    private String token;

    @Override
    public void filter(ContainerRequestContext ctx) {
        Cookie cookie = ctx.getCookies().get(cookieName);
        if (cookie == null) return;
        token = cookie.getValue();
        sessions.resolve(token)
            .map(id -> AppUser.<AppUser>findById(id))
            .ifPresent(u -> this.user = u);
    }

    public boolean isAuthenticated() {
        return user != null && user.isActive;
    }

    public AppUser require() {
        if (!isAuthenticated()) throw new NotAuthorizedException("session");
        return user;
    }

    public AppUser get() {
        return user;
    }

    public String getToken() {
        return token;
    }

    public boolean isDemo() {
        return user != null && user.isDemo;
    }
}
