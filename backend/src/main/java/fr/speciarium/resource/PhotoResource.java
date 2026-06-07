package fr.speciarium.resource;

import fr.speciarium.dto.PhotoDto;
import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.model.Photo;
import fr.speciarium.security.CurrentUser;
import fr.speciarium.service.CollectionService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.Map;

@Path("/api/photos")
@Produces(MediaType.APPLICATION_JSON)
public class PhotoResource {

    @Inject CurrentUser current;
    @Inject CollectionService collections;

    @GET
    public Map<String, Object> list(
        @QueryParam("kingdom") String kingdom,
        @QueryParam("class_field") String classField,
        @QueryParam("order_field") String orderField,
        @QueryParam("family") String family,
        @QueryParam("continent") String continent,
        @QueryParam("country") String country,
        @QueryParam("region") String region,
        @QueryParam("year") Integer year,
        @QueryParam("start_date") String startDate,
        @QueryParam("end_date") String endDate,
        @QueryParam("species_id") Long speciesId,
        @QueryParam("page") @DefaultValue("1") int page,
        @QueryParam("per_page") @DefaultValue("60") int perPage
    ) {
        AppUser user = current.require();
        Collection col = collections.requireActive(user);

        StringBuilder q = new StringBuilder("from Photo p where p.collection.id = :col");
        Parameters params = Parameters.with("col", col.id);

        if (notBlank(kingdom)) { q.append(" and p.specie.kingdom = :kingdom"); params.and("kingdom", kingdom); }
        if (notBlank(classField)) { q.append(" and p.specie.classField = :cls"); params.and("cls", classField); }
        if (notBlank(orderField)) { q.append(" and p.specie.orderField = :ord"); params.and("ord", orderField); }
        if (notBlank(family)) { q.append(" and p.specie.family = :fam"); params.and("fam", family); }
        if (notBlank(continent)) { q.append(" and p.continent = :continent"); params.and("continent", continent); }
        if (notBlank(country)) { q.append(" and p.country = :country"); params.and("country", country); }
        if (notBlank(region)) { q.append(" and p.region = :region"); params.and("region", region); }
        if (year != null) { q.append(" and p.year = :year"); params.and("year", year); }
        if (notBlank(startDate)) {
            try { params.and("sd", java.time.LocalDate.parse(startDate)); q.append(" and p.date >= :sd"); }
            catch (Exception ignored) {}
        }
        if (notBlank(endDate)) {
            try { params.and("ed", java.time.LocalDate.parse(endDate)); q.append(" and p.date <= :ed"); }
            catch (Exception ignored) {}
        }
        if (speciesId != null) { q.append(" and p.specie.id = :sid"); params.and("sid", speciesId); }
        q.append(" order by p.date desc nulls last, p.id desc");

        PanacheQuery<Photo> query = Photo.find(q.toString(), params);
        long total = query.count();
        int safe = Math.min(Math.max(perPage, 1), 500);
        int p = Math.max(page, 1);
        List<PhotoDto> items = query.page(p - 1, safe).list()
            .stream().map(PhotoDto::from).toList();

        return Map.of("items", items, "total", total, "page", p, "per_page", safe);
    }

    @GET
    @Path("/hash")
    public Map<String, Object> hashes() {
        AppUser user = current.require();
        Collection col = collections.requireActive(user);
        List<Object[]> rows = Photo.getEntityManager().createQuery(
            "select p.hash, p.photo from Photo p where p.collection.id = :col",
            Object[].class)
            .setParameter("col", col.id)
            .getResultList();
        List<String> keys = rows.stream()
            .map(r -> stripMediaPrefix((String) r[1], col.id) + ":" + r[0])
            .toList();
        return Map.of("keys", keys);
    }

    private String stripMediaPrefix(String path, Long collectionId) {
        String prefix = "/media/main/images/" + collectionId + "/small/";
        return path != null && path.startsWith(prefix) ? path.substring(prefix.length()) : path;
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
