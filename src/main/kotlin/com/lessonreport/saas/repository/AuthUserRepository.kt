package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.AuthUser
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface AuthUserRepository : JpaRepository<AuthUser, UUID> {
    fun findByUsername(username: String): AuthUser?
}
