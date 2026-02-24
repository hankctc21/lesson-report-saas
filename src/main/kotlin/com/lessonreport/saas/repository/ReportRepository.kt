package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.Report
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ReportRepository : JpaRepository<Report, UUID> {
    @EntityGraph(attributePaths = ["session", "client"])
    fun findByIdAndInstructorId(id: UUID, instructorId: UUID): Report?
    fun findBySessionId(sessionId: UUID): Report?

    @EntityGraph(attributePaths = ["session", "client"])
    fun findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID, pageable: Pageable): List<Report>
}
