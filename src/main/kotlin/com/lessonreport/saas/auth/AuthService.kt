package com.lessonreport.saas.auth

import org.springframework.stereotype.Service
import com.lessonreport.saas.repository.AuthUserRepository

@Service
class AuthService(
    private val authUserRepository: AuthUserRepository
) {
    fun authenticate(username: String, password: String): AuthPrincipal? {
        val authUser = authUserRepository.findByUsername(username.trim())
            ?: return null

        if (password != authUser.password) {
            return null
        }

        return AuthPrincipal(
            username = authUser.username!!,
            instructorId = authUser.instructor!!.id!!
        )
    }
}
