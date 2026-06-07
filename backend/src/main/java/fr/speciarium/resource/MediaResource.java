package fr.speciarium.resource;

import jakarta.annotation.PostConstruct;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.Normalizer;

@Path("/media")
public class MediaResource {

    private static final Logger LOG = Logger.getLogger(MediaResource.class);

    @ConfigProperty(name = "speciarium.media.root")
    String mediaRoot;

    @PostConstruct
    void logRoot() {
        java.nio.file.Path resolved = Paths.get(mediaRoot).toAbsolutePath().normalize();
        LOG.infof("MediaResource: speciarium.media.root = %s → %s (existe: %s)",
            mediaRoot, resolved, Files.isDirectory(resolved));
    }

    @GET
    @Path("/{path:.+}")
    public Response serve(@PathParam("path") String path) throws Exception {
        // Les noms de pays sont stockés en NFC par le pipeline d'upload (cf.
        // PhotoMetadataExtractor). Les filesystems (macOS notamment) peuvent
        // stocker en NFD : on tente les deux.
        java.nio.file.Path root = Paths.get(mediaRoot).toAbsolutePath().normalize();
        java.nio.file.Path target = root.resolve(path).normalize();
        if (!target.startsWith(root)) {
            LOG.warnf("MediaResource: chemin hors de la racine refusé: %s", target);
            throw new NotFoundException();
        }
        if (!Files.exists(target)) {
            // tentative NFD pour macOS HFS+/APFS
            java.nio.file.Path nfd = root.resolve(
                Normalizer.normalize(path, Normalizer.Form.NFD)).normalize();
            if (Files.exists(nfd)) target = nfd;
            else {
                LOG.warnf("MediaResource: fichier introuvable: %s (path demandé: %s)", target, path);
                throw new NotFoundException();
            }
        }
        if (Files.isDirectory(target)) throw new NotFoundException();

        String contentType = Files.probeContentType(target);
        if (contentType == null) {
            String name = target.getFileName().toString().toLowerCase();
            if (name.endsWith(".jpg") || name.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (name.endsWith(".png")) contentType = "image/png";
            else if (name.endsWith(".webp")) contentType = "image/webp";
            else contentType = "application/octet-stream";
        }
        return Response.ok(target.toFile())
            .header("Content-Type", contentType)
            .header("Cache-Control", "public, max-age=86400")
            .build();
    }
}
