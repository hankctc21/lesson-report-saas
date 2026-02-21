package com.lessonreport.saas.api

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
@RequestMapping("/api/v1")
class ApiPingController {
    @GetMapping("/ping")
    fun ping(): ResponseEntity<Map<String, Any>> =
        ResponseEntity.ok(mapOf("status" to "ok", "timestamp" to Instant.now().toString()))
}
