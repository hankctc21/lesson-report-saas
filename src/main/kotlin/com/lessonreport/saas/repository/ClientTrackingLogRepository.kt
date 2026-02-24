package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.ClientTrackingLog
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ClientTrackingLogRepository : JpaRepository<ClientTrackingLog, UUID> {
    fun findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID): List<ClientTrackingLog>
}

