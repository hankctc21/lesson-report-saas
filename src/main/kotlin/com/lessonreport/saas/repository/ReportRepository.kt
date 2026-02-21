package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.Report
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ReportRepository : JpaRepository<Report, UUID> {
    fun findByIdAndInstructorId(id: UUID, instructorId: UUID): Report?
    fun findBySessionId(sessionId: UUID): Report?
    fun findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID, pageable: Pageable): List<Report>
}
