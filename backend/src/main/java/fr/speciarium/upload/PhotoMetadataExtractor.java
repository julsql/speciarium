package fr.speciarium.upload;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.io.File;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Objects;

/**
 * Port de main/core/backend/load_data/shared/internal/info_photo.py
 * Extrait à partir d'un fichier image : pays/région/continent, nom latin/détails,
 * hash SHA-256, date EXIF, coordonnées GPS.
 */
@ApplicationScoped
public class PhotoMetadataExtractor {

    private static final Logger LOG = Logger.getLogger(PhotoMetadataExtractor.class);
    private static final DateTimeFormatter[] DATE_FORMATS = new DateTimeFormatter[] {
        DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssxxx"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
    };

    public record Location(String country, String region, String continent) {}
    public record LatinInfo(String latinName, String details) {}

    /** "Vulpes vulpes (mâle) ID0001.jpg" → "Vulpes vulpes" + "(mâle)" */
    public LatinInfo extractLatin(String relativePath) {
        String title = baseName(relativePath);
        title = title.replace("  ", " ");
        String[] parts = title.split(" ");
        if (parts.length < 2) {
            throw new IllegalArgumentException(
                title + " ne correspond pas au format attendu Genre espèce (détails) identifiant");
        }
        String latin = parts[0] + " " + parts[1];
        if (parts.length <= 3) return new LatinInfo(latin, "");
        String details = String.join(" ", Arrays.copyOfRange(parts, 2, parts.length - 1));
        return new LatinInfo(latin, details);
    }

    /** "Pays/Région/photo.jpg" → Location, ou "Pays/photo.jpg" */
    public Location extractLocation(String relativePath, ContinentLookup continents) {
        String normalized = nfc(relativePath);
        String[] folders = normalized.split("/");
        if (folders.length >= 3) {
            String pays = nfc(folders[0]);
            String region = nfc(folders[1]);
            return new Location(pays, region, continents.continentOf(pays));
        }
        if (folders.length == 2) {
            String pays = nfc(folders[0]);
            return new Location(pays, "", continents.continentOf(pays));
        }
        throw new IllegalArgumentException("Chemin invalide. Vérifiez la structure : pays/[région/]nom.jpg");
    }

    public String sha256(File file) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (var in = new java.io.FileInputStream(file)) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
            }
            return HexFormat.of().formatHex(md.digest());
        } catch (Exception e) {
            throw new RuntimeException("hash failed", e);
        }
    }

    public LocalDate extractDate(File file, String fallbackTimestamp) {
        LocalDateTime dt = extractDateTime(file, fallbackTimestamp);
        return dt == null ? null : dt.toLocalDate();
    }

    /** Retourne la date + heure complètes de prise de vue (EXIF DateTimeOriginal). */
    public LocalDateTime extractDateTime(File file, String fallbackTimestamp) {
        if (fallbackTimestamp != null && !fallbackTimestamp.isBlank()) {
            return parseDateTime(fallbackTimestamp);
        }
        try {
            Metadata md = ImageMetadataReader.readMetadata(file);
            ExifSubIFDDirectory exif = md.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (exif != null) {
                var date = exif.getDateOriginal();
                if (date != null) {
                    return date.toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
                }
            }
        } catch (Exception e) {
            LOG.warnf("EXIF date manquante pour %s: %s", file.getName(), e.getMessage());
        }
        return null;
    }

    public double[] extractGps(File file, Double providedLat, Double providedLon) {
        if (providedLat != null && providedLon != null) return new double[]{providedLat, providedLon};
        try {
            Metadata md = ImageMetadataReader.readMetadata(file);
            for (GpsDirectory gps : md.getDirectoriesOfType(GpsDirectory.class)) {
                var loc = gps.getGeoLocation();
                if (loc != null && !loc.isZero()) {
                    return new double[]{loc.getLatitude(), loc.getLongitude()};
                }
            }
        } catch (Exception e) {
            LOG.debugf("Pas de GPS pour %s", file.getName());
        }
        return null;
    }

    private LocalDate parseDate(String s) {
        LocalDateTime dt = parseDateTime(s);
        return dt == null ? null : dt.toLocalDate();
    }

    private LocalDateTime parseDateTime(String s) {
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try { return LocalDateTime.parse(s, fmt); } catch (Exception ignored) { }
            try { return LocalDate.parse(s, fmt).atStartOfDay(); } catch (Exception ignored) { }
        }
        throw new IllegalArgumentException("Format de date non reconnu: " + s);
    }

    private String baseName(String path) {
        String norm = nfc(path);
        int slash = Math.max(norm.lastIndexOf('/'), norm.lastIndexOf('\\'));
        String name = slash >= 0 ? norm.substring(slash + 1) : norm;
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static String nfc(String s) {
        return s == null ? null : Normalizer.normalize(s, Normalizer.Form.NFC);
    }
}
