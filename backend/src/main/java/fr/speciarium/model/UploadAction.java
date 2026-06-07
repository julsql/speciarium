package fr.speciarium.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "main_uploadaction")
public class UploadAction extends PanacheEntityBase {

    @Id
    @Column(name = "upload_id")
    public UUID uploadId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    public AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collection_id")
    public Collection collection;

    @Column(name = "created_at", nullable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "images_uploaded", nullable = false)
    public int imagesUploaded = 0;

    @Column(name = "images_deleted", nullable = false)
    public int imagesDeleted = 0;

    @Column(name = "images_changed", nullable = false)
    public int imagesChanged = 0;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
