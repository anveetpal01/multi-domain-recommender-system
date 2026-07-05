package com.curio.auth.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogRepository extends JpaRepository<CatalogItem, String> {
    long countByType(String type);
}
