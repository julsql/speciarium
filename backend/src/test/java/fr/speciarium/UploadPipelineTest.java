package fr.speciarium;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.speciarium.upload.PhotoMetadataExtractor;
import fr.speciarium.upload.UploadService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires (sans Quarkus + DB) qui vérifient les briques pures du
 * pipeline d'upload : parsing du nom de fichier, extraction continents,
 * sérialisation des `ImageMeta`. Pour les tests d'intégration avec DB +
 * multipart, voir un test @QuarkusTest dédié (qui nécessite Postgres up).
 */
class UploadPipelineTest {

    @Test
    void extractLatin_format_genre_espece_detail_id() {
        PhotoMetadataExtractor x = new PhotoMetadataExtractor();
        var info = x.extractLatin("France/Provence/Vulpes vulpes (mâle) ID0001.jpg");
        assertEquals("Vulpes vulpes", info.latinName());
        assertEquals("(mâle)", info.details());
    }

    @Test
    void extractLatin_format_court_sans_details() {
        PhotoMetadataExtractor x = new PhotoMetadataExtractor();
        var info = x.extractLatin("France/Bos taurus.jpg");
        assertEquals("Bos taurus", info.latinName());
        assertEquals("", info.details());
    }

    @Test
    void extractLatin_format_trois_mots_pas_de_details() {
        PhotoMetadataExtractor x = new PhotoMetadataExtractor();
        // Genre espèce ID → 3 mots, "ID" est considéré comme l'identifiant, pas comme details.
        var info = x.extractLatin("Nepal/Bos taurus ID42.jpg");
        assertEquals("Bos taurus", info.latinName());
        assertEquals("", info.details());
    }

    @Test
    void extractLatin_rejette_fichier_sans_espace() {
        PhotoMetadataExtractor x = new PhotoMetadataExtractor();
        assertThrows(IllegalArgumentException.class,
            () -> x.extractLatin("Nepal/Provence/oiseau.jpg"));
    }

    @Test
    void imageMeta_serialisation_round_trip() throws Exception {
        ObjectMapper json = new ObjectMapper();
        var meta = new UploadService.ImageMeta(
            "France/Provence/Vulpes vulpes (mâle) ID0001.jpg",
            "abcdef0123456789",
            "2024:05:15 14:30:00",
            45.3,
            5.7
        );
        String s = json.writeValueAsString(List.of(meta));
        var parsed = json.readValue(s, UploadService.ImageMeta[].class);
        assertEquals(1, parsed.length);
        assertEquals("France/Provence/Vulpes vulpes (mâle) ID0001.jpg", parsed[0].filepath());
        assertEquals("abcdef0123456789", parsed[0].hash());
        assertEquals("2024:05:15 14:30:00", parsed[0].datetime());
        assertEquals(45.3, parsed[0].latitude());
        assertEquals(5.7, parsed[0].longitude());
    }
}
