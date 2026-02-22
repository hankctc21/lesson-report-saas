package com.lessonreport.saas.auth

import org.springframework.boot.context.properties.ConfigurationProperties
import java.util.UUID

@ConfigurationProperties(prefix = "app.auth")
data class AppAuthProperties(
    var username: String = "admin",
    var password: String = "change_this_in_prod",
    var secret: String = "change-this-jwt-secret-min-32-bytes",
    var tokenTtlMinutes: Long = 120,
    var instructorId: UUID = UUID.fromString("11111111-1111-1111-1111-111111111111")
)
