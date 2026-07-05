package com.curio.auth.library;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time copy of saved_items.year into the renamed release_year column
 * (the old name is a reserved word in H2). On databases that never had the
 * old column this is a no-op — the statement simply fails and is ignored.
 */
@Component
public class LegacyYearMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyYearMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public LegacyYearMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int updated = jdbcTemplate.update(
                    "UPDATE saved_items SET release_year = year WHERE release_year IS NULL AND year IS NOT NULL");
            if (updated > 0) log.info("Migrated year -> release_year for {} saved items", updated);
        } catch (Exception e) {
            log.debug("Legacy year column not present; nothing to migrate");
        }
    }
}
