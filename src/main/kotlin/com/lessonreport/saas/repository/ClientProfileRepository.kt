package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.ClientProfile
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ClientProfileRepository : JpaRepository<ClientProfile, UUID> {
    fun findByClientId(clientId: UUID): ClientProfile?
}
