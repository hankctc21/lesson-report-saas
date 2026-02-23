package com.lessonreport.saas.auth

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.auth")
data class AppAuthProperties(
    var secret: String = "change-this-jwt-secret-min-32-bytes",
    var tokenTtlMinutes: Long = 120
)
