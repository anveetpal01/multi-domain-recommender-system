package com.curio.auth.recs;

import com.curio.auth.recs.dto.HomeFeedDto;
import com.curio.auth.recs.dto.RecommendedItemDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private static final int MAX_LIMIT = 50;

    private final RecommenderService recommenderService;

    public RecommendationController(RecommenderService recommenderService) {
        this.recommenderService = recommenderService;
    }

    @GetMapping("/home")
    public HomeFeedDto home(Authentication authentication) {
        return recommenderService.homeFeed(authentication.getName());
    }

    @GetMapping
    public List<RecommendedItemDto> list(Authentication authentication,
                                         @RequestParam(required = false) String type,
                                         @RequestParam(defaultValue = "20") int limit) {
        return recommenderService.recommend(authentication.getName(), type, clamp(limit));
    }

    @GetMapping("/similar/{itemId}")
    public List<RecommendedItemDto> similar(Authentication authentication,
                                            @PathVariable String itemId,
                                            @RequestParam(defaultValue = "6") int limit) {
        return recommenderService.similar(authentication.getName(), itemId, clamp(limit));
    }

    private static int clamp(int limit) {
        return Math.max(1, Math.min(MAX_LIMIT, limit));
    }
}
