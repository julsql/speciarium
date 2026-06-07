package fr.speciarium.upload;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

/**
 * Port léger de info_species.py — interroge GBIF (taxonomie) puis iNaturalist
 * (nom vernaculaire FR). On n'embarque pas ete3 (Python-only) ; si GBIF répond
 * sans données complètes on laisse les champs vides plutôt que d'introduire
 * une dépendance native lourde.
 */
@ApplicationScoped
public class TaxonomyService {

    private static final Logger LOG = Logger.getLogger(TaxonomyService.class);
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ObjectMapper JSON = new ObjectMapper();

    public record Taxonomy(
        String latinName,
        String genus,
        String species,
        String kingdom,
        String classField,
        String orderField,
        String family,
        String frenchName
    ) {}

    public Taxonomy lookup(String latinName) {
        String trimmed = normaliseHybrid(latinName);
        String[] parts = trimmed.split(" ");
        String genus = parts.length > 0 ? parts[0] : "";
        String species = parts.length > 1 ? parts[1] : "";
        String kingdom = "", cls = "", order = "", family = "";
        try {
            JsonNode hit = gbifSuggest(trimmed);
            if (hit != null) {
                JsonNode map = hit.get("higherClassificationMap");
                if (hit.hasNonNull("kingdomKey") && map != null) {
                    kingdom = textOrEmpty(map.get(hit.get("kingdomKey").asText()));
                }
                if (hit.hasNonNull("classKey") && map != null) {
                    cls = textOrEmpty(map.get(hit.get("classKey").asText()));
                }
                if (hit.hasNonNull("orderKey") && map != null) {
                    order = textOrEmpty(map.get(hit.get("orderKey").asText()));
                }
                if (hit.hasNonNull("familyKey") && map != null) {
                    family = textOrEmpty(map.get(hit.get("familyKey").asText()));
                }
            }
        } catch (Exception e) {
            LOG.warnf("GBIF lookup failed for %s: %s", latinName, e.getMessage());
        }
        if ("Metazoa".equals(kingdom)) kingdom = "Animalia";

        String frenchName = "";
        try {
            frenchName = iNaturalistCommonName(trimmed);
        } catch (Exception e) {
            LOG.warnf("iNaturalist lookup failed for %s: %s", latinName, e.getMessage());
        }

        return new Taxonomy(latinName, genus, species, kingdom, cls, order, family, frenchName);
    }

    private String normaliseHybrid(String latinName) {
        String[] parts = latinName.split(" ");
        if (parts.length >= 2 && "x".equalsIgnoreCase(parts[1])) return parts[0];
        return latinName;
    }

    private JsonNode gbifSuggest(String name) throws Exception {
        URI uri = URI.create("https://api.gbif.org/v1/species/suggest?q="
            + URLEncoder.encode(name, StandardCharsets.UTF_8));
        HttpResponse<String> resp = HTTP.send(
            HttpRequest.newBuilder(uri).GET().build(),
            HttpResponse.BodyHandlers.ofString()
        );
        if (resp.statusCode() != 200) return null;
        JsonNode arr = JSON.readTree(resp.body());
        return arr.isArray() && arr.size() > 0 ? arr.get(0) : null;
    }

    private String iNaturalistCommonName(String name) throws Exception {
        URI uri = URI.create("https://api.inaturalist.org/v1/taxa?locale=fr&q="
            + URLEncoder.encode(name, StandardCharsets.UTF_8));
        HttpResponse<String> resp = HTTP.send(
            HttpRequest.newBuilder(uri).GET().build(),
            HttpResponse.BodyHandlers.ofString()
        );
        if (resp.statusCode() != 200) return "";
        JsonNode results = JSON.readTree(resp.body()).get("results");
        if (results == null || !results.isArray()) return "";
        for (JsonNode taxon : results) {
            if (taxon.hasNonNull("preferred_common_name")) {
                return taxon.get("preferred_common_name").asText();
            }
        }
        for (JsonNode taxon : results) {
            if (taxon.hasNonNull("english_common_name")) {
                return taxon.get("english_common_name").asText();
            }
        }
        return "";
    }

    private String textOrEmpty(JsonNode node) {
        return node == null || node.isNull() ? "" : node.asText();
    }
}
