package fr.speciarium.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "main_appuser")
public class AppUser extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(length = 128, nullable = false)
    public String password;

    @Column(name = "last_login")
    public OffsetDateTime lastLogin;

    @Column(name = "is_superuser", nullable = false)
    public boolean isSuperuser = false;

    @Column(length = 150, unique = true, nullable = false)
    public String username;

    @Column(name = "first_name", length = 150, nullable = false)
    public String firstName = "";

    @Column(name = "last_name", length = 150, nullable = false)
    public String lastName = "";

    @Column(name = "is_staff", nullable = false)
    public boolean isStaff = false;

    @Column(name = "is_active", nullable = false)
    public boolean isActive = true;

    @Column(name = "date_joined", nullable = false)
    public OffsetDateTime dateJoined;

    @Column(length = 254, unique = true, nullable = false)
    public String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "map_tiles_id")
    public MapTiles mapTiles;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "theme_id")
    public Theme theme;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_collection_id")
    public Collection currentCollection;

    @Column(name = "is_demo", nullable = false)
    public boolean isDemo = false;

    @PrePersist
    void prePersist() {
        if (dateJoined == null) dateJoined = OffsetDateTime.now();
    }

    public static AppUser findByUsername(String username) {
        return find("username", username).firstResult();
    }

    public static AppUser findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
