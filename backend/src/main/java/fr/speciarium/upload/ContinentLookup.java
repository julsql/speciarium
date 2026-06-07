package fr.speciarium.upload;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ContinentLookup {

    private Map<String, String> countryToContinent = Map.of();

    @PostConstruct
    void load() {
        try (InputStream in = getClass().getResourceAsStream("/continents.yml")) {
            if (in == null) return;
            ObjectMapper yaml = new ObjectMapper(new YAMLFactory());
            @SuppressWarnings("unchecked")
            Map<String, List<String>> raw = yaml.readValue(in, Map.class);
            Map<String, String> map = new HashMap<>();
            raw.forEach((continent, countries) -> {
                if (countries != null) {
                    for (String c : countries) map.put(c.toLowerCase(), continent);
                }
            });
            countryToContinent = map;
        } catch (Exception ignored) {
            // continent vide → caller pourra gérer
        }
    }

    public String continentOf(String country) {
        if (country == null) return "";
        return countryToContinent.getOrDefault(country.toLowerCase(), "");
    }
}
