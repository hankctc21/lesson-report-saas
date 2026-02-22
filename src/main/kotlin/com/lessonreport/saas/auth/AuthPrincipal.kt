package com.lessonreport.saas.auth

import java.util.UUID

data class AuthPrincipal(
    val username: String,
    val instructorId: UUID
)
