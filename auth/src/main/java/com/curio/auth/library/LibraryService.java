package com.curio.auth.library;

import com.curio.auth.library.dto.SavedItemDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LibraryService {

    private final SavedItemRepository repository;

    public LibraryService(SavedItemRepository repository) {
        this.repository = repository;
    }

    public List<SavedItemDto> list(String email) {
        return repository.findByUserEmailOrderByCreatedAtAsc(email).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SavedItemDto add(String email, SavedItemDto dto) {
        if (!repository.existsByUserEmailAndItemId(email, dto.id())) {
            SavedItem item = new SavedItem();
            item.setUserEmail(email);
            item.setItemId(dto.id());
            item.setType(dto.type());
            item.setTitle(dto.title());
            item.setCreator(dto.creator());
            item.setCover(dto.cover());
            item.setYear(dto.year());
            item.setMeta(dto.meta());
            item.setTags(dto.tags() == null ? "" : String.join(",", dto.tags()));
            repository.save(item);
        }
        return dto;
    }

    @Transactional
    public void remove(String email, String itemId) {
        repository.deleteByUserEmailAndItemId(email, itemId);
    }

    private SavedItemDto toDto(SavedItem i) {
        List<String> tags = (i.getTags() == null || i.getTags().isBlank())
                ? List.of()
                : Arrays.stream(i.getTags().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
        return new SavedItemDto(
                i.getItemId(), i.getType(), i.getTitle(), i.getCreator(),
                i.getCover(), i.getYear(), i.getMeta(), tags
        );
    }
}
