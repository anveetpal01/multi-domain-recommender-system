package com.curio.auth.library;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SavedItemRepository extends JpaRepository<SavedItem, Long> {
    List<SavedItem> findByUserEmailOrderByCreatedAtAsc(String userEmail);
    boolean existsByUserEmailAndItemId(String userEmail, String itemId);
    void deleteByUserEmailAndItemId(String userEmail, String itemId);
}
