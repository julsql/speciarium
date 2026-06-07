package fr.speciarium.resource;

import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.service.CollectionService;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Port de get_filtered_options : retourne les valeurs distinctes possibles
 * d'un champ, en respectant les autres filtres déjà cochés.
 */
@Path("/api/filter-options")
@Produces(MediaType.APPLICATION_JSON)
public class FilterOptionsResource {

    @Inject CurrentUser current;
    @Inject CollectionService collections;
    @PersistenceContext EntityManager em;

    @GET
    public Map<String, Object> options(
        @QueryParam("field") String field,
        @QueryParam("continent") String continent,
        @QueryParam("country") String country,
        @QueryParam("region") String region,
        @QueryParam("year") Integer year,
        @QueryParam("kingdom") String kingdom,
        @QueryParam("class") String classField,
        @QueryParam("order") String orderField
    ) {
        AppUser user = current.require();
        Collection col = collections.requireActive(user);

        String column = switch (field) {
            case "continent" -> "p.continent";
            case "country" -> "p.country";
            case "region" -> "p.region";
            case "year" -> "p.year";
            case "kingdom" -> "p.specie.kingdom";
            case "class" -> "p.specie.classField";
            case "order" -> "p.specie.orderField";
            case "family" -> "p.specie.family";
            default -> null;
        };
        if (column == null) return Map.of("options", List.of());

        boolean numeric = "year".equals(field);
        StringBuilder q = new StringBuilder(
            "select distinct ").append(column)
            .append(" from Photo p where p.collection.id = :col and ")
            .append(column).append(" is not null");
        if (!numeric) {
            q.append(" and ").append(column).append(" <> ''");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("col", col.id);

        if (continent != null && !"continent".equals(field)) {
            q.append(" and p.continent = :continent"); params.put("continent", continent);
        }
        if (country != null && !"country".equals(field)) {
            q.append(" and p.country = :country"); params.put("country", country);
        }
        if (region != null && !"region".equals(field)) {
            q.append(" and p.region = :region"); params.put("region", region);
        }
        if (year != null && !"year".equals(field)) {
            q.append(" and p.year = :year"); params.put("year", year);
        }
        if (kingdom != null && !"kingdom".equals(field)) {
            q.append(" and p.specie.kingdom = :kingdom"); params.put("kingdom", kingdom);
        }
        if (classField != null && !"class".equals(field)) {
            q.append(" and p.specie.classField = :cls"); params.put("cls", classField);
        }
        if (orderField != null && !"order".equals(field)) {
            q.append(" and p.specie.orderField = :ord"); params.put("ord", orderField);
        }
        q.append(" order by ").append(column);

        var query = em.createQuery(q.toString());
        params.forEach(query::setParameter);
        @SuppressWarnings("unchecked")
        List<Object> values = query.getResultList();
        return Map.of("options", values.stream().map(Object::toString).toList());
    }
}
