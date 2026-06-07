package fr.speciarium.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "main_species")
public class Species extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "latin_name", length = 255, unique = true, nullable = false)
    public String latinName;

    @Column(length = 255, nullable = false)
    public String genus;

    @Column(length = 255, nullable = false)
    public String species;

    @Column(name = "french_name", length = 255, nullable = false)
    public String frenchName = "";

    @Column(length = 255, nullable = false)
    public String kingdom = "";

    @Column(name = "class_field", length = 255, nullable = false)
    public String classField = "";

    @Column(name = "order_field", length = 255, nullable = false)
    public String orderField = "";

    @Column(length = 255, nullable = false)
    public String family = "";

    public static Species findByLatinName(String latinName) {
        return find("latinName", latinName).firstResult();
    }
}
