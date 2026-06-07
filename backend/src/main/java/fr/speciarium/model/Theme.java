package fr.speciarium.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "main_theme")
public class Theme extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(length = 50, unique = true, nullable = false)
    public String name;

    @Column(length = 500, nullable = false)
    public String description;

    @Column(length = 128, nullable = false)
    public String sheet;
}
