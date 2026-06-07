package fr.speciarium.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
    name = "main_uploadseen",
    uniqueConstraints = @UniqueConstraint(columnNames = {"upload_id", "user_id"}),
    indexes = @Index(columnList = "user_id, seen_at")
)
public class UploadSeen extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "upload_id")
    public UploadAction upload;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    public AppUser user;

    @Column(name = "seen_at", nullable = false, updatable = false)
    public OffsetDateTime seenAt;

    @PrePersist
    void prePersist() {
        if (seenAt == null) seenAt = OffsetDateTime.now();
    }
}
