package fr.speciarium.service;

import fr.speciarium.model.AppUser;
import fr.speciarium.model.Collection;
import fr.speciarium.model.CollectionAccount;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

@ApplicationScoped
public class CollectionService {

    public Collection requireAccessible(AppUser user, Long collectionId) {
        Collection c = Collection.findById(collectionId);
        if (c == null) throw new NotFoundException("collection");
        boolean owner = c.owner != null && c.owner.id.equals(user.id);
        long linked = CollectionAccount.count(
            "collection.id = ?1 and user.id = ?2", collectionId, user.id);
        if (!owner && linked == 0) {
            throw new ForbiddenException("collection_not_accessible");
        }
        return c;
    }

    public Collection requireActive(AppUser user) {
        Collection c = user.currentCollection;
        if (c != null) return c;
        // fallback : première collection liée
        CollectionAccount link = CollectionAccount.find("user.id", user.id).firstResult();
        if (link == null) throw new NotFoundException("no_collection_for_user");
        return link.collection;
    }
}
