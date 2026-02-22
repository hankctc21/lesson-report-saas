package com.lessonreport.saas.auth

import org.springframework.stereotype.Service

@Service
class AuthService(
    private val appAuthProperties: AppAuthProperties
) {
    fun authenticate(username: String, password: String): AuthPrincipal? {
        if (username != appAuthProperties.username) {
            return null
        }
        if (password != appAuthProperties.password) {
            return null
        }

        return AuthPrincipal(
            username = username,
            instructorId = appAuthProperties.instructorId
        )
    }
}
