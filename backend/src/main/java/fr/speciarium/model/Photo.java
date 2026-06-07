package fr.speciarium.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "main_photos")
public class Photo extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Integer year;

    public LocalDate date;

    public Double latitude;
    public Double longitude;

    @Column(length = 255, nullable = false)
    public String continent = "";

    @Column(length = 255, nullable = false)
    public String country;

    @Column(length = 255, nullable = false)
    public String region = "";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specie_id", nullable = false)
    public Species specie;

    @Column(length = 255, nullable = false)
    public String photo;

    @Column(length = 255, nullable = false)
    public String thumbnail;

    @Column(length = 255, nullable = false)
    public String hash;

    @Column(columnDefinition = "text", nullable = false)
    public String details = "";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id", nullable = false)
    public Collection collection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_action_id")
    public UploadAction uploadAction;

    @Column(name = "created_at", nullable = false, updatable = false)
    public OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
