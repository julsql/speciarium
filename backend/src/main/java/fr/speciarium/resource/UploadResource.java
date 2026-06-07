package fr.speciarium.resource;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.model.Photo;
import fr.speciarium.model.UploadAction;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.service.CollectionService;
import fr.speciarium.upload.UploadService;
import fr.speciarium.websocket.ProgressSocket;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.util.*;

@Path("/api/upload-images")
public class UploadResource {

    private static final Logger LOG = Logger.getLogger(UploadResource.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject CurrentUser current;
    @Inject CollectionService collections;
    @Inject UploadService uploadService;
    @Inject ProgressSocket progress;

    @POST
    @Path("/{collectionId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response upload(
        @PathParam("collectionId") Long collectionId,
        @RestForm("upload_id") String uploadIdStr,
        @RestForm("metadata") String metadataJson,
        @RestForm("imageToDelete") String imageToDeleteJson,
        @RestForm("images") List<FileUpload> images
    ) {
        AppUser user = current.require();
        if (user.isDemo) {
            return Response.status(403)
                .entity(Map.of("error", "demo_user_forbidden")).build();
        }
        if (uploadIdStr == null || uploadIdStr.isBlank()) {
            return Response.status(400).entity(Map.of("error", "upload_id required")).build();
        }
        UUID uploadId;
        try {
            uploadId = UUID.fromString(uploadIdStr);
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", "upload_id invalide")).build();
        }
        Collection collection = collections.requireAccessible(user, collectionId);

        LOG.infof("=== Upload reçu: collection=%d, uploadId=%s, user=%s, images=%d, metaJson=%d chars, deleteJson=%d chars",
            collectionId, uploadId, user.username,
            images == null ? 0 : images.size(),
            metadataJson == null ? 0 : metadataJson.length(),
            imageToDeleteJson == null ? 0 : imageToDeleteJson.length());

        try {
            uploadService.ensureUploadAction(uploadId, user.id, collection.id);

            progress.broadcast("Début de la suppression des images");
            List<String> toDelete = parseStringList(imageToDeleteJson);
            var deletedOrigins = uploadService.deleteImages(toDelete, collection.id);
            if (!toDelete.isEmpty()) {
                LOG.infof("Suppressions: %d demandées, %d effectives", toDelete.size(), deletedOrigins.size());
                updateCounters(uploadId, toDelete.size(), 0, 0);
            }

            progress.broadcast("Début du traitement des images");
            List<UploadService.ImageMeta> metas = parseMetadata(metadataJson);
            Set<String> existingHashes = collectExistingHashes(collection.id);

            int uploaded = 0, changed = 0, failed = 0;
            List<String> errors = new ArrayList<>();
            if (images != null && !metas.isEmpty()) {
                int n = Math.min(images.size(), metas.size());
                if (images.size() != metas.size()) {
                    LOG.warnf("Mismatch images (%d) / metadata (%d)", images.size(), metas.size());
                }
                for (int i = 0; i < n; i++) {
                    FileUpload upload = images.get(i);
                    UploadService.ImageMeta meta = metas.get(i);
                    try {
                        boolean isNew = uploadService.treatOne(
                            i, meta, upload.uploadedFile().toFile(),
                            collection.id, uploadId, existingHashes);
                        if (isNew) uploaded++;
                        else changed++;
                    } catch (Exception e) {
                        failed++;
                        String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                        errors.add(meta.filepath() + " : " + msg);
                        LOG.errorf(e, "Échec traitement image %s", meta.filepath());
                        progress.broadcast("Erreur sur " + meta.filepath() + " : " + msg);
                    }
                }
            }
            if (uploaded > 0 || changed > 0) {
                updateCounters(uploadId, 0, uploaded, changed);
                updateDeletedFloor(uploadId, changed);
            }
            uploadService.reassignRenameOrigins(uploadId, deletedOrigins);

            progress.broadcast("Done");
            LOG.infof("=== Upload OK: %d ajoutées, %d modifiées, %d supprimées, %d échouées",
                uploaded, changed, toDelete.size(), failed);

            Map<String, Object> body = new HashMap<>();
            body.put("uploaded", uploaded);
            body.put("changed", changed);
            body.put("deleted", toDelete.size());
            body.put("failed", failed);
            if (!errors.isEmpty()) body.put("errors", errors);
            return Response.ok(body).build();
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.errorf(e, "=== Upload KO (collection=%d, upload=%s): %s",
                collectionId, uploadId, e.getMessage());
            progress.broadcast("Erreur serveur : " + e.getMessage());
            return Response.status(500)
                .entity(Map.of("error", "server_error", "message",
                    e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()))
                .build();
        }
    }

    @Transactional
    void updateCounters(UUID uploadId, int deleted, int uploaded, int changed) {
        UploadAction.update(
            "imagesDeleted = imagesDeleted + ?1, imagesUploaded = imagesUploaded + ?2, " +
            "imagesChanged = imagesChanged + ?3 where uploadId = ?4",
            deleted, uploaded, changed, uploadId);
    }

    @Transactional
    void updateDeletedFloor(UUID uploadId, int changed) {
        UploadAction action = UploadAction.findById(uploadId);
        if (action == null) return;
        action.imagesDeleted = Math.max(action.imagesDeleted - changed, 0);
    }

    private Set<String> collectExistingHashes(Long collectionId) {
        return new HashSet<>(Photo.getEntityManager().createQuery(
            "select distinct p.hash from Photo p where p.collection.id = :c", String.class)
            .setParameter("c", collectionId)
            .getResultList());
    }

    private List<UploadService.ImageMeta> parseMetadata(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return List.of(JSON.readValue(json, UploadService.ImageMeta[].class));
        } catch (Exception e) {
            LOG.errorf(e, "metadata JSON invalide : %s", json);
            throw new BadRequestException("metadata JSON invalide: " + e.getMessage(), e);
        }
    }

    private List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return List.of(JSON.readValue(json, String[].class));
        } catch (Exception e) {
            LOG.warnf("imageToDelete JSON invalide, ignoré : %s", json);
            return List.of();
        }
    }
}
