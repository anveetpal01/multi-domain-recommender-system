package com.curio.auth.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "catalog_items")
@Getter
@Setter
public class CatalogItem {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, length = 500)
    private String title;

    private String creator;

    @Column(length = 1000)
    private String cover;

    // "year" is a reserved word in H2 (local dev DB) — map to a safe name.
    @Column(name = "release_year")
    private Integer year;

    private String meta;

    @Column(length = 2000)
    private String description;

    @Column(length = 500)
    private String tags;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();
}
