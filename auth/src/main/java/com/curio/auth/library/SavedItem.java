package com.curio.auth.library;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(
        name = "saved_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_email", "item_id"})
)
@Getter
@Setter
public class SavedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "item_id", nullable = false)
    private String itemId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, length = 500)
    private String title;

    private String creator;

    @Column(length = 1000)
    private String cover;

    private Integer year;

    private String meta;

    @Column(length = 500)
    private String tags;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
