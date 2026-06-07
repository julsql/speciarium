package fr.speciarium.upload;

import jakarta.enterprise.context.ApplicationScoped;
import net.coobird.thumbnailator.Thumbnails;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Port de create_image.py — vignette 300px + variante "small" 1000px,
 * conservation du format d'origine (Thumbnailator détecte via l'extension de sortie).
 */
@ApplicationScoped
public class ImageResizer {

    public static final int THUMB_SIZE = 300;
    public static final int SMALL_SIZE = 1000;

    @ConfigProperty(name = "speciarium.media.root")
    String mediaRoot;

    public Output process(File source, Long collectionId, String relativePath) throws Exception {
        Path thumbDir = Paths.get(mediaRoot, "main", "images", collectionId.toString(), "vignettes");
        Path smallDir = Paths.get(mediaRoot, "main", "images", collectionId.toString(), "small");
        Path thumbPath = thumbDir.resolve(relativePath);
        Path smallPath = smallDir.resolve(relativePath);
        Files.createDirectories(thumbPath.getParent());
        Files.createDirectories(smallPath.getParent());

        Thumbnails.of(source).size(THUMB_SIZE, THUMB_SIZE * 10).toFile(thumbPath.toFile());
        Thumbnails.of(source).size(SMALL_SIZE, SMALL_SIZE * 10).toFile(smallPath.toFile());

        return new Output(
            "/media/main/images/" + collectionId + "/vignettes/" + relativePath,
            "/media/main/images/" + collectionId + "/small/" + relativePath
        );
    }

    public void deleteFor(Long collectionId, String relativePath) {
        Path thumb = Paths.get(mediaRoot, "main", "images", collectionId.toString(), "vignettes", relativePath);
        Path small = Paths.get(mediaRoot, "main", "images", collectionId.toString(), "small", relativePath);
        try { Files.deleteIfExists(thumb); } catch (Exception ignored) {}
        try { Files.deleteIfExists(small); } catch (Exception ignored) {}
    }

    public record Output(String thumbnailUrl, String smallUrl) {}
}
