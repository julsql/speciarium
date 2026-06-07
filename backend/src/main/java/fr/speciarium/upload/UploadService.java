package fr.speciarium.upload;

import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.model.Photo;
import fr.speciarium.model.Species;
import fr.speciarium.model.UploadAction;
import fr.speciarium.websocket.ProgressSocket;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.io.File;
import java.time.LocalDate;
import java.util.*;

/**
 * Port de upload_images_endpoint.py (process_images / treatment_image)
 * + delete_images + add_specie/add_photo + reassign_rename_origins.
 *
 * Chaque méthode publique est @Transactional et travaille à partir d'IDs
 * (uploadId, collectionId) pour éviter les detached entities entre transactions.
 */
@ApplicationScoped
public class UploadService {

    private static final Logger LOG = Logger.getLogger(UploadService.class);

    @Inject PhotoMetadataExtractor metadata;
    @Inject ContinentLookup continents;
    @Inject ImageResizer resizer;
    @Inject TaxonomyService taxonomy;
    @Inject ProgressSocket progress;

    public record ImageMeta(
        String filepath,
        String hash,
        String datetime,
        Double latitude,
        Double longitude
    ) {}

    @Transactional
    public void ensureUploadAction(UUID uploadId, Long userId, Long collectionId) {
        if (UploadAction.findById(uploadId) != null) return;
        UploadAction action = new UploadAction();
        action.uploadId = uploadId;
        action.user = AppUser.findById(userId);
        action.collection = Collection.findById(collectionId);
        action.persist();
        LOG.infof("UploadAction créé: %s (user=%d, collection=%d)", uploadId, userId, collectionId);
    }

    @Transactional
    public List<Map.Entry<String, UUID>> deleteImages(List<String> keys, Long collectionId) {
        List<Map.Entry<String, UUID>> deletedOrigins = new ArrayList<>();
        if (keys == null || keys.isEmpty()) return deletedOrigins;
        for (String key : keys) {
            try {
                int sep = key.indexOf(':');
                if (sep <= 0) continue;
                String relativePath = key.substring(0, sep);
                String hash = key.substring(sep + 1);
                String thumbnailUrl = "/media/main/images/" + collectionId + "/vignettes/" + relativePath;

                List<Photo> matches = Photo.list("hash = ?1 and thumbnail = ?2", hash, thumbnailUrl);
                for (Photo p : matches) {
                    UUID origin = p.uploadAction != null ? p.uploadAction.uploadId : null;
                    deletedOrigins.add(Map.entry(hash, origin));
                }
                Long specieId = matches.isEmpty() ? null : matches.get(0).specie.id;
                Photo.delete("hash = ?1 and thumbnail = ?2", hash, thumbnailUrl);

                if (specieId != null && Photo.count("specie.id", specieId) == 0) {
                    Species.deleteById(specieId);
                }
                resizer.deleteFor(collectionId, relativePath);
            } catch (Exception e) {
                LOG.errorf(e, "Échec suppression image %s", key);
            }
        }
        return deletedOrigins;
    }

    /**
     * Traite UNE image : extraction métadonnées + resize + persistance.
     * Tout est dans la même transaction pour rester atomique par image.
     *
     * @return true si l'image n'existait pas (= nouvelle), false si re-soumission.
     */
    @Transactional
    public boolean treatOne(int index, ImageMeta meta, File uploaded,
                            Long collectionId, UUID uploadId,
                            Set<String> existingHashes) throws Exception {
        LOG.debugf("[%d] début traitement %s", index, meta.filepath());

        // 1) hash
        String hash = (meta.hash != null && !meta.hash.isBlank())
            ? meta.hash
            : metadata.sha256(uploaded);

        // 2) localisation à partir du chemin
        PhotoMetadataExtractor.Location loc = metadata.extractLocation(meta.filepath, continents);

        // 3) nom latin & détails
        PhotoMetadataExtractor.LatinInfo latin = metadata.extractLatin(meta.filepath);

        // 4) date EXIF
        LocalDate date;
        try {
            date = metadata.extractDate(uploaded, meta.datetime);
        } catch (Exception e) {
            LOG.warnf("[%d] date EXIF invalide pour %s: %s", index, meta.filepath(), e.getMessage());
            date = null;
        }

        // 5) GPS
        double[] gps = metadata.extractGps(uploaded, meta.latitude, meta.longitude);

        // 6) redimensionnement
        ImageResizer.Output out = resizer.process(uploaded, collectionId, meta.filepath);

        // 7) taxonomie (si espèce inconnue)
        Species specie = Species.findByLatinName(latin.latinName());
        if (specie == null) {
            TaxonomyService.Taxonomy taxo = taxonomy.lookup(latin.latinName());
            specie = new Species();
            specie.latinName = taxo.latinName();
            specie.genus = taxo.genus();
            specie.species = taxo.species();
            specie.kingdom = taxo.kingdom();
            specie.classField = taxo.classField();
            specie.orderField = taxo.orderField();
            specie.family = taxo.family();
            specie.frenchName = taxo.frenchName();
            specie.persist();
            LOG.infof("[%d] espèce créée: %s", index, latin.latinName());
        }

        // 8) photo — fetch des relations dans la transaction courante
        Collection collection = Collection.findById(collectionId);
        UploadAction action = UploadAction.findById(uploadId);
        if (collection == null || action == null) {
            throw new IllegalStateException("Collection ou UploadAction introuvable (id="
                + collectionId + ", upload=" + uploadId + ")");
        }

        Photo photo = new Photo();
        photo.year = date != null ? date.getYear() : null;
        photo.date = date;
        photo.latitude = gps != null ? gps[0] : null;
        photo.longitude = gps != null ? gps[1] : null;
        photo.continent = loc.continent();
        photo.country = loc.country();
        photo.region = loc.region();
        photo.specie = specie;
        photo.photo = out.smallUrl();
        photo.thumbnail = out.thumbnailUrl();
        photo.hash = hash;
        photo.details = latin.details();
        photo.collection = collection;
        photo.uploadAction = action;
        photo.persist();

        boolean isNew = !existingHashes.contains(hash);
        LOG.infof("[%d] image traitée: %s (nouvelle=%s)", index, meta.filepath(), isNew);
        progress.broadcastNumber(index + 1);
        return isNew;
    }

    /**
     * Si une photo a été supprimée puis ré-ajoutée avec le même hash dans la
     * même session d'upload, restaure son upload_action d'origine pour conserver
     * la lignée. Port de reassign_rename_origins().
     */
    @Transactional
    public void reassignRenameOrigins(UUID uploadId, List<Map.Entry<String, UUID>> deletedOrigins) {
        if (deletedOrigins == null || deletedOrigins.isEmpty()) return;
        Map<String, Deque<UUID>> hashToOrigins = new HashMap<>();
        for (var entry : deletedOrigins) {
            if (entry.getValue() != null) {
                hashToOrigins.computeIfAbsent(entry.getKey(), k -> new ArrayDeque<>()).add(entry.getValue());
            }
        }
        for (var entry : hashToOrigins.entrySet()) {
            String hash = entry.getKey();
            Deque<UUID> origins = entry.getValue();
            while (!origins.isEmpty()) {
                UUID origin = origins.pollFirst();
                Photo photo = Photo.find(
                    "uploadAction.uploadId = ?1 and hash = ?2", uploadId, hash).firstResult();
                if (photo == null) break;
                photo.uploadAction = UploadAction.findById(origin);
            }
        }
    }
}
