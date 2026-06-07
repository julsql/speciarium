package fr.speciarium.resource;

import fr.speciarium.dto.ComparisonResult;
import fr.speciarium.dto.GroupedResult;
import fr.speciarium.dto.PhotoDto;
import fr.speciarium.dto.PhotoSummary;
import fr.speciarium.dto.SpeciesRowDto;
import fr.speciarium.model.CollectionAccount;
import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.model.Photo;
import fr.speciarium.model.Species;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.service.CollectionService;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestQuery;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Port de advanced_search_result : retourne par espèce une ligne agrégée
 * avec les listes distinctes de continents/pays/régions et toutes les photos
 * pour pouvoir alimenter la lightbox côté client.
 */
@Path("/api/species")
@Produces(MediaType.APPLICATION_JSON)
public class SpeciesResource {

    @Inject CurrentUser current;
    @Inject CollectionService collections;
    @PersistenceContext EntityManager em;

    private static final Map<String, String> GROUP_BY_FIELDS = Map.of(
        "Pays", "country",
        "Continent", "continent",
        "Région", "region",
        "Année", "year",
        "Règne", "specie.kingdom",
        "Classe", "specie.classField",
        "Ordre", "specie.orderField",
        "Famille", "specie.family",
        "Espèce", "specie.latinName"
    );

    @GET
    public Map<String, Object> list(
        @RestQuery("collection_id") Long collectionId,
        @RestQuery("search") String search,
        @RestQuery("latin_name") String latinName,
        @RestQuery("french_name") String frenchName,
        @RestQuery("kingdom") String kingdom,
        @RestQuery("class_field") String classField,
        @RestQuery("order_field") String orderField,
        @RestQuery("family") String family,
        @RestQuery("year") Integer year,
        @RestQuery("start_date") String startDate,
        @RestQuery("end_date") String endDate,
        @RestQuery("continent") String continent,
        @RestQuery("country") String country,
        @RestQuery("region") String region,
        @RestQuery("details") String details,
        @RestQuery("latitude") Double latitude,
        @RestQuery("longitude") Double longitude,
        @RestQuery("sort") @DefaultValue("latin_name") String sort,
        @RestQuery("direction") @DefaultValue("asc") String direction,
        @RestQuery("page") @DefaultValue("1") int page,
        @RestQuery("per_page") @DefaultValue("25") int perPage
    ) {
        AppUser user = current.require();
        Collection col = collectionId != null
            ? collections.requireAccessible(user, collectionId)
            : collections.requireActive(user);

        FilterClause clause = buildPhotoFilter(col.id, search, latinName, frenchName, kingdom,
            classField, orderField, family, year, startDate, endDate,
            continent, country, region, details, latitude, longitude);

        // 1. Récupérer les ids d'espèces uniques + leur min_year + nb photos
        String orderColumn = switch (sort) {
            case "french_name" -> "s.french_name";
            case "kingdom" -> "s.kingdom";
            case "class_field" -> "s.class_field";
            case "order_field" -> "s.order_field";
            case "family" -> "s.family";
            case "genus" -> "s.genus";
            case "min_year" -> "min(p.year)";
            case "number_picture" -> "count(p.id)";
            default -> "s.latin_name";
        };
        String dir = "desc".equalsIgnoreCase(direction) ? "desc" : "asc";

        @SuppressWarnings("unchecked")
        List<Object[]> idRows = nativeQuery(
            "select s.id, count(p.id) as nb, min(p.year) as min_year " +
            "from main_species s join main_photos p on p.specie_id = s.id " +
            "where " + clause.where +
            " group by s.id, " + orderColumn +
            " order by " + orderColumn + " " + dir + " nulls last",
            clause.params)
            .getResultList();

        long total = idRows.size();
        int safe = Math.min(Math.max(perPage, 1), 200);
        int p = Math.max(page, 1);
        int from = Math.min((p - 1) * safe, idRows.size());
        int to = Math.min(from + safe, idRows.size());
        List<Object[]> slice = idRows.subList(from, to);

        if (slice.isEmpty()) {
            return Map.of("items", List.of(), "total", total, "page", p, "per_page", safe);
        }
        List<Long> ids = slice.stream().map(r -> ((Number) r[0]).longValue()).toList();

        // 2. Récupérer les espèces
        Map<Long, Species> speciesMap = Species.<Species>list("id in ?1", ids).stream()
            .collect(Collectors.toMap(s -> s.id, s -> s));

        // 3. Récupérer toutes les photos correspondant au filtre pour ces espèces
        List<Photo> photos = jpqlPhotosFor(clause, ids);

        // 4. Agréger par espèce en conservant l'ordre du slice
        Map<Long, List<Photo>> byId = new LinkedHashMap<>();
        for (Long id : ids) byId.put(id, new ArrayList<>());
        for (Photo ph : photos) {
            if (ph.specie != null) byId.computeIfAbsent(ph.specie.id, k -> new ArrayList<>()).add(ph);
        }

        List<SpeciesRowDto> items = new ArrayList<>();
        for (Object[] row : slice) {
            Long sid = ((Number) row[0]).longValue();
            int n = ((Number) row[1]).intValue();
            Integer minYear = row[2] != null ? ((Number) row[2]).intValue() : null;
            Species s = speciesMap.get(sid);
            if (s == null) continue;
            List<Photo> ps = byId.getOrDefault(sid, List.of());
            items.add(new SpeciesRowDto(
                s.id, s.latinName, s.genus, s.species, s.frenchName,
                s.kingdom, s.classField, s.orderField, s.family,
                minYear,
                ps.stream().map(ph -> ph.continent).filter(v -> v != null && !v.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new)),
                ps.stream().map(ph -> ph.country).filter(v -> v != null && !v.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new)),
                ps.stream().map(ph -> ph.region).filter(v -> v != null && !v.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new)),
                n,
                ps.stream().map(SpeciesResource::toSummary).toList()
            ));
        }

        return Map.of("items", items, "total", total, "page", p, "per_page", safe);
    }

    /**
     * Retourne un tableau pivot du groupement par champ.
     * - Sans `compare_with` : une seule colonne (la collection courante).
     * - Avec `compare_with` (csv d'ids de collections accessibles) : une colonne
     *   par collection + une ligne « Total en commun » en tête.
     */
    @GET
    @Path("/grouped")
    public ComparisonResult grouped(
        @RestQuery("by") String by,
        @RestQuery("compare_with") String compareWith,
        @RestQuery("search") String search,
        @RestQuery("latin_name") String latinName,
        @RestQuery("french_name") String frenchName,
        @RestQuery("kingdom") String kingdom,
        @RestQuery("class_field") String classField,
        @RestQuery("order_field") String orderField,
        @RestQuery("family") String family,
        @RestQuery("year") Integer year,
        @RestQuery("start_date") String startDate,
        @RestQuery("end_date") String endDate,
        @RestQuery("continent") String continent,
        @RestQuery("country") String country,
        @RestQuery("region") String region
    ) {
        AppUser user = current.require();
        Collection mainCol = collections.requireActive(user);

        if (by == null || !GROUP_BY_FIELDS.containsKey(by)) {
            return new ComparisonResult(List.of(), List.of());
        }

        // Résoudre la liste ordonnée des collections : la courante en premier,
        // puis celles spécifiées dans compare_with (que l'utilisateur a le droit
        // de voir).
        List<Collection> ordered = new ArrayList<>();
        ordered.add(mainCol);
        if (compareWith != null && !compareWith.isBlank()) {
            for (String raw : compareWith.split(",")) {
                try {
                    Long otherId = Long.parseLong(raw.trim());
                    if (otherId.equals(mainCol.id)) continue;
                    if (ordered.stream().anyMatch(c -> c.id.equals(otherId))) continue;
                    boolean accessible = CollectionAccount.count(
                        "collection.id = ?1 and user.id = ?2", otherId, user.id) > 0;
                    if (accessible) {
                        Collection c = Collection.findById(otherId);
                        if (c != null) ordered.add(c);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        String field = GROUP_BY_FIELDS.get(by);
        boolean isSpeciesGroup = "Espèce".equals(by);
        String countExpr = isSpeciesGroup ? "count(p)" : "count(distinct p.specie.id)";

        List<Long> collectionIds = ordered.stream().map(c -> c.id).toList();
        FilterClause clause = buildPhotoFilterMulti(collectionIds, search, latinName, frenchName, kingdom,
            classField, orderField, family, year, startDate, endDate,
            continent, country, region, null, null, null);

        String numbered = numberPlaceholders(clause.whereJpql, 1);
        var q = em.createQuery(
            "select coalesce(nullif(cast(" + field + " as string), ''), 'Non spécifié'), " +
            "p.collection.id, " + countExpr +
            " from Photo p where " + numbered +
            " group by " + field + ", p.collection.id"
        );
        for (int k = 0; k < clause.params.size(); k++) q.setParameter(k + 1, clause.params.get(k));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        // Agrégation : Map<name, Map<collectionId, count>>
        Map<String, Map<Long, Long>> byName = new LinkedHashMap<>();
        Map<String, Long> totals = new HashMap<>();
        for (Object[] row : rows) {
            String name = (String) row[0];
            Long colId = ((Number) row[1]).longValue();
            long count = ((Number) row[2]).longValue();
            byName.computeIfAbsent(name, k -> new HashMap<>()).put(colId, count);
            totals.merge(name, count, Long::sum);
        }

        // Tri par total décroissant
        List<String> names = byName.keySet().stream()
            .sorted((a, b) -> Long.compare(totals.getOrDefault(b, 0L), totals.getOrDefault(a, 0L)))
            .toList();

        // Colonnes
        List<ComparisonResult.Column> columns = ordered.stream()
            .map(c -> new ComparisonResult.Column(c.id, collectionLabel(c, user)))
            .toList();

        // Construction des rows
        List<Map<String, Object>> outRows = new ArrayList<>();

        // Ligne "Total en commun" si comparaison
        if (ordered.size() > 1) {
            Map<String, Object> totalRow = new LinkedHashMap<>();
            totalRow.put("name", "Total en commun");
            totalRow.put("isTotal", true);
            Long mainId = mainCol.id;
            for (Collection c : ordered) {
                if (c.id.equals(mainId)) {
                    // Combien de valeurs de groupement existent dans la collection principale
                    long n = names.stream()
                        .filter(name -> byName.get(name).getOrDefault(mainId, 0L) > 0)
                        .count();
                    totalRow.put("collection_" + c.id, n);
                } else {
                    long n = names.stream()
                        .filter(name -> byName.get(name).getOrDefault(mainId, 0L) > 0
                            && byName.get(name).getOrDefault(c.id, 0L) > 0)
                        .count();
                    totalRow.put("collection_" + c.id, n);
                }
            }
            outRows.add(totalRow);
        }

        for (String name : names) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("name", name);
            Map<Long, Long> counts = byName.get(name);
            for (Collection c : ordered) {
                r.put("collection_" + c.id, counts.getOrDefault(c.id, 0L));
            }
            outRows.add(r);
        }

        return new ComparisonResult(columns, outRows);
    }

    private String collectionLabel(Collection c, AppUser viewer) {
        if (c.owner != null && !c.owner.id.equals(viewer.id)) {
            return c.title + " (@" + c.owner.username + ")";
        }
        return c.title;
    }

    @GET
    @Path("/{id}")
    public SpeciesRowDto get(@PathParam("id") Long id) {
        AppUser user = current.require();
        Collection col = collections.requireActive(user);
        Species s = Species.findById(id);
        if (s == null) throw new NotFoundException();
        List<Photo> ps = Photo.<Photo>list(
            "specie.id = ?1 and collection.id = ?2 order by date desc nulls last, id desc",
            id, col.id);
        return new SpeciesRowDto(
            s.id, s.latinName, s.genus, s.species, s.frenchName,
            s.kingdom, s.classField, s.orderField, s.family,
            ps.stream().map(p -> p.year).filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null),
            ps.stream().map(p -> p.continent).filter(v -> v != null && !v.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new)),
            ps.stream().map(p -> p.country).filter(v -> v != null && !v.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new)),
            ps.stream().map(p -> p.region).filter(v -> v != null && !v.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new)),
            ps.size(),
            ps.stream().map(SpeciesResource::toSummary).toList()
        );
    }

    @GET
    @Path("/{id}/photos")
    public List<PhotoDto> photosFor(@PathParam("id") Long id) {
        AppUser user = current.require();
        Collection col = collections.requireActive(user);
        return Photo.<Photo>list(
            "specie.id = ?1 and collection.id = ?2 order by date desc nulls last, id desc", id, col.id)
            .stream().map(PhotoDto::from).toList();
    }

    private static PhotoSummary toSummary(Photo p) {
        return new PhotoSummary(
            p.id, p.thumbnail, p.photo, p.year, p.date,
            p.continent, p.country, p.region, p.details,
            p.latitude, p.longitude,
            extractNumberPicture(p.thumbnail)
        );
    }

    /** Reproduit get_number(thumbnail_path) côté Python : dernier mot du nom de fichier si >2 mots. */
    private static String extractNumberPicture(String thumbnailPath) {
        if (thumbnailPath == null) return "";
        String name = thumbnailPath.substring(thumbnailPath.lastIndexOf('/') + 1);
        int dot = name.lastIndexOf('.');
        if (dot > 0) name = name.substring(0, dot);
        String[] parts = name.split(" ");
        return parts.length > 2 ? parts[parts.length - 1] : "";
    }

    // ── Construction du WHERE pour Photo ──────────────────────
    private record FilterClause(String where, String whereJpql, List<Object> params) {}

    private FilterClause buildPhotoFilter(
        Long collectionId, String search, String latinName, String frenchName, String kingdom,
        String classField, String orderField, String family, Integer year,
        String startDate, String endDate, String continent, String country,
        String region, String details, Double latitude, Double longitude
    ) {
        StringBuilder sql = new StringBuilder("p.collection_id = ?");
        StringBuilder jpql = new StringBuilder("p.collection.id = ?");
        List<Object> params = new ArrayList<>();
        params.add(collectionId);
        appendSearch(sql, jpql, params, search);

        if (notBlank(latinName)) { addIlike(sql, jpql, params, "s.latin_name", "p.specie.latinName", latinName); }
        if (notBlank(frenchName)) { addIlike(sql, jpql, params, "s.french_name", "p.specie.frenchName", frenchName); }
        if (notBlank(kingdom)) { addEqOrLike(sql, jpql, params, "s.kingdom", "p.specie.kingdom", kingdom); }
        if (notBlank(classField)) { addEqOrLike(sql, jpql, params, "s.class_field", "p.specie.classField", classField); }
        if (notBlank(orderField)) { addEqOrLike(sql, jpql, params, "s.order_field", "p.specie.orderField", orderField); }
        if (notBlank(family)) { addEqOrLike(sql, jpql, params, "s.family", "p.specie.family", family); }
        if (year != null) {
            sql.append(" and p.year = ?"); jpql.append(" and p.year = ?"); params.add(year);
        }
        if (notBlank(continent)) { addEq(sql, jpql, params, "p.continent", "p.continent", continent); }
        if (notBlank(country)) { addEq(sql, jpql, params, "p.country", "p.country", country); }
        if (notBlank(region)) { addEq(sql, jpql, params, "p.region", "p.region", region); }
        if (notBlank(details)) { addIlike(sql, jpql, params, "p.details", "p.details", details); }
        if (notBlank(startDate)) {
            try {
                LocalDate d = LocalDate.parse(startDate);
                sql.append(" and p.date >= ?"); jpql.append(" and p.date >= ?"); params.add(d);
            } catch (Exception ignored) {}
        }
        if (notBlank(endDate)) {
            try {
                LocalDate d = LocalDate.parse(endDate);
                sql.append(" and p.date <= ?"); jpql.append(" and p.date <= ?"); params.add(d);
            } catch (Exception ignored) {}
        }
        if (latitude != null) {
            sql.append(" and round(cast(p.latitude as numeric), 3) = round(cast(? as numeric), 3)");
            jpql.append(" and p.latitude is not null and abs(p.latitude - ?) < 0.001");
            params.add(latitude);
        }
        if (longitude != null) {
            sql.append(" and round(cast(p.longitude as numeric), 3) = round(cast(? as numeric), 3)");
            jpql.append(" and p.longitude is not null and abs(p.longitude - ?) < 0.001");
            params.add(longitude);
        }
        return new FilterClause(sql.toString(), jpql.toString(), params);
    }

    /** Variante multi-collections : `p.collection.id in (?, ?, ...)`. */
    private FilterClause buildPhotoFilterMulti(
        List<Long> collectionIds, String search, String latinName, String frenchName, String kingdom,
        String classField, String orderField, String family, Integer year,
        String startDate, String endDate, String continent, String country,
        String region, String details, Double latitude, Double longitude
    ) {
        StringBuilder sql = new StringBuilder("p.collection_id in (");
        StringBuilder jpql = new StringBuilder("p.collection.id in (");
        List<Object> params = new ArrayList<>();
        for (int i = 0; i < collectionIds.size(); i++) {
            if (i > 0) { sql.append(", "); jpql.append(", "); }
            sql.append("?"); jpql.append("?");
            params.add(collectionIds.get(i));
        }
        sql.append(")"); jpql.append(")");
        appendSearch(sql, jpql, params, search);

        if (notBlank(latinName)) addIlike(sql, jpql, params, "s.latin_name", "p.specie.latinName", latinName);
        if (notBlank(frenchName)) addIlike(sql, jpql, params, "s.french_name", "p.specie.frenchName", frenchName);
        if (notBlank(kingdom)) addEqOrLike(sql, jpql, params, "s.kingdom", "p.specie.kingdom", kingdom);
        if (notBlank(classField)) addEqOrLike(sql, jpql, params, "s.class_field", "p.specie.classField", classField);
        if (notBlank(orderField)) addEqOrLike(sql, jpql, params, "s.order_field", "p.specie.orderField", orderField);
        if (notBlank(family)) addEqOrLike(sql, jpql, params, "s.family", "p.specie.family", family);
        if (year != null) {
            sql.append(" and p.year = ?"); jpql.append(" and p.year = ?"); params.add(year);
        }
        if (notBlank(continent)) addEq(sql, jpql, params, "p.continent", "p.continent", continent);
        if (notBlank(country)) addEq(sql, jpql, params, "p.country", "p.country", country);
        if (notBlank(region)) addEq(sql, jpql, params, "p.region", "p.region", region);
        if (notBlank(details)) addIlike(sql, jpql, params, "p.details", "p.details", details);
        if (notBlank(startDate)) {
            try {
                LocalDate d = LocalDate.parse(startDate);
                sql.append(" and p.date >= ?"); jpql.append(" and p.date >= ?"); params.add(d);
            } catch (Exception ignored) {}
        }
        if (notBlank(endDate)) {
            try {
                LocalDate d = LocalDate.parse(endDate);
                sql.append(" and p.date <= ?"); jpql.append(" and p.date <= ?"); params.add(d);
            } catch (Exception ignored) {}
        }
        if (latitude != null) {
            sql.append(" and round(cast(p.latitude as numeric), 3) = round(cast(? as numeric), 3)");
            jpql.append(" and p.latitude is not null and abs(p.latitude - ?) < 0.001");
            params.add(latitude);
        }
        if (longitude != null) {
            sql.append(" and round(cast(p.longitude as numeric), 3) = round(cast(? as numeric), 3)");
            jpql.append(" and p.longitude is not null and abs(p.longitude - ?) < 0.001");
            params.add(longitude);
        }
        return new FilterClause(sql.toString(), jpql.toString(), params);
    }

    /**
     * Ajoute un filtre OR sur l'ensemble des champs textuels et numériques
     * pour la barre de recherche globale.
     */
    private void appendSearch(StringBuilder sql, StringBuilder jpql, List<Object> params, String search) {
        if (!notBlank(search)) return;
        String[] terms = search.trim().toLowerCase().split("\\s+");
        for (String term : terms) {
            String pattern = "%" + stripAccents(term) + "%";
            String sqlOr = String.join(" or ",
                "lower(s.latin_name) like ?",
                "lower(s.french_name) like ?",
                "lower(s.genus) like ?",
                "lower(s.species) like ?",
                "lower(s.kingdom) like ?",
                "lower(s.class_field) like ?",
                "lower(s.order_field) like ?",
                "lower(s.family) like ?",
                "lower(p.continent) like ?",
                "lower(p.country) like ?",
                "lower(p.region) like ?",
                "lower(p.details) like ?",
                "cast(p.year as text) like ?"
            );
            String jpqlOr = String.join(" or ",
                "lower(p.specie.latinName) like ?",
                "lower(p.specie.frenchName) like ?",
                "lower(p.specie.genus) like ?",
                "lower(p.specie.species) like ?",
                "lower(p.specie.kingdom) like ?",
                "lower(p.specie.classField) like ?",
                "lower(p.specie.orderField) like ?",
                "lower(p.specie.family) like ?",
                "lower(p.continent) like ?",
                "lower(p.country) like ?",
                "lower(p.region) like ?",
                "lower(p.details) like ?",
                "cast(p.year as string) like ?"
            );
            sql.append(" and (").append(sqlOr).append(")");
            jpql.append(" and (").append(jpqlOr).append(")");
            for (int i = 0; i < 13; i++) params.add(pattern);
        }
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private static void addIlike(StringBuilder sql, StringBuilder jpql, List<Object> params,
                                 String col, String jpqlCol, String value) {
        sql.append(" and lower(").append(col).append(") like ?");
        jpql.append(" and lower(").append(jpqlCol).append(") like ?");
        params.add("%" + stripAccents(value.toLowerCase()) + "%");
    }

    private static void addEq(StringBuilder sql, StringBuilder jpql, List<Object> params,
                              String col, String jpqlCol, String value) {
        sql.append(" and ").append(col).append(" = ?");
        jpql.append(" and ").append(jpqlCol).append(" = ?");
        params.add(value);
    }

    private static void addEqOrLike(StringBuilder sql, StringBuilder jpql, List<Object> params,
                                    String col, String jpqlCol, String value) {
        addIlike(sql, jpql, params, col, jpqlCol, value);
    }

    private static String stripAccents(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        return n.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    /** Crée une requête native paramétrée positionnellement (?1, ?2...). */
    private jakarta.persistence.Query nativeQuery(String sql, List<Object> params) {
        String numbered = numberPlaceholders(sql, 1);
        var q = em.createNativeQuery(numbered);
        for (int k = 0; k < params.size(); k++) q.setParameter(k + 1, params.get(k));
        return q;
    }

    /** Récupère toutes les photos correspondant au filtre + ids d'espèces, triées. */
    private List<Photo> jpqlPhotosFor(FilterClause clause, List<Long> ids) {
        int paramCount = clause.params.size();
        String numbered = numberPlaceholders(clause.whereJpql, 1);
        String jpql = "select p from Photo p where " + numbered +
            " and p.specie.id in ?" + (paramCount + 1) +
            " order by p.date desc nulls last, p.id desc";
        var q = em.createQuery(jpql, Photo.class);
        for (int k = 0; k < clause.params.size(); k++) q.setParameter(k + 1, clause.params.get(k));
        q.setParameter(paramCount + 1, ids);
        return q.getResultList();
    }

    private static String numberPlaceholders(String src, int startIndex) {
        StringBuilder out = new StringBuilder();
        int i = startIndex;
        for (int c = 0; c < src.length(); c++) {
            if (src.charAt(c) == '?') out.append('?').append(i++); else out.append(src.charAt(c));
        }
        return out.toString();
    }
}
