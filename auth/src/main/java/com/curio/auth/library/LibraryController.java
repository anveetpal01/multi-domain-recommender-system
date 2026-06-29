package com.curio.auth.library;

import com.curio.auth.library.dto.SavedItemDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/library")
public class LibraryController {

    private final LibraryService libraryService;

    public LibraryController(LibraryService libraryService) {
        this.libraryService = libraryService;
    }

    @GetMapping
    public List<SavedItemDto> list(Authentication authentication) {
        return libraryService.list(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<SavedItemDto> add(Authentication authentication,
                                            @Valid @RequestBody SavedItemDto dto) {
        return ResponseEntity.ok(libraryService.add(authentication.getName(), dto));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> remove(Authentication authentication,
                                       @PathVariable String itemId) {
        libraryService.remove(authentication.getName(), itemId);
        return ResponseEntity.noContent().build();
    }
}
